import json
import os
import shutil
import subprocess
import sys
import time


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
VERSIONCO = "2026-02-23_" + time.strftime("%Y%m%d%H%M%S")
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
shutil.copytree("assets", "dist", dirs_exist_ok=True)


def replace_handles(string):
    string = string.replace("%%PREFETCH%%", PREFETCH)
    string = string.replace("%%VERSIONCO%%", VERSIONCO)
    string = string.replace("%%TITLE%%", TITLE)
    string = string.replace("%%HOSTER%%", HOSTER)
    string = string.replace("%%ASSETSJSON%%", json.dumps(ASSETS, ensure_ascii=False))
    return string


for file in HANDLEPARSE:
    # Skip the RxDB bundle entry – it's built by esbuild, not copied directly
    if file == "rxdb-bundle.js":
        continue
    print(file)
    with open("src/" + file, "r", encoding="utf-8") as f1:
        out = replace_handles(f1.read())
    with open("dist/" + file, "w", encoding="utf-8") as f2:
        f2.write(out)


# ---------------------------------------------------------------------------
# Bundle RxDB with esbuild → dist/static/rxdb.js
# ---------------------------------------------------------------------------
def bundle_rxdb():
    """Build the RxDB browser bundle using esbuild."""
    # Check if node_modules is up-to-date by comparing package.json mtime
    pkg_mtime = os.path.getmtime("package.json") if os.path.exists("package.json") else 0
    nm_mtime = os.path.getmtime("node_modules/.package-lock.json") if os.path.exists("node_modules/.package-lock.json") else 0

    if not os.path.exists("node_modules") or pkg_mtime > nm_mtime:
        print("Installing npm dependencies…")
        result = subprocess.run(
            ["npm", "install", "--prefer-offline"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print("npm install failed:", result.stderr, file=sys.stderr)
            sys.exit(1)

    print("Bundling RxDB…")
    result = subprocess.run(
        [
            "npx",
            "esbuild",
            "src/rxdb-bundle.js",
            "--bundle",
            "--format=iife",
            "--global-name=RxDB",
            "--outfile=dist/static/rxdb.js",
            "--minify",
            "--log-level=warning",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("esbuild failed:", result.stderr, file=sys.stderr)
        sys.exit(1)
    size_kb = os.path.getsize("dist/static/rxdb.js") // 1024
    print(f"RxDB bundled → dist/static/rxdb.js ({size_kb} KB)")


bundle_rxdb()
