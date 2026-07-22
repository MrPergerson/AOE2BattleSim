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

# Unlike the Blacksmith techs, these have multi-clause descriptions (e.g. Siege Engineers'
# "+1 range ... +20% attack vs. buildings") where the generic regex parser below would
# wrongly pick up the vs.-building percentage as a flat attack bonus. Their bonuses are
# few and verified by hand against each tech's tooltip text, so they're hardcoded instead
# of parsed.
EXTRA_TECHS = {
    "Chemistry": {
        "line": "ranged_attack",
        "age": 4,
        "source": "University",
        "attack_bonus": 1,
    },
    "Siege Engineers": {
        "line": "siege_range",
        "age": 4,
        "source": "University",
        "range_bonus": 1,
    },
    "Careening": {
        "line": "ship_pierce_armor",
        "age": 3,
        "source": "University",
        "pierce_armor_bonus": 1,
    },
    "Dry Dock": {
        "line": "ship_pierce_armor",
        "age": 4,
        "source": "University",
        "pierce_armor_bonus": 1,
    },
}

NO_BONUS = {"attack_bonus": 0, "range_bonus": 0, "melee_armor_bonus": 0, "pierce_armor_bonus": 0}

ATTACK_RE = re.compile(r"\+(\d+) attack")
RANGE_RE = re.compile(r"\+(\d+) range")
ARMOR_RE = re.compile(r"\+(\d+) melee/\+(\d+) pierce armor")
# Unique techs sometimes buff only one armor type (e.g. "Siege Weapons +4 melee armor"),
# unlike Blacksmith/University, which always pair melee+pierce together.
MELEE_ARMOR_ONLY_RE = re.compile(r"\+(\d+) melee armor")
PIERCE_ARMOR_ONLY_RE = re.compile(r"\+(\d+) pierce armor")


def _effect_clause(description: str) -> str:
    # Descriptions read "Research <Name> (<effect>)" (or sometimes just "<Name> (<effect>)");
    # stripping down to the parenthesized effect drops the tech's own name from the text so
    # a name like "Manipur Cavalry" can't leak a false "cavalry" keyword match below. Then
    # keep only the first ";"-clause (further clauses tend to describe a second, unrelated
    # effect) and cut off anything from " vs" onward, since a "+N attack vs. Camels" clause
    # names Camels as the *target* of a bonus-damage effect, not the recipient of a flat stat.
    effect = description.split("(", 1)[-1]
    first_clause = effect.split(";")[0]
    vs_idx = first_clause.lower().find(" vs")
    return first_clause if vs_idx == -1 else first_clause[:vs_idx]


def parse_bonus(description: str) -> dict:
    clause = _effect_clause(description)
    attack_m = ATTACK_RE.search(clause)
    range_m = RANGE_RE.search(clause)
    armor_m = ARMOR_RE.search(clause)
    melee_armor = int(armor_m.group(1)) if armor_m else 0
    pierce_armor = int(armor_m.group(2)) if armor_m else 0
    if not armor_m:
        melee_only_m = MELEE_ARMOR_ONLY_RE.search(clause)
        pierce_only_m = PIERCE_ARMOR_ONLY_RE.search(clause)
        melee_armor = int(melee_only_m.group(1)) if melee_only_m else 0
        pierce_armor = int(pierce_only_m.group(1)) if pierce_only_m else 0
    return {
        "attack_bonus": int(attack_m.group(1)) if attack_m else 0,
        "range_bonus": int(range_m.group(1)) if range_m else 0,
        "melee_armor_bonus": melee_armor,
        "pierce_armor_bonus": pierce_armor,
    }


