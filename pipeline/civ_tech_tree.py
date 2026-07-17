import json

from paths_config import CIV_TECH_TREES

# CivTechTrees/*.json filenames use each civ's pre-DE name; these 6 were renamed in
# Definitive Edition and no longer match Civ.name from the .dat file (found by diffing
# every civ name against the CivTechTrees directory listing).
CIV_NAME_OVERRIDES = {
    "British": "BRITONS",
    "Byzantine": "BYZANTINES",
    "French": "FRANKS",
    "Hindustanis": "INDIANS",
    "Magyars": "MAGYAR",
    "Mayan": "MAYANS",
}


def load_civ_tech_tree(civ_name: str) -> dict | None:
    filename = CIV_NAME_OVERRIDES.get(civ_name, civ_name.upper())
    path = CIV_TECH_TREES / f"{filename}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def available_node_ids(tree: dict) -> set[int]:
    nodes = tree["civ_techs_buildings"] + tree["civ_techs_units"]
    return {n["Node ID"] for n in nodes if n["Node Status"] != "NotAvailable"}
