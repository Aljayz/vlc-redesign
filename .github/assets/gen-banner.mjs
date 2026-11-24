/**
 * Generates the README banners (1600x500):
 *
 *   vlc-redesign-banner.svg/.png       light, cone + name + claim
 *   vlc-redesign-banner-dark.svg/.png  dark,  cone + name + claim
 *   vlc-redesign-banner-logo.svg/.png  light, cone only, no text
 *
 * The cone is VLC's own app icon (extras/package/macosx/asset_sources), with
 * its viewBox cropped to the drawing so the layout can work with its ink box.
 * It keeps its colours on both grounds.
 *
 * Text becomes SVG paths through opentype.js, so the SVG needs no font and
 * renders the same in resvg and a browser. Bree Serif Regular for the name and
 * Bree Light for the claim, the house typeface, at the sizes the other repos use.
 *
 * Deps (global): opentype.js, @resvg/resvg-js, and the house fonts as TTF in
 * HOUSE_FONTS (default %LOCALAPPDATA%\halleluja-fonts).
 * Run: node .github/assets/gen-banner.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const groot = execSync("npm root -g").toString().trim();
const opentype = require(`${groot}/opentype.js`);
const { Resvg } = require(`${groot}/@resvg/resvg-js`);

const __dir = dirname(fileURLToPath(import.meta.url));

const NAME = "VLC Redesign";
const CLAIM = "A new look. Still plays everything.";
const W = 1600, H = 500;
const LOGO_FILE = "vlc-cone.svg";
const LOGO = readFileSync(join(__dir, LOGO_FILE), "utf8").replace(/^[\s\S]*?(?=<svg\b)/, "");
const LOGO_VB = LOGO.match(/viewBox="([^"]+)"/)[1];
const [, , LOGO_VB_W, LOGO_VB_H] = LOGO_VB.split(/\s+/).map(Number);

// The house layout: the logo's ink 400 px high, its left edge at x 165,
// centred on the banner's middle, and the text 70 px to its right.
const LH = 400, LW = LH * (LOGO_VB_W / LOGO_VB_H);
const LX = 165, LY = (H - LH) / 2;
const nameSize = 132, claimSize = 44, gap = 70, lineGap = 16;
const textX = LX + LW + gap;

const THEMES = [
  { suffix: "", bg: "#ffffff", name: "#1f2328", claim: "#5a5d5e" },
  { suffix: "-dark", bg: "#0d1117", name: "#e6edf3", claim: "#9aa4ad" },
];

// The house typeface is licensed, so it is read from a local folder and never committed.
const fonts = process.env.HOUSE_FONTS ?? join(process.env.LOCALAPPDATA ?? tmpdir(), "halleluja-fonts");
const font = opentype.parse(readFileSync(join(fonts, "bree-serif-regular.ttf")).buffer);
const claimFont = opentype.parse(readFileSync(join(fonts, "bree-light.ttf")).buffer);

const nameAsc = font.ascender * (nameSize / font.unitsPerEm);
const nameDesc = -font.descender * (nameSize / font.unitsPerEm);
const claimAsc = claimFont.ascender * (claimSize / claimFont.unitsPerEm);
const blockH = nameAsc + nameDesc + lineGap + claimAsc;
const nameBaseline = H / 2 - blockH / 2 + nameAsc;
const claimBaseline = nameBaseline + nameDesc + lineGap + claimAsc;

// Glyphs are laid out at the origin and moved with a transform: opentype.js can
// return NaN coordinates for some glyphs at large offsets.
const textPath = (f, text, size, x, y, fill) =>
  `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" d="${f.getPath(text, 0, 0, size).toPathData(2)}" fill="${fill}"/>`;

const embedLogo = (x, y, w, h) =>
  LOGO.replace(/<svg\b[^>]*>/, `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" viewBox="${LOGO_VB}">`).trim();

function emit(name, svg, bg) {
  writeFileSync(join(__dir, `${name}.svg`), svg);
  const png = new Resvg(svg, { background: bg, fitTo: { mode: "width", value: W } }).render().asPng();
  writeFileSync(join(__dir, `${name}.png`), png);
  console.log(`wrote ${name}.svg + .png`);
}

for (const t of THEMES) {
  emit(`vlc-redesign-banner${t.suffix}`, `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  ${embedLogo(LX, LY, LW, LH)}
  ${textPath(font, NAME, nameSize, textX, nameBaseline, t.name)}
  ${textPath(claimFont, CLAIM, claimSize, textX, claimBaseline, t.claim)}
</svg>
`, t.bg);
}

emit("vlc-redesign-banner-logo", `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${THEMES[0].bg}"/>
  ${embedLogo((W - LW) / 2, LY, LW, LH)}
</svg>
`, THEMES[0].bg);
