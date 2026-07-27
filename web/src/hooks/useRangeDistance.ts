import { useMemo, useState } from "react";
import type { Unit } from "../types";

export type RangeMode = "long" | "close";

export function useRangeDistance(unitA: Unit | null, unitB: Unit | null) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("close");

  const distance = useMemo(() => {
    if (rangeMode === "close") return 1;
    const maxRange = Math.max(unitA?.max_range ?? 0, unitB?.max_range ?? 0);
    return maxRange + 1;
  }, [rangeMode, unitA, unitB]);

  return { rangeMode, setRangeMode, distance };
}
