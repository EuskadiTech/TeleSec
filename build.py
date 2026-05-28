from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import os


# =========================================================
# CONFIG
# =========================================================

ROOT = Path.cwd()
SRC_DIR = ROOT / "src"
ASSETS_DIR = ROOT / "assets"
DIST_DIR = ROOT / "dist"

VERSION = f"2026-02-23_{time.strftime('%Y%m%d%H%M%S')}"


@dataclass(slots=True)
class BuildConfig:
    edition: str
    pages_src_dir: Path
    pages_dist_dir: str
    use_app_bundle: bool
    use_page_bundle: bool
    required_pages: list[str]


CONFIG = BuildConfig(
    edition=os.getenv("TELESEC_EDITION", "AulaAdapt"),
    pages_src_dir=None,  # set below
    pages_dist_dir=os.getenv("TELESEC_PAGES_DIST", "pages").strip("/") or "pages",
    use_app_bundle=os.getenv("TELESEC_USE_APP_BUNDLE", "1").lower() not in {"0", "false", "no"},
    use_page_bundle=os.getenv("TELESEC_USE_PAGE_BUNDLE", "1").lower() not in {"0", "false", "no"},
    required_pages=[],
)


CORE_SCRIPTS = [
    "pwa.js",
    "config.js",
    "db.js",
    "app_logic.js",
    "app_modules.js",
    "builtin/login.js",
    "builtin/index.js",
    "builtin/personas.js",
    "builtin/dataman.js",
    "builtin/buscar.js",
]


# =========================================================
# HELPERS
# =========================================================

def run(cmd: list[str], *, error: str) -> None:
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(error, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)


def rel(path: Path, base: Path) -> str:
    return path.relative_to(base).as_posix()


def list_files(directory: Path, suffix: str | None = None) -> list[str]:
    if not directory.exists():
        return []

    files = []

    for file in directory.rglob("*"):
        if not file.is_file():
            continue

        if suffix and file.suffix != suffix:
            continue

        files.append(rel(file, directory))

    return sorted(files)


def normalize_page_name(name: str) -> str:
    name = name.strip().replace("\\", "/")

    if not name:
        return ""

    return name if name.endswith(".js") else f"{name}.js"


def parse_required_pages(value: str | None) -> list[str]:
    if not value:
        return []

    return [
        p
        for p in (
            normalize_page_name(v)
            for v in value.split(",")
        )
        if p
    ]


def pick_pages_source(edition: str) -> Path:
    custom = os.getenv("TELESEC_PAGES_SRC")

    if custom:
        return Path(custom)

    candidates = [
        ROOT / "EDITIONS" / edition / "pages",
        ROOT / "EDITIONS" / edition / "page",
        SRC_DIR / "pages",
        SRC_DIR / "page",
    ]

    for candidate in candidates:
        if candidate.is_dir():
            return candidate

    return SRC_DIR / "pages"


def order_pages(files: list[str], required: list[str]) -> list[str]:
    seen = set()
    ordered = []

    files_set = set(files)

    for page in required:
        if page in files_set:
            ordered.append(page)
            seen.add(page)

    ordered.extend(f for f in files if f not in seen)

    return ordered


def ensure_npm_dependencies() -> None:
    package_json = ROOT / "package.json"
    lock_file = ROOT / "node_modules/.package-lock.json"

    pkg_mtime = package_json.stat().st_mtime if package_json.exists() else 0
    lock_mtime = lock_file.stat().st_mtime if lock_file.exists() else 0

    if not (ROOT / "node_modules").exists() or pkg_mtime > lock_mtime:
        print("Installing npm dependencies...")

        run(
            ["npm", "install", "--prefer-offline"],
            error="npm install failed",
        )


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


# =========================================================
# BUNDLING
# =========================================================

def esbuild(input_file: Path, output_file: Path, *, bundle: bool = False) -> None:
    ensure_npm_dependencies()

    cmd = [
        "npx",
        "esbuild",
        str(input_file),
        "--minify",
        f"--outfile={output_file}",
        "--log-level=warning",
    ]

    if bundle:
        cmd.extend([
            "--bundle",
            "--format=iife",
        ])

    run(cmd, error="esbuild failed")


def build_pages_bundle(
    pages_src_dir: Path,
    pages_files: list[str],
) -> str | None:
    if not pages_files:
        return None

    entry = DIST_DIR / ".pages-entry.js"

    imports = []

    for file in pages_files:
        import_path = (
            Path("../") /
            pages_src_dir /
            file
        ).as_posix()

        imports.append(f'import "{import_path}";')

    write_file(entry, "\n".join(imports))

    output = DIST_DIR / "static/pages.bundle.js"

    esbuild(entry, output, bundle=True)

    entry.unlink(missing_ok=True)

    size = output.stat().st_size // 1024

    print(f"Pages bundle -> {size} KB")

    return "static/pages.bundle.js"


