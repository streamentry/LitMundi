# Social-card font

`DejaVuSerif.ttf` is an unmodified copy of DejaVu Serif from the Debian
`fonts-dejavu-core` package. The accompanying `LICENSE-DejaVu.txt` is the actual
package copyright file, copied from `/usr/share/doc/fonts-dejavu-core/copyright`.
Its Bitstream Vera font terms cover this font; the separate Debian packaging
section describes the packaging files, not an additional license on the font.

The generator supplies this font file directly to Sharp/Pango. It does not
download webfonts. Current English, Portuguese and Spanish titles and author
names are covered, including their accents.

DejaVu Serif does **not** cover every writing system. Before publishing works
whose original titles require additional scripts, such as Chinese or Japanese,
vendor an appropriately licensed font and update the generator's font choice.
Do not replace the title with an English translation or silently truncate it.
Pango fallback is disabled so system-dependent fonts cannot silently change
the image between builds. Inspect the resulting images when adding a script.

## Additional scripts

`social-fonts.json` maps an original language to a vendored subset font used
for titles that DejaVu Serif cannot render. `social-ja.otf` is a subset of
Noto Serif JP (SIL Open Font License 1.1, `LICENSE-NotoSerifCJK-OFL.txt`)
containing printable ASCII plus the characters of the corpus's Japanese titles.
The subset is an OFL Modified Version; it may keep the Noto name because Noto
declares no Reserved Font Name.

When a new title adds characters, download the upstream font listed in
`social-fonts.json` and regenerate the subset:

```sh
python3 scripts/fonts/subset-social-fonts.py ja=/path/to/NotoSerifJP-Regular.otf
```

The generator fails with a clear error instead of drawing missing-glyph boxes.
Local macOS builds whose fontconfig cannot load may ignore `fontfile`
entirely and draw a system sans font for every card; inspect cards produced on
Linux (CI or the deployed site).
