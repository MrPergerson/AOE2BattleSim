import type { Unit, Upgrade, UpgradeLine } from "./types";
import { findBaseAttackClass } from "./combat";

export function appliesTo(unit: Unit, line: UpgradeLine): boolean {
  switch (line) {
    case "melee_attack":
      return unit.class_name === "Infantry" || unit.class_name === "Cavalry";
    case "infantry_armor":
      return unit.class_name === "Infantry";
    case "cavalry_armor":
      return unit.class_name === "Cavalry";
    case "ranged_attack":
    case "ranged_armor":
      return findBaseAttackClass(unit) === 3;
    case "siege_range":
      return unit.class_name === "Siege Weapon" && unit.max_range > 0;
    case "siege_weapon":
      return unit.class_name === "Siege Weapon";
    case "ship_pierce_armor":
      return unit.class_name === "Warship";
    case "unclassified":
      return false;
  }
}

export interface UpgradeBonuses {
  attack: number;
  meleeArmor: number;
  pierceArmor: number;
  range: number;
}

const NO_BONUSES: UpgradeBonuses = { attack: 0, meleeArmor: 0, pierceArmor: 0, range: 0 };

// Returns a modified unit with the selected, applicable upgrades' bonuses baked into both
// the displayed_* stats and the underlying attacks/armours base-class entries - those have
// to move together, since combat.ts's findBaseAttackClass matches a unit's base attack
// entry by `amount === displayed_attack`.
export function applyUpgrades(
  unit: Unit,
  upgrades: Upgrade[],
  selectedIds: Set<number>,
): { unit: Unit; bonuses: UpgradeBonuses } {
  const bonuses: UpgradeBonuses = { ...NO_BONUSES };

  for (const upgrade of upgrades) {
    if (!selectedIds.has(upgrade.id)) continue;
    if (!appliesTo(unit, upgrade.line)) continue;
    bonuses.attack += upgrade.attack_bonus;
    bonuses.meleeArmor += upgrade.melee_armor_bonus;
    bonuses.pierceArmor += upgrade.pierce_armor_bonus;
    bonuses.range += upgrade.range_bonus;
  }

  const hasAnyBonus =
    bonuses.attack !== 0 || bonuses.meleeArmor !== 0 || bonuses.pierceArmor !== 0 || bonuses.range !== 0;
  if (!hasAnyBonus) {
    return { unit, bonuses };
  }

  const baseClass = findBaseAttackClass(unit);
  const attacks = unit.attacks.map((a) =>
    a.class_ === baseClass ? { ...a, amount: a.amount + bonuses.attack } : a,
  );
  const armours = unit.armours.map((a) => {
    if (a.class_ === 4) return { ...a, amount: a.amount + bonuses.meleeArmor };
    if (a.class_ === 3) return { ...a, amount: a.amount + bonuses.pierceArmor };
    return a;
  });

  const modifiedUnit: Unit = {
    ...unit,
    displayed_attack: unit.displayed_attack + bonuses.attack,
    displayed_melee_armour: unit.displayed_melee_armour + bonuses.meleeArmor,
    displayed_pierce_armour: unit.displayed_pierce_armour + bonuses.pierceArmor,
    displayed_range: unit.displayed_range + bonuses.range,
    attacks,
    armours,
  };

  return { unit: modifiedUnit, bonuses };
}
