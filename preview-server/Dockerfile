# Preview Server Dockerfile
# Runs gatsby develop with hot reload for draft content preview

FROM node:20-alpine

# Install build dependencies for native modules (@napi-rs/canvas, sharp)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Gatsby develop runs on port 8000 by default
# Port 8000: Main dev server
# Port 8000 websocket for hot reload
EXPOSE 8000

# Set environment variables for development
ENV NODE_ENV=development
ENV GATSBY_TELEMETRY_DISABLED=1

# Run gatsby develop with host flag to allow external connections
# The -H flag binds to all interfaces (needed for Docker)
CMD ["yarn", "develop", "-H", "0.0.0.0"]
