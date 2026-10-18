"""Evaluate the support chatbot against data/eval/questions.jsonl.

Sends every question to the chat webhook (one new session per question, with a
delay for the Gemini free tier), then measures:
- answerable questions: correct source file, all must_contain facts present;
- escalation questions: correctly escalated;
- false escalations on answerable questions;
- latency, and the best-similarity "confidence" logged in Supabase, to tune
  the escalation threshold.

The eval rows are deleted from Supabase at the end (use --keep-logs to keep them).
Writes docs/eval_report.md.

Usage:
    python scripts/evaluate.py [--delay 5] [--limit N] [--keep-logs]
"""

import argparse
import json
import re
import statistics
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVAL_FILE = ROOT / "data" / "eval" / "questions.jsonl"
REPORT_FILE = ROOT / "docs" / "eval_report.md"
THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7]
CURRENT_THRESHOLD = 0.6  # SIMILARITY_THRESHOLD in the n8n node "Parse answer"


def load_env(path: Path) -> dict[str, str]:
    env = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def normalize(text: str) -> str:
    """Lowercase and remove formatting differences ("160×200" = "160 x 200", "40°C" = "40 °C")."""
    text = text.casefold().replace("\u2019", "'").replace("×", "x")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\d)\s*x\s*(\d)", r"\1 x \2", text)
    text = re.sub(r"(\d)\s*°", r"\1 °", text)
    text = re.sub(r"(\d)\s*(€|%)", r"\1 \2", text)
    return text.strip()


