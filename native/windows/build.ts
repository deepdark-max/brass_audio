const SRC_DIR  = "./native/src";
const OUT_DIR  = "./native/windows";
const OUT_EXT  = ".dll";
const OUT_NAME = "export" + OUT_EXT;
const OUTPUT_FILE = OUT_DIR + "/" + OUT_NAME;
const EXPORT_FILE = "./build/brassAudio" + OUT_EXT + ".ts";
const LIB_FILE    = "brassAudio" + OUT_EXT;
const PLATFORM    = "Windows";

function stubExport(errMsg: string) {
  console.warn(`[WARN] ${PLATFORM}: ${errMsg}`);
  console.warn(`[WARN] ${PLATFORM}: generating stub export`);
  Deno.mkdirSync("./build", { recursive: true });
  Deno.writeTextFileSync(EXPORT_FILE, `
const B64 = "";

export default (() => {
  throw new Error("${errMsg.replace(/"/g, '\\"')}");
})();
`);
  console.log(`Exported stub to ${EXPORT_FILE}`);
}

async function checkTool(name: string): Promise<boolean> {
  try {
    const { code } = await new Deno.Command(name, {
      args: ["--version"], stdout: "null", stderr: "null"
    }).output();
    return code === 0;
  } catch {
    return false;
  }
}

if (!await checkTool("gcc")) {
  stubExport("gcc not found, cannot build for Windows");
  Deno.exit(0);
}

const command = new Deno.Command("gcc", {
  args: [
    "-shared",
    "-o", OUTPUT_FILE,
    SRC_DIR + "/export.c",
    "-I.", "-lm",
    "-lwinmm", "-lole32",
    "-Os", "-s",
    "-Wall", "-Wextra", "-Wno-unused-parameter",
    "-fvisibility=hidden",
    "-DBUILD_SHARED",
    "-DMA_NO_ENCODING",
    "-DMA_NO_GENERATION",
    "-DMA_NO_VORBIS",
  ],
  stderr: "piped"
});

const { code, stderr } = await command.output();
const decoder = new TextDecoder();

if (code !== 0) {
  stubExport("compilation failed:\n" + decoder.decode(stderr));
  Deno.exit(0);
}

console.log("Windows compiled successfully!");

const binary = await Deno.readFile(OUTPUT_FILE);

let b64 = "";
const step = 0xFFFF;
for (let i = 0; i < binary.length; i += step) {
  const end = Math.min(i + step, binary.length);
  let s = "";
  for (let j = i; j < end; j++) s += String.fromCharCode(binary[j]);
  b64 += btoa(s);
}

await Deno.mkdir("./build", { recursive: true });
await Deno.writeTextFile(EXPORT_FILE, `
const B64 = "${b64}";
const PATH = Deno.cwd() + "/${LIB_FILE}";

export default (async () => {
  try { await Deno.stat(PATH); return PATH; } catch {}
  await Deno.writeFile(PATH, Uint8Array.from(atob(B64), c => c.charCodeAt(0)));
  return PATH;
})();
`);

console.log("Exported to " + EXPORT_FILE);
