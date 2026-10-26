# Preview Server

A Docker-based preview environment that runs `gatsby develop` with draft content from Strapi, protected by Strapi-based authentication and served over HTTPS via Caddy + Cloudflare.

## Architecture

Three containers run on the preview host, connected via a shared Podman network (`preview-net`):

```
Internet → Cloudflare (edge TLS) → :443 on host
  ↓
┌─────────────────────────────────────────────────┐
│  preview-caddy  (Caddy 2, TLS + reverse proxy)  │
│  ├─ /login, /logout → preview-forward-auth:3001 │
│  └─ /* (after auth) → aascmed-preview:8000       │
├─────────────────────────────────────────────────┤
│  preview-forward-auth  (Node/Express)            │
│  Verifies Strapi JWT cookie, serves login page   │
├─────────────────────────────────────────────────┤
│  aascmed-preview  (Gatsby develop)               │
│  Runs with GATSBY_IS_PREVIEW=true (draft content)│
└─────────────────────────────────────────────────┘
```

## Files

| Path | Description |
|------|-------------|
| `Dockerfile` | Gatsby develop image (preview site) |
| `docker-compose.yml` | Compose file for all three services |
| `example.env` | Template for environment variables |
| `Caddyfile` | Caddy reverse-proxy config with `forward_auth` |
| `forward-auth/` | Forward-auth service (login + JWT verification) |
| `forward-auth/server.js` | Express app: `/verify`, `/login`, `/logout` |
| `forward-auth/Dockerfile` | Docker image for the auth service |
| `.dockerignore` | Files excluded from Docker builds |

## Setup Guide

### 1. Cloudflare — DNS + SSL

1. In Cloudflare, add a DNS **A record** for your preview domain (e.g. `preview.aascmed.com`) pointing to your server IP. **Enable the proxy** (orange cloud).
2. Go to **SSL/TLS → Overview** and set encryption mode to **Full (strict)**.
3. Go to **SSL/TLS → Origin Server → Create Certificate**:
   - Let Cloudflare generate the private key.
   - Hostnames: `preview.aascmed.com` (or `*.aascmed.com`).
   - Validity: 15 years (default).
   - Click **Create** and copy both the **Origin Certificate** and **Private Key**.

### 2. Server — Prepare the host

```bash
# 1. Install Podman (if not already installed)
sudo apt install podman     # Debian/Ubuntu
sudo dnf install podman     # Fedora/RHEL

# 2. Create deployment user
sudo useradd -m -s /bin/bash preview-deploy
sudo loginctl enable-linger preview-deploy

# 3. Set up SSH key for CI
sudo mkdir -p /home/preview-deploy/.ssh
# Add your CI public key to authorized_keys
sudo chown -R preview-deploy:preview-deploy /home/preview-deploy/.ssh
sudo chmod 700 /home/preview-deploy/.ssh
sudo chmod 600 /home/preview-deploy/.ssh/authorized_keys

# 4. Save the Cloudflare Origin Certificate
sudo mkdir -p /home/preview-deploy/certs
# Paste the certificate into cert.pem
sudo tee /home/preview-deploy/certs/cert.pem > /dev/null <<'EOF'
-----BEGIN CERTIFICATE-----
<paste origin certificate here>
-----END CERTIFICATE-----
EOF
# Paste the private key into key.pem
sudo tee /home/preview-deploy/certs/key.pem > /dev/null <<'EOF'
-----BEGIN PRIVATE KEY-----
<paste private key here>
-----END PRIVATE KEY-----
EOF
sudo chown -R preview-deploy:preview-deploy /home/preview-deploy/certs
sudo chmod 600 /home/preview-deploy/certs/key.pem
```

### 3. GitHub — Secrets and Variables

Add these in your repository **Settings → Secrets and variables → Actions**:

#### Secrets

| Name | Description |
|------|-------------|
| `PREVIEW_SERVER_HOST` | Hostname or IP of the preview server |
| `PREVIEW_SERVER_USER` | SSH username (`preview-deploy`) |
| `PREVIEW_SERVER_SSH_KEY` | Private SSH key for authentication |
| `STRAPI_TOKEN` | Strapi API token (needs draft access) |
| `GATSBY_MAPBOX_API_KEY` | Mapbox API key for clinic maps |

#### Variables (non-secret)

