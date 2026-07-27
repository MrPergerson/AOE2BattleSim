import { appliesTo } from "../upgrades";
import type { Unit, Upgrade, UpgradeSource } from "../types";

const AGE_LABELS: Record<number, string> = {
  1: "Dark Age",
  2: "Feudal Age",
  3: "Castle Age",
  4: "Imperial Age",
};

interface UpgradePanelProps {
  source: UpgradeSource;
  unit: Unit | null;
  upgrades: Upgrade[];
  selectedIds: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
  onSelectAll: (ids: number[]) => void;
  onClearAll: (ids: number[]) => void;
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
  source,
  unit,
  upgrades,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: UpgradePanelProps) {
  if (!unit) return null;

  const visible = upgrades
    .filter(
      (u) =>
        u.source === source &&
        u.status !== "NotAvailable" &&
        (u.line === "unclassified" || appliesTo(unit, u.line)),
    )
    .sort((a, b) => a.age - b.age || a.name.localeCompare(b.name));

  return (
    <div className="upgrade-source">
      <h4>{source}</h4>

      {visible.length > 0 && (
        <div className="upgrade-panel-actions">
          <button type="button" onClick={() => onSelectAll(visible.map((u) => u.id))}>
            Select All
          </button>
          <button type="button" onClick={() => onClearAll(visible.map((u) => u.id))}>
            Clear All
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="upgrade-panel-empty">No {source} upgrades apply to this unit.</p>
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
                {u.name}{" "}
                <span className="upgrade-bonus-text">
                  ({AGE_LABELS[u.age] ?? `Age ${u.age}`}
                  {formatBonus(u) ? `, ${formatBonus(u)}` : ", no modeled effect"}
                  )
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
