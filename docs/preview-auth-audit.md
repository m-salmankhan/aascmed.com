# Preview authentication review — 30 October 2026

## Scope and conclusion

Reviewed the website's `b4507e0` Caddy, Compose, forward-auth server/login client and deployment workflow. Used synthetic local HTTP fixtures to exercise the unchanged legacy authentication server. No production credentials, CMS records, account settings or deployed services were changed. This is a source and local-behavior review, not a claim that the live Cloudflare policies, firewall or application are secure.

The expanded Caddy pre-check follows the documented `forward_auth` pattern; complexity alone does not establish an authentication bypass. Its intended authorization boundary is a successful gateway response. No general anonymous draft bypass was demonstrated. The avoidable risk is the custom gateway's use and handling of Strapi administrator credentials, plus incomplete session and failure controls.

The proposed replacement uses Cloudflare Access for editor identity and a private Cloudflare Tunnel with built-in Access token validation. Strapi remains the content source; the Astro server's narrowly scoped Content API token is independent of editor sign-in. The preview no longer needs to receive administrator passwords or hold administrator tokens. Existing-server Podman Compose and private Caddy remain; Traefik, Quadlets and a CMS authentication rewrite are outside this change.

## Findings at the reviewed baseline

| Finding | Evidence and effect | Replacement control |
| --- | --- | --- |
| Administrator credential exposure crosses the preview boundary | `/login` posts administrator credentials to `/admin/login`, stores `data.token` verbatim in `preview_jwt`, and reuses it at `/admin/users/me`. Caddy does not remove `Cookie` before proxying to the site. `HttpOnly` and `Secure` are positive controls, but the preview handles a credential with CMS administrator scope. | Access handles sign-in; remove the custom login service. Strip Access assertions, cookies and authorization headers before forwarding to Astro. |
| Logout does not invalidate a captured token | `/logout` only clears the browser cookie. The local fixture replayed the previous cookie at `/verify` successfully after logout. This is a captured-token scenario, not a demonstration of token theft. | Use the managed Access session/logout model. Record its expiry/revocation behavior in actual-host tests; do not promise instant revocation beyond the provider's documented behavior. |
| No local login CSRF control | A form-encoded POST with an unrelated `Origin` authenticated successfully in the synthetic test. Neither Origin nor a CSRF token is checked. `SameSite=None` is required for the old cross-site iframe flow and does not supply CSRF protection. | Remove the preview credential POST endpoint. Access and the selected identity providers own the authentication interaction. |
| Unnecessary information in logs | The fixture confirmed login email addresses and a complete upstream error body appear in process logs. The missing-token branch also logs a complete response object. Do not infer that real passwords were logged; that was not observed. | Remove the custom login logging and avoid verbose request/token logs in the tunnel and proxy. Keep managed access audit logs subject to their own retention/access controls. |
| Unbounded and ambiguous upstream authentication | Both auth fetches lack an abort deadline and follow redirects by default. Verification checks status alone; an upstream error becomes 401 and can create misleading login loops. | Remove the per-request Strapi administrator lookup. Cloudflared performs supported JWT signature/issuer/audience/time validation before origin forwarding. |
| Return-path contract is unsafe and the client loses deep links | The server accepts an arbitrary `redirect` query value, including an external URL, in its successful JSON response. The existing login client omits the original query on POST, so its ordinary flow currently returns to `/`; the audit does not claim a proven script-execution exploit. | Remove the custom return-path implementation and use Access's supported login flow. Check deep links and hostile return values during rollout. |
| Gateway has no explicit local attempt limiter | The source imposes no local login rate limit. Strapi may independently rate-limit its admin login; deployed settings were not verified, so this is not a claim that unlimited attempts reach the CMS. | Managed login and explicit editor authorization policy replace the public Strapi-password relay. |
| Exceptional routes and cache policy need whole-host coverage | The legacy `/__refresh` bypasses admin auth by design and relies on a separate Gatsby refresh token. The old proxy applies no uniform private/no-store policy. Live Cloudflare cache rules were not inspected. | Retire the refresh exception with Gatsby preview. Protect every preview path, image, asset and error response with Access and uniform private/no-store/noindex policy; explicitly bypass edge caching for the hostname. |

