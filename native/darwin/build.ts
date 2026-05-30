const SRC_DIR  = "./native/src";
const OUT_DIR  = "./native/darwin";
const OUT_EXT  = ".dylib";
const OUT_NAME = "libexport" + OUT_EXT;
const OUTPUT_FILE = OUT_DIR + "/" + OUT_NAME;
const EXPORT_FILE = "./build/brassAudio" + OUT_EXT + ".ts";
const LIB_FILE    = "brassAudio" + OUT_EXT;
const PLATFORM    = "macOS";

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

function stubExport(errMsg: string) {
  console.warn(`[WARN] ${PLATFORM}: ${errMsg}`);
  Deno.mkdirSync("./build", { recursive: true });
  Deno.writeTextFileSync(EXPORT_FILE, `
const B64 = "";
export default (() => { throw new Error("${errMsg.replace(/"/g, '\\"')}"); })();
`);
  console.log(`Exported stub to ${EXPORT_FILE}`);
}

if (!await checkTool("clang")) {
  stubExport("clang not found, cannot build for macOS");
  Deno.exit(0);
}

const command = new Deno.Command("clang", {
  args: [
    "-shared", "-fPIC",
    "-o", OUTPUT_FILE,
    SRC_DIR + "/export.c",
    "-I.", "-lm",
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

console.log("macOS compiled successfully!");

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
