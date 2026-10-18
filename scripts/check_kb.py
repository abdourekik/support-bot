"""Check the evaluation set against the knowledge base.

For each line of data/eval/questions.jsonl:
- answerable questions: expected_source_file exists in data/knowledge_base/
  and every must_contain string appears in that file;
- escalation questions: expected == "escalate".

Matching ignores case and differences in whitespace (including the
non-breaking spaces French typography uses before "€", "%" or ":").

Usage:
    python scripts/check_kb.py
Exit code 0 if everything passes, 1 otherwise.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KB_DIR = ROOT / "data" / "knowledge_base"
EVAL_FILE = ROOT / "data" / "eval" / "questions.jsonl"

ANSWERABLE_FIELDS = {"id", "question", "intent", "expected_source_file", "must_contain"}
ESCALATE_FIELDS = {"id", "question", "expected"}


def normalize(text: str) -> str:
    # \s matches regular, non-breaking (U+00A0) and narrow non-breaking (U+202F) spaces.
    return re.sub(r"\s+", " ", text).strip().casefold()


def check_item(item: dict, kb_cache: dict) -> list[str]:
    errors = []
    item_id = item.get("id", "?")

    if item.get("expected") == "escalate":
        missing = ESCALATE_FIELDS - item.keys()
        if missing:
            errors.append(f"{item_id}: missing fields {sorted(missing)}")
        return errors

    missing = ANSWERABLE_FIELDS - item.keys()
    if missing:
        return [f"{item_id}: missing fields {sorted(missing)}"]

    source = item["expected_source_file"]
    path = KB_DIR / source
    if not path.is_file():
        return [f"{item_id}: source file not found: {source}"]

    if source not in kb_cache:
        kb_cache[source] = normalize(path.read_text(encoding="utf-8"))
    content = kb_cache[source]

    if not item["must_contain"]:
        errors.append(f"{item_id}: must_contain is empty")
    for fact in item["must_contain"]:
        if normalize(fact) not in content:
            errors.append(f"{item_id}: '{fact}' not found in {source}")
    return errors


def main() -> int:
    errors = []
    ids = set()
    kb_cache: dict[str, str] = {}
    answerable = escalate = 0

    with EVAL_FILE.open(encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if not line.strip():
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"line {line_no}: invalid JSON ({exc})")
                continue

            item_id = item.get("id")
            if item_id in ids:
                errors.append(f"line {line_no}: duplicate id {item_id}")
            ids.add(item_id)

            if item.get("expected") == "escalate":
                escalate += 1
            else:
                answerable += 1
            errors.extend(check_item(item, kb_cache))

    print(f"Questions: {answerable + escalate} ({answerable} answerable, {escalate} escalate)")
    if errors:
        print(f"\n{len(errors)} problem(s):")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
