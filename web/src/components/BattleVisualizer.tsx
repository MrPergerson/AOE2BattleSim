import { useCallback, useEffect, useState, useRef, type ReactNode } from "react";
import type { Unit } from "../types";
import { simulateApproachBattle, type ApproachBattleResult } from "../approach";
import { toRealSeconds } from "../gameSpeed";

interface BattleVisualizerProps {
  unitA: Unit | null;
  countA: number;
  unitB: Unit | null;
  countB: number;
  distance: number;
  controls?: ReactNode;
}

// AoE2 tiles are 53x53px and unit "speed" is defined in tiles/second, so a
// speed-1 unit covers 53px of simulated ground per game-second. The replay
// isn't fast-forwarded into a fixed-length clip - every wall-clock duration
// below (arrival times, volley timing, total length) is the real number of
// seconds a viewer watching an actual AoE2DE multiplayer game (which runs at
// gameSpeed.GAME_SPEED_MULTIPLIER, not 1.0x) would experience, via
// toRealSeconds(). Positions, though, are computed from the *raw* game-second
// values (sim.timeToRangeA/B) rather than the real-seconds ones - tiles =
// speed * time only holds when time is paired with the same game-second basis
// the speed stat is defined against; converting it to real seconds first
// would make a unit visibly overshoot or undershoot its actual stopping tile.
const MS_PER_SIMULATED_SECOND = 1000;
const MIN_TILES = 6;
const MAX_TILES = 20;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

// Mirrors the backend's "front unit absorbs, carries remainder into the next" rule
// (battle.ts) at per-unit granularity, so the replay's final HP state always agrees
// with the survivor counts the real simulation produced.
function applyDamage(hp: number[], damage: number): number[] {
  const next = [...hp];
  let remaining = damage;
  for (let i = 0; i < next.length && remaining > 0; i++) {
    if (next[i] <= 0) continue;
    if (next[i] > remaining) {
      next[i] -= remaining;
      remaining = 0;
    } else {
      remaining -= next[i];
      next[i] = 0;
    }
  }
  return next;
}

function healthColor(pct: number): string {
  if (pct > 0.6) return "#0ca30c";
  if (pct > 0.25) return "#fab219";
  return "#d03b3b";
}

const WORLD_MARGIN_PERCENT = 6;

// Units live on a real coordinate line, matching the actual simulated ground,
// rather than being confined to their own half of the screen - so a fast unit
// can visibly cover most of the field while a slow one barely moves, and the
// two can meet anywhere, not just in the middle. The margin-to-(100-margin)
// span always represents `tileCount` tiles (the same count the background
// grid draws), not just the raw start distance - otherwise a short gap (e.g.
// two melee units, whose "long range" start is only 1 tile) would get
// stretched across the full width and look like a full-field sprint instead
// of the short hop it actually is. When the real gap is shorter than the
// displayed tile count, it's centered within that wider field rather than
// pinned to the left edge.
function worldToPercent(tileFromLeft: number, distanceTiles: number, tileCount: number): number {
  if (tileCount <= 0) return 50;
  const paddingTiles = (tileCount - distanceTiles) / 2;
  const t = clamp((paddingTiles + tileFromLeft) / tileCount, 0, 1);
  return WORLD_MARGIN_PERCENT + t * (100 - 2 * WORLD_MARGIN_PERCENT);
}

// Must match .army-cluster's `gap` in App.css - a melee matchup (0 range) computes
// to the two sides sharing the exact same world point, which would otherwise stack
// their unit tokens directly on top of each other. Instead they're held apart by
// the same spacing already used to keep tokens within one side's own army from
// overlapping. Since each cluster box has real width (padding plus however many
// tokens it's wrapping), the minimum center-to-center gap has to clear *both*
// boxes' half-widths, not just add a few px between their anchor points -
// otherwise two wide armies would still visibly overlap even with "space" between
// their centers. Everything is measured in real battlefield pixels so it holds up
// regardless of screen width, then split evenly to either side of wherever they
// actually met.
const TOKEN_GAP_PX = 4;
const FALLBACK_MIN_GAP_PERCENT = 4;

function applyMinContactGap(
  targetA: number,
  targetB: number,
  minGapPercent: number,
): [number, number] {
  const gap = targetB - targetA;
  if (Math.abs(gap) >= minGapPercent) return [targetA, targetB];
  const mid = (targetA + targetB) / 2;
  return [mid - minGapPercent / 2, mid + minGapPercent / 2];
}

interface SidePosition {
  percent: number;
  transitionMs: number;
}