| Name | Example | Description |
|------|---------|-------------|
| `GATSBY_STRAPI_API_URL` | `https://cms.example.com` | Strapi API URL |
| `GATSBY_API_BASE_URL` | `https://api.example.com` | Existing public base URL for non-content runtime API endpoints (currently used by the contact form); separate from Strapi |
| `PREVIEW_DOMAIN` | `preview.aascmed.com` | Domain for the preview site |
| `PREVIEW_CERTS_PATH` | `/home/preview-deploy/certs` | Absolute path to cert dir on host |

### 4. Deploy

Push to `main` or trigger the workflow manually from **Actions → Deploy Preview Server → Run workflow**.

The workflow will:
1. Build and push the **preview site** image to GHCR.
2. Build and push the **forward-auth** image to GHCR.
3. Copy `docker-compose.yml` and `Caddyfile` to the server.
4. SSH to the server and:
   - Write a `.env` file with secrets and image tags.
   - Run `docker compose pull && docker compose up -d`.
   - Prune unused images.

### 5. Verify

```bash
# Check all three containers are running
ssh preview-deploy@<host> podman compose ps

# Test HTTPS (should redirect to /login)
curl -I https://preview.aascmed.com

# Check container logs
ssh preview-deploy@<host> podman compose logs preview
ssh preview-deploy@<host> podman compose logs forward-auth
ssh preview-deploy@<host> podman compose logs caddy
```

## Authentication

- Visit `https://preview.aascmed.com` — unauthenticated visitors are redirected to `/login`.
- Sign in with a **Strapi administrator account** (the email and password used by the Strapi admin panel). A regular Content API user account cannot authenticate to this preview.
- The forward-auth service posts the credentials to the Strapi admin endpoint `/admin/login`. It reads the administrator token from `body.data.token` and stores it in the `preview_jwt` cookie (or the value configured by `COOKIE_NAME`).
- The cookie is `HttpOnly`, `Secure`, `SameSite=None`, valid for one week, and scoped to `/`. `SameSite=None` is required when the preview is embedded in the Strapi editor iframe; browsers may still block third-party cookies according to their privacy settings. If the embedded preview cannot stay signed in, open the preview URL directly in a tab and sign in there.
- On subsequent requests, Caddy calls `/verify` on the auth service. The service validates the cookie against the Strapi admin endpoint `/admin/users/me`. A valid administrator session is then proxied to the Gatsby preview; missing or invalid sessions are redirected to `/login`.
- Visit `/logout` to clear the administrator session cookie.

The `STRAPI_TOKEN` used by Gatsby is separate from this administrator session. It is a Content API token used by the preview site to fetch draft content; it is not a browser login credential and is never placed in the session cookie.

## Manual Deployment

```bash
# On the server (as preview-deploy)
cd ~

# First time only: create .env from template
cp example.env .env
nano .env   # fill in STRAPI_TOKEN, GATSBY_MAPBOX_API_KEY, etc.

# If using pre-built GHCR images (set PREVIEW_IMAGE / AUTH_IMAGE in .env):
podman compose pull
podman compose up -d

# Or build from source (leave PREVIEW_IMAGE / AUTH_IMAGE empty in .env):
podman compose up -d --build

# Useful commands when SSH'd in:
podman compose ps                    # check status
podman compose logs -f preview       # tail Gatsby logs
podman compose restart preview       # restart just Gatsby
podman compose down && podman compose up -d  # full restart
```

All services have `restart: unless-stopped`, so they survive reboots and crashes.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Node OOM (heap out of memory) | Increase `--max-old-space-size` in `NODE_OPTIONS` (in `.env` or compose) or add swap on host |
| Caddy can't resolve `preview` or `forward-auth` | Ensure `podman compose ps` shows all 3 services running |
| 502 from Caddy | Gatsby is still starting — wait for build to finish (`podman compose logs preview`) |
| Login fails | Confirm the account is a Strapi administrator, check that `GATSBY_STRAPI_API_URL` reaches `/admin/login` from the server, and inspect `podman compose logs forward-auth` |
| Preview works directly but not in the editor iframe | Open the preview directly to sign in, then check browser third-party-cookie/privacy settings; iframe support depends on the browser and embedding context |
| Certificate errors | Ensure Cloudflare SSL mode is "Full (strict)" and origin cert matches the domain |
