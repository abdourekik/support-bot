"""Print Bitext categories and intents with row counts.

Usage:
    python scripts/explore_bitext.py
"""

import csv
import sys
from collections import Counter
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "raw" / "bitext_customer_support.csv"


def main() -> int:
    if not CSV_PATH.exists():
        print(f"Missing {CSV_PATH}. Run scripts/download_bitext.py first.", file=sys.stderr)
        return 1

    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    categories = Counter(row["category"] for row in rows)
    intents = Counter((row["category"], row["intent"]) for row in rows)

    print(f"Rows: {len(rows)}")
    print(f"Categories: {len(categories)}  Intents: {len(intents)}\n")

    for category, count in sorted(categories.items()):
        print(f"{category} ({count})")
        for (cat, intent), n in sorted(intents.items()):
            if cat == category:
                print(f"    {intent:<28} {n:>5}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
