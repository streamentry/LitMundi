"""Regenerate the vendored social-card font subsets.

Usage (requires fontTools; run from the repository root):
    python3 scripts/fonts/subset-social-fonts.py ja=/path/to/NotoSerifJP-Regular.otf [...]

Each subset contains printable ASCII plus every character used in the titles
of corpus works whose original language matches. Re-run it with the upstream
font whenever a new title in that language is added; the social-card
generator refuses to render a title whose characters are missing.
"""
import json
import pathlib
import subprocess
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONTS = ROOT / 'scripts/fonts'
MANIFEST = FONTS / 'social-fonts.json'
UPSTREAM = {
    'ja': {'family': 'Noto Serif JP', 'source': 'https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/JP/NotoSerifJP-Regular.otf'},
    'zh': {'family': 'Noto Serif TC', 'source': 'https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/TC/NotoSerifTC-Regular.otf'},
    'bn': {'family': 'Noto Serif Bengali', 'source': 'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSerifBengali/hinted/ttf/NotoSerifBengali-Regular.ttf'},
}


def main(pairs):
    works = json.loads((ROOT / 'corpus/catalog/works.json').read_text(encoding='utf-8'))
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    for pair in pairs:
        lang, upstream = pair.split('=', 1)
        if lang not in UPSTREAM:
            sys.exit(f'No upstream font configured for {lang}')
        titles = [w['title'] for w in works if w['original_language'] == lang]
        # Shapers may decompose a character (Bengali \u09cb -> \u09c7 + \u09be),
        # so keep the canonical decomposition of every title character too.
        chars = sorted({c for t in titles for c in t + unicodedata.normalize('NFD', t) if ord(c) > 0x7E})
        output = FONTS / f'social-{lang}{pathlib.Path(upstream).suffix}'
        subprocess.run([
            sys.executable, '-m', 'fontTools.subset', upstream,
            '--unicodes=20-7E', '--text=' + ''.join(chars),
            '--name-IDs=*', '--layout-features=*', '--no-hinting',
            '--output-file=' + str(output),
        ], check=True)
        manifest[lang] = {**UPSTREAM[lang], 'file': output.name, 'characters': ''.join(chars)}
        print(f'{lang}: {len(chars)} title characters -> {output.name} ({output.stat().st_size} bytes)')
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main(sys.argv[1:])
