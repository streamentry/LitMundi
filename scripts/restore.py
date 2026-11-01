#!/usr/bin/env python3
"""Verify and restore a LitMundi archive offline using Python 3's standard library."""
import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path, PurePosixPath

def fail(message):
    raise ValueError(message)

def safe_path(root, name):
    if not isinstance(name, str) or "\\" in name:
        fail("Invalid archive path")
    p = PurePosixPath(name)
    if p.is_absolute() or not p.parts or any(x in ("..", ".", "") for x in p.parts):
        fail("Unsafe archive path: " + name)
    target = root.joinpath(*p.parts)
    if root not in target.resolve().parents:
        fail("Path escapes archive: " + name)
    current = root
    for part in p.parts:
        current = current / part
        if current.is_symlink():
            fail("Archive symlinks are not permitted: " + name)
    return target

def load(root, name):
    return json.loads(safe_path(root, name).read_text(encoding="utf-8"))

def edition_title(work, edition):
    """Older archives may predate per-edition titles; retain their original title."""
    title = edition.get("title")
    return work["title"] if title is None else title

def verify(root):
    manifest_path = safe_path(root, "manifest.json")
    raw = manifest_path.read_bytes()
    expected = safe_path(root, "manifest.sha256").read_text(encoding="ascii").strip()
    actual = hashlib.sha256(raw).hexdigest() + "  manifest.json"
    if expected != actual:
        fail("Manifest SHA-256 mismatch")
    manifest = json.loads(raw)
    if manifest.get("format") != "LitMundi corpus archive v2":
        fail("Unsupported archive format")
    paths = set()
    for record in manifest["files"]:
        name = record["path"]
        if name in paths or name in ("manifest.json", "manifest.sha256"):
            fail("Duplicate or reserved manifest path: " + name)
        paths.add(name)
        file = safe_path(root, name)
        data = file.read_bytes()
        if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
            fail("Fixity failure: " + name)
    actual_paths = set()
    for p in root.rglob("*"):
        if p.is_symlink():
            fail("Archive contains a symlink: " + str(p))
        if p.is_file():
            actual_paths.add(p.relative_to(root).as_posix())
    if actual_paths != paths | {"manifest.json", "manifest.sha256"}:
        fail("Archive inventory mismatch: unexpected or missing files")
    # These files are the independent reconstruction contract.
    for name in ("corpus/catalog/works.json", "corpus/catalog/editions.json", "rights-manifest.json"):
        load(root, name)
    return manifest

