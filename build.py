import json
import os

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
VERSIONCO = "2025-08-12_1"
HANDLEPARSE = get_all_files("src")

# Combine assets from JSON and recursively found files
ASSETS = get_all_files("assets")

for asset in ASSETS:
    if asset != "sw.js":
        PREFETCH += f'<link rel="prefetch" href="{asset}" />\n'

shutil.rmtree("dist")
shutil.copytree("assets","dist", dirs_exist_ok=True)

def replace_handles(string):
    string = string.replace("%%PREFETCH%%", PREFETCH)
    string = string.replace("%%VERSIONCO%%", VERSIONCO)
    string = string.replace("%%ASSETSJSON%%", json.dumps(ASSETS, ensure_ascii=False))
    return string


for file in HANDLEPARSE:
    print(file)
    with open("src/" + file, "r") as f1:
        out = replace_handles(f1.read())
    with open("dist/" + file, "w") as f2:
        f2.write(out)
