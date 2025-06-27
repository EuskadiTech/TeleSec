import json
ASSETS = json.load(open("_assets.json", "r"))
PREFETCH = ""
VERSIONCO = "2025-06-27_1"
HANDLEPARSE = ["index.html", "sw.js"]
for asset in ASSETS:
    PREFETCH += f'<link rel="prefetch" href="{asset}" />\n'

def replace_handles(string):
    string = string.replace("%%PREFETCH%%", PREFETCH)
    string = string.replace("%%VERSIONCO%%", VERSIONCO)
    string = string.replace("%%ASSETSJSON%%", json.dumps(ASSETS, ensure_ascii=False))
    return string

for file in HANDLEPARSE:

    with open("src/" + file, "r") as f:
        out = replace_handles(f.read())
    with open("dist/" + file, "w") as f:
        f.write(out)
