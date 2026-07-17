import { appliesTo } from "../upgrades";
import type { Unit, Upgrade } from "../types";

const AGE_OPTIONS = [
  { value: 1, label: "Dark Age" },
  { value: 2, label: "Feudal Age" },
  { value: 3, label: "Castle Age" },
  { value: 4, label: "Imperial Age" },
];

interface UpgradePanelProps {
  label: string;
  unit: Unit | null;
  upgrades: Upgrade[];
  age: number;
  onAgeChange: (age: number) => void;
  selectedIds: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
}

function formatBonus(u: Upgrade): string {
  const parts: string[] = [];
  if (u.attack_bonus) parts.push(`+${u.attack_bonus} attack`);
  if (u.range_bonus) parts.push(`+${u.range_bonus} range`);
  if (u.melee_armor_bonus) parts.push(`+${u.melee_armor_bonus} melee armor`);
  if (u.pierce_armor_bonus) parts.push(`+${u.pierce_armor_bonus} pierce armor`);
  return parts.join(", ");
}

export function UpgradePanel({
  label,
  unit,
  upgrades,
  age,
  onAgeChange,
  selectedIds,
  onToggle,
}: UpgradePanelProps) {
  if (!unit) return null;

  const visible = upgrades.filter(
    (u) => u.age === age && u.status !== "NotAvailable" && appliesTo(unit, u.line),
  );

  return (
    <div className="upgrade-panel">
      <h3>{label} Upgrades</h3>
      <select value={age} onChange={(e) => onAgeChange(Number(e.target.value))}>
        {AGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {visible.length === 0 ? (
        <p className="upgrade-panel-empty">No Blacksmith upgrades apply to this unit at this age.</p>
      ) : (
        <ul className="upgrade-list">
          {visible.map((u) => (
            <li key={u.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={(e) => onToggle(u.id, e.target.checked)}
                />
                {u.name} <span className="upgrade-bonus-text">({formatBonus(u)})</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
