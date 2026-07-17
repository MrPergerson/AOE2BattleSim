from genieutils.datfile import DatFile

from paths_config import DATA_SET

data = DatFile.parse(DATA_SET)

print(f"version: {data.version}")
print(f"civs: {len(data.civs)}")
print(f"techs: {len(data.techs)}")

# Civ 0 is "GAIA" in the base data; real civs start after it and share
# the same unit stats unless a civ bonus overrides them, so any civ
# works for looking up baseline combat values.
civ = data.civs[1]
print(f"\nciv[1] name: {civ.name}, units: {len(civ.units)}")

# Find a well-known combat unit by name to show the fields the
# simulator will care about (Archer line, unit id 4).
archer = civ.units[4]
print(f"\nunit: {archer.name} (id={archer.id})")
print(f"hit_points: {archer.hit_points}")
print(f"speed: {archer.speed}")

t50 = archer.type_50
if t50:
    print(f"base_armor: {t50.base_armor}")
    print(f"attacks: {[(a.class_, a.amount) for a in t50.attacks]}")
    print(f"armours: {[(a.class_, a.amount) for a in t50.armours]}")
    print(f"max_range: {t50.max_range}")
    print(f"reload_time: {t50.reload_time}")
    print(f"displayed_attack: {t50.displayed_attack}")
    print(f"displayed_range: {t50.displayed_range}")
