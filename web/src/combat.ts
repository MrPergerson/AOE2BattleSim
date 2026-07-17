import type { Unit } from "./types";

export interface DamageBreakdown {
  baseAttack: number;
  baseArmor: number;
  baseDamage: number;
  bonusDamage: number;
  bonusReduction: number;
  total: number;
}

// A unit's `attacks` array always includes one entry for its "base" damage type -
// class 3 (pierce) or class 4 (melee) - whose amount equals displayed_attack. Every
// other entry is a bonus vs. a specific target class (e.g. "+9 vs cavalry").
export function findBaseAttackClass(unit: Unit): 3 | 4 | null {
  const entry = unit.attacks.find(
    (a) => (a.class_ === 3 || a.class_ === 4) && a.amount === unit.displayed_attack,
  );
  return entry ? (entry.class_ as 3 | 4) : null;
}

// (attack - armor) + (bonus damage - bonus damage reduction) = final damage
//
// A bonus-class attack only counts if the defender has a matching armour entry for
// that class - that's how AoE2 encodes "the defender belongs to class X". The base
// pierce/melee component and every applicable bonus component are summed before
// flooring, so a strong resistance can offset a bonus down to (but not below) what
// the base component alone would do; only the grand total is floored at 1.
export function computeDamageBreakdown(attacker: Unit, defender: Unit): DamageBreakdown {
  const baseClass = findBaseAttackClass(attacker);
  const baseAttack = attacker.displayed_attack;
  const baseArmor =
    baseClass === 4
      ? defender.displayed_melee_armour
      : baseClass === 3
        ? defender.displayed_pierce_armour
        : 0;
  const baseDamage = baseAttack - baseArmor;

  const armourByClass = new Map(defender.armours.map((a) => [a.class_, a.amount]));
  let bonusDamage = 0;
  let bonusReduction = 0;
  for (const attack of attacker.attacks) {
    if (attack.class_ === baseClass) continue;
    const armour = armourByClass.get(attack.class_);
    if (armour === undefined) continue;
    bonusDamage += attack.amount;
    bonusReduction += armour;
  }

  const total = Math.max(baseDamage + (bonusDamage - bonusReduction), 1);

  return { baseAttack, baseArmor, baseDamage, bonusDamage, bonusReduction, total };
}

export function computeDamage(attacker: Unit, defender: Unit): number {
  return computeDamageBreakdown(attacker, defender).total;
}
