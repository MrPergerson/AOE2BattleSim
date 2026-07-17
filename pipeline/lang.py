import re

_LINE_RE = re.compile(r'^\s*(\d+)\s+"(.*)"\s*$')


def parse_lang_file(path) -> dict[int, str]:
    strings: dict[int, str] = {}
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.lstrip().startswith("//"):
                continue
            match = _LINE_RE.match(line.rstrip("\n"))
            if not match:
                continue
            strings[int(match.group(1))] = match.group(2)
    return strings


def load_lang(*paths) -> dict[int, str]:
    strings: dict[int, str] = {}
    for path in paths:
        strings.update(parse_lang_file(path))
    return strings


def resolve_name(unit, lang: dict[int, str]) -> str:
    return lang.get(unit.language_dll_name, unit.name)
