import { useEffect, useState } from "react";
import { getUnits } from "../api/data";
import type { Civ, Unit } from "../types";

interface UnitPickerProps {
  label: string;
  civs: Civ[];
  civId: number | null;
  onCivChange: (civId: number) => void;
  unit: Unit | null;
  onUnitChange: (unit: Unit | null) => void;
  count: number;
  onCountChange: (count: number) => void;
}

export function UnitPicker({
  label,
  civs,
  civId,
  onCivChange,
  unit,
  onUnitChange,
  count,
  onCountChange,
}: UnitPickerProps) {
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (civId === null) return;
    let cancelled = false;
    getUnits(civId).then((fetched) => {
      if (cancelled) return;
      setUnits(fetched);
      onUnitChange(fetched[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [civId]);

  return (
    <div className="card unit-picker">
      <span className="tag">{label}</span>
      <select
        value={civId ?? ""}
        onChange={(e) => onCivChange(Number(e.target.value))}
      >
        {civs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={unit?.id ?? ""}
        onChange={(e) => {
          const found = units.find((u) => u.id === Number(e.target.value));
          onUnitChange(found ?? null);
        }}
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      <label className="unit-picker-count">
        Count
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => onCountChange(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
        />
      </label>
    </div>
  );
}
