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
