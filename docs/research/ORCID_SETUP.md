# Optional ORCID authentication
The server uses Node's built-in HTTP implementation; no new server framework, cloud account or desktop sidecar is required. Public discovery works when this server is absent.

## Rotate and configure
Rotate any secret exposed in chat in ORCID Developer Tools before use. The repository does not contain or use the supplied secret. The client ID in .env.example is public; the secret is deliberately blank.

Copy .env.example to .env and restrict access (`chmod 600 .env`). Set ORCID_CLIENT_SECRET to the newly generated value using a local editor or secret manager. Do not paste it into prompts, shell history or commits. Never prefix credentials with VITE_.

Production: register exactly `https://research.arynwood.com/auth/orcid/callback`, set ORCID_ENV=production and ORCID_REDIRECT_URI to that URI. The endpoint is proposed and has not been deployed. A TLS reverse proxy must serve this hostname and forward to loopback port 8000, preserving Host=research.arynwood.com. Do not log callback query strings. Do not expose loopback directly. Production registration accepts HTTPS according to [ORCID's authenticated iD tutorial](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/).

Sandbox development: register a separate sandbox client, set ORCID_ENV=sandbox, use that client's credentials, and register `http://127.0.0.1:8000/auth/orcid/callback` if accepted by the sandbox registration. Production credentials cannot be used against sandbox. The server rejects HTTP redirects in production.

Run `npm ci`, `npm run build`, and `npm run auth:orcid`. Visit the server's `/auth/orcid` route through the configured origin. It serves the built research app at /. An optional VITE_ORCID_AUTH_URL may display a link in the frontend; it is a public URL only and is allowlisted. Sign-in does not transfer tokens into the React app or Tauri.

## Endpoints and boundaries
GET /auth/orcid presents an explicit connect form.
POST /auth/orcid/start checks same-origin form submission and a cookie-bound nonce before redirecting.
GET /auth/orcid/callback validates a ten-minute, single-use random state bound to an HttpOnly cookie and exchanges the code server-side using /authenticate scope.
GET /researcher shows the authenticated iD/name and a disconnect form.
GET /api/researcher returns sanitized public profile JSON: stable researcherId, profile link, public affiliations and public works/identifier relationships.
POST /auth/orcid/logout checks a separate session CSRF nonce and deletes the local session.

The server requests only public data. See [ORCID's record-read tutorial](https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/). Authenticated iD means the user connected their ORCID account; affiliation/work statements do not prove qualifications or validate findings.

Server-side sessions use 256-bit random opaque cookies, HttpOnly/SameSite=Lax and Secure/__Host- cookies for HTTPS. Host/origin checks, no-store, no-referrer, restrictive CSP, bounded responses, outbound timeouts, rate limiting and code/state replay rejection are implemented. Secrets are never returned in responses. Access tokens remain in process memory; profile data are cached for the session. Sessions expire after one hour and disappear on restart/logout. No token persistence, refresh-token store or durable researcher account exists yet.

## Deployment limitations
Mocked HTTP-handler tests cover OAuth boundaries; no live login was attempted with an exposed credential. Verify actual sandbox/production consent after rotation, registered redirects, proxy TLS/headers, logout and expiry. This single-process optional service needs independent review before public deployment. Do not run multiple replicas without shared secure sessions. It does not provide community roles, editorial authorization, or student authentication. Future durable tokens require OS keyring or an encrypted server secret store, not localStorage or a plaintext database. Disconnect clears the application session; users can separately revoke access in ORCID.
