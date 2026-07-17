import json
import re
from pathlib import Path

from genieutils.datfile import DatFile

from civ_tech_tree import load_civ_tech_tree
from lang import load_lang
from paths_config import DATA_SET, LANG_FILE, LANG_1X_FILE

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data" / "upgrades"

# The 15 Blacksmith techs: name -> (line, age). Verified this session that every one of
# these names' language_dll_description parses cleanly with BONUS_RE below.
BLACKSMITH_TECHS = {
    "Forging": ("melee_attack", 2),
    "Iron casting": ("melee_attack", 3),
    "Blast Furnace": ("melee_attack", 4),
    "Fletching": ("ranged_attack", 2),
    "Bodkin Arrow": ("ranged_attack", 3),
    "Bracer": ("ranged_attack", 4),
    "Scale Mail Armor": ("infantry_armor", 2),
    "Chain Mail Armor": ("infantry_armor", 3),
    "Plate Mail Armor": ("infantry_armor", 4),
    "Scale Barding Armor": ("cavalry_armor", 2),
    "Chain Barding Armor": ("cavalry_armor", 3),
    "Plate Barding Armor": ("cavalry_armor", 4),
    "Padded Archer Armor": ("ranged_armor", 2),
    "Leather Archer Armor": ("ranged_armor", 3),
    "Ring Archer Armor": ("ranged_armor", 4),
}

ATTACK_RE = re.compile(r"\+(\d+) attack")
RANGE_RE = re.compile(r"\+(\d+) range")
ARMOR_RE = re.compile(r"\+(\d+) melee/\+(\d+) pierce armor")


def parse_bonus(description: str) -> dict:
    first_clause = description.split(";")[0]
    attack_m = ATTACK_RE.search(first_clause)
    range_m = RANGE_RE.search(first_clause)
    armor_m = ARMOR_RE.search(first_clause)
    return {
        "attack_bonus": int(attack_m.group(1)) if attack_m else 0,
        "range_bonus": int(range_m.group(1)) if range_m else 0,
        "melee_armor_bonus": int(armor_m.group(1)) if armor_m else 0,
        "pierce_armor_bonus": int(armor_m.group(2)) if armor_m else 0,
    }


def main():
    data = DatFile.parse(DATA_SET)
    lang = load_lang(LANG_FILE, LANG_1X_FILE)

    tech_info = {}
    for tech_id, tech in enumerate(data.techs):
        if tech.name in BLACKSMITH_TECHS:
            line, age = BLACKSMITH_TECHS[tech.name]
            description = lang.get(tech.language_dll_description, "")
            tech_info[tech_id] = {
                "id": tech_id,
                "name": tech.name,
                "line": line,
                "age": age,
                **parse_bonus(description),
            }

    missing = set(BLACKSMITH_TECHS) - {t["name"] for t in tech_info.values()}
    if missing:
        print(f"warning: {len(missing)} Blacksmith tech names not found in data.techs: {sorted(missing)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    written = 0
    skipped_civs = []

    for civ_id, civ in enumerate(data.civs):
        tree = load_civ_tech_tree(civ.name)
        if tree is None:
            skipped_civs.append(civ.name)
            continue

        status_by_id = {n["Node ID"]: n["Node Status"] for n in tree["civ_techs_units"]}

        entries = []
        for tech_id, info in tech_info.items():
            status = status_by_id.get(tech_id)
            if status is None or status == "NotAvailable":
                continue
            entries.append({**info, "status": status})

        entries.sort(key=lambda e: (e["line"], e["age"]))
        with open(OUTPUT_DIR / f"{civ_id}.json", "w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False)
        written += 1

    print(f"wrote {written} civ upgrade files to {OUTPUT_DIR}")
    if skipped_civs:
        print(f"warning: {len(skipped_civs)} civs had no CivTechTrees file, skipped: {skipped_civs}")


if __name__ == "__main__":
    main()