def build_app_bundle(
    core_scripts: list[str],
    pages_src_dir: Path,
    pages_files: list[str],
) -> str:
    output = DIST_DIR / "static/app.bundle.js"
    temp = DIST_DIR / "static/app.bundle.raw.js"

    chunks = ["/* TeleSec app bundle */"]

    all_files = [
        *(SRC_DIR / f for f in core_scripts),
        *(pages_src_dir / f for f in pages_files),
    ]

    for file in all_files:
        if not file.exists():
            print(f"Missing script: {file}", file=sys.stderr)
            sys.exit(1)

        chunks.append(f"\n/* ---- {file} ---- */\n")
        chunks.append(file.read_text(encoding="utf-8"))

    write_file(temp, "\n".join(chunks))

    esbuild(temp, output)

    temp.unlink(missing_ok=True)

    size = output.stat().st_size // 1024

    print(f"App bundle -> {size} KB")

    return "static/app.bundle.js"


# =========================================================
# HTML HELPERS
# =========================================================

def prefetch_tag(path: str) -> str:
    return f'<link rel="prefetch" href="{path}" />'


def script_tag(path: str) -> str:
    return f'<script src="{path}"></script>'


# =========================================================
# BUILD
# =========================================================

CONFIG.pages_src_dir = pick_pages_source(CONFIG.edition)
CONFIG.required_pages = parse_required_pages(
    os.getenv("TELESEC_REQUIRED_PAGES")
)

src_files = [
    f
    for f in list_files(SRC_DIR)
    if not f.endswith(".js")
]
src_files.append("sw.js")
asset_files = list_files(ASSETS_DIR)

pages_files = order_pages(
    list_files(CONFIG.pages_src_dir, ".js"),
    CONFIG.required_pages,
)

prefetch: list[str] = []
cache_urls: list[str] = [
    "./",
    "index.html",
    "manifest.json",
    "version.json",
]

page_scripts: list[str] = []
app_scripts: list[str] = []


# =========================================================
# DIST CLEAN
# =========================================================

if DIST_DIR.exists():
    shutil.rmtree(DIST_DIR)

shutil.copytree(ASSETS_DIR, DIST_DIR, dirs_exist_ok=True)


# =========================================================
# ASSETS
# =========================================================

for asset in asset_files:
    if asset == "sw.js":
        continue

    prefetch.append(prefetch_tag(asset))
    cache_urls.append(asset)


# =========================================================
# SOURCE PREFETCH
# =========================================================

for src in src_files:
    if (
        src != "sw.js"
        and not src.startswith("page/")
        and not src.startswith("pages/")
    ):
        prefetch.append(prefetch_tag(src))


# =========================================================
# BUNDLES
# =========================================================

if CONFIG.use_app_bundle:
    bundle = build_app_bundle(
        CORE_SCRIPTS,
        CONFIG.pages_src_dir,
        pages_files,
    )

    app_scripts.append(script_tag(bundle))
    prefetch.append(prefetch_tag(bundle))
    cache_urls.append(bundle)

elif CONFIG.use_page_bundle:
    bundle = build_pages_bundle(
        CONFIG.pages_src_dir,
        pages_files,
    )

    if bundle:
        page_scripts.append(script_tag(bundle))
        prefetch.append(prefetch_tag(bundle))
        cache_urls.append(bundle)

else:
    for page in pages_files:
        page_path = f"{CONFIG.pages_dist_dir}/{page}"

        page_scripts.append(script_tag(page_path))
        prefetch.append(prefetch_tag(page_path))
        cache_urls.append(page_path)

    shutil.copytree(
        CONFIG.pages_src_dir,
        DIST_DIR / CONFIG.pages_dist_dir,
        dirs_exist_ok=True,
    )


# =========================================================
# NON-BUNDLED CORE SCRIPTS
# =========================================================

if not CONFIG.use_app_bundle:
    for script in CORE_SCRIPTS:
        app_scripts.append(script_tag(script))
        cache_urls.append(script)

    app_scripts.extend(page_scripts)


# =========================================================
# TEMPLATE REPLACEMENT
# =========================================================

cache_urls = list(dict.fromkeys(cache_urls))


def replace_handles(content: str) -> str:
    replacements = {
        "%%PREFETCH%%": "\n".join(prefetch),
        "%%VERSIONCO%%": VERSION,
        "%%EDITION%%": CONFIG.edition,
        "%%ASSETSJSON%%": json.dumps(asset_files, ensure_ascii=False),
        "%%CACHE_URLS%%": json.dumps(cache_urls, ensure_ascii=False),
        "%%PAGES%%": "\n".join(page_scripts),
        "%%APP_SCRIPTS%%": "\n".join(app_scripts),
    }

    for key, value in replacements.items():
        content = content.replace(key, value)

    return content

# =========================================================
# FILES INCLUDED INSIDE APP BUNDLE
# =========================================================

bundled_files: set[str] = set()

if CONFIG.use_app_bundle:
    bundled_files.update(CORE_SCRIPTS)

    for page in pages_files:
        bundled_files.add(
            rel(CONFIG.pages_src_dir / page, ROOT)
        )


# =========================================================
# GENERATE DIST
# =========================================================

for file in src_files:
    # Skip files already included in app bundle
    if file in bundled_files:
        continue

    src_path = SRC_DIR / file
    dist_path = DIST_DIR / file

    print(file)

    content = replace_handles(
        src_path.read_text(encoding="utf-8")
    )

    write_file(dist_path, content)
