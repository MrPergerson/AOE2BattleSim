import type { Unit } from "./types";
import { computeDamageBreakdown, type DamageBreakdown } from "./combat";

export interface ArmyBattleResult {
  breakdownAtoB: DamageBreakdown;
  breakdownBtoA: DamageBreakdown;
  survivorsA: number;
  survivorsB: number;
  duration: number;
  winner: "A" | "B" | "tie";
  winnerRemainingHp: number;
  winnerRemainingHpPercent: number;
}

// Stand-and-fight model: both armies are already in range, and every surviving unit
// on a side attacks together on that unit's fixed reload cycle (no movement, misses,
// or reinforcements). Each volley's total damage is applied to the enemy army like a
// focus-fired HP pool - it kills off the front unit, then carries any leftover damage
// into the next one - so a side's damage output shrinks as it loses units, same as it
// would in a real fight. Per-unit stats (attack/armor/HP/reload) are untouched; only
// the army-level math is new here.
export function simulateArmyBattle(
  unitA: Unit,
  countA: number,
  unitB: Unit,
  countB: number,
): ArmyBattleResult {
  const breakdownAtoB = computeDamageBreakdown(unitA, unitB);
  const breakdownBtoA = computeDamageBreakdown(unitB, unitA);

  let aliveA = countA;
  let aliveB = countB;
  let frontHpA = unitA.hit_points;
  let frontHpB = unitB.hit_points;

  let nextAttackA = unitA.reload_time;
  let nextAttackB = unitB.reload_time;
  let time = 0;

  const MAX_VOLLEYS = 200_000;
  let volleys = 0;

  while (aliveA > 0 && aliveB > 0 && volleys < MAX_VOLLEYS) {
    volleys++;
    if (nextAttackA <= nextAttackB) {
      time = nextAttackA;
      let damage = aliveA * breakdownAtoB.total;
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
  };
}
