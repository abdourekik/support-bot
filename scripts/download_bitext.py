"""Download the Bitext customer support dataset into data/raw/.

Dataset: https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset
License: CDLA-Sharing-1.0 (see README.md, "Data attribution").

Usage:
    python scripts/download_bitext.py
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

REPO = "bitext/Bitext-customer-support-llm-chatbot-training-dataset"
# Pin the dataset revision so every run downloads exactly the same file.
REVISION = "430d1a89bd93bd1fa23c16f29dd53e73f0087443"
FILENAME = "Bitext_Sample_Customer_Support_Training_Dataset_27K_responses-v11.csv"
SHA256 = "6f81102b0100b97b8468eb04368033a23206bf1fde9d53500d5806ec1001a434"

URL = f"https://huggingface.co/datasets/{REPO}/resolve/{REVISION}/{FILENAME}"
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
TARGET = RAW_DIR / "bitext_customer_support.csv"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if TARGET.exists() and sha256_of(TARGET) == SHA256:
        print(f"Already downloaded: {TARGET}")
        return 0

    print(f"Downloading {URL}")
    tmp = TARGET.with_suffix(".part")
    urllib.request.urlretrieve(URL, tmp)

    actual = sha256_of(tmp)
    if actual != SHA256:
        tmp.unlink()
        print(f"Checksum mismatch: expected {SHA256}, got {actual}", file=sys.stderr)
        return 1

    tmp.replace(TARGET)
    print(f"Saved {TARGET} ({TARGET.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
