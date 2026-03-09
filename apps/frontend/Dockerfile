# ---- Builder ----
FROM denoland/deno:2.7.4 AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY package.json deno.lock ./

# Install dependencies
RUN deno install

# Copy source
COPY . .

# Build
RUN deno task build

# ---- Runner ----
FROM denoland/deno:2.7.4 AS runner

WORKDIR /app

# Copy built output and package files
COPY --from=builder /app/build build
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules node_modules

ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["deno", "run", "--allow-all", "build/index.js"]
