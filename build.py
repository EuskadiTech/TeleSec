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
        os.path.join("EDITIONS", edition, "pages"),
        os.path.join("EDITIONS", edition, "page"),
        os.path.join("src", "pages"),
        os.path.join("src", "page"),
    ]
    for candidate in candidates:
        if os.path.isdir(candidate):
            return candidate

    return os.path.join("src", "pages")


def normalize_page_name(name):
    cleaned = (name or "").strip().replace("\\", "/")
    if not cleaned:
        return ""
    if cleaned.endswith(".js"):
        return cleaned
    return cleaned + ".js"


def parse_required_pages(raw_value):
    if not raw_value:
        return []
    items = [normalize_page_name(v) for v in raw_value.split(",")]
    return [v for v in items if v]


def order_pages(pages_files, required_pages):
    """Load required pages first, then load the rest as common pages."""
    if not pages_files:
        return []

    pages_set = set(pages_files)
    required_existing = []
    seen = set()
    for page in required_pages:
        if page in pages_set and page not in seen:
            required_existing.append(page)
            seen.add(page)

    common_pages = [page for page in pages_files if page not in seen]
    return required_existing + common_pages


def ensure_npm_dependencies():
    """Install npm dependencies when package metadata changed."""
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


def bundle_pages(pages_src_dir, pages_files):
    """Bundle page scripts into a single legacy-compatible IIFE file."""
    if not pages_files:
        return None

    ensure_npm_dependencies()

    entry_path = os.path.join("dist", ".pages-entry.js")
    with open(entry_path, "w", encoding="utf-8") as f:
        for page_file in pages_files:
            import_path = os.path.relpath(
                os.path.join(pages_src_dir, page_file),
                "dist",
            ).replace("\\", "/")
            if not import_path.startswith("."):
                import_path = "./" + import_path
            f.write(f'import "{import_path}";\n')

    print("Bundling page scripts…")
    result = subprocess.run(
        [
            "npx",
            "esbuild",
            entry_path,
            "--bundle",
            "--format=iife",
            "--outfile=dist/static/pages.bundle.js",
            "--minify",
            "--log-level=warning",
        ],
        capture_output=True,
        text=True,
    )
    if os.path.exists(entry_path):
        os.remove(entry_path)
    if result.returncode != 0:
        print("esbuild pages bundle failed:", result.stderr, file=sys.stderr)
        sys.exit(1)

    size_kb = os.path.getsize("dist/static/pages.bundle.js") // 1024
    print(f"Pages bundled → dist/static/pages.bundle.js ({size_kb} KB)")
    return "static/pages.bundle.js"


def bundle_application(core_scripts, pages_src_dir, pages_files):
    """Bundle all app scripts into one legacy-compatible global-scope file."""
    ensure_npm_dependencies()
    print("Bundling application scripts…")
    out_path = os.path.join("dist", "static", "app.bundle.js")
    raw_path = os.path.join("dist", "static", "app.bundle.raw.js")
    ordered_files = [os.path.join("src", f) for f in core_scripts]
    ordered_files.extend([os.path.join(pages_src_dir, f) for f in pages_files])

    with open(raw_path, "w", encoding="utf-8") as out:
        out.write("/* TeleSec app bundle (legacy global scope) */\n")
        for input_path in ordered_files:
            if not os.path.exists(input_path):
                print(f"Missing app script: {input_path}", file=sys.stderr)
                sys.exit(1)
            with open(input_path, "r", encoding="utf-8") as srcf:
                out.write(f"\n/* ---- {input_path} ---- */\n")
                out.write(srcf.read())
                out.write("\n")

    result = subprocess.run(
        [
            "npx",
            "esbuild",
            raw_path,
            "--minify",
            "--outfile=dist/static/app.bundle.js",
            "--log-level=warning",
        ],
        capture_output=True,
        text=True,
    )
    if os.path.exists(raw_path):
        os.remove(raw_path)
    if result.returncode != 0:
        print("esbuild app minify failed:", result.stderr, file=sys.stderr)
        sys.exit(1)

    size_kb = os.path.getsize(out_path) // 1024
    print(f"Application bundled → dist/static/app.bundle.js ({size_kb} KB)")
    return "static/app.bundle.js"


