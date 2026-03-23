// http/health_handler.gleam — Handler REST: Health Check
//
// Chamado por: HealthController.index → :http@health_handler.handle_health()

import phoenix_bridge/types.{type HttpResponse, HttpOk}

/// Response body tipado para health check
pub type HealthBody {
  HealthBody(
    status: String,
    active_rooms: Int,
    connected_players: Int,
    uptime_seconds: Int,
  )
}

/// GET /health
pub fn handle_health() -> HttpResponse(HealthBody) {
  // TODO: buscar métricas reais via phoenix_bridge (registry count, etc.)
  HttpOk(200, HealthBody(
    status: "ok",
    active_rooms: 0,
    connected_players: 0,
    uptime_seconds: 0,
  ))
}
