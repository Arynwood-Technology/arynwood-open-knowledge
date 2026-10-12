import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const nonce = () => randomBytes(32).toString('base64url')
const equal = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  /^[A-Za-z0-9_-]{43}$/.test(a) &&
  /^[A-Za-z0-9_-]{43}$/.test(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b))
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  )
function validOrcid(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value)
  )
    return false
  const digits = value.replaceAll('-', '')
  let sum = 0
  for (const n of digits.slice(0, 15)) sum = (sum + Number(n)) * 2
  const check = (12 - (sum % 11)) % 11
  return digits[15] === (check === 10 ? 'X' : String(check))
}
export function configuration(env = process.env) {
  const clientId = env.ORCID_CLIENT_ID
  const clientSecret = env.ORCID_CLIENT_SECRET
  if (
    !clientId ||
    !/^APP-[A-Z0-9]+$/.test(clientId) ||
    !clientSecret ||
    clientSecret.length < 16
  )
    throw new Error(
      'Configure ORCID_CLIENT_ID and a rotated ORCID_CLIENT_SECRET in server environment variables.',
    )
  const sandbox = env.ORCID_ENV === 'sandbox'
  if (!sandbox && env.ORCID_ENV !== 'production')
    throw new Error('Set ORCID_ENV to sandbox or production.')
  const redirect = new URL(env.ORCID_REDIRECT_URI || '')
  if (
    redirect.pathname !== '/auth/orcid/callback' ||
    redirect.username ||
    redirect.password ||
    redirect.search ||
    redirect.hash
  )
    throw new Error('Invalid ORCID redirect URI.')
  const local = redirect.origin === 'http://127.0.0.1:8000'
  if (redirect.protocol !== 'https:' && !(sandbox && local))
    throw new Error(
      'Production ORCID callbacks require HTTPS. Loopback HTTP is supported only for sandbox development.',
    )
  if (
    !['http://127.0.0.1:8000', 'https://research.arynwood.com'].includes(
      redirect.origin,
    )
  )
    throw new Error(
      'Redirect origin is outside the configured application allowlist.',
    )
  return {
    clientId,
    clientSecret,
    sandbox,
    redirect: redirect.href,
    origin: redirect.origin,
    issuer: sandbox ? 'https://sandbox.orcid.org' : 'https://orcid.org',
    api: sandbox ? 'https://pub.sandbox.orcid.org' : 'https://pub.orcid.org',
    secure: redirect.protocol === 'https:',
    port: 8000,
  }
}
async function boundedJson(response) {
  if (!response.ok) throw new Error('ORCID request failed.')
  if (!response.headers.get('content-type')?.includes('json'))
    throw new Error('Unexpected ORCID response.')
  if (!response.body) throw new Error('Empty ORCID response.')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2_000_000) {
        await reader.cancel()
        throw new Error('ORCID response too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
function publicProfile(raw, id, sandbox) {
  if (!raw || typeof raw !== 'object' || raw['orcid-identifier']?.path !== id)
    throw new Error('ORCID profile identifier mismatch.')
  const short = (x) => (typeof x === 'string' ? x.slice(0, 1000) : '')
  const name = raw.person?.name
  const summary = raw['activities-summary'] ?? {}
  const affiliations = []
  for (const [kind, key, itemKey] of [
    ['employment', 'employments', 'employment-summary'],
    ['education', 'educations', 'education-summary'],
  ]) {
    for (const group of (Array.isArray(summary[key]?.['affiliation-group'])
      ? summary[key]['affiliation-group']
      : []
    ).slice(0, 100)) {
      for (const entry of (Array.isArray(group.summaries)
        ? group.summaries
        : []
      ).slice(0, 100)) {
        const item = entry[itemKey]
        if (item?.visibility !== 'public') continue
        affiliations.push({
          kind,
          organization: short(item.organization?.name),
          department: short(item['department-name']),
          role: short(item['role-title']),
          source: short(item.source?.['source-name']?.value),
        })
      }
    }
  }
  const works = []
  for (const group of (Array.isArray(summary.works?.group)
    ? summary.works.group
    : []
  ).slice(0, 200)) {
    for (const item of (Array.isArray(group['work-summary'])
      ? group['work-summary']
      : []
    ).slice(0, 10)) {
      if (item.visibility !== 'public') continue
      const identifiers = (
        Array.isArray(item['external-ids']?.['external-id'])
          ? item['external-ids']['external-id']
          : []
      )
        .slice(0, 30)
        .map((e) => ({
          type: short(e['external-id-type']),
          value: short(e['external-id-value']),
          relationship: short(e['external-id-relationship']),
        }))
      works.push({
        title: short(item.title?.title?.value),
        type: short(item.type),
        identifiers,
        source: short(item.source?.['source-name']?.value),
      })
    }
  }
  return {
    orcid: id,
    profileUrl:
      (sandbox ? 'https://sandbox.orcid.org/' : 'https://orcid.org/') + id,
    name: [
      short(name?.['given-names']?.value),
      short(name?.['family-name']?.value),
    ]
      .filter(Boolean)
      .join(' '),
    affiliations: affiliations.slice(0, 200),
    works: works.slice(0, 200),
    retrievedAt: new Date().toISOString(),
    notice:
      'Public record assertions are not validation of qualifications or research quality.',
  }
}
function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || '')
      .split(';')
      .map((v) => v.trim().split('='))
      .filter((pair) => pair.length === 2 && pair[0]),
  )
}
async function body(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk.toString()
    if (raw.length > 2048) throw new Error('Request too large.')
  }
  return new URLSearchParams(raw)
}
export function createOrcidServer(
  config,
  { fetcher = fetch, clock = Date.now, staticDir = resolve('dist') } = {},
) {
  const pending = new Map()
  const sessions = new Map()
  const flowCookie = config.secure ? '__Host-aok-flow' : 'aok-flow'
  const sessionCookie = config.secure ? '__Host-aok-session' : 'aok-session'
  let windowStart = clock()
  let requests = 0
  const cookie = (name, value, age) =>
    name +
    '=' +
    value +
    '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' +
    age +
    (config.secure ? '; Secure' : '')
  function cleanup() {
    for (const [key, row] of pending)
      if (row.expires <= clock()) pending.delete(key)
    for (const [key, row] of sessions)
      if (row.expires <= clock()) sessions.delete(key)
  }
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.crossref.org https://api.openalex.org; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    )
    if (config.secure)
      response.setHeader('Strict-Transport-Security', 'max-age=31536000')
    const send = (status, value, type = 'text/html; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type })
      response.end(value)
    }
    const page = (title, content) =>
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
      escape(title) +
      '</title></head><body><main><h1>' +
      escape(title) +
      '</h1>' +
      content +
      '</main></body></html>'
    try {
      cleanup()
      if (request.headers.host !== new URL(config.origin).host) {
        send(400, 'Invalid request host.', 'text/plain')
        return
      }
      if (request.url?.length > 4096) {
        send(414, 'Request URI too long.', 'text/plain')
        return
      }
      const url = new URL(request.url || '/', config.origin)
      const method = request.method
      if (
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/api/') ||
        url.pathname === '/researcher'
      ) {
        if (clock() - windowStart > 60_000) {
          windowStart = clock()
          requests = 0
        }
        if (++requests > 60) {
          response.setHeader('Retry-After', '60')
          send(429, 'Too many requests.', 'text/plain')
          return
        }
      }
      const jar = cookies(request)
      const session = sessions.get(jar[sessionCookie])
      if (method === 'POST' && request.headers.origin !== config.origin) {
        send(403, 'Invalid request origin.', 'text/plain')
        return
      }
      if (url.pathname === '/auth/orcid' && method === 'GET') {
        if (pending.size >= 1000) {
          send(503, 'Authentication temporarily unavailable.', 'text/plain')
          return
        }
        const state = nonce()
        pending.set(state, { expires: clock() + 10 * 60_000, started: false })
        response.setHeader('Set-Cookie', cookie(flowCookie, state, 600))
        send(
          200,
          page(
            'Connect your ORCID iD',
            '<p>This optional connection identifies your researcher profile. ORCID does not validate qualifications or endorse findings. Public research discovery remains available without sign-in.</p><form method="post" action="/auth/orcid/start"><input type="hidden" name="state" value="' +
              state +
              '"><button>Continue to ORCID</button></form><p><a href="/">Return to research</a></p>',
          ),
        )
        return
      }
      if (url.pathname === '/auth/orcid/start' && method === 'POST') {
        if (
          !request.headers['content-type']?.startsWith(
            'application/x-www-form-urlencoded',
          )
        ) {
          send(415, 'Invalid form type.', 'text/plain')
          return
        }
        const form = await body(request)
        const state = form.get('state')
        const row = pending.get(jar[flowCookie])
        if (
          form.getAll('state').length !== 1 ||
          !row ||
          row.started ||
          !equal(state, jar[flowCookie])
        ) {
          send(403, 'Invalid authentication state.', 'text/plain')
          return
        }
        row.started = true
        const target = new URL(config.issuer + '/oauth/authorize')
        target.search = new URLSearchParams({
          client_id: config.clientId,
          response_type: 'code',
          scope: '/authenticate',
          redirect_uri: config.redirect,
          state,
        }).toString()
        response.writeHead(303, { Location: target.href })
        response.end()
        return
      }
      if (url.pathname === '/auth/orcid/callback' && method === 'GET') {
        const state = url.searchParams.get('state')
        const row = pending.get(jar[flowCookie])
        if (
          url.searchParams.getAll('state').length !== 1 ||
          !row?.started ||
          !equal(state, jar[flowCookie])
        ) {
          send(403, 'Invalid or expired authentication state.', 'text/plain')
          return
        }
        pending.delete(jar[flowCookie]) // Single-use, including failures.
        response.setHeader('Set-Cookie', cookie(flowCookie, '', 0))
        if (url.searchParams.has('error')) {
          send(
            400,
            page(
              'ORCID connection cancelled',
              '<a href="/auth/orcid">Try again</a>',
            ),
          )
          return
        }
        const code = url.searchParams.get('code')
        if (
          url.searchParams.getAll('code').length !== 1 ||
          !code ||
          code.length > 512 ||
          !/^[A-Za-z0-9_-]+$/.test(code)
        ) {
          send(400, 'Invalid authorization response.', 'text/plain')
          return
        }
        const token = await boundedJson(
          await fetcher(config.issuer + '/oauth/token', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: config.clientId,
              client_secret: config.clientSecret,
              grant_type: 'authorization_code',
              code,
              redirect_uri: config.redirect,
            }),
            signal: AbortSignal.timeout(15000),
            redirect: 'error',
          }),
        )
        if (
          !validOrcid(token.orcid) ||
          token.token_type?.toLowerCase() !== 'bearer' ||
          typeof token.access_token !== 'string' ||
          token.access_token.length > 4096 ||
          !String(token.scope).split(/\s+/).includes('/authenticate')
        )
          throw new Error('Invalid ORCID token response.')
        if (sessions.size >= 1000) throw new Error('Session capacity reached.')
        sessions.delete(jar[sessionCookie]) // Rotate prior session rather than adopting a caller identifier.
        const id = nonce()
        sessions.set(id, {
          orcid: token.orcid,
          name: typeof token.name === 'string' ? token.name.slice(0, 1000) : '',
          token: token.access_token,
          expires: clock() + 60 * 60_000,
          csrf: nonce(),
          profile: null,
          profilePending: null,
        })
        response.setHeader('Set-Cookie', [
          cookie(flowCookie, '', 0),
          cookie(sessionCookie, id, 3600),
        ])
        response.writeHead(303, { Location: '/researcher' })
        response.end()
        return
      }
      if (url.pathname === '/researcher' && method === 'GET') {
        if (!session) {
          send(
            401,
            page(
              'Researcher connection',
              '<a href="/auth/orcid">Connect ORCID</a>',
            ),
          )
          return
        }
        send(
          200,
          page(
            'Authenticated researcher',
            '<p>' +
              escape(session.name) +
              '</p><p>ORCID iD: ' +
              escape(session.orcid) +
              '</p><p><a href="' +
              config.issuer +
              '/' +
              session.orcid +
              '">Public ORCID profile</a></p><p><a href="/api/researcher">Retrieve public affiliations and works (JSON)</a></p><form method="post" action="/auth/orcid/logout"><input type="hidden" name="csrf" value="' +
              session.csrf +
              '"><button>Disconnect and delete local session</button></form><p><a href="/">Research interface</a></p><p>This session does not grant editorial review or publishing privileges.</p>',
          ),
        )
        return
      }
      if (url.pathname === '/api/researcher' && method === 'GET') {
        if (!session) {
          send(401, '{"error":"Authentication required"}', 'application/json')
          return
        }
        if (!session.profile) {
          if (!session.profilePending) {
            session.profilePending = (async () =>
              boundedJson(
                await fetcher(
                  config.api + '/v3.0/' + session.orcid + '/record',
                  {
                    headers: {
                      Accept: 'application/vnd.orcid+json',
                      Authorization: 'Bearer ' + session.token,
                    },
                    signal: AbortSignal.timeout(15000),
                    redirect: 'error',
                  },
                ),
              ))()
              .then((raw) => publicProfile(raw, session.orcid, config.sandbox))
              .finally(() => {
                session.profilePending = null
              })
          }
          session.profile = await session.profilePending
        }
        send(
          200,
          JSON.stringify({
            authenticated: true,
            researcherId: 'orcid:' + session.orcid,
            profile: session.profile,
          }),
          'application/json',
        )
        return
      }
      if (url.pathname === '/auth/orcid/logout' && method === 'POST') {
        const form = await body(request)
        if (
          !session ||
          form.getAll('csrf').length !== 1 ||
          !equal(form.get('csrf'), session.csrf)
        ) {
          send(403, 'Invalid logout request.', 'text/plain')
          return
        }
        sessions.delete(jar[sessionCookie])
        response.setHeader('Set-Cookie', cookie(sessionCookie, '', 0))
        response.writeHead(303, { Location: '/' })
        response.end()
        return
      }
      if (method !== 'GET' && method !== 'HEAD') {
        send(405, 'Method not allowed.', 'text/plain')
        return
      }
      if (
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/api/')
      ) {
        send(404, 'Not found.', 'text/plain')
        return
      }
      const relative = decodeURIComponent(
        url.pathname === '/' ? '/index.html' : url.pathname,
      )
      const path = resolve(staticDir, '.' + relative)
      if (
        !path.startsWith(resolve(staticDir) + sep) ||
        relative.includes('\0') ||
        !['.html', '.js', '.css', '.json', '.svg', '.png', '.ico'].includes(
          extname(path),
        )
      ) {
        send(404, 'Not found.', 'text/plain')
        return
      }
      const info = await stat(path)
      if (!info.isFile() || info.size > 5_000_000) {
        send(404, 'Not found.', 'text/plain')
        return
      }
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
      }
      send(
        200,
        method === 'HEAD' ? '' : await readFile(path),
        types[extname(path)],
      )
    } catch {
      // Never log secrets, codes, request URLs or upstream response bodies.
      send(
        502,
        page(
          'Request could not be completed',
          '<p>The provider or local configuration could not complete this request.</p><a href="/auth/orcid">Start a new ORCID connection</a>',
        ),
      )
    }
  })
  server.requestTimeout = 20_000
  server.headersTimeout = 15_000
  const expirySweep = setInterval(cleanup, 60_000)
  expirySweep.unref()
  server.on('close', () => {
    clearInterval(expirySweep)
    pending.clear()
    sessions.clear()
  })
  return server
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  try {
    const config = configuration()
    createOrcidServer(config).listen(config.port, '127.0.0.1', () =>
      console.log('Optional ORCID server listening on loopback port 8000.'),
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
