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


def get_js_files(directory):
    files = []
    if not os.path.isdir(directory):
        return files
    for root, _, filenames in os.walk(directory):
        for filename in filenames:
            if not filename.endswith(".js"):
                continue
            path = os.path.join(root, filename)
            rel_path = os.path.relpath(path, directory)
            files.append(rel_path.replace('\\', '/'))
    files.sort()
    return files


def pick_pages_source(edition):
    custom_dir = os.environ.get("TELESEC_PAGES_SRC")
    if custom_dir:
        return custom_dir

    candidates = [
        os.path.join("src", "pages", edition),
        os.path.join("src", "pages"),
        os.path.join("src", "page"),
    ]
    for candidate in candidates:
        if os.path.isdir(candidate):
            return candidate

    return os.path.join("src", "pages")


PREFETCH = ""
VERSIONCO = "2026-02-23_" + time.strftime("%Y%m%d%H%M%S")
HANDLEPARSE = get_all_files("src")
EDITION = os.environ.get("TELESEC_EDITION", "AulaAdapt")
PAGES_SRC_DIR = pick_pages_source(EDITION)
PAGES_DIST_DIR = os.environ.get("TELESEC_PAGES_DIST", "pages").strip("/") or "pages"
PAGES_FILES = get_js_files(PAGES_SRC_DIR)
PAGES = ""
# Combine assets from JSON and recursively found files
ASSETS = get_all_files("assets")

for asset in ASSETS:
    if asset != "sw.js":
        PREFETCH += f'<link rel="prefetch" href="{asset}" />\n'
for src in HANDLEPARSE:
    if src != "sw.js" and not src.startswith("page/") and not src.startswith("pages/"):
        PREFETCH += f'<link rel="prefetch" href="{src}" />\n'
for page_file in PAGES_FILES:
    page_path = f"{PAGES_DIST_DIR}/{page_file}"
    PREFETCH += f'<link rel="prefetch" href="{page_path}" />\n'
    PAGES += f'<script src="{page_path}"></script>\n'

if os.path.exists("dist"):
    shutil.rmtree("dist")
shutil.copytree("assets", "dist", dirs_exist_ok=True)

# Copy edition pages to dist/<PAGES_DIST_DIR>/
if PAGES_FILES:
    shutil.copytree(PAGES_SRC_DIR, os.path.join("dist", PAGES_DIST_DIR), dirs_exist_ok=True)


def replace_handles(string):
    string = string.replace("%%PREFETCH%%", PREFETCH)
    string = string.replace("%%VERSIONCO%%", VERSIONCO)
    string = string.replace("%%EDITION%%", EDITION)
    string = string.replace("%%ASSETSJSON%%", json.dumps(ASSETS, ensure_ascii=False))
    string = string.replace("%%PAGES%%", PAGES)
    return string


for file in HANDLEPARSE:
    # Skip the RxDB bundle entry – it's built by esbuild, not copied directly
    if file == "rxdb-bundle.js" or file.startswith("page/") or file.startswith("pages/"):
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