export function BattleVisualizer({ unitA, countA, unitB, countB, distance, controls }: BattleVisualizerProps) {
  const tileCount = clamp(Math.round(distance), MIN_TILES, MAX_TILES);
  const [result, setResult] = useState<ApproachBattleResult | null>(null);
  const [posA, setPosA] = useState<SidePosition | null>(null);
  const [posB, setPosB] = useState<SidePosition | null>(null);
  const [done, setDone] = useState(false);
  const [hpA, setHpA] = useState<number[]>([]);
  const [hpB, setHpB] = useState<number[]>([]);
  const [attackFlash, setAttackFlash] = useState<"A" | "B" | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const rafsRef = useRef<number[]>([]);
  const battlefieldRef = useRef<HTMLDivElement | null>(null);
  const clusterARef = useRef<HTMLDivElement | null>(null);
  const clusterBRef = useRef<HTMLDivElement | null>(null);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
    rafsRef.current.forEach((id) => window.cancelAnimationFrame(id));
    rafsRef.current = [];
  }, []);

  useEffect(() => {
    clearTimeouts();
    setResult(null);
    setPosA({ percent: worldToPercent(0, distance, tileCount), transitionMs: 0 });
    setPosB({ percent: worldToPercent(distance, distance, tileCount), transitionMs: 0 });
    setDone(false);
    setHpA([]);
    setHpB([]);
    setAttackFlash(null);
  }, [unitA, unitB, countA, countB, distance, tileCount, clearTimeouts]);

  useEffect(() => clearTimeouts, [clearTimeouts]);

  if (!unitA || !unitB) {
    return <p>Pick a unit on both sides to see the battle.</p>;
  }

  const handleSimulate = () => {
    clearTimeouts();
    const sim = simulateApproachBattle(unitA, countA, unitB, countB, distance);
    setResult(sim);
    setHpA(Array(countA).fill(unitA.hit_points));
    setHpB(Array(countB).fill(unitB.hit_points));
    setAttackFlash(null);
    setDone(false);

    if (!sim.reachable) {
      setPosA(null);
      setPosB(null);
      setDone(true);
      return;
    }

    const scale = MS_PER_SIMULATED_SECOND;
    const totalMs = toRealSeconds(sim.duration) * scale;

    // Each side moves at its own constant speed from t=0 until *its own* arrival
    // time (timeToRangeA/B) and then stops for good - that's true whether it's the
    // side that gets there first (it only ever moves during the "both closing"
    // phase) or the side that has to keep going alone afterward (same speed the
    // whole way, just unaccompanied for the back half) - so its world position is
    // exactly linear over that window, and a single CSS transition can represent
    // it exactly rather than approximating a multi-phase move. Distance traveled
    // uses the raw (game-second) arrival time, not the real-seconds one - see the
    // note above.
    const speedA = unitA.speed ?? 0;
    const speedB = unitB.speed ?? 0;
    const tilesTraveledA = clamp(speedA * sim.timeToRangeA, 0, distance);
    const tilesTraveledB = clamp(speedB * sim.timeToRangeB, 0, distance);
    const rawTargetA = worldToPercent(tilesTraveledA, distance, tileCount);
    const rawTargetB = worldToPercent(distance - tilesTraveledB, distance, tileCount);
    const arrivalMsA = Math.max(toRealSeconds(sim.timeToRangeA) * scale, 16);
    const arrivalMsB = Math.max(toRealSeconds(sim.timeToRangeB) * scale, 16);

    // Snap both sides back to their starting positions with no transition first,
    // then (a couple of frames later, so the browser actually paints that reset)
    // kick off the real glide toward each side's resting position - each side's
    // own arrival time drives its transition duration, so a unit that takes
    // longer to reach its range visibly keeps marching the whole time instead of
    // sitting still and then snapping into place right before it starts fighting.
    setPosA({ percent: worldToPercent(0, distance, tileCount), transitionMs: 0 });
    setPosB({ percent: worldToPercent(distance, distance, tileCount), transitionMs: 0 });

    const raf1 = window.requestAnimationFrame(() => {
      // The DOM now reflects this side's actual unit count (hpA/hpB were set
      // above), so the clusters' rendered widths are accurate to measure here.
      const battlefieldWidthPx = battlefieldRef.current?.getBoundingClientRect().width ?? 0;
      const widthAPx = clusterARef.current?.getBoundingClientRect().width ?? 0;
      const widthBPx = clusterBRef.current?.getBoundingClientRect().width ?? 0;
      const requiredGapPx = widthAPx / 2 + widthBPx / 2 + TOKEN_GAP_PX;
      const minGapPercent =
        battlefieldWidthPx > 0 ? (requiredGapPx / battlefieldWidthPx) * 100 : FALLBACK_MIN_GAP_PERCENT;
      const [targetA, targetB] = applyMinContactGap(rawTargetA, rawTargetB, minGapPercent);

      const raf2 = window.requestAnimationFrame(() => {
        setPosA({ percent: targetA, transitionMs: arrivalMsA });
        setPosB({ percent: targetB, transitionMs: arrivalMsB });
      });
      rafsRef.current.push(raf2);
    });
    rafsRef.current.push(raf1);

    for (const event of sim.log) {
      const eventDelay = toRealSeconds(event.time) * scale;
      timeoutsRef.current.push(
        window.setTimeout(() => {
          setAttackFlash(event.attacker);
          if (event.attacker === "A") setHpB((prev) => applyDamage(prev, event.damage));
          else setHpA((prev) => applyDamage(prev, event.damage));
          timeoutsRef.current.push(window.setTimeout(() => setAttackFlash(null), 150));
        }, eventDelay),
      );
    }

    timeoutsRef.current.push(window.setTimeout(() => setDone(true), totalMs + 100));
  };

  const unreachable = result !== null && !result.reachable;
  const totalMaxA = countA * unitA.hit_points;
  const totalMaxB = countB * unitB.hit_points;
  const totalCurrentA = sum(hpA);
  const totalCurrentB = sum(hpB);
  const winnerName = result?.winner === "A" ? unitA.name : result?.winner === "B" ? unitB.name : null;

  return (
    <div className="battle-visualizer">
      <div className="battle-visualizer-controls">
        <button type="button" onClick={handleSimulate}>
          Simulate Battle
        </button>
        {controls}
      </div>

      {unreachable ? (
        <p className="battle-visualizer-empty">
          These two units have no speed between them and can never close a {distance}-tile gap.
        </p>
      ) : (
        <>
          <div className="battlefield" ref={battlefieldRef}>
            <div className="battlefield-tiles">
              {Array.from({ length: tileCount }).map((_, i) => (
                <div key={i} className="battlefield-tile" />
              ))}
            </div>
            <div
              ref={clusterARef}
              className={`army-cluster side-a ${attackFlash === "A" ? "attacking" : ""}`}
              style={
                posA
                  ? {
                      left: `${posA.percent}%`,
                      transition: `left ${posA.transitionMs}ms linear, background 0.15s ease`,
                    }
                  : undefined
              }
            >
              {hpA.map((hp, i) => (
                <div key={i} className={`unit-token side-a ${hp <= 0 ? "dead" : ""}`}>
                  <div
                    className="unit-token-hp"
                    style={{
                      width: `${Math.max(0, (hp / unitA.hit_points) * 100)}%`,
                      background: healthColor(hp / unitA.hit_points),
                    }}
                  />
                </div>
              ))}
            </div>
            <div
              ref={clusterBRef}
              className={`army-cluster side-b ${attackFlash === "B" ? "attacking" : ""}`}
              style={
                posB
                  ? {
                      left: `${posB.percent}%`,
                      transition: `left ${posB.transitionMs}ms linear, background 0.15s ease`,
                    }
                  : undefined
              }
            >
              {hpB.map((hp, i) => (
                <div key={i} className={`unit-token side-b ${hp <= 0 ? "dead" : ""}`}>
                  <div
                    className="unit-token-hp"
                    style={{
                      width: `${Math.max(0, (hp / unitB.hit_points) * 100)}%`,
                      background: healthColor(hp / unitB.hit_points),
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="army-totals">
            <div className="army-total">
              <span className="army-total-label">
                {unitA.name} (×{countA})
              </span>
              <div className="army-total-bar">
                <div
                  className="army-total-bar-fill"
                  style={{
                    width: `${totalMaxA > 0 ? (totalCurrentA / totalMaxA) * 100 : 0}%`,
                    background: healthColor(totalMaxA > 0 ? totalCurrentA / totalMaxA : 0),
                  }}
                />
              </div>
              <span className="army-total-value">
                {totalCurrentA}/{totalMaxA} HP
              </span>
            </div>
            <div className="army-total">
              <span className="army-total-label">
                {unitB.name} (×{countB})
              </span>
              <div className="army-total-bar">
                <div
                  className="army-total-bar-fill"
                  style={{
                    width: `${totalMaxB > 0 ? (totalCurrentB / totalMaxB) * 100 : 0}%`,
                    background: healthColor(totalMaxB > 0 ? totalCurrentB / totalMaxB : 0),
                  }}
                />
              </div>
              <span className="army-total-value">
                {totalCurrentB}/{totalMaxB} HP
              </span>
            </div>
          </div>

          {done && result && (
            <p className="battle-winner-banner">
              {result.winner === "tie" ? "Tie — both sides wiped out" : `${winnerName} wins!`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