The synthetic checks used only a fake local CMS and fake administrator token. They verified cross-origin form acceptance, verbatim cookie contents, successful token replay after logout, acceptance of an external return value, and identity/upstream-body logging. They did not test password guessing, real account revocation or live network bypasses.

## Proposed trust boundary

```text
Editor -> Cloudflare Access policy -> authenticated Tunnel
       -> cloudflared Access JWT validation -> private Caddy -> private Astro
                                                          -> Strapi Content API
```

Access policy must explicitly allow the intended editor addresses or IdP groups. Merely enabling Google/Microsoft or one-time email PIN does not authorize every authenticated user. Do not use `Everyone`, an unrestricted email-domain rule, an OTP-method-only Allow rule, or a Bypass policy for draft paths. Preview authorization is administered separately from Strapi roles; removing a Strapi administrator does not automatically remove their Access permission.

Cloudflared must require Access validation for the hostname, configured for the correct team and application audience. End ingress with a reject rule. Missing account configuration must fail closed. Publish no host ports for Astro or Caddy, do not use host networking, and restrict host/container-network access: local users with host or container control remain inside the trust boundary. Merely trusting an identity header or putting an orange-cloud DNS record in front of an exposed origin is insufficient.

Use supported `cloudflared` Access validation rather than implement another password gateway, session store or JWT verifier. Pin the runtime image and keep tunnel credentials out of repository/build context/process logs. Review effective configuration and DNS before retiring the former externally reachable listener.

## Cost and CMS sign-in

As checked on 30 October 2026, Cloudflare lists a $0 Zero Trust plan with a 50-user limit. It supports an identity provider and one-time email PIN simultaneously. Keep the account on the free plan; no paid identity-provider subscription or additional server is required merely to offer email codes. Existing account entitlements and usage remain to be checked before activation.

Cloudflare Access can provide a shared outer gate for CMS and preview, but does not create a Strapi administrator session. Supported Strapi admin SSO requires Enterprise or the Growth SSO add-on; the current pricing page lists the add-on from $150/month in addition to Growth. The budget-preserving recommendation is free Access for preview and the existing Strapi admin login. Do not gate the whole CMS/API/media host as an incidental change: public assets and server-side CMS clients may need different policies.

## Required actual-host evidence

Before declaring WEB-41/42 or the stage complete, verify the named editor allowlist and denied users with every enabled login method; forged/missing/expired/wrong-audience assertions; session expiry/logout; all deep-link, asset, image and error paths; direct origin-IP/old-port access; Cloudflare/cache isolation; dependency outages; and sanitized logs. A successful config parse or local health response does not prove these controls.

Check the real CMS iframe in supported desktop/mobile browsers. Access or identity-provider login redirects may refuse framing, and `SameSite=None` cannot override third-party-cookie blocking. Sign in from a direct preview tab when needed, then retest embedding. A working direct tab is a fallback, not evidence that the iframe works. Do not loosen Access policy or remove origin validation to make an iframe test pass.

The complete ten-second CMS response deadline and stalled-body cancellation are verified locally. The init-enabled preview exits promptly on SIGTERM; the pinned adapter does not guarantee graceful request draining. Actual-host saved-draft freshness, deadline/error behavior, resource/latency measurements and interrupted-request recovery remain acceptance criteria. No real enquiry emails should be sent during checks.

## Primary references

- [Caddy forward_auth behavior and equivalent expanded form](https://caddyserver.com/docs/caddyfile/directives/forward_auth)
- [Caddy proxy header handling](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers)
- [Cloudflare Access application and origin validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Cloudflared origin parameters and Access validation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/origin-parameters/)
- [Access policy pitfalls](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Identity providers and simultaneous OTP](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/)
- [Access cookies and browser restrictions](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/)
- [Cloudflare pricing](https://www.cloudflare.com/plans/)
- [Strapi SSO availability](https://docs.strapi.io/cms/features/sso) and [CMS pricing](https://strapi.io/pricing-cms)
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
