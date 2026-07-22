// AoE2DE's standard multiplayer game speed runs the simulation clock at 1.7x the
// "Normal" (1.0x) rate that raw unit stats (speed, reload_time) are defined
// against, so 1 second of simulated game-time actually plays out in 1/1.7 real
// seconds for someone watching a real multiplayer game. Anything that turns a
// computed "seconds" value into something a viewer watches or reads (animation
// duration, report text) should convert through this constant. The underlying
// tiles = speed * time and reload-cadence math should stay in raw game-seconds,
// since that's what pairs correctly with the raw speed/reload_time stats - only
// the outward-facing duration gets scaled.
export const GAME_SPEED_MULTIPLIER = 1.7;

export function toRealSeconds(gameSeconds: number): number {
  return gameSeconds / GAME_SPEED_MULTIPLIER;
}