def restore(root, output):
    if output == root or root in output.parents:
        fail("Restored output must be outside the verified archive")
    if output.exists() and any(output.iterdir()):
        fail("Use an empty output directory; existing files are not overwritten")
    output.mkdir(parents=True, exist_ok=True)
    edition_output = output / "editions"
    edition_output.mkdir()
    works = {w["id"]: w for w in load(root, "corpus/catalog/works.json")}
    editions = load(root, "corpus/catalog/editions.json")
    links = []
    count = 0
    for edition in editions:
        work = works[edition["work_id"]]
        if edition["status"] != "published" or work["visibility"] != "public":
            continue
        title = edition_title(work, edition)
        if edition["rights"]["status"] not in ("public_domain_assessed", "cleared"):
            fail("Published edition has no assessed rights: " + edition["id"])
        for identifier in (edition["id"], work["id"]):
            if not re.fullmatch(r"[a-z][a-z0-9-]+", identifier):
                fail("Unsafe canonical identifier")
        structure = load(root, "corpus/structure/" + work["id"] + ".json")
        segments = load(root, edition["content_path"])
        ids = structure["segment_ids"]
        if len(set(ids)) != len(ids) or set(ids) != set(segments):
            fail("Incomplete or inconsistent edition: " + edition["id"])
        if not all(isinstance(segments[k], str) and segments[k].strip() for k in ids):
            fail("Invalid prose in " + edition["id"])
        esc = html.escape
        ai_reviewed = edition.get("publication_policy") == "litmundi-literary-v2" or edition["review"]["status"] == "ai_reviewed"
        ai_notice = ("AI-reviewed translation. Weighted AI assessment: " + str(edition["review"].get("score", "unrecorded")) + "/10. No independent human literary review is claimed. Reader corrections may lead to revision.") if ai_reviewed else ""
        paragraphs = "\n".join('<p id="' + esc(k, quote=True) + '"><a href="#' + esc(k, quote=True) + '">§</a> ' + esc(segments[k]) + "</p>" for k in ids)
        notice = (
            "Original title: " + work["title"] + "\n" + edition["label"] + "\nPublication: " + edition["status"] + "; " + edition["review"]["status"] +
            "\nSource: " + edition["provenance"]["citation"] +
            "\nTranslator: " + (edition["credits"]["translator"] or "not applicable") +
            "\nEditors: " + ", ".join(edition["credits"]["editors"]) +
            "\nReviewers: " + ", ".join(edition["review"]["reviewers"]) +
            "\nAI assessment systems: " + ", ".join(edition["review"].get("ai_reviewers", [])) +
            "\nReview evidence: " + "; ".join(edition["review"].get("evidence_urls", [])) +
            ("\n" + ai_notice if ai_notice else "") +
            "\nLicense: " + (edition["rights"]["license"] or "No reuse permission granted") +
            "\nRights assessment: " + edition["rights"]["basis"] +
            "\nChecksums establish consistency with this archive, not authenticity or legal authority."
        )
        page = (
            '<!doctype html><html lang="' + esc(edition["language"], quote=True) + '"><head><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) +
            '</title><style>body{max-width:44em;margin:2em auto;padding:0 1em;font:1.25em/1.8 Georgia,serif;color:#222;background:#fff}' +
            'pre{white-space:pre-wrap;overflow-wrap:anywhere;font:0.8em/1.6 system-ui}a{color:#174d38}p:target{background:#fff3cd}</style></head>' +
            '<body><nav><a href="../index.html">Library</a></nav><main><h1>' + esc(title) + '</h1><p>' + esc(work["author"]) +
            '</p>' + ('<p lang="en">' + esc(ai_notice) + '</p>' if ai_notice else '') + paragraphs + '<h2>Edition and rights</h2><pre>' + esc(notice) + '</pre></main></body></html>\n'
        )
        (edition_output / (edition["id"] + ".html")).write_text(page, encoding="utf-8")
        text = title + "\n" + work["author"] + "\n" + notice + "\n\n" + "\n\n".join("[" + k + "]\n" + segments[k] for k in ids) + "\n"
        (edition_output / (edition["id"] + ".txt")).write_text(text, encoding="utf-8")
        original_note = (' — Original title: <span lang="' + esc(work["original_language"], quote=True) + '">' + esc(work["title"]) + '</span>') if title != work["title"] else ""
        links.append('<li><a href="editions/' + esc(edition["id"], quote=True) + '.html">' + esc(title + " — " + edition["language"]) + "</a>" + original_note + "</li>")
        count += 1
    index = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LitMundi offline library</title></head><body><main><h1>LitMundi offline library</h1><p>Reconstructed from canonical JSON, with no Astro, GitHub, network, or original domain. Drafts remain in the archival corpus and are excluded here.</p><ul>' + "".join(links) + "</ul></main></body></html>\n"
    (output / "index.html").write_text(index, encoding="utf-8")
    return count

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    root = args.archive.resolve()
    manifest = verify(root)
    print("Verified", len(manifest["files"]), "files and the complete archive inventory.")
    if not args.verify_only:
        output = (args.output or root.parent / "litmundi-restored").resolve()
        count = restore(root, output)
        print("Restored", count, "published editions to", output)
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError, TypeError) as error:
        print("Archive validation FAILED:", error, file=sys.stderr)
        sys.exit(1)
