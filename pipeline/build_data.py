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
        "attacks": [{"class_": a.class_, "amount": a.amount} for a in t50.attacks],
        "armours": [{"class_": a.class_, "amount": a.amount} for a in t50.armours],
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
