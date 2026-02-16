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
3. **Copy the Caddyfile** from the repo to the server (auto-updated on every deploy).
4. SSH to the server and:
   - Pull both images.
   - Stop/remove old containers.
   - Create a `preview-net` Podman network (if it doesn't exist).
   - Start three containers: `aascmed-preview`, `preview-forward-auth`, `preview-caddy`.
   - Prune unused images.

### 5. Verify

```bash
# Check all three containers are running
ssh preview-deploy@<host> podman ps

# Test HTTPS (should redirect to /login)
curl -I https://preview.aascmed.com

# Check container logs
ssh preview-deploy@<host> podman logs aascmed-preview
ssh preview-deploy@<host> podman logs preview-forward-auth
ssh preview-deploy@<host> podman logs preview-caddy
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
podman stop preview-caddy preview-forward-auth aascmed-preview || true
podman rm   preview-caddy preview-forward-auth aascmed-preview || true

podman network exists preview-net || podman network create preview-net

podman run -d --name aascmed-preview --network preview-net \
  --restart unless-stopped \
  -e NODE_OPTIONS="--max-old-space-size=700" \
  -e GATSBY_STRAPI_API_URL=<strapi-url> \
  -e STRAPI_TOKEN=<token> \
  -e GATSBY_MAPBOX_API_KEY=<key> \
  -e GATSBY_API_BASE_URL=<api-url> \
  -e GATSBY_IS_PREVIEW=true \
  -e ENABLE_GATSBY_REFRESH_ENDPOINT=true \
  ghcr.io/m-salmankhan/aascmed.com-preview:main

podman run -d --name preview-forward-auth --network preview-net \
  --restart unless-stopped \
  -e STRAPI_URL=<strapi-url> \
  ghcr.io/m-salmankhan/aascmed.com-preview-auth:main

podman run -d --name preview-caddy --network preview-net \
  --restart unless-stopped \
  -p 443:443 -p 80:80 \
  -v ~/Caddyfile:/etc/caddy/Caddyfile:ro,Z \
  -v /home/preview-deploy/certs:/etc/caddy/certs:ro,Z \
  -e PREVIEW_DOMAIN=preview.aascmed.com \
  docker.io/library/caddy:2-alpine

podman image prune -f
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Node OOM (heap out of memory) | Increase `--max-old-space-size` in `NODE_OPTIONS` or add swap on host |
| Caddy can't resolve `preview` or `forward-auth` | Ensure all containers are on the `preview-net` network |
| 502 from Caddy | Gatsby is still starting — wait for build to finish (`podman logs aascmed-preview`) |
| Login fails | Check `STRAPI_URL` is reachable from the server (`podman logs preview-forward-auth`) |
| Certificate errors | Ensure Cloudflare SSL mode is "Full (strict)" and origin cert matches the domain |
| Podman permission denied | SSH directly as `preview-deploy` (don't `su` from another user) |
