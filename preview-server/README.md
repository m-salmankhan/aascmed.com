# Preview Server

This folder contains the Docker configuration for running a preview server that displays draft content from Strapi.

## Files

- `Dockerfile` - Docker image that runs `gatsby develop`
- `.dockerignore` - Files excluded from Docker build
- `deploy.yml` - GitHub Actions workflow (symlinked to `.github/workflows/`)

## How It Works

The preview server runs `gatsby develop` in a Docker container, allowing content editors to preview draft content before publishing. When `GATSBY_IS_PREVIEW=true`, Strapi returns both published and draft content.

## Deployment

The GitHub Actions workflow automatically builds and deploys the preview server when changes are pushed to the `main` branch.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `PREVIEW_SERVER_HOST` | Hostname or IP of the preview server |
| `PREVIEW_SERVER_USER` | SSH username (needs docker group access, not root) |
| `PREVIEW_SERVER_SSH_KEY` | Private SSH key for authentication |
| `GATSBY_STRAPI_API_URL` | Strapi API URL |
| `STRAPI_TOKEN` | Strapi API token (with draft access) |
| `GATSBY_MAPBOX_API_KEY` | Mapbox API key for clinic maps |
| `GATSBY_API_BASE_URL` | Base URL for API endpoints |

### Server Setup

The server needs Podman installed. The deployment user doesn't need root permissions since Podman runs rootless by default.

```bash
# Install Podman (Fedora/RHEL)
sudo dnf install podman

# Install Podman (Ubuntu/Debian)
sudo apt install podman

# Create dedicated deployment user
sudo useradd -m -s /bin/bash preview-deploy

# Set up SSH key
sudo mkdir -p /home/preview-deploy/.ssh
# Add public key to /home/preview-deploy/.ssh/authorized_keys
sudo chown -R preview-deploy:preview-deploy /home/preview-deploy/.ssh
sudo chmod 700 /home/preview-deploy/.ssh
sudo chmod 600 /home/preview-deploy/.ssh/authorized_keys

# Enable lingering so containers persist after logout
sudo loginctl enable-linger preview-deploy
```

## Manual Deployment

You can manually trigger a deployment from the GitHub Actions tab:

1. Go to Actions → Deploy Preview Server
2. Click "Run workflow"
3. Select the branch to deploy
