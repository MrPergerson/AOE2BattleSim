import json

from genieutils.datfile import DatFile

from lang import load_lang, resolve_name
from paths_config import DATA_SET, LANG_FILE, LANG_1X_FILE

OUTPUT_FILE = "unit_allowlist.json"


def main():
    data = DatFile.parse(DATA_SET)
    lang = load_lang(LANG_FILE, LANG_1X_FILE)

    unit_ids = sorted(set(uc.id for uc in data.tech_tree.unit_connections))

    entries = []
    missing = []
    for unit_id in unit_ids:
        unit = next((u for civ in data.civs for u in civ.units if u and u.id == unit_id), None)
        if unit is None:
            missing.append(unit_id)
            continue
        entries.append({"id": unit_id, "name": resolve_name(unit, lang)})

    entries.sort(key=lambda e: e["name"].lower())

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"wrote {len(entries)} units to {OUTPUT_FILE}")
    if missing:
        print(f"warning: {len(missing)} tech-tree unit ids had no matching Unit in any civ: {missing}")


if __name__ == "__main__":
    main()
