import type { Unit } from "./types";
import { computeDamageBreakdown, type DamageBreakdown } from "./combat";

// One volley: `damage` is the attacking side's full army output for that instant,
// still to be walked front-unit-first across the defending army's per-unit HP (the
// same rule frontHpA/frontHpB apply below) - consumers that need per-unit state
// (e.g. an animated replay) reconstruct it by applying `damage` themselves rather
// than this function tracking per-unit HP, which it has no other reason to do.
export interface VolleyEvent {
  time: number;
  attacker: "A" | "B";
  damage: number;
}

export interface ArmyBattleResult {
  breakdownAtoB: DamageBreakdown;
  breakdownBtoA: DamageBreakdown;
  survivorsA: number;
  survivorsB: number;
  duration: number;
  winner: "A" | "B" | "tie";
  winnerRemainingHp: number;
  winnerRemainingHpPercent: number;
  log: VolleyEvent[];
}

// Stand-and-fight model: every surviving unit on a side attacks together on that
// unit's fixed reload cycle (no ongoing movement, misses, or reinforcements). Each
// volley's total damage is applied to the enemy army like a focus-fired HP pool - it
// kills off the front unit, then carries any leftover damage into the next one - so a
// side's damage output shrinks as it loses units, same as it would in a real fight.
// Per-unit stats (attack/armor/HP/reload) are untouched; only the army-level math is
// new here.
//
// `startTimeA`/`startTimeB` (both default 0, i.e. "already in range") let a caller
// give one side a head start - e.g. a longer-ranged unit that's within its own range
// before the other side has closed the gap gets to land free volleys in the interval
// between the two start times, same as it would in-game.
export function simulateArmyBattle(
  unitA: Unit,
  countA: number,
  unitB: Unit,
  countB: number,
  startTimeA = 0,
  startTimeB = 0,
): ArmyBattleResult {
  const breakdownAtoB = computeDamageBreakdown(unitA, unitB);
  const breakdownBtoA = computeDamageBreakdown(unitB, unitA);

  let aliveA = countA;
  let aliveB = countB;
  let frontHpA = unitA.hit_points;
  let frontHpB = unitB.hit_points;

  let nextAttackA = startTimeA;
  let nextAttackB = startTimeB;
  let time = 0;

  const log: VolleyEvent[] = [];
  const MAX_VOLLEYS = 200_000;
  let volleys = 0;

  while (aliveA > 0 && aliveB > 0 && volleys < MAX_VOLLEYS) {
    volleys++;
    if (nextAttackA === nextAttackB) {
      // Both sides' next volley lands at the exact same instant - resolve them
      // simultaneously off the pre-volley state (rather than one after the other,
      // which would let whichever side went "first" wipe out the other's last
      // unit before the other's own already-due attack ever landed). Without
      // this, a mirror matchup with identical units and reload times always ties
      // its attack timestamps every round and A would deterministically win every
      // such fight, when a mutual kill should be a tie.
      time = nextAttackA;
      const damageAtoB = aliveA * breakdownAtoB.total;
      const damageBtoA = aliveB * breakdownBtoA.total;
      log.push({ time, attacker: "A", damage: damageAtoB });
      log.push({ time, attacker: "B", damage: damageBtoA });

      let remainingToB = damageAtoB;
      while (remainingToB > 0 && aliveB > 0) {
        if (remainingToB >= frontHpB) {
          remainingToB -= frontHpB;
          aliveB--;
          frontHpB = unitB.hit_points;
        } else {
          frontHpB -= remainingToB;
          remainingToB = 0;
        }
      }
      let remainingToA = damageBtoA;
      while (remainingToA > 0 && aliveA > 0) {
        if (remainingToA >= frontHpA) {
          remainingToA -= frontHpA;
          aliveA--;
          frontHpA = unitA.hit_points;
        } else {
          frontHpA -= remainingToA;
          remainingToA = 0;
        }
      }

      nextAttackA += unitA.reload_time;
      nextAttackB += unitB.reload_time;
    } else if (nextAttackA < nextAttackB) {
      time = nextAttackA;
      let damage = aliveA * breakdownAtoB.total;
      log.push({ time, attacker: "A", damage });
      while (damage > 0 && aliveB > 0) {
        if (damage >= frontHpB) {
          damage -= frontHpB;
          aliveB--;
          frontHpB = unitB.hit_points;
        } else {
          frontHpB -= damage;
          damage = 0;
        }
      }
      nextAttackA += unitA.reload_time;
    } else {
      time = nextAttackB;
      let damage = aliveB * breakdownBtoA.total;
      log.push({ time, attacker: "B", damage });
      while (damage > 0 && aliveA > 0) {
        if (damage >= frontHpA) {
          damage -= frontHpA;
          aliveA--;
          frontHpA = unitA.hit_points;
        } else {
          frontHpA -= damage;
          damage = 0;
        }
      }
      nextAttackB += unitB.reload_time;
    }
  }

  let winner: "A" | "B" | "tie";
  if (aliveA > 0 && aliveB <= 0) winner = "A";
  else if (aliveB > 0 && aliveA <= 0) winner = "B";
  else winner = "tie";

  const winnerAlive = winner === "A" ? aliveA : winner === "B" ? aliveB : 0;
  const winnerFrontHp = winner === "A" ? frontHpA : winner === "B" ? frontHpB : 0;
  const winnerUnit = winner === "A" ? unitA : unitB;
  const winnerCount = winner === "A" ? countA : countB;

  const winnerRemainingHp =
    winner === "tie" ? 0 : (winnerAlive - 1) * winnerUnit.hit_points + winnerFrontHp;
  const winnerMaxHp = winnerCount * winnerUnit.hit_points;
  const winnerRemainingHpPercent = winnerMaxHp > 0 ? (winnerRemainingHp / winnerMaxHp) * 100 : 0;

  return {
    breakdownAtoB,
    breakdownBtoA,
    survivorsA: aliveA,
    survivorsB: aliveB,
    duration: time,
    winner,
    winnerRemainingHp,
    winnerRemainingHpPercent,
    log,
  };
}
