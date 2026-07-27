import type { RangeMode } from "../hooks/useRangeDistance";

interface RangeModeToggleProps {
  rangeMode: RangeMode;
  onChange: (mode: RangeMode) => void;
}

export function RangeModeToggle({ rangeMode, onChange }: RangeModeToggleProps) {
  return (
    <div className="approach-distance">
      <label>
        <input
          type="radio"
          name="range-mode"
          value="close"
          checked={rangeMode === "close"}
          onChange={() => onChange("close")}
        />
        Close range
      </label>
      <label>
        <input
          type="radio"
          name="range-mode"
          value="long"
          checked={rangeMode === "long"}
          onChange={() => onChange("long")}
        />
        Long range
      </label>
    </div>
  );
}
