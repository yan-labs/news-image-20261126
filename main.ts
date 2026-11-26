// news-image-20261126 — one picture that sums up Thursday 26 November 2026.
// Pure TypeScript, standard library only, no network. It paints a newspaper
// front page into a pixel buffer (a hand-drawn 5x7 letter set + a small PNG
// writer built on node:zlib) and saves it as /output/entry.png, or into
// $MAKEFUN_OUTPUT_DIR when run outside the grader.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PAGE_W = 1024;
const PAGE_H = 640;

// ------------------------------------------------------------ letter set
// Every letter is seven rows of five cells, "#" inked and "." blank.
const LETTERS: Record<string, string[]> = {
  A: [" ## ", "#  #", "#  #", "####", "#  #", "#  #", "#  #"],
  B: ["### ", "#  #", "#  #", "### ", "#  #", "#  #", "### "],
  C: [" ###", "#   ", "#   ", "#   ", "#   ", "#   ", " ###"],
  D: ["### ", "#  #", "#  #", "#  #", "#  #", "#  #", "### "],
  E: ["####", "#   ", "#   ", "### ", "#   ", "#   ", "####"],
  F: ["####", "#   ", "#   ", "### ", "#   ", "#   ", "#   "],
  G: [" ###", "#   ", "#   ", "# ##", "#  #", "#  #", " ###"],
  H: ["#  #", "#  #", "#  #", "####", "#  #", "#  #", "#  #"],
  I: ["###", " # ", " # ", " # ", " # ", " # ", "###"],
  J: ["  ##", "   #", "   #", "   #", "   #", "#  #", " ## "],
  K: ["#  #", "# # ", "##  ", "#   ", "##  ", "# # ", "#  #"],
  L: ["#   ", "#   ", "#   ", "#   ", "#   ", "#   ", "####"],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
  O: [" ###", "#   #", "#   #", "#   #", "#   #", "#   #", " ###"],
  P: ["### ", "#   #", "#   #", "### ", "#   ", "#   ", "#   "],
  Q: [" ###", "#   #", "#   #", "#   #", "# # #", "#  #", "  ## "],
  R: ["### ", "#   #", "#   #", "### ", "##  ", "# # ", "#  #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
  "0": [" ###", "#  ##", "# # #", "##  #", "#   #", "#   #", " ###"],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "   # ", "  #  ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ",": ["     ", "     ", "     ", "     ", " ##  ", " ##  ", " #   "],
  "'": ["  #  ", "  #  ", " #   ", "     ", "     ", "     ", "     "],
  "-": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
  "&": [" ##  ", "#  # ", "# #  ", " #   ", "# # #", "#  # ", " ## #"],
  "/": ["    #", "    #", "   # ", "  #  ", " #   ", "#    ", "#    "],
  "(": ["   # ", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   # "],
  ")": [" #   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", " #   "],
  "%": ["##  #", "## # ", "   # ", "  #  ", " #   ", "# ## ", "#  ##"],
  "+": ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
  "=": ["     ", "     ", "#####", "     ", "#####", "     ", "     "],
};
const STEP = 6; // one letter cell plus tracking, in unit pixels

// ------------------------------------------------------------ palette
type Ink = [number, number, number];
const NAVY: Ink = [11, 18, 32];
const SLATE: Ink = [26, 42, 68];
const PAPER: Ink = [246, 241, 231];
const PAPERDIM: Ink = [214, 206, 190];
const INKTEXT: Ink = [18, 22, 30];
const GREYINK: Ink = [74, 82, 96];
const SCARLET: Ink = [196, 44, 36];
const AMBER: Ink = [214, 172, 92];
const OFFWHITE: Ink = [240, 243, 247];
const FADED: Ink = [146, 160, 182];
const TEAL: Ink = [46, 125, 122];
const SKY: Ink = [74, 132, 182];

// ------------------------------------------------------------ canvas
const buf = new Uint8Array(PAGE_W * PAGE_H * 3);
function dot(x: number, y: number, c: Ink): void {
  if (x < 0 || y < 0 || x >= PAGE_W || y >= PAGE_H) return;
  const i = (y * PAGE_W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function box(x: number, y: number, w: number, h: number, c: Ink): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dot(i, j, c);
}
function disc(cx: number, cy: number, r: number, c: Ink): void {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) dot(x, y, c);
}
function glyph(ch: string, x: number, y: number, s: number, c: Ink): void {
  const rows = LETTERS[ch] ?? LETTERS["?"];
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if (rows[r][col] === "#") box(x + col * s, y + r * s, s, s, c);
}
function measure(t: string, s: number): number {
  return t.length * STEP * s - s;
}
function line(t: string, x: number, y: number, s: number, c: Ink): void {
  let cx = x;
  for (const ch of t) { glyph(ch, cx, y, s, c); cx += STEP * s; }
}
function wrap(t: string, maxW: number, s: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of t.split(" ")) {
    const trial = cur ? cur + " " + w : w;
    if (measure(trial, s) <= maxW) { cur = trial; continue; }
    if (cur) out.push(cur);
    cur = w;
  }
  if (cur) out.push(cur);
  return out;
}
function para(t: string, x: number, y: number, maxW: number, s: number, c: Ink, lh: number): number {
  const lines = wrap(t, maxW, s);
  lines.forEach((ln, i) => line(ln, x, y + i * lh, s, c));
  return lines.length;
}

// ------------------------------------------------------------ PNG writer
const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crcOf(data: Buffer): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function packChunk(kind: string, data: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcOf(body), 0);
  return Buffer.concat([size, body, crc]);
}
function toPNG(): Buffer {
  const raw = Buffer.alloc(PAGE_H * (1 + PAGE_W * 3));
  for (let y = 0; y < PAGE_H; y++) {
    raw[y * (1 + PAGE_W * 3)] = 0;
    raw.set(buf.subarray(y * PAGE_W * 3, (y + 1) * PAGE_W * 3), y * (1 + PAGE_W * 3) + 1);
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(PAGE_W, 0);
  head.writeUInt32BE(PAGE_H, 4);
  head[8] = 8; head[9] = 2; head[10] = 0; head[11] = 0; head[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    packChunk("IHDR", head),
    packChunk("IDAT", deflateSync(raw, { level: 9 })),
    packChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ the day
// Every story below was first reported on Thursday 26 November 2026.
const LEAD = {
  kicker: "WASHINGTON - TRADE WAR",
  head: "TRUMP UNVEILS NEW TARIFFS ON 14 NATIONS",
  dek: "WASHINGTON PROPOSES SWEEPING NEW DUTIES TO FIGHT WHAT IT CALLS EXCESS INDUSTRIAL CAPACITY. CHINA FACES RATES OF UP TO 40 PERCENT, INDIA UP TO 25.",
};
const BARS = [
  { label: "CHINA", pct: 40, c: SCARLET },
  { label: "INDIA", pct: 25, c: AMBER },
];
interface Tile { kicker: string; c: Ink; head: string; }
const TILES: Tile[] = [
  { kicker: "CAIRO - DISASTER", c: SCARLET, head: "TANKER FIRE KILLS 31 ON CAIRO RING ROAD" },
  { kicker: "MIDDLE EAST", c: AMBER, head: "HOUTHIS HIT SAUDI REFINERY" },
  { kicker: "ISRAEL", c: SKY, head: "JUDGES URGE DROPPING NETANYAHU BRIBERY CHARGE" },
  { kicker: "UKRAINE", c: TEAL, head: "KYIV: STRIKE HIT RUSSIAN AIR BASE" },
];
const ALSO = [
  "2ND JUDGE BLOCKS TRUMP BIRTHRIGHT ORDER",
  "KIM ORDERS WIDER TACTICAL NUKE DEPLOYMENT",
  "DURAN DURAN STAR ANDY TAYLOR DIES AT 65",
  "KING TIDES BATTER CALIFORNIA ON THANKSGIVING",
];

// ------------------------------------------------------------ composition
function tariffBars(x: number, y: number, w: number): void {
  // Two horizontal bars, length proportional to the rate, 40 percent = full.
  for (const b of BARS) {
    line(b.label, x, y + 2, 2, GREYINK);
    const trackX = x + 78;
    const trackW = w - 78 - 52;
    box(trackX, y, trackW, 16, PAPERDIM);
    box(trackX, y, Math.round(trackW * b.pct / 40), 16, b.c);
    line(b.pct + "%", trackX + trackW + 8, y + 2, 2, INKTEXT);
    y += 30;
  }
  line("RATES PROPOSED, UP TO", x, y + 2, 2, GREYINK);
}

function compose(): void {
  box(0, 0, PAGE_W, PAGE_H, NAVY);

  // Masthead
  line("THE DAY IN ONE PICTURE", 32, 26, 5, OFFWHITE);
  line("MAKE.FUN - DAILY NEWS", 742, 40, 2, FADED);
  box(32, 84, 960, 3, SCARLET);
  line("THURSDAY 26 NOVEMBER 2026", 32, 100, 3, AMBER);
  line("TARIFFS AND FIRE LEAD THE DAY", 634, 106, 2, FADED);

  // Lead story on paper, left two thirds
  const lx = 32, ly = 140, lw = 592, lh = 318;
  box(lx, ly, lw, lh, PAPER);
  box(lx, ly, lw, 8, SCARLET);
  line(LEAD.kicker, lx + 28, ly + 26, 2, SCARLET);
  para(LEAD.head, lx + 28, ly + 56, lw - 56, 4, INKTEXT, 36);
  para(LEAD.dek, lx + 28, ly + 138, lw - 56, 2, GREYINK, 21);
  box(lx + 28, ly + 220, lw - 56, 2, PAPERDIM);
  tariffBars(lx + 28, ly + 238, lw - 56);

  // Four tiles, right column
  const rx = 648, rw = 344;
  let ty = ly;
  const th = 72, gap = 10;
  for (const t of TILES) {
    box(rx, ty, rw, th, SLATE);
    box(rx, ty, 7, th, t.c);
    line(t.kicker, rx + 20, ty + 10, 2, t.c);
    para(t.head, rx + 20, ty + 32, rw - 36, 2, OFFWHITE, 19);
    ty += th + gap;
  }

  // Bottom strip: also today
  const by = 478;
  box(32, by, 960, 2, AMBER);
  line("ALSO TODAY", 32, by + 16, 3, AMBER);
  const colW = 240;
  ALSO.forEach((item, i) => {
    const cx = 32 + i * 244;
    box(cx, by + 52, 5, 52, SCARLET);
    para(item, cx + 16, by + 52, colW - 16, 2, OFFWHITE, 19);
  });
  line("DRAWN FROM THE DAY'S REPORTING - 26 NOVEMBER 2026", 32, 612, 2, FADED);
}

// ------------------------------------------------------------ run
function main(): void {
  compose();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, "entry.png");
  const png = toPNG();
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes, ${PAGE_W}x${PAGE_H})`);
}
main();
