# ---- Builder ----
FROM elixir:1.18-otp-27-slim AS builder

# Install build deps + Gleam
ARG GLEAM_VERSION=1.14.0
RUN apt-get update && apt-get install -y curl git && \
    curl -fsSL "https://github.com/gleam-lang/gleam/releases/download/v${GLEAM_VERSION}/gleam-v${GLEAM_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
    | tar -xz -C /usr/local/bin && \
    gleam --version

ENV MIX_ENV=prod

WORKDIR /app

# Install hex + rebar
RUN mix local.hex --force && mix local.rebar --force

# Copy game_engine (Gleam) first
COPY apps/game_engine/gleam.toml apps/game_engine/manifest.toml apps/game_engine/mix.exs apps/game_engine/
COPY apps/game_engine/src apps/game_engine/src

# Build Gleam dependencies
RUN cd apps/game_engine && gleam deps download

# Copy orchestrator config + mix
COPY apps/game_orchestrator/mix.exs apps/game_orchestrator/
COPY apps/game_orchestrator/config apps/game_orchestrator/config

WORKDIR /app/apps/game_orchestrator

# Fetch deps
RUN mix deps.get --only prod

# Compile deps (includes gleam build via custom compiler)
RUN mix deps.compile

# Copy orchestrator source
COPY apps/game_orchestrator/lib lib
COPY apps/game_orchestrator/priv priv

# Compile + build release
RUN mix compile && mix release

# ---- Runner ----
FROM debian:bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 openssl libncurses6 locales ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Set locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

WORKDIR /app

# Copy release from builder
COPY --from=builder /app/apps/game_orchestrator/_build/prod/rel/game_orchestrator ./

ENV PHX_SERVER=true
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:4000/health || exit 1

CMD ["bin/game_orchestrator", "start"]
