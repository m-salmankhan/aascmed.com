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
| `GATSBY_API_BASE_URL` | `https://api.example.com` | Base URL for API endpoints |
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
ssh preview-deploy@<host> docker compose ps

# Test HTTPS (should redirect to /login)
curl -I https://preview.aascmed.com

# Check container logs
ssh preview-deploy@<host> docker compose logs preview
ssh preview-deploy@<host> docker compose logs forward-auth
ssh preview-deploy@<host> docker compose logs caddy
```

## Authentication

- Visit `https://preview.aascmed.com` — unauthenticated visitors are redirected to `/login`.
- Sign in with any **Strapi user** (email + password).
- The auth service calls Strapi's `/api/auth/local`, receives a JWT, and sets it as an `HttpOnly` cookie.
- On subsequent requests, Caddy calls `/verify` on the auth service. If the JWT is valid (verified against Strapi's `/api/users/me`), the request is proxied to the Gatsby preview. Otherwise, the user is redirected to login.
- Visit `/logout` to clear the cookie.

## Manual Deployment

```bash
# On the server (as preview-deploy)
cd ~

# First time only: create .env from template
cp example.env .env
nano .env   # fill in STRAPI_TOKEN, GATSBY_MAPBOX_API_KEY, etc.

# If using pre-built GHCR images (set PREVIEW_IMAGE / AUTH_IMAGE in .env):
docker compose pull
docker compose up -d

# Or build from source (leave PREVIEW_IMAGE / AUTH_IMAGE empty in .env):
docker compose up -d --build

# Useful commands when SSH'd in:
docker compose ps                    # check status
docker compose logs -f preview       # tail Gatsby logs
docker compose restart preview       # restart just Gatsby
docker compose down && docker compose up -d  # full restart
```

All services have `restart: unless-stopped`, so they survive reboots and crashes.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Node OOM (heap out of memory) | Increase `--max-old-space-size` in `NODE_OPTIONS` (in `.env` or compose) or add swap on host |
| Caddy can't resolve `preview` or `forward-auth` | Ensure `docker compose ps` shows all 3 services running |
| 502 from Caddy | Gatsby is still starting — wait for build to finish (`docker compose logs preview`) |
| Login fails | Check `STRAPI_URL` is reachable from the server (`docker compose logs forward-auth`) |
| Certificate errors | Ensure Cloudflare SSL mode is "Full (strict)" and origin cert matches the domain |
