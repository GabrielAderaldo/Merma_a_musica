import Config

# Force SSL only if FORCE_SSL env is set (skip for local Docker testing).
# In production with a real domain, set FORCE_SSL=true.
# Note: force_ssl is a compile-time config, so we use a build arg approach.
# For simplicity, we disable it by default and let Nginx handle SSL termination.

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
