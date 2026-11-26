// THE MORNING LEDGER — one-image world news for Thursday 26 November 2026.
// A tiny software printing press: a hand-set 5x7 type case, a flat-bed
// canvas and a from-scratch PNG writer. No network, no clock, no dice:
// every run prints byte-identical copies of the front page.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- PNG writer (encoder side only, filters all zero) ----------
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable.push(c >>> 0);
}
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const body = out.subarray(4, 8 + data.length);
  dv.setUint32(8 + data.length, crc32(body));
  return out;
}
function encodePng(rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    raw.set(rgb.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    png.set(p, off);
    off += p.length;
  }
  return png;
}

// ---------- canvas ----------
type Rgb = [number, number, number];
const PAPER: Rgb = [246, 241, 230];
const INK: Rgb = [20, 22, 26];
const RED: Rgb = [164, 22, 35];
const GRAY: Rgb = [110, 112, 118];
const FAINT: Rgb = [214, 207, 190];
const canvas = new Uint8Array(W * H * 3);
function paint(x: number, y: number, c: Rgb): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  canvas[i] = c[0];
  canvas[i + 1] = c[1];
  canvas[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: Rgb): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) paint(xx, yy, c);
}
function hRule(x: number, y: number, w: number, t: number, c: Rgb): void {
  fillRect(x, y, w, t, c);
}
function vRule(x: number, y: number, h: number, t: number, c: Rgb): void {
  fillRect(x, y, t, h, c);
}
function frame(x: number, y: number, w: number, h: number, t: number, c: Rgb): void {
  hRule(x, y, w, t, c);
  hRule(x, y + h - t, w, t, c);
  vRule(x, y, h, t, c);
  vRule(x + w - t, y, h, t, c);
}

// ---------- the type case: 5x7 glyphs as seven 5-bit rows ----------
const GLYPHS: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
};
const ADV = 6; // glyph pitch in font units: 5 wide + 1 space
function textWidth(text: string, scale: number): number {
  return text.length === 0 ? 0 : text.length * ADV * scale - scale;
}
function drawText(x: number, y: number, text: string, scale: number, c: Rgb): void {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (0x10 >> col)) fillRect(cx + col * scale, y + row * scale, scale, scale, c);
      }
    }
    cx += ADV * scale;
  }
}
function drawCentered(cx: number, y: number, text: string, scale: number, c: Rgb): void {
  drawText(Math.round(cx - textWidth(text, scale) / 2), y, text, scale, c);
}
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line === "" ? w : line + " " + w;
    if (next.length > maxChars && line !== "") {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}
function drawBlock(x: number, y: number, text: string, maxChars: number, scale: number, leading: number, c: Rgb): number {
  const lines = wrap(text, maxChars);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * leading, lines[i], scale, c);
  return y + lines.length * leading;
}

// ---------- compose the front page ----------
fillRect(0, 0, W, H, PAPER);
const M = 48; // page margin
const RIGHT = W - M;

// masthead
hRule(M, 40, W - 2 * M, 3, INK);
drawCentered(W / 2, 58, "THE MORNING LEDGER", 6, INK);
drawCentered(W / 2, 112, "THURSDAY, 26 NOVEMBER 2026 - WORLD EDITION - NO. 1126", 2, GRAY);
hRule(M, 140, W - 2 * M, 6, INK);
hRule(M, 150, W - 2 * M, 2, INK);

// the day's big story
drawCentered(W / 2, 172, "TARIFFS LEAD THE DAY", 7, INK);
drawCentered(W / 2, 232, "WASHINGTON UNVEILS A NEW LEVY SCHEDULE;", 2, INK);
drawCentered(W / 2, 254, "TRADING PARTNERS WEIGH THEIR REPLY", 2, INK);
hRule(M, 282, W - 2 * M, 2, INK);

// chart panel, left: import prices climbing
const chartX = M;
const chartY = 306;
const chartW = 428;
const chartH = 268;
frame(chartX, chartY, chartW, chartH, 2, INK);
drawText(chartX + 16, chartY + 12, "IMPORT PRICES, INDEX", 2, INK);
const baseY = chartY + chartH - 44;
const topY = chartY + 52;
for (let g = 0; g < 4; g++) hRule(chartX + 52, topY + g * 44, chartW - 76, 1, FAINT);
vRule(chartX + 52, topY, 1, baseY - topY, GRAY);
hRule(chartX + 52, baseY, chartW - 76, 2, GRAY);
const bars = [0.34, 0.46, 0.55, 0.71, 0.88];
for (let i = 0; i < bars.length; i++) {
  const bh = Math.round((baseY - topY) * bars[i]);
  const bx = chartX + 76 + i * 66;
  fillRect(bx, baseY - bh, 40, bh, i === bars.length - 1 ? RED : INK);
}
// trend arrow over the bars
for (let t = 0; t <= 60; t++) {
  const ax = chartX + 84 + t * 4.6;
  const ay = baseY - 62 - t * 1.72;
  fillRect(Math.round(ax), Math.round(ay), 5, 5, RED);
}
fillRect(chartX + 356, topY + 2, 26, 6, RED);
fillRect(chartX + 376, topY + 2, 6, 26, RED);
drawText(chartX + 16, baseY + 12, "SEP   OCT   NOV   DEC   JAN", 1, GRAY);
drawText(chartX + 16, chartY + chartH - 20, "SOURCE: THE LEDGER TRADE DESK", 1, GRAY);

