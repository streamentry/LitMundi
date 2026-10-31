"""Create an isolated, non-deployable synthetic corpus for reader rendering tests.

Run from the repository root: python docs/verification/make-parallel-fixture.py /tmp/litmundi-parallel-fixture
The destination must not already exist. This never edits the real corpus.
"""
import json
import os
import shutil
import sys
from pathlib import Path

repo = Path.cwd()
root = Path(sys.argv[1]).resolve()
root.mkdir(parents=True, exist_ok=False)
for name in ["src", "scripts", "corpus"]:
    shutil.copytree(repo / name, root / name)
for name in ["package.json", "astro.config.mjs", "tsconfig.json"]:
    shutil.copy(repo / name, root / name)
os.symlink(repo / "node_modules", root / "node_modules", target_is_directory=True)
work = json.loads((repo / "corpus/catalog/works.json").read_text())[0]
work.update(id="fixture-pair", title="Synthetic parallel-reader fixture", author="TEST FIXTURE ONLY", original_language="en", description="Synthetic content for rendering tests. Never published.")
source = json.loads((repo / "corpus/catalog/editions.json").read_text())[0]
source.update(id="fixture-source", work_id="fixture-pair", content_path="corpus/segments/fixture-pair/fixture-source.json", label="TEST FIXTURE original")
source["credits"]["author"] = "TEST FIXTURE ONLY"
target = json.loads(json.dumps(source))
target.update(id="fixture-target", kind="translation", language="vi", source_edition_id="fixture-source", content_path="corpus/segments/fixture-pair/fixture-target.json", label="TEST FIXTURE translation")
(root / "corpus/catalog/works.json").write_text(json.dumps([work]))
(root / "corpus/catalog/editions.json").write_text(json.dumps([source, target]))
ids = ["fixture-pair:1.1", "fixture-pair:1.2", "fixture-pair:1.3"]
(root / "corpus/structure/fixture-pair.json").write_text(json.dumps({"schema_version": 2, "work_id": "fixture-pair", "segment_ids": ids, "deprecated_ids": {}}))
(root / "corpus/segments/fixture-pair").mkdir()
(root / source["content_path"]).write_text(json.dumps(dict(zip(ids, ["Source one.", "Source two.", "Source three."]))))
(root / target["content_path"]).write_text(json.dumps(dict(zip(ids, ["Bản dịch thử một.", "Bản dịch thử hai.", "Bản dịch thử ba."]))))
(root / "corpus/alignments/fixture-pair").mkdir()
(root / "corpus/alignments/fixture-pair/fixture-target.json").write_text(json.dumps({"schema_version": 1, "work_id": "fixture-pair", "edition_id": "fixture-target", "source_edition_id": "fixture-source", "links": [{"source": ids[:2], "target": ids[:1]}, {"source": ids[2:], "target": ids[1:]}]}))
print(root)
