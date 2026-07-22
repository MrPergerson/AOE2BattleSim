import { useEffect, useState } from "react";
import { getCivs } from "../api/data";
import { UnitPicker } from "./UnitPicker";
import { ApproachReport } from "./ApproachReport";
import { BattleVisualizer } from "./BattleVisualizer";
import type { Civ, Unit } from "../types";

export function ApproachSim() {
  const [civs, setCivs] = useState<Civ[]>([]);
  const [civIdA, setCivIdA] = useState<number | null>(null);
  const [civIdB, setCivIdB] = useState<number | null>(null);
  const [unitA, setUnitA] = useState<Unit | null>(null);
  const [unitB, setUnitB] = useState<Unit | null>(null);
  const [countA, setCountA] = useState(1);
  const [countB, setCountB] = useState(1);
  const [distance, setDistance] = useState(4);

  useEffect(() => {
    getCivs().then((fetched) => {
      const playable = fetched.filter((c) => c.id !== 0);
      setCivs(playable);
      setCivIdA(playable[0]?.id ?? null);
      setCivIdB(playable[1]?.id ?? null);
    });
  }, []);

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

      <div className="approach-distance">
        <label>
          Starting distance (tiles)
          <input
            type="number"
            min={0}
            value={distance}
            onChange={(e) => setDistance(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>

      <BattleVisualizer unitA={unitA} countA={countA} unitB={unitB} countB={countB} distance={distance} />

      <ApproachReport unitA={unitA} countA={countA} unitB={unitB} countB={countB} distance={distance} />
    </div>
  );
}
