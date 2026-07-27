import type { Unit } from "../types";
import { simulateArmyBattle } from "../battle";
import { toRealSeconds } from "../gameSpeed";

interface BattleReportProps {
  unitA: Unit | null;
  countA: number;
  unitB: Unit | null;
  countB: number;
}

export function BattleReport({ unitA, countA, unitB, countB }: BattleReportProps) {
  if (!unitA || !unitB) return null;

  const result = simulateArmyBattle(unitA, countA, unitB, countB);
  const winnerName = result.winner === "A" ? unitA.name : unitB.name;
  const winnerStartCount = result.winner === "A" ? countA : countB;
  const winnerSurvivors = result.winner === "A" ? result.survivorsA : result.survivorsB;

  return (
    <div className="battle-result">
      {result.winner === "tie" ? (
        <h2>Tie — both sides are wiped out at the same moment</h2>
      ) : (
        <h2>
          {winnerName} wins in {toRealSeconds(result.duration).toFixed(1)}s{" "}
          <span className="battle-result-sub">
            — {winnerSurvivors}/{winnerStartCount} left, {result.winnerRemainingHpPercent.toFixed(0)}% HP
          </span>
        </h2>
      )}
    </div>
  );
}
