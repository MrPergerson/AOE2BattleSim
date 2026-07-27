import { useEffect, useRef, useState } from "react";
import { getCivs, getUpgrades } from "../api/data";
import { UnitPicker } from "./UnitPicker";
import { UpgradeCard } from "./UpgradeCard";
import { BattleReport } from "./BattleReport";
import { DamageBreakdown } from "./DamageBreakdown";
import { BattleVisualizer, type BattleVisualizerHandle } from "./BattleVisualizer";
import { RangeModeToggle } from "./RangeModeToggle";
import { StatCompare } from "./StatCompare";
import { applyUpgrades } from "../upgrades";
import { useRangeDistance } from "../hooks/useRangeDistance";
import type { Civ, SimMode, Unit, Upgrade } from "../types";

interface CombatSimProps {
  mode: SimMode;
}

export function CombatSim({ mode }: CombatSimProps) {
  const [civs, setCivs] = useState<Civ[]>([]);
  const [civIdA, setCivIdA] = useState<number | null>(null);
  const [civIdB, setCivIdB] = useState<number | null>(null);
  const [unitA, setUnitA] = useState<Unit | null>(null);
  const [unitB, setUnitB] = useState<Unit | null>(null);
  const [countA, setCountA] = useState(1);
  const [countB, setCountB] = useState(1);

  const [upgradesA, setUpgradesA] = useState<Upgrade[]>([]);
  const [upgradesB, setUpgradesB] = useState<Upgrade[]>([]);
  const [selectedIdsA, setSelectedIdsA] = useState<Set<number>>(new Set());
  const [selectedIdsB, setSelectedIdsB] = useState<Set<number>>(new Set());
  const [fastSpeed, setFastSpeed] = useState(false);
  const [battleOutcome, setBattleOutcome] = useState<string | null>(null);

  const visualizerRef = useRef<BattleVisualizerHandle>(null);

  useEffect(() => {
    getCivs().then((fetched) => {
      const playable = fetched.filter((c) => c.id !== 0);
      setCivs(playable);
      setCivIdA(playable[0]?.id ?? null);
      setCivIdB(playable[1]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (civIdA === null) return;
    getUpgrades(civIdA).then(setUpgradesA);
  }, [civIdA]);

  useEffect(() => {
    if (civIdB === null) return;
    getUpgrades(civIdB).then(setUpgradesB);
  }, [civIdB]);

  const toggleA = (id: number, checked: boolean) => {
    setSelectedIdsA((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleB = (id: number, checked: boolean) => {
    setSelectedIdsB((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllA = (ids: number[]) =>
    setSelectedIdsA((prev) => new Set([...prev, ...ids]));
  const clearAllA = (ids: number[]) =>
    setSelectedIdsA((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  const selectAllB = (ids: number[]) =>
    setSelectedIdsB((prev) => new Set([...prev, ...ids]));
  const clearAllB = (ids: number[]) =>
    setSelectedIdsB((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

  const appliedA = unitA ? applyUpgrades(unitA, upgradesA, selectedIdsA) : null;
  const appliedB = unitB ? applyUpgrades(unitB, upgradesB, selectedIdsB) : null;

  const { rangeMode, setRangeMode, distance } = useRangeDistance(
    appliedA?.unit ?? null,
    appliedB?.unit ?? null,
  );

  const handleRunBattle = () => {
    visualizerRef.current?.simulate();
  };

  return (
    <div className="combat-sim">
      <div className="pickers">
        <UnitPicker
          label="Army A"
          civs={civs}
          civId={civIdA}
          onCivChange={setCivIdA}
          unit={unitA}
          onUnitChange={setUnitA}
          count={countA}
          onCountChange={setCountA}
        />
        <UnitPicker
          label="Army B"
          civs={civs}
          civId={civIdB}
          onCivChange={setCivIdB}
          unit={unitB}
          onUnitChange={setUnitB}
          count={countB}
          onCountChange={setCountB}
        />
      </div>

      <hr className="hr" />

      <div className="result-section">
        <RangeModeToggle rangeMode={rangeMode} onChange={setRangeMode} />

        <BattleVisualizer
          ref={visualizerRef}
          unitA={appliedA?.unit ?? null}
          countA={countA}
          unitB={appliedB?.unit ?? null}
          countB={countB}
          distance={distance}
          speedMultiplier={fastSpeed ? 4 : 1}
          onOutcomeChange={setBattleOutcome}
        />

        <div className="run-battle-row">
          <div className="run-battle-left">
            <button type="button" className="btn btn-primary run-battle-btn" onClick={handleRunBattle}>
              Run Battle
            </button>
            {battleOutcome && <span className="battle-winner-banner">{battleOutcome}</span>}
          </div>
          <button
            type="button"
            className={fastSpeed ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setFastSpeed((prev) => !prev)}
          >
            Fast Speed
          </button>
        </div>
      </div>

      {mode === "advanced" && (
        <>
          <hr className="hr" />
          <div className="advanced-section">
            <BattleReport
              unitA={appliedA?.unit ?? null}
              countA={countA}
              unitB={appliedB?.unit ?? null}
              countB={countB}
            />

            <DamageBreakdown
              unitA={appliedA?.unit ?? null}
              countA={countA}
              unitB={appliedB?.unit ?? null}
              countB={countB}
            />

            <div className="upgrade-cards">
              <UpgradeCard
                label="Army A"
                unit={unitA}
                upgrades={upgradesA}
                selectedIds={selectedIdsA}
                onToggle={toggleA}
                onSelectAll={selectAllA}
                onClearAll={clearAllA}
              />
              <UpgradeCard
                label="Army B"
                unit={unitB}
                upgrades={upgradesB}
                selectedIds={selectedIdsB}
                onToggle={toggleB}
                onSelectAll={selectAllB}
                onClearAll={clearAllB}
              />
            </div>

            <div className="table-scroll">
              <StatCompare
                unitA={appliedA?.unit ?? null}
                countA={countA}
                bonusesA={appliedA?.bonuses ?? null}
                unitB={appliedB?.unit ?? null}
                countB={countB}
                bonusesB={appliedB?.bonuses ?? null}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
