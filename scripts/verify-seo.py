#!/usr/bin/env python3
"""Parse built sitemaps and compare their canonical/hreflang inventory with HTML."""
import argparse
import json
from pathlib import Path
from lib.seo_validation import verify_build


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--canonical-base", default="https://streamentry.github.io/LitMundi/")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = verify_build(Path(__file__).resolve().parent.parent, args.canonical_base.rstrip("/") + "/")
    if args.json:
        print(json.dumps(result))
    else:
        print("SEO verification passed:", len(result["urls"]), "canonical URLs in", len(result["child_sitemaps"]), "locale sitemaps;", result["checked_html_pages"], "public HTML pages checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
