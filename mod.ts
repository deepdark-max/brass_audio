/**
 * @brass/audio — 基于 miniaudio 的 Deno 音频播放库
 *
 * 提供类似 Web Audio API 的简洁接口，支持 MP3/WAV/FLAC/OGG 播放、
 * ended 事件、3D 空间音频、淡入淡出、并发播放等。
 *
 * @example
 * ```ts
 * import { AudioContext } from "@brass/audio";
 *
 * const ctx = new AudioContext();
 * await ctx.init();
 *
 * const s = ctx.createSound("music.mp3", { loop: true, volume: 0.5 });
 * s.play();
 *
 * ctx.playOneShot("sfx.wav", 0.8);
 *
 * s.addEventListener("ended", () => console.log("done"));
 * // or: s.onended = () => console.log("done");
 *
 * ctx.close();
 * ```
 *
 * @module
 */

export { AudioContext } from "./src/audio_context.ts";
export type { AudioContextOptions, AudioContextState } from "./src/audio_context.ts";
export { Sound } from "./src/sound.ts";
export type { SoundOptions } from "./src/sound.ts";
