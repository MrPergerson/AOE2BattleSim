import json
from pathlib import Path

_PATHS_FILE = Path(__file__).resolve().parent / "paths"

with open(_PATHS_FILE, "r", encoding="utf-8") as f:
    _paths = json.load(f)

DATA_SET = Path(_paths["data_set"])
LANG_FILE = Path(_paths["lang_file"])
LANG_1X_FILE = Path(_paths["lang_1x_file"])
DRS = Path(_paths["drs"])
CIV_TECH_TREES = Path(_paths["civ_tech_trees"])