# Unique techs' effects are far more varied than Blacksmith/University's, and each civ only
# has ~2-3 of them, so there's no fixed name table like BLACKSMITH_TECHS above. Instead we
# guess which unit class (if any) a tech's flat bonus applies to from keywords in its
# tooltip text - "best effort": many unique techs boost buildings, economy, or use % / HP /
# conditional effects this app doesn't model at all, and are listed with a name but no
# numeric effect (line "unclassified", which never applies to any unit).
ARCHER_KEYWORDS = ("archer", "skirmisher", "hand cannoneer", "gunpowder", "crossbow")
SIEGE_KEYWORDS = ("siege", "mangonel", "trebuchet", "scorpion", "onager", "bombard cannon")
SHIP_KEYWORDS = ("ship", "galley", "galleon", "dock", "longboat", "dromon", "turtle ship", "lou chuan")


def _first_index(text: str, keywords) -> int | None:
    indexes = [text.index(k) for k in keywords if k in text]
    return min(indexes) if indexes else None


def classify_unique_line(description: str) -> str:
    clause = _effect_clause(description)
    text = clause.lower()

    # A keyword only counts if it names the *subject* of the bonus, i.e. it appears before
    # the number - "Castles +3 range, garrisoned Infantry fires arrows" mentions Infantry,
    # but only as flavor text after the actual (Castle-only) bonus, so it must not count.
    number_m = re.search(r"\+\d", text)
    number_idx = number_m.start() if number_m else None

    def before_number(idx):
        return idx is not None and (number_idx is None or idx < number_idx)

    infantry_idx = _first_index(text, ("infantry",))
    cavalry_idx = _first_index(text, ("cavalry", "mounted"))
    archer_idx = _first_index(text, ARCHER_KEYWORDS)
    siege_idx = _first_index(text, SIEGE_KEYWORDS)
    ship_idx = _first_index(text, SHIP_KEYWORDS)

    # Archer-line units (incl. Cavalry Archer, Hand Cannoneer) checked first: they're
    # identified by findBaseAttackClass, not unit.class_name, so this is the only line
    # that can reach them - "cavalry_armor" alone would miss Cavalry Archers entirely.
    if before_number(archer_idx):
        return "ranged_attack"
    if before_number(infantry_idx) and before_number(cavalry_idx):
        return "melee_attack"
    if before_number(infantry_idx):
        return "infantry_armor"
    if before_number(cavalry_idx):
        return "cavalry_armor"
    if before_number(siege_idx):
        return "siege_weapon"
    if before_number(ship_idx):
        return "ship_pierce_armor"
    return "unclassified"


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
                "source": "Blacksmith",
                **parse_bonus(description),
            }
        elif tech.name in EXTRA_TECHS:
            extra = EXTRA_TECHS[tech.name]
            tech_info[tech_id] = {
                "id": tech_id,
                "name": tech.name,
                **NO_BONUS,
                **extra,
            }

    missing = set(BLACKSMITH_TECHS) | set(EXTRA_TECHS)
    missing -= {t["name"] for t in tech_info.values()}
    if missing:
        print(f"warning: {len(missing)} tech names not found in data.techs: {sorted(missing)}")

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

        for node in tree["civ_techs_units"]:
            if node.get("Use Type") != "Tech" or node["Node Status"] == "NotAvailable":
                continue
            tech_id = node["Node ID"]
            tech = data.techs[tech_id]
            if tech.civ != civ_id:
                continue
            description = lang.get(tech.language_dll_description, "")
            entries.append(
                {
                    "id": tech_id,
                    "name": node["Name"],
                    "line": classify_unique_line(description),
                    "source": "Unique",
                    "age": node["Age ID"],
                    "status": node["Node Status"],
                    **parse_bonus(description),
                }
            )

        entries.sort(key=lambda e: (e["source"], e["line"], e["age"]))
        with open(OUTPUT_DIR / f"{civ_id}.json", "w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False)
        written += 1

    print(f"wrote {written} civ upgrade files to {OUTPUT_DIR}")
    if skipped_civs:
        print(f"warning: {len(skipped_civs)} civs had no CivTechTrees file, skipped: {skipped_civs}")


if __name__ == "__main__":
    main()
