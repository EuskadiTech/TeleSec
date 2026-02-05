import json
import os
import shutil
import sys

def get_all_files(directory):
    files = []
    for root, _, filenames in os.walk(directory):
        for filename in filenames:
            path = os.path.join(root, filename)
            # Convert to relative path and normalize separators
            rel_path = os.path.relpath(path, directory)
            files.append(rel_path.replace('\\', '/'))
    return files

PREFETCH = ""
VERSIONCO = "2026-02"
HANDLEPARSE = get_all_files("src")
TITLE = os.environ.get("TELESEC_TITLE", "TeleSec")
HOSTER = os.environ.get("TELESEC_HOSTER", "EuskadiTech")
# Combine assets from JSON and recursively found files
ASSETS = get_all_files("assets")

for asset in ASSETS:
    if asset != "sw.js":
        PREFETCH += f'<link rel="prefetch" href="{asset}" />\n'
for src in HANDLEPARSE:
    if src != "sw.js":
        PREFETCH += f'<link rel="prefetch" href="{src}" />\n'

if os.path.exists("dist"):
    shutil.rmtree("dist")
shutil.copytree("assets","dist", dirs_exist_ok=True)

def replace_handles(string):
    string = string.replace("%%PREFETCH%%", PREFETCH)
    string = string.replace("%%VERSIONCO%%", VERSIONCO)
    string = string.replace("%%TITLE%%", TITLE)
    string = string.replace("%%HOSTER%%", HOSTER)
    string = string.replace("%%ASSETSJSON%%", json.dumps(ASSETS, ensure_ascii=False))
    return string


for file in HANDLEPARSE:
    print(file)
    with open("src/" + file, "r", encoding="utf-8") as f1:
        out = replace_handles(f1.read())
    with open("dist/" + file, "w", encoding="utf-8") as f2:
        f2.write(out)
