// Several unit fields (speed, reload_time, range) come from 32-bit floats in the
// original game data and don't survive the round-trip cleanly (e.g. 1.7999999523162842
// instead of 1.8) - round to at most 1 decimal place before ever displaying a number.
// The tiny epsilon corrects values whose true design value sits exactly on a rounding
// boundary (e.g. 0.65 stored as 0.6499999761581421) so they round the same way the
// intended value would, instead of falling short because of the float32 undershoot.
export function round1(n: number): number {
  return Math.round((n + 1e-6) * 10) / 10;
}
