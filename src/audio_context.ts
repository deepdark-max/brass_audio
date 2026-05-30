import lib from "./ffi.ts";
import { Sound, type SoundOptions } from "./sound.ts";

const enc = new TextEncoder();

function ptr(s: string): Deno.PointerValue {
  return Deno.UnsafePointer.of(enc.encode(s + "\0"));
}

/** 初始化音频引擎时的配置选项 */
export interface AudioContextOptions {
  /** 采样率 (Hz)，默认 44100 */
  sampleRate?: number;
  /** 输出通道数，默认 2（立体声） */
  channels?: number;
  /** 每次回调的 PCM 帧数（越小延迟越低），默认 512 */
  periodSizeInFrames?: number;
  /**
   * 内部轮询间隔（毫秒），用于检测 ended 事件。
   * 数值越小 ended 事件响应越快，但 CPU 开销略有增加。
   * 默认 200ms。
   */
  pollIntervalMs?: number;
}

/** AudioContext 的运行状态 */
export type AudioContextState = "running" | "closed";

/**
 * 音频引擎上下文，管理 miniaudio 引擎的生命周期和所有音源。
 *
 * 使用前必须调用 `init()`，使用完毕后调用 `close()` 释放资源。
 *
 * @example
 * ```ts
 * const ctx = new AudioContext({ sampleRate: 44100 });
 * await ctx.init();
 * const s = ctx.createSound("music.mp3");
 * s.play();
 * ctx.close();
 * ```
 */
export class AudioContext {
  #state: AudioContextState = "closed";
  #sounds = new Set<Sound>();
  #pollTimer: ReturnType<typeof setInterval> | null = null;
  #opts: Required<AudioContextOptions>;
  #initialized = false;

  /**
   * @param options 引擎配置选项
   */
  constructor(options: AudioContextOptions = {}) {
    this.#opts = {
      sampleRate: options.sampleRate ?? 44100,
      channels: options.channels ?? 2,
      periodSizeInFrames: options.periodSizeInFrames ?? 512,
      pollIntervalMs: options.pollIntervalMs ?? 200,
    };
  }

  /** 当前引擎状态：`"running"` 或 `"closed"` */
  get state(): AudioContextState {
    return this.#state;
  }

  /** 当前引擎采样率 (Hz)，由底层音频设备决定 */
  get sampleRate(): number {
    return lib.symbols.audio_get_sample_rate();
  }

  /** 当前引擎输出通道数 */
  get channels(): number {
    return lib.symbols.audio_get_channels();
  }

  /** 获取或设置全局音量 (0.0 ~ 1.0，可大于 1.0 用于增益) */
  get masterVolume(): number {
    return lib.symbols.audio_get_master_volume();
  }

  set masterVolume(v: number) {
    lib.symbols.audio_set_master_volume(v);
  }

  /**
   * 初始化音频引擎。
   * 使用构造函数传入的配置（sampleRate、channels、periodSizeInFrames）初始化底层的 miniaudio 引擎。
   * 在调用此方法之前调用 `createSound()` 或 `playOneShot()` 会抛出错误。
   */
  async init(): Promise<void> {
    if (this.#initialized) return;
    const r = lib.symbols.audio_init(
      this.#opts.sampleRate,
      this.#opts.channels,
      this.#opts.periodSizeInFrames,
    );
    if (r !== 0) throw new Error("AudioContext: audio_init failed");
    this.#initialized = true;
    this.#state = "running";
    this.#startPolling();
  }

  /**
   * 关闭引擎，释放所有资源。
   * 自动释放所有通过 `createSound()` 创建的 Sound 对象，停止内部轮询并销毁底层引擎。
   * 调用后引擎状态变为 `"closed"`，可安全重复调用。
   */
  close(): void {
    if (this.#state === "closed") return;
    this.#stopPolling();
    for (const s of this.#sounds) s.dispose();
    this.#sounds.clear();
    lib.symbols.audio_uninit();
    this.#initialized = false;
    this.#state = "closed";
  }

  /**
   * 加载音频文件并返回 Sound 对象。
   *
   * 支持 WAV、MP3、FLAC 等格式（取决于 miniaudio 编译时的解码器支持）。
   *
   * @param path    音频文件路径（相对于运行目录或绝对路径）
   * @param options 可选：初始音量、声像、音高、循环
   * @returns Sound 实例
   * @throws 如果引擎未初始化或文件加载失败
   *
   * @example
   * ```ts
   * const bgm = ctx.createSound("bgm.mp3", { loop: true, volume: 0.5 });
   * bgm.play();
   * ```
   */
  createSound(path: string, options?: SoundOptions): Sound {
    if (this.#state !== "running") {
      throw new Error("AudioContext: not running, call init() first");
    }
    const handle = lib.symbols.audio_load(ptr(path));
    if (handle < 0) throw new Error(`AudioContext: failed to load "${path}"`);
    const sound = new Sound(handle);
    if (options) {
      if (options.volume !== undefined) sound.volume = options.volume;
      if (options.pan !== undefined) sound.pan = options.pan;
      if (options.pitch !== undefined) sound.pitch = options.pitch;
      if (options.speed !== undefined) sound.speed = options.speed;
      if (options.loop !== undefined) sound.loop = options.loop;
    }
    this.#sounds.add(sound);
    return sound;
  }

  /**
   * 播放一次性音效（Fire-and-Forget）。
   *
   * 音频播放完毕后由底层自动清理，无需管理句柄。
   * 无法控制播放过程（停止、跳转等）。
   *
   * @param path   音频文件路径
   * @param volume 音量 (1.0 = 原声)
   *
   * @example
   * ```ts
   * ctx.playOneShot("sfx.wav", 0.8);
   * ```
   */
  playOneShot(path: string, volume = 1): void {
    if (this.#state !== "running") {
      throw new Error("AudioContext: not running, call init() first");
    }
    lib.symbols.audio_play_one_shot(ptr(path), volume);
  }

  /**
   * 从内部跟踪列表中移除 Sound 对象。
   *
   * 注意：这不会卸载底层音源，只是停止内部 ended 事件轮询。
   * 如需完全释放资源请调用 `sound.dispose()`。
   */
  removeSound(sound: Sound): void {
    this.#sounds.delete(sound);
  }

  #startPolling(): void {
    const ms = this.#opts.pollIntervalMs;
    this.#pollTimer = setInterval(() => {
      for (const s of this.#sounds) s._checkEnded();
    }, ms);
  }

  #stopPolling(): void {
    if (this.#pollTimer !== null) {
      clearInterval(this.#pollTimer);
      this.#pollTimer = null;
    }
  }
}
