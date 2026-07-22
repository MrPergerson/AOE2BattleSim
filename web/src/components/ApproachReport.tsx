import type { Unit } from "../types";
import { simulateApproachBattle } from "../approach";
import { round1 } from "../format";
import { toRealSeconds } from "../gameSpeed";

interface ApproachReportProps {
  unitA: Unit | null;
  countA: number;
  unitB: Unit | null;
  countB: number;
  distance: number;
}

export function ApproachReport({ unitA, countA, unitB, countB, distance }: ApproachReportProps) {
  if (!unitA || !unitB) {
    return <p>Pick a unit on both sides to compare.</p>;
  }

  const result = simulateApproachBattle(unitA, countA, unitB, countB, distance);

  if (!result.reachable) {
    return (
      <div className="battle-result">
        <h2>
          These two units have no speed between them and can never close a {distance}-tile
          gap.
        </h2>
      </div>
    );
  }

  const winnerName = result.winner === "A" ? unitA.name : unitB.name;
  const winnerStartCount = result.winner === "A" ? countA : countB;
  const winnerSurvivors = result.winner === "A" ? result.survivorsA : result.survivorsB;

  const soonerIsA = result.timeToRangeA <= result.timeToRangeB;
  const soonerName = soonerIsA ? unitA.name : unitB.name;
  const laterName = soonerIsA ? unitB.name : unitA.name;
  const laterTime = Math.max(result.timeToRangeA, result.timeToRangeB);

  let approachLead: string;
  if (result.firstContactTime === 0 && laterTime === 0) {
    approachLead = "Armies start within engagement range — combat begins immediately.";
  } else if (result.timeToRangeA === result.timeToRangeB) {
    approachLead = `Armies close the ${distance}-tile gap together and engage after ${round1(toRealSeconds(result.firstContactTime))}s.`;
  } else {
    approachLead = `${soonerName} closes to range in ${round1(toRealSeconds(result.firstContactTime))}s and opens fire; ${laterName} closes the remaining gap and joins the fight ${round1(toRealSeconds(laterTime - result.firstContactTime))}s later.`;
  }

  return (
    <div className="battle-result">
      <h2>
        {approachLead}{" "}
        {result.winner === "tie"
          ? "Tie — both sides are wiped out at the same moment"
          : `${winnerName} wins in ${round1(toRealSeconds(result.duration))}s total with ${winnerSurvivors}/${winnerStartCount} units left (${result.winnerRemainingHpPercent.toFixed(0)}% of that army's total HP)`}
      </h2>
      <p className="battle-caveat">
        Each side closes to its own max range (stopping there to fire rather than
        continuing to melee range) - whichever side has the longer range gets free
        volleys until the other side arrives. Once both sides are in range, neither
        repositions again (no ongoing kiting/retreating), and min_range and pathing
        obstacles are ignored.
      </p>

      <div className="damage-breakdown">
        <strong>{unitA.name} → {unitB.name} (per unit)</strong>
        <p>
          ({result.breakdownAtoB.baseAttack} attack − {result.breakdownAtoB.baseArmor}{" "}
          armor) + ({result.breakdownAtoB.bonusDamage} bonus damage −{" "}
          {result.breakdownAtoB.bonusReduction} bonus reduction) ={" "}
          <strong>{result.breakdownAtoB.total} damage per hit</strong>, once
          every {round1(toRealSeconds(unitA.reload_time))}s. With {countA} attacking together, that's{" "}
          <strong>{countA * result.breakdownAtoB.total} damage per volley</strong>.
        </p>
      </div>
      <div className="damage-breakdown">
        <strong>{unitB.name} → {unitA.name} (per unit)</strong>
        <p>
          ({result.breakdownBtoA.baseAttack} attack − {result.breakdownBtoA.baseArmor}{" "}
          armor) + ({result.breakdownBtoA.bonusDamage} bonus damage −{" "}
          {result.breakdownBtoA.bonusReduction} bonus reduction) ={" "}
          <strong>{result.breakdownBtoA.total} damage per hit</strong>, once
          every {round1(toRealSeconds(unitB.reload_time))}s. With {countB} attacking together, that's{" "}
          <strong>{countB * result.breakdownBtoA.total} damage per volley</strong>.
        </p>
      </div>
    </div>
  );
}
