pub const domain = @import("domain/partida.zig");

// Bring the domain test suite into the root module so `zig build test`
// runs both unit and domain specification tests.
const _ = @import("tests/partida_tests.zig");
