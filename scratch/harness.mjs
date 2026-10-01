/**
 * Headless harness: does v86 0.5.465 boot a CD-ROM from a lazy File-backed
 * buffer (AsyncFileBuffer)? Control: same ISO as ArrayBuffer (SyncBuffer).
 *
 * Usage: node scratch/harness.mjs <iso-path> <mode>
 *   mode: "ab" | "file-async" | "file-sync"
 *
 * Node 22 has the global File constructor, so `new File([ab], name)` matches
 * v86's `a.buffer instanceof File` check exactly like a browser input.files[0].
 */
import fs from "node:fs";

const LIBV86 = "file:///tmp/libv86-new.js";
const WASM = "/tmp/nixtab-test/v86-new.wasm";
const SEABIOS = "/tmp/nixtab-test/seabios.bin";
const VGABIOS = "/tmp/nixtab-test/vgabios.bin";

const [, , isoPath, mode] = process.argv;
if (!isoPath || !mode) {
  console.error("usage: node scratch/harness.mjs <iso> <ab|file-async|file-sync>");
  process.exit(2);
}

// ── Mini-DOM: just enough surface for v86's ScreenAdapter/keyboard/mouse ──
function makeEl(tag) {
  const el = {
    tagName: tag,
    style: {},
    childNodes: [],
    textContent: "",
    width: 0,
    height: 0,
    appendChild(c) { c.parentNode = this; this.childNodes.push(c); return c; },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); if (c) c.parentNode = null; return c; },
    replaceChild(n, o) { const i = this.childNodes.indexOf(o); if (i >= 0) { this.childNodes[i] = n; n.parentNode = this; } return o; },
    insertBefore(n, ref) { const i = this.childNodes.indexOf(ref); if (i >= 0) this.childNodes.splice(i, 0, n); else this.childNodes.push(n); n.parentNode = this; return n; },
    get firstChild() { return this.childNodes[0] ?? null; },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: el.width, bottom: el.height, width: el.width, height: el.height };
    },
    getElementsByTagName(t) {
      const out = [];
      const walk = (n) => { for (const c of n.childNodes ?? []) { if (c.tagName === t) out.push(c); walk(c); } };
      walk(el);
      return out;
    },
    addEventListener() {}, removeEventListener() {},
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {},
  };
  if (tag === "canvas") {
    el.getContext = () => ({
      imageSmoothingEnabled: true,
      font: "", textBaseline: "", fillStyle: "",
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData() {}, fillRect() {}, clearRect() {}, drawImage() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      measureText: (s) => ({ width: (s?.length ?? 0) * 8 }),
    });
    el.toDataURL = () => "data:image/png;base64,";
  }
  return el;
}

globalThis.window = globalThis;
globalThis.importScripts = undefined;
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.document = {
  createElement: (t) => makeEl(t),
  addEventListener() {}, removeEventListener() {},
  pointerLockElement: null,
  documentElement: makeEl("html"),
  body: makeEl("body"),
};
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { V86 } = await import(LIBV86);

// Node lacks FileReader; polyfill with fs to emulate the browser's async path.
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      setTimeout(() => {
        try {
          // Node's File is memory-backed; read its bytes synchronously and
          // deliver via onload exactly like a browser FileReader would.
          blob.arrayBuffer().then((ab) => {
            this.result = ab;
            this.onload?.({ target: { result: ab } });
          }, (e) => this.onerror?.(e));
        } catch (e) { this.onerror?.(e); }
      }, 0);
    }
  };
}

// Slice to exact size: Node's read pool can over-allocate the ArrayBuffer.
const iso = fs.readFileSync(isoPath).buffer.slice(0, fs.statSync(isoPath).size);

let buffer, asyncOpt;
if (mode === "ab") {
  buffer = iso;
} else {
  buffer = new File([iso], "test.iso");
  asyncOpt = mode === "file-async";
}

const container = makeEl("div");

const textRows = new Map();
let graphics = false;

const emulator = new V86({
  wasm_path: WASM,
  memory_size: 512 * 1024 * 1024,
  vga_memory_size: 8 * 1024 * 1024,
  screen_container: container,
  autostart: true,
  acpi: true,
  bios: { buffer: fs.readFileSync(SEABIOS).buffer.slice(0, fs.statSync(SEABIOS).size) },
  vga_bios: { buffer: fs.readFileSync(VGABIOS).buffer.slice(0, fs.statSync(VGABIOS).size) },
  cdrom: { buffer, ...(asyncOpt === undefined ? {} : { async: asyncOpt }) },
});

emulator.add_listener("screen-put-char", ([row, col, charCode]) => {
  if (row === undefined) return;
  const rowMap = textRows.get(row) ?? new Map();
  rowMap.set(col, charCode);
  putChars++;
});
emulator.add_listener("screen-set-size", ([w, h, flags]) => {
  console.log(`[event] screen-set-size ${w}x${h} flags=${flags}`);
  graphics = flags !== 0;
});
emulator.add_listener("download-error", (e) => console.log("[event] download-error", e));
emulator.add_listener("emulator-loaded", () => console.log("[event] emulator-loaded"));
let putChars = 0;

const renderRows = () => {
  const adapter = emulator.screen_adapter;
  if (typeof adapter?.get_text_screen === "function") {
    try {
      return adapter.get_text_screen().filter((r) => r.trim());
    } catch { /* fall through */ }
  }
  const rows = [];
  for (const [r, cols] of [...textRows.entries()].sort((a, b) => a[0] - b[0])) {
    let s = "";
    for (const [c, code] of [...cols.entries()].sort((x, y) => x[0] - y[0])) s += String.fromCharCode(code);
    rows.push(s);
  }
  return rows.filter((r) => r.trim());
};

const start = Date.now();
const HARD_MS = 100_000;
const tick = setInterval(() => {
  const rows = renderRows();
  console.log(`[${Math.round((Date.now() - start) / 1000)}s] mode=${mode} rows=${rows.length} putChars=${putChars}${graphics ? " [GRAPHICS]" : ""}`);
  if (rows.length) console.log(rows.slice(-6).map((r) => `  | ${r.slice(0, 76)}`).join("\n"));
}, 10_000);

setTimeout(() => {
  clearInterval(tick);
  let verdict;
  if (graphics) {
    verdict = "GRAPHICS (booted)";
  } else {
    const rows = renderRows();
    const text = rows.join(" | ").toLowerCase();
    if (rows.length === 0) verdict = "SILENT (no output)";
    else if (/boot failed|no bootable|could not read/.test(text)) verdict = "SEABIOS FAILURE";
    else verdict = "TEXT BOOT (kernel output present)";
  }
  console.log(`\n=== VERDICT mode=${mode}: ${verdict} ===`);
  process.exit(0);
}, HARD_MS);
