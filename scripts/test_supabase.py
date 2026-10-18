"""Check that the Supabase schema from supabase/migrations/001_init.sql is in place.

Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env and the Supabase
REST API (PostgREST). Checks:
- the tables documents, conversations and escalations exist;
- the match_documents function can be called with a 768-dimension vector;
- a request without any key is refused.

Usage:
    python scripts/test_supabase.py
Exit code 0 if everything passes, 1 otherwise.
"""

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TABLES = ["documents", "conversations", "escalations"]
EMBEDDING_DIM = 768


def load_env(path: Path) -> dict[str, str]:
    """Minimal .env reader (KEY=value lines), so no extra package is needed."""
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def request(url: str, key: str | None, body: dict | None = None) -> tuple[int, str]:
    headers = {"Content-Type": "application/json"}
    if key:
        headers["apikey"] = key
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()


def main() -> int:
    env = load_env(ROOT / ".env")
    base_url = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not key:
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env", file=sys.stderr)
        return 1

    rest = f"{base_url}/rest/v1"
    failures = 0

    def report(ok: bool, label: str, detail: str = "") -> None:
        nonlocal failures
        failures += not ok
        print(f"[{'OK' if ok else 'FAIL'}] {label}" + (f" - {detail}" if detail and not ok else ""))

    for table in TABLES:
        status, body = request(f"{rest}/{table}?select=*&limit=1", key)
        report(status == 200, f"table {table} exists", f"HTTP {status}: {body[:200]}")

    status, body = request(
        f"{rest}/rpc/match_documents",
        key,
        {"query_embedding": [0.01] * EMBEDDING_DIM, "match_count": 1, "filter": {}},
    )
    report(status == 200, "function match_documents works with a 768-dim vector", f"HTTP {status}: {body[:200]}")

    status, _ = request(f"{rest}/documents?select=id&limit=1", None)
    report(status in (401, 403), "request without a key is refused", f"HTTP {status}")

    print("\nAll checks passed." if not failures else f"\n{failures} check(s) failed.")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
