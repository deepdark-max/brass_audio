const OS = Deno.build.os;

let LIB_PATH: string;
let LOAD_ERROR: Error | null = null;

try {
  LIB_PATH = await (async () => {
    switch (OS) {
      case "windows":
        return (await import("../build/brassAudio.dll.ts")).default;
      case "linux":
        return (await import("../build/brassAudio.so.ts")).default;
      case "darwin":
        return (await import("../build/brassAudio.dylib.ts")).default;
      default:
        throw new Error(`[ERROR] Unsupported OS: ${OS}`);
    }
  })();
} catch (e) {
  LIB_PATH = "";
  LOAD_ERROR = e instanceof Error ? e : new Error(String(e));
}

export function getLibPath(): string {
  if (LOAD_ERROR) throw LOAD_ERROR;
  return LIB_PATH;
}

export default LIB_PATH;
