import type { Unit } from "./types";
import { simulateArmyBattle, type ArmyBattleResult } from "./battle";
import { computeDamageBreakdown } from "./combat";

export interface ApproachBattleResult extends ArmyBattleResult {
  timeToRangeA: number;
  timeToRangeB: number;
  firstContactTime: number;
  fightDuration: number;
  reachable: boolean;
}

// Both sides close the gap together (combined speed) until whichever has the longer
// range is within it - a unit only needs to close to its own max_range, not the full
// distance, and it stops advancing there rather than continuing to melee range
// ("ranged units stop moving and fire once in range" - they don't need to walk into
// their target's face). After that, only the shorter-ranged side keeps closing, alone
// at its own speed, until it too is in range. That gives the longer-ranged side free
// volleys in the gap between the two arrival times, same as it would in-game, without
// simulating ongoing repositioning/kiting for the rest of the fight - once both sides
// are in range, neither moves again.
export function computeEngagementTimes(
  unitA: Unit,
  unitB: Unit,
  distance: number,
): { timeToRangeA: number; timeToRangeB: number } {
  const speedA = unitA.speed ?? 0;
  const speedB = unitB.speed ?? 0;
  const rangeA = unitA.max_range;
  const rangeB = unitB.max_range;
  const combinedSpeed = speedA + speedB;

  const rangeMax = Math.max(rangeA, rangeB);
  const rangeMin = Math.min(rangeA, rangeB);

  const phase1Gap = Math.max(distance - rangeMax, 0);
  const t1 = combinedSpeed > 0 ? phase1Gap / combinedSpeed : phase1Gap > 0 ? Infinity : 0;

  if (rangeA === rangeB) {
    return { timeToRangeA: t1, timeToRangeB: t1 };
  }

  // Whichever side doesn't have rangeMax is still short of its own range after phase 1
  // (unless the gap was already inside rangeMin, in which case phase2Gap is 0) and has
  // to keep closing alone.
  const gapAfterPhase1 = Math.min(distance, rangeMax);
  const phase2Gap = Math.max(gapAfterPhase1 - rangeMin, 0);

  if (rangeA > rangeB) {
    const t2 = speedB > 0 ? phase2Gap / speedB : phase2Gap > 0 ? Infinity : 0;
    return { timeToRangeA: t1, timeToRangeB: t1 + t2 };
  }
  const t2 = speedA > 0 ? phase2Gap / speedA : phase2Gap > 0 ? Infinity : 0;
  return { timeToRangeA: t1 + t2, timeToRangeB: t1 };
}

export function simulateApproachBattle(
  unitA: Unit,
  countA: number,
  unitB: Unit,
  countB: number,
  distance: number,
): ApproachBattleResult {
  const { timeToRangeA, timeToRangeB } = computeEngagementTimes(unitA, unitB, distance);
  const firstContactTime = Math.min(timeToRangeA, timeToRangeB);
  const reachable = Number.isFinite(timeToRangeA) && Number.isFinite(timeToRangeB);

  if (!reachable) {
    return {
      breakdownAtoB: computeDamageBreakdown(unitA, unitB),
      breakdownBtoA: computeDamageBreakdown(unitB, unitA),
      survivorsA: countA,
      survivorsB: countB,
      duration: Infinity,
      winner: "tie",
      winnerRemainingHp: 0,
      winnerRemainingHpPercent: 0,
      log: [],
      timeToRangeA,
      timeToRangeB,
      firstContactTime,
      fightDuration: Infinity,
      reachable,
    };
  }

  const result = simulateArmyBattle(unitA, countA, unitB, countB, timeToRangeA, timeToRangeB);
  return {
    ...result,
    timeToRangeA,
    timeToRangeB,
    firstContactTime,
    fightDuration: result.duration - firstContactTime,
    reachable,
  };
}