PREFETCH = ""
VERSIONCO = "2026-02-23_" + time.strftime("%Y%m%d%H%M%S")
HANDLEPARSE = get_all_files("src")
EDITION = os.environ.get("TELESEC_EDITION", "AulaAdapt")
PAGES_SRC_DIR = pick_pages_source(EDITION)
PAGES_DIST_DIR = os.environ.get("TELESEC_PAGES_DIST", "pages").strip("/") or "pages"
CORE_SCRIPTS = [
    "pwa.js",
    "config.js",
    "db.js",
    "app_logic.js",
    "app_modules.js",
    "login.js",
    "index.js",
    "personas.js",
]
USE_APP_BUNDLE = os.environ.get("TELESEC_USE_APP_BUNDLE", "1").strip().lower() not in {"0", "false", "no"}
USE_PAGE_BUNDLE = os.environ.get("TELESEC_USE_PAGE_BUNDLE", "1").strip().lower() not in {"0", "false", "no"}
REQUIRED_PAGES = parse_required_pages(os.environ.get("TELESEC_REQUIRED_PAGES", ""))
PAGES_FILES = order_pages(get_js_files(PAGES_SRC_DIR), REQUIRED_PAGES)
PAGES = ""
APP_SCRIPTS = ""
CACHE_URLS = ["./", "index.html", "manifest.json", "version.json"]
# Combine assets from JSON and recursively found files
ASSETS = get_all_files("assets")

for asset in ASSETS:
    if asset != "sw.js":
        PREFETCH += f'<link rel="prefetch" href="{asset}" />\n'
        CACHE_URLS.append(asset)
for src in HANDLEPARSE:
    if src != "sw.js" and not src.startswith("page/") and not src.startswith("pages/"):
        PREFETCH += f'<link rel="prefetch" href="{src}" />\n'

if os.path.exists("dist"):
    shutil.rmtree("dist")
shutil.copytree("assets", "dist", dirs_exist_ok=True)

# Copy edition pages only in non-bundled mode
if PAGES_FILES and not USE_PAGE_BUNDLE and not USE_APP_BUNDLE:
    shutil.copytree(PAGES_SRC_DIR, os.path.join("dist", PAGES_DIST_DIR), dirs_exist_ok=True)

if USE_APP_BUNDLE:
    app_bundle_path = bundle_application(CORE_SCRIPTS, PAGES_SRC_DIR, PAGES_FILES)
    PREFETCH += f'<link rel="prefetch" href="{app_bundle_path}" />\n'
    APP_SCRIPTS = f'<script src="{app_bundle_path}"></script>\n'
    CACHE_URLS.append(app_bundle_path)
elif PAGES_FILES and USE_PAGE_BUNDLE:
    pages_bundle_path = bundle_pages(PAGES_SRC_DIR, PAGES_FILES)
    if pages_bundle_path:
        PREFETCH += f'<link rel="prefetch" href="{pages_bundle_path}" />\n'
        PAGES += f'<script src="{pages_bundle_path}"></script>\n'
        CACHE_URLS.append(pages_bundle_path)
elif PAGES_FILES and not USE_APP_BUNDLE:
    for page_file in PAGES_FILES:
        page_path = f"{PAGES_DIST_DIR}/{page_file}"
        PREFETCH += f'<link rel="prefetch" href="{page_path}" />\n'
        PAGES += f'<script src="{page_path}"></script>\n'
        CACHE_URLS.append(page_path)

if not USE_APP_BUNDLE:
    for core_script in CORE_SCRIPTS:
        APP_SCRIPTS += f'<script src="{core_script}"></script>\n'
        CACHE_URLS.append(core_script)
    APP_SCRIPTS += PAGES

# RxDB bundle is generated into dist/static/rxdb.js and is required offline.
CACHE_URLS.append("static/rxdb.js")

# Preserve insertion order while removing duplicates.
CACHE_URLS = list(dict.fromkeys(CACHE_URLS))


def replace_handles(string):
    string = string.replace("%%PREFETCH%%", PREFETCH)
    string = string.replace("%%VERSIONCO%%", VERSIONCO)
    string = string.replace("%%EDITION%%", EDITION)
    string = string.replace("%%ASSETSJSON%%", json.dumps(ASSETS, ensure_ascii=False))
    string = string.replace("%%CACHE_URLS%%", json.dumps(CACHE_URLS, ensure_ascii=False))
    string = string.replace("%%PAGES%%", PAGES)
    string = string.replace("%%APP_SCRIPTS%%", APP_SCRIPTS)
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
    ensure_npm_dependencies()

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
