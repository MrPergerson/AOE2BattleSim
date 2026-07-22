import type { Unit } from "../types";
import { simulateArmyBattle } from "../battle";
import { round1 } from "../format";
import { toRealSeconds } from "../gameSpeed";

interface BattleReportProps {
  unitA: Unit | null;
  countA: number;
  unitB: Unit | null;
  countB: number;
}

export function BattleReport({ unitA, countA, unitB, countB }: BattleReportProps) {
  if (!unitA || !unitB) {
    return <p>Pick a unit on both sides to compare.</p>;
  }

  const result = simulateArmyBattle(unitA, countA, unitB, countB);
  const winnerName = result.winner === "A" ? unitA.name : unitB.name;
  const winnerStartCount = result.winner === "A" ? countA : countB;
  const winnerSurvivors = result.winner === "A" ? result.survivorsA : result.survivorsB;

  return (
    <div className="battle-result">
      <h2>
        {result.winner === "tie"
          ? "Tie — both sides are wiped out at the same moment"
          : `${winnerName} wins in ${toRealSeconds(result.duration).toFixed(1)}s with ${winnerSurvivors}/${winnerStartCount} units left (${result.winnerRemainingHpPercent.toFixed(0)}% of that army's total HP)`}
      </h2>
      <p className="battle-caveat">
        Assumes both armies are already in range and every surviving unit attacks
        continuously, with no movement, misses, or reinforcements. Each volley's
        damage focuses down one enemy at a time (like real focus fire), so a
        side's output shrinks as it loses units.
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
