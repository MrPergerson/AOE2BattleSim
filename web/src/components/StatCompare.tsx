import type { ClassAmount, Unit } from "../types";
import type { UpgradeBonuses } from "../upgrades";
import { round1 } from "../format";

interface StatCompareProps {
  unitA: Unit | null;
  countA: number;
  bonusesA: UpgradeBonuses | null;
  unitB: Unit | null;
  countB: number;
  bonusesB: UpgradeBonuses | null;
}

const RESOURCE_NAMES: Record<number, string> = {
  0: "Food",
  1: "Wood",
  2: "Stone",
  3: "Gold",
};

function formatCost(unit: Unit): string {
  return unit.resource_costs
    .filter((c) => c.amount > 0)
    .map((c) => `${c.amount} ${RESOURCE_NAMES[c.type] ?? `res${c.type}`}`)
    .join(", ");
}

function formatClassList(entries: ClassAmount[]): string {
  const nonzero = entries.filter((e) => e.amount !== 0);
  if (nonzero.length === 0) return "-";
  return nonzero
    .map((e) => `${e.class_name}: ${e.amount > 0 ? "+" : ""}${e.amount}`)
    .join(", ");
}

type BonusKey = keyof UpgradeBonuses;

interface RowDef {
  label: string;
  value: (u: Unit) => number | string;
  bonusKey?: BonusKey;
}

const ROWS: RowDef[] = [
  { label: "Class", value: (u) => u.class_name },
  { label: "Hit Points", value: (u) => u.hit_points },
  { label: "Attack", value: (u) => u.displayed_attack, bonusKey: "attack" },
  { label: "Melee Armor", value: (u) => u.displayed_melee_armour, bonusKey: "meleeArmor" },
  { label: "Pierce Armor", value: (u) => u.displayed_pierce_armour, bonusKey: "pierceArmor" },
  { label: "Bonus Attacks", value: (u) => formatClassList(u.attacks) },
  { label: "Bonus Armors", value: (u) => formatClassList(u.armours) },
  { label: "Range", value: (u) => u.displayed_range, bonusKey: "range" },
  { label: "Reload Time", value: (u) => u.displayed_reload_time },
  { label: "Accuracy", value: (u) => `${u.accuracy_percent}%` },
  { label: "Speed", value: (u) => u.speed ?? "-" },
  { label: "Line of Sight", value: (u) => u.line_of_sight },
  { label: "Cost", value: formatCost },
  { label: "Train Time", value: (u) => u.train_time ?? "-" },
];

function renderCell(row: RowDef, unit: Unit, bonuses: UpgradeBonuses | null) {
  const raw = row.value(unit);
  if (row.bonusKey && bonuses && typeof raw === "number") {
    const bonus = bonuses[row.bonusKey];
    const base = round1(raw - bonus);
    return (
      <>
        {base}
        {bonus > 0 && <span className="stat-bonus"> +{bonus}</span>}
      </>
    );
  }
  return typeof raw === "number" ? round1(raw) : raw;
}

export function StatCompare({ unitA, countA, bonusesA, unitB, countB, bonusesB }: StatCompareProps) {
  if (!unitA || !unitB) {
    return null;
  }

  return (
    <table className="stat-compare">
      <thead>
        <tr>
          <th></th>
          <th>{unitA.name} (×{countA})</th>
          <th>{unitB.name} (×{countB})</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{renderCell(row, unitA, bonusesA)}</td>
            <td>{renderCell(row, unitB, bonusesB)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