// lead story, right of the chart
const leadX = chartX + chartW + 28;
const leadW = RIGHT - leadX;
drawBlock(leadX, chartY + 2, "MARKETS SLIP AS TRADE FEARS GROW", 21, 3, 26, INK);
hRule(leadX, chartY + 58, leadW, 2, RED);
drawBlock(
  leadX,
  chartY + 72,
  "STOCKS FELL IN EARLY TRADE AS INVESTORS READ THE FINE PRINT OF THE NEW " +
    "TARIFF SCHEDULE. BONDS HELD STEADY WHILE THE DOLLAR EASED AGAINST A " +
    "BASKET OF CURRENCIES. ANALYSTS SAY THE FULL COST OF THE LEVIES WILL " +
    "TAKE MONTHS TO REACH SHOP SHELVES, BUT RETAILERS ARE ALREADY " +
    "REWRITING PRICE TAGS AND FREIGHT FIRMS REPORT A RUSH TO SHIP GOODS " +
    "AHEAD OF THE START DATE.",
  47,
  1,
  11,
  INK
);
hRule(M, 596, W - 2 * M, 2, INK);

// three columns of the rest of the world
const colY = 620;
const colW = 290;
const colGap = (W - 2 * M - colW * 3) / 2;
const stories: Array<[string, string]> = [
  [
    "SUMMIT ENVOYS SET SPRING TALKS ON TRADE TRUCE",
    "DIPLOMATS FROM THE THREE CAPITALS AGREED TO MEET AGAIN IN SPRING, " +
      "EXTENDING THE CALM THAT FOLLOWED LAST WEEK'S SUMMIT. THE COMMUNIQUE " +
      "PROMISES A STANDING CHANNEL ON TARIFFS, GRAIN SHIPMENTS AND PORT " +
      "ACCESS, WITH A FIRST WORKING GROUP BEFORE THE NEW YEAR.",
  ],
  [
    "GTA VI LAUNCH WEEK SMASHES SALES RECORDS",
    "THE LONG-AWAITED GAME TOPPED CHARTS IN FORTY COUNTRIES IN ITS FIRST " +
      "WEEK, AS STREAMERS LOGGED RECORD HOURS AND SHOPS REPORTED MIDNIGHT " +
      "QUEUES AROUND THE BLOCK. STUDIOS SAY THE LAUNCH IS NOW THE BIGGEST " +
      "IN ENTERTAINMENT HISTORY.",
  ],
  [
    "CLIMATE FINANCE PLEDGES FACE FIRST TEST",
    "TREASURERS MEET NEXT WEEK TO TURN COP31 PROMISES INTO BUDGET LINES. " +
      "SMALL ISLAND STATES SAY THE MONEY MUST MOVE FASTER THAN THE TIDES, " +
      "AND AUDITORS WILL PUBLISH THE FIRST LEDGER OF WHO HAS PAID WHAT.",
  ],
];
for (let i = 0; i < stories.length; i++) {
  const x = M + i * (colW + colGap);
  if (i > 0) vRule(x - colGap / 2 - 1, colY, 236, 1, FAINT);
  const afterHead = drawBlock(x, colY, stories[i][0], 24, 2, 17, INK);
  hRule(x, afterHead + 4, colW, 1, GRAY);
  drawBlock(x, afterHead + 14, stories[i][1], 48, 1, 11, INK);
}
hRule(M, 872, W - 2 * M, 2, INK);

// bottom boxes: weather and in-brief
const boxY = 890;
const boxH = 82;
frame(M, boxY, 452, boxH, 1, INK);
drawText(M + 14, boxY + 10, "WEATHER", 2, RED);
drawBlock(M + 14, boxY + 34, "STORM CROSSING THE ATLANTIC; RAIN FOR THE NORTH, FIRST SNOW INLAND, SUN RETURNING FRIDAY.", 62, 1, 11, INK);
frame(M + 476, boxY, 452, boxH, 1, INK);
drawText(M + 490, boxY + 10, "IN BRIEF", 2, RED);
drawBlock(M + 490, boxY + 34, "CENTRAL BANKS HOLD RATES - RAIL STRIKE CALLED OFF - COMET VISIBLE AT DAWN - MARKETS CLOSE EARLY FRIDAY.", 62, 1, 11, INK);

// colophon
drawCentered(W / 2, 990, "THE MORNING LEDGER - SET IN SOFTWARE TYPE - ALL THE NEWS THAT FITS THE PAGE", 1, GRAY);

// ---------- print it ----------
mkdirSync("/output", { recursive: true });
const png = encodePng(canvas);
writeFileSync("/output/entry.png", png);
console.log("entry.png:", png.length, "bytes");