def post_json(url: str, body: dict, timeout: int = 90) -> tuple[int, dict | None]:
    req = urllib.request.Request(
        url, json.dumps(body).encode("utf-8"), {"Content-Type": "application/json; charset=utf-8"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        return exc.code, None
    except (urllib.error.URLError, TimeoutError):
        return 0, None


def ask(url: str, session_id: str, question: str) -> tuple[dict | None, float]:
    """One retry on an empty response, a network error or HTTP 429."""
    for attempt in range(2):
        start = time.perf_counter()
        status, data = post_json(url, {"session_id": session_id, "message": question})
        elapsed = time.perf_counter() - start
        if status == 200 and data and "answer" in data:
            return data, elapsed
        if attempt == 0:
            time.sleep(15 if status == 429 else 5)
    return None, elapsed


def supabase(env: dict, path: str, method: str = "GET") -> list:
    req = urllib.request.Request(
        f"{env['SUPABASE_URL'].rstrip('/')}/rest/v1/{path}",
        headers={"apikey": env["SUPABASE_SERVICE_ROLE_KEY"], "Prefer": "return=representation"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read() or b"[]")


def pct(n: int, d: int) -> str:
    return f"{n}/{d} ({100 * n / d:.0f} %)" if d else "n/a"


def md_escape(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--delay", type=float, default=5.0, help="seconds between questions (free tier)")
    parser.add_argument("--limit", type=int, default=0, help="only the first N questions")
    parser.add_argument("--keep-logs", action="store_true", help="keep the eval rows in Supabase")
    args = parser.parse_args()

    env = load_env(ROOT / ".env")
    url = env.get("VITE_CHAT_WEBHOOK_URL") or "http://localhost:5678/webhook/chat"
    questions = [json.loads(line) for line in EVAL_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.limit:
        questions = questions[: args.limit]

    run_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    prefix = f"eval-{run_id}-"
    print(f"Run {run_id}: {len(questions)} questions -> {url} (delay {args.delay}s)\n")

    results = []
    for i, q in enumerate(questions, start=1):
        data, latency = ask(url, prefix + q["id"], q["question"])
        r = {"q": q, "latency": latency, "error": data is None}
        if data:
            files = [s.get("file") for s in data.get("sources", [])]
            r.update(answer=data["answer"], escalated=bool(data.get("escalated")), files=files)
            if q.get("expected") == "escalate":
                r["ok"] = r["escalated"]
            else:
                answer_norm = normalize(data["answer"])
                r["source_ok"] = q["expected_source_file"] in files
                r["missing"] = [f for f in q["must_contain"] if normalize(f) not in answer_norm]
                r["ok"] = r["source_ok"] and not r["missing"] and not r["escalated"]
        else:
            r.update(answer="", escalated=False, files=[], ok=False, source_ok=False, missing=q.get("must_contain", []))
        results.append(r)
        print(f"[{i:2}/{len(questions)}] {q['id']} {'OK  ' if r['ok'] else 'FAIL'} {latency:5.1f}s  {q['question'][:60]}")
        if i < len(questions):
            time.sleep(args.delay)

    # Confidence (best similarity) logged by the workflow, then cleanup.
    confidence = {}
    try:
        for row in supabase(env, f"conversations?session_id=like.{prefix}*&select=session_id,confidence"):
            confidence[row["session_id"].removeprefix(prefix)] = row["confidence"]
        if not args.keep_logs:
            deleted = sum(len(supabase(env, f"{t}?session_id=like.{prefix}*&select=id", "DELETE"))
                          for t in ("escalations", "conversations"))
            print(f"\nDeleted {deleted} eval rows from Supabase.")
    except (urllib.error.URLError, KeyError) as exc:
        print(f"\nCould not read or clean Supabase logs: {exc}", file=sys.stderr)
    for r in results:
        r["confidence"] = confidence.get(r["q"]["id"])

    answerable = [r for r in results if r["q"].get("expected") != "escalate"]
    escalate = [r for r in results if r["q"].get("expected") == "escalate"]
    n_source = sum(r["source_ok"] for r in answerable)
    n_facts = sum(not r["missing"] for r in answerable)
    n_false_esc = sum(r["escalated"] for r in answerable)
    n_esc_ok = sum(r["ok"] for r in escalate)
    n_errors = sum(r["error"] for r in results)
    latencies = sorted(r["latency"] for r in results if not r["error"])

    summary = [
        ("Answerable: correct source file", pct(n_source, len(answerable))),
        ("Answerable: all must_contain facts present", pct(n_facts, len(answerable))),
        ("Answerable: fully correct (source + facts, not escalated)", pct(sum(r["ok"] for r in answerable), len(answerable))),
        ("Answerable: falsely escalated", pct(n_false_esc, len(answerable))),
        ("Escalation questions: correctly escalated", pct(n_esc_ok, len(escalate))),
        ("Requests failed (no answer)", str(n_errors)),
        ("Latency median / max", f"{statistics.median(latencies):.1f} s / {latencies[-1]:.1f} s" if latencies else "n/a"),
    ]

    # Threshold analysis: only questions that reached the search step have a confidence.
    ans_conf = [r["confidence"] for r in answerable if r["confidence"] is not None]
    esc_conf = [r["confidence"] for r in escalate if r["confidence"] is not None]
    threshold_rows = [
        (t, sum(c < t for c in ans_conf), sum(c < t for c in esc_conf)) for t in THRESHOLDS
    ]

    lines = [
        "# Evaluation report",
        "",
        f"Run `{run_id}` on {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC · {len(results)} questions "
        f"({len(answerable)} answerable, {len(escalate)} must escalate) · `python scripts/evaluate.py`",
        "",
        "## Summary",
        "",
        "| Metric | Result |",
        "|---|---|",
        *[f"| {name} | {value} |" for name, value in summary],
        "",
        "\"All must_contain facts present\" is strict: the answer must contain each key fact "
        "(case, spacing and `×`/`x` are ignored). A correct paraphrase counts as a miss.",
        "",
        "## Escalation threshold",
        "",
        f"Best similarity of the retrieved chunks (logged as `confidence`). Current threshold: {CURRENT_THRESHOLD}. "
        f"Questions caught by a rule never reach the search, so only {len(esc_conf)} of the "
        f"{len(escalate)} escalation questions have a value.",
        "",
        f"- Answerable questions: min {min(ans_conf):.2f}, median {statistics.median(ans_conf):.2f}, max {max(ans_conf):.2f}"
        if ans_conf else "- Answerable questions: no data",
        f"- Escalation questions that reached the search: "
        + (", ".join(f"{c:.2f}" for c in sorted(esc_conf)) if esc_conf else "none"),
        "",
        "| Threshold | Answerable questions below (would be escalated) | Escalation questions below (caught) |",
        "|---|---|---|",
        *[f"| {t:.2f} | {a}/{len(ans_conf)} | {e}/{len(esc_conf)} |" for t, a, e in threshold_rows],
        "",
        "## Failures",
        "",
    ]

    failures = [r for r in results if not r["ok"]]
    if not failures:
        lines.append("None.")
    for r in failures:
        q = r["q"]
        if q.get("expected") == "escalate":
            problem = "not escalated" if not r["error"] else "no answer"
        else:
            problems = []
            if r["error"]:
                problems.append("no answer")
            if r["escalated"]:
                problems.append("falsely escalated")
            if not r["source_ok"] and not r["error"]:
                problems.append(f"wrong source ({', '.join(r['files']) or 'none'}; expected {q['expected_source_file']})")
            if r["missing"] and not r["error"]:
                problems.append("missing: " + ", ".join(f"`{m}`" for m in r["missing"]))
            problem = "; ".join(problems)
        conf = f"{r['confidence']:.2f}" if r["confidence"] is not None else "-"
        lines += [
            f"### {q['id']} · {problem}",
            "",
            f"- Question: {md_escape(q['question'])}",
            f"- Confidence: {conf}",
            f"- Answer: {md_escape(r['answer']) or '(none)'}",
            "",
        ]

    lines += [
        "## All results",
        "",
        "| id | expected | escalated | sources | confidence | ok |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        q = r["q"]
        conf = f"{r['confidence']:.2f}" if r["confidence"] is not None else "-"
        expected = "escalate" if q.get("expected") == "escalate" else q["expected_source_file"]
        lines.append(
            f"| {q['id']} | {expected} | {r['escalated']} | {', '.join(r['files']) or '-'} | {conf} | {'✅' if r['ok'] else '❌'} |"
        )

    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print()
    for name, value in summary:
        print(f"{name:<60} {value}")
    print(f"\nReport: {REPORT_FILE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
