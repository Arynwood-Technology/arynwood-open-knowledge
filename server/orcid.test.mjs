import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { configuration, createOrcidServer } from './orcid.mjs'

const env = {
  ORCID_ENV: 'sandbox',
  ORCID_CLIENT_ID: 'APP-TESTCLIENT',
  ORCID_CLIENT_SECRET: 'test-only-noncredential-placeholder',
  ORCID_REDIRECT_URI: 'http://127.0.0.1:8000/auth/orcid/callback',
}
const config = configuration(env)
const fixtureId = '0000-0002-1825-0097'
const token = {
  orcid: fixtureId,
  name: '<script>Test Author</script>',
  access_token: 'test-token-not-real',
  token_type: 'bearer',
  scope: '/authenticate /read-public',
}
const record = {
  'orcid-identifier': { path: fixtureId },
  person: {
    name: {
      'given-names': { value: 'Test' },
      'family-name': { value: 'Author' },
    },
  },
  'activities-summary': {
    employments: {
      'affiliation-group': [
        {
          summaries: [
            {
              'employment-summary': {
                visibility: 'public',
                organization: { name: 'Synthetic test institution' },
                'role-title': 'Test researcher',
              },
            },
            {
              'employment-summary': {
                visibility: 'limited',
                organization: { name: 'Private fixture affiliation' },
              },
            },
          ],
        },
      ],
    },
    works: {
      group: [
        {
          'work-summary': [
            {
              visibility: 'public',
              title: { title: { value: 'Synthetic fixture work' } },
              type: 'journal-article',
              'external-ids': {
                'external-id': [
                  {
                    'external-id-type': 'doi',
                    'external-id-value': '10.5555/orcid-test-fixture',
                    'external-id-relationship': 'self',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  },
}
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
  })
// Invoke the actual Node HTTP request handler in-process; no privileged listening socket needed.
function request(
  server,
  path,
  {
    method = 'GET',
    cookie = '',
    body = '',
    origin = config.origin,
    host = '127.0.0.1:8000',
  } = {},
) {
  return new Promise((resolve, reject) => {
    const req = Readable.from(body ? [Buffer.from(body)] : [])
    Object.assign(req, {
      url: path,
      method,
      headers: {
        host,
        cookie,
        origin,
        'content-type': 'application/x-www-form-urlencoded',
      },
    })
    const headers = {}
    const res = {
      setHeader(name, value) {
        headers[name.toLowerCase()] = value
      },
      writeHead(status, extra = {}) {
        this.status = status
        for (const [key, value] of Object.entries(extra))
          headers[key.toLowerCase()] = value
      },
      end(value = '') {
        resolve({ status: this.status, headers, body: String(value) })
      },
    }
    try {
      server.emit('request', req, res)
    } catch (e) {
      reject(e)
    }
  })
}
const cookiePair = (value) => value.split(';')[0]
async function start(server) {
  const login = await request(server, '/auth/orcid')
  assert.equal(login.status, 200)
  const cookie = cookiePair(login.headers['set-cookie'])
  const state = cookie.split('=')[1]
  const redirect = await request(server, '/auth/orcid/start', {
    method: 'POST',
    cookie,
    body: new URLSearchParams({ state }).toString(),
  })
  assert.equal(redirect.status, 303)
  return { state, cookie, redirect }
}
await test('configuration requires credentials and HTTPS for production', () => {
  assert.throws(() => configuration({}), /Configure/)
  assert.throws(
    () => configuration({ ...env, ORCID_ENV: 'production' }),
    /HTTPS/,
  )
  assert.throws(
    () =>
      configuration({
        ...env,
        ORCID_REDIRECT_URI: 'https://attacker.example/auth/orcid/callback',
      }),
    /allowlist/,
  )
  const production = configuration({
    ...env,
    ORCID_ENV: 'production',
    ORCID_REDIRECT_URI: 'https://research.arynwood.com/auth/orcid/callback',
  })
  assert.equal(production.secure, true)
})
await test('OAuth exchanges codes server-side, associates the authenticated iD, and retrieves only public profile data', async (t) => {
  const calls = []
  const server = createOrcidServer(config, {
    fetcher: async (url, options) => {
      calls.push({ url, options })
      return json(url.endsWith('/oauth/token') ? token : record)
    },
  })
  t.after(() => server.emit('close'))
  const flow = await start(server)
  const authorize = new URL(flow.redirect.headers.location)
  assert.equal(authorize.origin, 'https://sandbox.orcid.org')
  assert.equal(authorize.searchParams.get('scope'), '/authenticate')
  assert.equal(authorize.searchParams.get('state'), flow.state)
  const callback = await request(
    server,
    '/auth/orcid/callback?code=TESTCODE&state=' + flow.state,
    { cookie: flow.cookie },
  )
  assert.equal(callback.status, 303)
  assert.equal(calls[0].url, 'https://sandbox.orcid.org/oauth/token')
  assert.equal(
    calls[0].options.body.get('client_secret'),
    env.ORCID_CLIENT_SECRET,
  )
  assert.equal(calls[0].options.redirect, 'error')
  const session = cookiePair(callback.headers['set-cookie'][1])
  assert.match(callback.headers['set-cookie'][1], /HttpOnly; SameSite=Lax/)
  assert.equal(callback.headers.location, '/researcher')
  const researcher = await request(server, '/researcher', { cookie: session })
  assert.equal(researcher.status, 200)
  assert.match(researcher.body, /&lt;script&gt;/)
  assert.ok(!researcher.body.includes(token.access_token))
  assert.ok(!JSON.stringify(callback).includes(env.ORCID_CLIENT_SECRET))
  const profile = await request(server, '/api/researcher', { cookie: session })
  const parsed = JSON.parse(profile.body)
  assert.equal(parsed.researcherId, 'orcid:' + fixtureId)
  assert.equal(parsed.profile.affiliations.length, 1)
  assert.equal(parsed.profile.works[0].identifiers[0].type, 'doi')
  assert.ok(!profile.body.includes('Private fixture'))
  assert.ok(!profile.body.includes(token.access_token))
  await request(server, '/api/researcher', { cookie: session })
  assert.equal(calls.length, 2) // Session cache prevents repeated public API calls.
  assert.equal(
    calls[1].options.headers.Authorization,
    'Bearer ' + token.access_token,
  )
  const csrf = researcher.body.match(/name="csrf" value="([^"]+)"/)[1]
  assert.equal(
    (
      await request(server, '/auth/orcid/logout', {
        method: 'POST',
        cookie: session,
        body: 'csrf=' + csrf,
      })
    ).status,
    303,
  )
  assert.equal(
    (await request(server, '/api/researcher', { cookie: session })).status,
    401,
  )
})
await test('invalid, unbound, duplicate and replayed OAuth state cannot exchange codes', async (t) => {
  let calls = 0
  const server = createOrcidServer(config, {
    fetcher: async () => {
      calls++
      return json(token)
    },
  })
  t.after(() => server.emit('close'))
  const flow = await start(server)
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?code=TEST&state=' + 'x'.repeat(43),
        { cookie: flow.cookie },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?code=TEST&state=' + flow.state,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?code=TEST&state=' +
          flow.state +
          '&state=' +
          flow.state,
        { cookie: flow.cookie },
      )
    ).status,
    403,
  )
  assert.equal(calls, 0)
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?code=TEST&state=' + flow.state,
        { cookie: flow.cookie },
      )
    ).status,
    303,
  )
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?code=TEST&state=' + flow.state,
        { cookie: flow.cookie },
      )
    ).status,
    403,
  )
  assert.equal(calls, 1)
})
await test('expired state, cancelled consent and token failures do not create sessions', async (t) => {
  let now = 1000
  const server = createOrcidServer(config, {
    clock: () => now,
    fetcher: async () => json({ ...token, orcid: '0000-0002-1825-0098' }),
  })
  t.after(() => server.emit('close'))
  const expired = await start(server)
  now += 601_000
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?code=TEST&state=' + expired.state,
        { cookie: expired.cookie },
      )
    ).status,
    403,
  )
  const denied = await start(server)
  assert.equal(
    (
      await request(
        server,
        '/auth/orcid/callback?error=access_denied&state=' + denied.state,
        { cookie: denied.cookie },
      )
    ).status,
    400,
  )
  const invalid = await start(server)
  const response = await request(
    server,
    '/auth/orcid/callback?code=TEST&state=' + invalid.state,
    { cookie: invalid.cookie },
  )
  assert.equal(response.status, 502)
  assert.ok(!response.body.includes(env.ORCID_CLIENT_SECRET))
  assert.equal((await request(server, '/api/researcher')).status, 401)
})
await test('host and origin checks reject cross-site login and logout; production sets secure cookies', async (t) => {
  const server = createOrcidServer(config)
  t.after(() => server.emit('close'))
  assert.equal(
    (await request(server, '/auth/orcid', { host: 'evil.example' })).status,
    400,
  )
  assert.equal(
    (
      await request(server, '/auth/orcid/start', {
        method: 'POST',
        origin: 'https://evil.example',
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await request(server, '/auth/orcid/logout', {
        method: 'POST',
        body: 'csrf=invalid',
      })
    ).status,
    403,
  )
  const prod = createOrcidServer(
    configuration({
      ...env,
      ORCID_ENV: 'production',
      ORCID_REDIRECT_URI: 'https://research.arynwood.com/auth/orcid/callback',
    }),
  )
  t.after(() => prod.emit('close'))
  const response = await request(prod, '/auth/orcid', {
    host: 'research.arynwood.com',
  })
  assert.match(response.headers['set-cookie'], /^__Host-aok-flow=/)
  assert.match(response.headers['set-cookie'], /Secure/)
  assert.match(
    response.headers['content-security-policy'],
    /frame-ancestors 'none'/,
  )
})
