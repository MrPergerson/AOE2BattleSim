import { useEffect, useState } from "react";
import { getCivs, getUpgrades } from "../api/data";
import { UnitPicker } from "./UnitPicker";
import { UpgradePanel } from "./UpgradePanel";
import { BattleReport } from "./BattleReport";
import { StatCompare } from "./StatCompare";
import { applyUpgrades } from "../upgrades";
import type { Civ, Unit, Upgrade, UpgradeSource } from "../types";

const UPGRADE_SOURCES: UpgradeSource[] = ["Blacksmith", "University", "Unique"];

export function CombatSim() {
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

  return (
    <div className="combat-sim">
      <div className="pickers">
        <UnitPicker
          label="Unit A"
          civs={civs}
          civId={civIdA}
          onCivChange={setCivIdA}
          unit={unitA}
          onUnitChange={setUnitA}
          count={countA}
          onCountChange={setCountA}
        />
        <UnitPicker
          label="Unit B"
          civs={civs}
          civId={civIdB}
          onCivChange={setCivIdB}
          unit={unitB}
          onUnitChange={setUnitB}
          count={countB}
          onCountChange={setCountB}
        />
      </div>

      <BattleReport
        unitA={appliedA?.unit ?? null}
        countA={countA}
        unitB={appliedB?.unit ?? null}
        countB={countB}
      />

      {UPGRADE_SOURCES.map((source) => (
        <div className="upgrade-panels" key={source}>
          <UpgradePanel
            label="Unit A"
            source={source}
            unit={unitA}
            upgrades={upgradesA}
            selectedIds={selectedIdsA}
            onToggle={toggleA}
            onSelectAll={selectAllA}
            onClearAll={clearAllA}
          />
          <UpgradePanel
            label="Unit B"
            source={source}
            unit={unitB}
            upgrades={upgradesB}
            selectedIds={selectedIdsB}
            onToggle={toggleB}
            onSelectAll={selectAllB}
            onClearAll={clearAllB}
          />
        </div>
      ))}

      <StatCompare
        unitA={appliedA?.unit ?? null}
        countA={countA}
        bonusesA={appliedA?.bonuses ?? null}
        unitB={appliedB?.unit ?? null}
        countB={countB}
        bonusesB={appliedB?.bonuses ?? null}
      />
    </div>
  );
}
