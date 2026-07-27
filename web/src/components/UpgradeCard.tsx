import { UpgradePanel } from "./UpgradePanel";
import type { Unit, Upgrade, UpgradeSource } from "../types";

const UPGRADE_SOURCES: UpgradeSource[] = ["Blacksmith", "University", "Unique"];

interface UpgradeCardProps {
  label: string;
  unit: Unit | null;
  upgrades: Upgrade[];
  selectedIds: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
  onSelectAll: (ids: number[]) => void;
  onClearAll: (ids: number[]) => void;
}

export function UpgradeCard({
  label,
  unit,
  upgrades,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: UpgradeCardProps) {
  if (!unit) return null;

  return (
    <div className="card upgrade-card">
      <strong className="upgrade-card-title">{label} Upgrades</strong>
      {UPGRADE_SOURCES.map((source) => (
        <UpgradePanel
          key={source}
          source={source}
          unit={unit}
          upgrades={upgrades}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
        />
      ))}
    </div>
  );
}
