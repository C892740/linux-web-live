// Headless v86 boot harness — runs under node, no DOM required.
// Usage: node scratch/harness.mjs <libv86.js> <image> <media-key> <ramMB> [seconds] [--acpi]
import { createRequire } from "node:module";
import fs from "node:fs/promises";

const [, , libPath, imagePath, mediaKey, ramArg, secsArg, ...flags] = process.argv;
const SECS = Number(secsArg || 90);
const ACPI = flags.includes("--acpi");
const RAM = Number(ramArg || 512) * 1048576;
const BIOS_DIR = "/tmp/nixtab-test";

const require = createRequire(import.meta.url);
const { V86 } = require(libPath);

/** node Buffer → standalone ArrayBuffer (v86's Aa() only takes ArrayBuffer/File/url). */
function ab(nodeBuffer) {
  return nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength,
  );
}

const libLabel = libPath.includes("libv86-new") ? "0.5.465" : "0.5.44";
console.log(
  `[harness] lib=${libLabel} image=${imagePath.split("/").pop()} media=${mediaKey} ram=${ramArg}MB acpi=${ACPI}`,
);

const mediaBuffer = await fs.readFile(imagePath);

const config = {
  autostart: true,
  disable_speaker: true,
  acpi: ACPI,
  wasm_path: libPath.includes("libv86-new")
    ? "/tmp/nixtab-test/v86-new.wasm"
    : "/tmp/nixtab-test/v86.wasm",
  memory_size: RAM,
  vga_memory_size: 8 * 1048576,
  bios: { buffer: ab(await fs.readFile(`${BIOS_DIR}/seabios.bin`)) },
  vga_bios: { buffer: ab(await fs.readFile(`${BIOS_DIR}/vgabios.bin`)) },
  [mediaKey]: { buffer: ab(mediaBuffer), async: false },
};

const emulator = new V86(config);

const started = Date.now();
const t = (ms) => `${((ms - started) / 1000).toFixed(1)}s`;
let lastCount = -1;
let stagnantSamples = 0;
let sawTextOutput = false;
let sawGraphicsMode = false;

emulator.add_listener("emulator-loaded", () =>
  console.log(`[${t(Date.now())}] emulator-loaded`),
);
emulator.add_listener("emulator-started", () =>
  console.log(`[${t(Date.now())}] emulator-started`),
);
// Reconstruct the text screen from bus events. payload = [row, col, charCode].
const screenRows = new Map();
emulator.add_listener("screen-put-char", (payload) => {
  sawTextOutput = true;
  if (Array.isArray(payload) && payload.length >= 3) {
    const [row, col, code] = payload;
    if (
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      Number.isInteger(code) &&
      code > 0
    ) {
      const line = screenRows.get(row) ?? [];
      line[col] = String.fromCharCode(code);
      screenRows.set(row, line);
    }
  }
});
emulator.add_listener("screen-set-size", (payload) => {
  // text mode emits [cols, rows, 0]; graphics emits [w, h, nonzero flags]
  if (payload[2] !== 0) sawGraphicsMode = true;
  console.log(
    `[${t(Date.now())}] screen-set-size ${payload[0]}x${payload[1]} flags=${payload[2]}`,
  );
});

const sampler = setInterval(() => {
  try {
    const counter = emulator.get_instruction_counter?.() ?? 0;
    if (counter === lastCount) {
      stagnantSamples++;
    } else {
      stagnantSamples = 0;
    }
    lastCount = counter;
  } catch {
    /* engine not ready yet */
  }
}, 2000);

const dumpScreen = () => {
  const lines = [...screenRows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, chars]) => chars.map((c) => c ?? " ").join("").trimEnd())
    .filter((l) => l.trim().length > 0);
  console.log(`[harness] reconstructed text screen (${lines.length} non-empty lines):`);
  for (const line of lines.slice(0, 16)) console.log("  |", line);
};

const finish = (verdict, extra = "") => {
  clearInterval(sampler);
  console.log(`[harness] VERDICT: ${verdict} ${extra}`);
  console.log(
    `[harness] details: textOutput=${sawTextOutput} graphicsMode=${sawGraphicsMode} instructionStagnantFor=${stagnantSamples * 2}s counter=${lastCount}`,
  );
  dumpScreen();
  emulator.destroy();
  process.exit(0);
};

setTimeout(async () => {
  if (sawGraphicsMode) {
    finish("BOOTED_GRAPHICS", "— guest reached a graphical mode (desktop likely)");
  } else if (sawTextOutput && stagnantSamples < 3) {
    finish("BOOTED_TEXT_ACTIVE", "— text output present, CPU still executing");
  } else if (sawTextOutput) {
    finish("BOOTED_TEXT_STALLED", "— text output present, CPU instruction counter stagnant");
  } else {
    finish("NO_OUTPUT", "— zero video output; image did not boot (wrong media key or unbootable)");
  }
}, SECS * 1000).unref?.();

// Keep the process alive without a dangling timer (setTimeout above unref'd).
setInterval(() => {}, 60_000);
