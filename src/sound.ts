import lib from "./ffi.ts";

/** 创建 Sound 时可选的初始参数 */
export interface SoundOptions {
  /** 初始音量 (0.0 ~ 1.0，可大于 1.0 增益)，默认 1.0 */
  volume?: number;
  /** 初始声像 (-1.0 全左 ~ 1.0 全右)，默认 0.0 */
  pan?: number;
  /** 初始音高倍率 (1.0 = 原速)，默认 1.0 */
  pitch?: number;
  /** 初始播放速度倍率 (1.0 = 原速)，默认 1.0 */
  speed?: number;
  /** 是否循环播放，默认 false */
  loop?: boolean;
}

function applyRate(h: number, pitch: number, speed: number): void {
  lib.symbols.audio_set_pitch(h, pitch * speed);
}

export class Sound extends EventTarget {
  #handle: number;
  #ended = false;
  #paused = false;
  #volume = 1;
  #pan = 0;
  #pitch = 1;
  #speed = 1;
  #loop = false;
  #disposed = false;

  constructor(handle: number) {
    super();
    this.#handle = handle;
  }

  _checkEnded(): void {
    if (this.#ended || this.#disposed || this.#loop || this.#paused) return;
    if (lib.symbols.audio_is_at_end(this.#handle) === 1) {
      this.#ended = true;
      const ev = new Event("ended");
      this.dispatchEvent(ev);
      this.onended?.(ev);
    }
  }

  get paused(): boolean {
    return this.#paused;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  get handle(): number {
    return this.#handle;
  }

  get volume(): number {
    return this.#volume;
  }

  set volume(v: number) {
    this.#volume = v;
    lib.symbols.audio_set_volume(this.#handle, v);
  }

  get pan(): number {
    return this.#pan;
  }

  set pan(v: number) {
    this.#pan = v;
    lib.symbols.audio_set_pan(this.#handle, v);
  }

  get pitch(): number {
    return this.#pitch;
  }

  set pitch(v: number) {
    this.#pitch = v;
    applyRate(this.#handle, this.#pitch, this.#speed);
  }

  get speed(): number {
    return this.#speed;
  }

  set speed(v: number) {
    this.#speed = v;
    applyRate(this.#handle, this.#pitch, this.#speed);
  }

  get loop(): boolean {
    return this.#loop;
  }

  set loop(v: boolean) {
    this.#loop = v;
    lib.symbols.audio_set_looping(this.#handle, v ? 1 : 0);
  }

  get playing(): boolean {
    return !this.#disposed && lib.symbols.audio_is_playing(this.#handle) === 1;
  }

  get position(): number {
    if (this.#disposed) return 0;
    return Number(lib.symbols.audio_get_position(this.#handle));
  }

  get length(): number {
    if (this.#disposed) return 0;
    return Number(lib.symbols.audio_get_length(this.#handle));
  }

  get currentTime(): number {
    if (this.#disposed) return 0;
    return Number(lib.symbols.audio_get_position_in_milliseconds(this.#handle));
  }

  get duration(): number {
    if (this.#disposed) return 0;
    return Number(lib.symbols.audio_get_length_in_milliseconds(this.#handle));
  }

  play(): void {
    if (this.#disposed) return;
    this.#ended = false;
    this.#paused = false;
    lib.symbols.audio_play(this.#handle);
  }

  stop(): void {
    if (this.#disposed) return;
    this.#paused = false;
    lib.symbols.audio_stop(this.#handle);
    lib.symbols.audio_seek(this.#handle, 0n);
  }

  pause(): void {
    if (this.#disposed) return;
    if (!lib.symbols.audio_is_playing(this.#handle)) return;
    this.#paused = true;
    lib.symbols.audio_stop(this.#handle);
    this.dispatchEvent(new Event("pause"));
  }

  resume(): void {
    if (this.#disposed || !this.#paused) return;
    this.#paused = false;
    this.#ended = false;
    lib.symbols.audio_play(this.#handle);
    this.dispatchEvent(new Event("resume"));
  }

  seek(frame: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_seek(this.#handle, BigInt(frame));
  }

  fadeIn(volumeEnd = 1, durationMs = 1000): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_fade_in_milliseconds(
      this.#handle,
      -1,
      volumeEnd,
      BigInt(durationMs),
    );
    this.play();
  }

  fadeTo(volumeEnd: number, durationMs: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_fade_in_milliseconds(
      this.#handle,
      -1,
      volumeEnd,
      BigInt(durationMs),
    );
  }

  stopWithFade(durationMs = 500): void {
    if (this.#disposed) return;
    lib.symbols.audio_stop_with_fade_in_milliseconds(
      this.#handle,
      BigInt(durationMs),
    );
  }

  setPosition(x: number, y: number, z: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_position(this.#handle, x, y, z);
  }

  setSpatializationEnabled(enabled: boolean): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_spatialization_enabled(this.#handle, enabled ? 1 : 0);
  }

  setAttenuationModel(model: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_attenuation_model(this.#handle, model);
  }

  setRolloff(rolloff: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_rolloff(this.#handle, rolloff);
  }

  setDopplerFactor(factor: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_doppler_factor(this.#handle, factor);
  }

  setMinGain(gain: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_min_gain(this.#handle, gain);
  }

  setMaxGain(gain: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_max_gain(this.#handle, gain);
  }

  setMinDistance(distance: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_min_distance(this.#handle, distance);
  }

  setMaxDistance(distance: number): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_max_distance(this.#handle, distance);
  }

  setCone(
    innerAngleRadians: number,
    outerAngleRadians: number,
    outerGain: number,
  ): void {
    if (this.#disposed) return;
    lib.symbols.audio_set_cone(
      this.#handle,
      innerAngleRadians,
      outerAngleRadians,
      outerGain,
    );
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    lib.symbols.audio_unload(this.#handle);
    this.#handle = -1;
  }

  onended: ((this: Sound, ev: Event) => void) | null = null;
}
