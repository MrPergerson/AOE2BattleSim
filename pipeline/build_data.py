import json
from pathlib import Path

from genieutils.datfile import DatFile

from civ_tech_tree import available_node_ids, load_civ_tech_tree
from lang import load_lang, resolve_name
from paths_config import DATA_SET, LANG_FILE, LANG_1X_FILE

ALLOWLIST_FILE = "unit_allowlist.json"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data"

# Unit.class_ has no name of its own, but the scenario editor's "Class" dropdown
# strings live in the key-value file at exactly `13300 + class_` - verified against
# every distinct class_ id in this project's allowlist (0 -> "Archer", 6 -> "Infantry",
# 12 -> "Cavalry", 13 -> "Siege Weapon", 22 -> "Warship", etc. all matched their real units).
CLASS_NAME_LANG_OFFSET = 13300

# attacks[]/armours[]' class_ is a *different*, unrelated enum from unit.class_ above
# (confusingly, genieutils names both fields "class_") - it's the game's fixed "Armor
# Class" bonus-damage-matching table, not covered by any language string. Verified this
# session: the CLASS_NAME_LANG_OFFSET trick gives nonsense for these ids (e.g. 3 ->
# "Building", 4 -> "Civilian"), which contradicts combat.ts's independently-verified
# 3 == base pierce / 4 == base melee. This table is instead the standard, static Armor
# Class list documented at https://liquipedia.net/ageofempires/Armor_class - ids absent
# here (37, 38, 39, 41, 60 seen in this project's unit data) are newer additions with no
# public documentation found, and fall back to "Class N" rather than guessing.
ARMOR_CLASS_NAMES = {
    1: "Infantry",
    2: "Turtle Ship",
    3: "Base Pierce",
    4: "Base Melee",
    5: "War Elephant",
    8: "Cavalry",
    11: "Building",
    13: "Stone Defense",
    14: "Predator Animal",
    15: "Archer",
    16: "Ship",
    17: "Ram",
    18: "Tree",
    19: "Unique Unit",
    20: "Siege Weapon",
    21: "Standard Building",
    22: "Wall and Gate",
    23: "Gunpowder Unit",
    24: "Boar",
    25: "Monk",
    26: "Castle",
    27: "Spearman",
    28: "Cavalry Archer",
    29: "Eagle Warrior",
    30: "Camel",
    31: "Anti-Leitis",
    32: "Condottiero",
    33: "Anti-Gunpowder",
    34: "Fishing Ship",
    35: "Mameluke",
    36: "Hero and King",
}


def armor_class_name(class_id: int) -> str:
    return ARMOR_CLASS_NAMES.get(class_id, f"Class {class_id}")


def build_unit_record(unit, lang: dict[int, str]) -> dict:
    t50 = unit.type_50
    train_location = unit.creatable.train_locations[0] if unit.creatable.train_locations else None
    return {
        "id": unit.id,
        "name": resolve_name(unit, lang),
        "internal_name": unit.name,
        "hit_points": unit.hit_points,
        "line_of_sight": unit.line_of_sight,
        "speed": unit.speed,
        "class_": unit.class_,
        "class_name": lang.get(CLASS_NAME_LANG_OFFSET + unit.class_, str(unit.class_)),
        "base_armor": t50.base_armor,
        "attacks": [
            {"class_": a.class_, "class_name": armor_class_name(a.class_), "amount": a.amount}
            for a in t50.attacks
        ],
        "armours": [
            {"class_": a.class_, "class_name": armor_class_name(a.class_), "amount": a.amount}
            for a in t50.armours
        ],
        "max_range": t50.max_range,
        "min_range": t50.min_range,
        "blast_damage": t50.blast_damage,
        "reload_time": t50.reload_time,
        "displayed_attack": t50.displayed_attack,
        "displayed_range": t50.displayed_range,
        "displayed_reload_time": t50.displayed_reload_time,
        "displayed_melee_armour": t50.displayed_melee_armour,
        "displayed_pierce_armour": unit.creatable.displayed_pierce_armour,
        "accuracy_percent": t50.accuracy_percent,
        "frame_delay": t50.frame_delay,
        "resource_costs": [
            {"type": rc.type, "amount": rc.amount}
            for rc in unit.creatable.resource_costs
            if rc.type != -1
        ],
        "train_time": train_location.train_time if train_location else None,
    }


def main():
    data = DatFile.parse(DATA_SET)
    lang = load_lang(LANG_FILE, LANG_1X_FILE)

    with open(ALLOWLIST_FILE, "r", encoding="utf-8") as f:
        allowlist = json.load(f)
    allowed_ids = set(entry["id"] for entry in allowlist)

    (OUTPUT_DIR / "units").mkdir(parents=True, exist_ok=True)

    civs_meta = []
    matched_ids = set()
    total_written = 0
    skipped_civs = []

    for civ_id, civ in enumerate(data.civs):
        civ_tech_tree = load_civ_tech_tree(civ.name)
        if civ_tech_tree is None:
            skipped_civs.append(civ.name)
            continue
        civ_unit_ids = available_node_ids(civ_tech_tree)

        records = []
        for unit in civ.units:
            if unit is None or unit.id not in allowed_ids or unit.id not in civ_unit_ids:
                continue
            if unit.type_50 is None or unit.creatable is None:
                continue
            records.append(build_unit_record(unit, lang))
            matched_ids.add(unit.id)

        records.sort(key=lambda r: r["name"])
        with open(OUTPUT_DIR / "units" / f"{civ_id}.json", "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False)

        civs_meta.append({"id": civ_id, "name": civ.name})
        total_written += len(records)

    with open(OUTPUT_DIR / "civs.json", "w", encoding="utf-8") as f:
        json.dump(civs_meta, f, indent=2, ensure_ascii=False)

    unmatched = allowed_ids - matched_ids
    print(f"civs: {len(civs_meta)}, total unit records written: {total_written}")
    if skipped_civs:
        print(f"warning: {len(skipped_civs)} civs had no CivTechTrees file, skipped: {skipped_civs}")
    if unmatched:
        print(f"warning: {len(unmatched)} allowlist ids matched zero civs: {sorted(unmatched)}")


if __name__ == "__main__":
    main()
