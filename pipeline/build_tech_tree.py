import json
from pathlib import Path

from genieutils.datfile import DatFile

from civ_tech_tree import load_civ_tech_tree
from paths_config import DATA_SET

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data" / "tech_tree"


def clean_node(n: dict) -> dict:
    return {
        "id": n["Node ID"],
        "name": n["Name"],
        "node_type": n.get("Node Type"),
        "status": n["Node Status"],
        "age": n["Age ID"],
        "building_id": n.get("Building ID"),
        "link_id": n.get("Link ID"),
    }


def main():
    data = DatFile.parse(DATA_SET)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    written = 0
    skipped_civs = []

    for civ_id, civ in enumerate(data.civs):
        tree = load_civ_tech_tree(civ.name)
        if tree is None:
            skipped_civs.append(civ.name)
            continue

        output = {
            "buildings": [clean_node(n) for n in tree["civ_techs_buildings"]],
            "units": [clean_node(n) for n in tree["civ_techs_units"]],
        }
        with open(OUTPUT_DIR / f"{civ_id}.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False)
        written += 1

    print(f"wrote {written} civ tech tree files to {OUTPUT_DIR}")
    if skipped_civs:
        print(f"warning: {len(skipped_civs)} civs had no CivTechTrees file, skipped: {skipped_civs}")


if __name__ == "__main__":
    main()
