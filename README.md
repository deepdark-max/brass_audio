<div align="center">

# 🎵 @brass/audio

**An audio playback library for Deno, based on miniaudio**  
**适用于 Deno 的音频播放库，基于miniaudio**

[![JSR](https://jsr.io/badges/@brass/audio)](https://jsr.io/@brass/audio)
[![JSR Score](https://jsr.io/badges/@brass/audio/score)](https://jsr.io/@brass/audio)
![Windows](https://img.shields.io/badge/Windows-blue?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODggNTEyIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMCAzMkwyMDMuMiAzMy4zVjI0Ny4ySDB6TTAgMzJMMjAzLjIgMzMuM1YyNDcuMkgweiBNMjQ0LjcgMzMuM0w0ODggMzJWMjQ3LjJIMjQ0Ljd6TTI0NC43IDMzLjNMNDg4IDMyVjI0Ny4ySDI0NC43ek0wIDI2NC43SDIwMy4yVjQ3OC43TDAgNDgwek0wIDI2NC43SDIwMy4yVjQ3OC43TDAgNDgweiBNMjQ0LjcgMjY0LjdINDg4VjQ3OC43TDI0NC43IDQ4MHoiLz48L3N2Zz4=)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Deno](https://img.shields.io/badge/Deno-^2.0-black?logo=deno)
</div>

> 暂时仅支持 Windows

---

## 📦 Installation / 安装

```bash
# JSR
deno add jsr:@brass/audio

# or import directly / 或直接导入
import { AudioContext } from "jsr:@brass/audio"
```

> **⚠️ Native FFI Required / 需要 FFI 权限** — Run with `deno --allow-ffi` or `deno -A`.
> 需要使用 `--allow-ffi` 或 `-A` 权限运行。

---

## 🚀 Quick Start / 快速开始

```typescript
import { AudioContext } from "@brass/audio";

const ctx = new AudioContext();
await ctx.init();

// Load & play background music (loop) / 加载并播放背景音乐（循环）
const bgm = ctx.createSound("music.mp3", { loop: true, volume: 0.5 });
bgm.play();

// Sound effect + ended event / 音效 + ended 事件
const sfx = ctx.createSound("sfx.wav");
sfx.addEventListener("ended", () => console.log("播放完毕"));
sfx.play();

// One-shot / 一次性播放
ctx.playOneShot("click.wav", 0.8);

// Pause / Resume / 暂停恢复
const sfx2 = ctx.createSound("sfx.wav");
sfx2.play();
sfx2.addEventListener("pause", () => console.log("paused"));
sfx2.pause(); // keep position / 保留位置
sfx2.resume(); // resume from paused position / 从暂停处恢复

// Playback speed / 播放速度
const voice = ctx.createSound("voice.wav", { speed: 1.5 });
voice.play();

// Fade in / 淡入
const intro = ctx.createSound("intro.wav");
intro.fadeIn(1, 2000);

// 3D spatial audio / 3D 空间音频
const engine = ctx.createSound("engine.wav", { loop: true });
engine.setSpatializationEnabled(true);
engine.setPosition(5, 0, -3);
engine.setRolloff(1.5);
engine.play();

// Cleanup / 清理
ctx.close();
```

---

## ✨ Features / 特性

<details open>
<summary><b>English</b></summary>

- 🎯 **Simple API** — `AudioContext` + `Sound`, Web Audio API–style, works out of the box
- 🎼 **Multi-format** — MP3, WAV, FLAC (depends on miniaudio compilation flags)
- 📡 **Event-driven** — `ended` event via `addEventListener` / `onended` callback
- 🎮 **Playback Control** — play / pause / resume / stop / seek / loop / volume / pan / pitch / speed
- 🎚️ **Fade Support** — `fadeIn()`, `fadeTo()`, `stopWithFade()`
- 🌌 **3D Spatial Audio** — position, attenuation model, Doppler effect, sound cone
- 💥 **One-shot** — `playOneShot()` auto-cleanups after playback
- 🔊 **Concurrent Playback** — up to 64 simultaneous sounds
- 📦 **Bundled DLL** — No external native dependencies; ships in one package
- 🎯 **TypeScript** — Fully typed API with JSDoc documentation

</details>

<details>
<summary><b>中文</b></summary>

- 🎯 **简单 API** — `AudioContext` + `Sound`，Web Audio API 风格，开箱即用
- 🎼 **多格式** — MP3、WAV、FLAC（取决于 miniaudio 编译支持）
- 📡 **事件监听** — `ended` 事件，支持 `addEventListener` 和 `onended` 回调
- 🎮 **播放控制** — play / pause / resume / stop / seek / loop / volume / pan / pitch / speed
- 🎚️ **淡入淡出** — `fadeIn()` / `fadeTo()` / `stopWithFade()`
- 🌌 **3D 空间音频** — 位置、衰减模型、多普勒效应、听锥
- 💥 **一次性音效** — `playOneShot()` 自动清理
- 🔊 **并发播放** — 最多 64 路同时播放
- 📦 **内置 DLL** — 无外部原生依赖，一个包全部包含
- 🎯 **TypeScript** — 完整类型与 JSDoc 文档

</details>

---

## 📖 API Reference / API 参考

### 🔊 AudioContext

| Method / 方法 | Description / 说明 |
|---|---|
| `new AudioContext(opts?)` | Create engine instance / 创建引擎实例 |
| `await ctx.init()` | Initialize engine / 初始化引擎 |
| `ctx.close()` | Close engine, release all resources / 关闭引擎 |
| `ctx.state` | Current state `"running"` \| `"closed"` / 当前状态 |
| `ctx.sampleRate` | Sample rate (Hz) / 采样率 |
| `ctx.channels` | Channel count / 通道数 |
| `ctx.masterVolume` | Global volume getter/setter / 全局音量 |
| `ctx.createSound(path, opts?)` | Load audio & return `Sound` / 加载音频 |
| `ctx.playOneShot(path, volume?)` | One-shot playback / 一次性播放 |

**AudioContextOptions**

| Option / 选项 | Default / 默认值 | Description / 说明 |
|---|---|---|
| `sampleRate` | `44100` | Sample rate (Hz) / 采样率 |
| `channels` | `2` | Output channels / 输出通道数 |
| `periodSizeInFrames` | `512` | Buffer size (lower = less latency) / 回调帧数 |
| `pollIntervalMs` | `200` | ended event poll interval (ms) / 事件轮询间隔 |

**SoundOptions** (for `createSound` / `createSound` 选项)

| Option / 选项 | Default / 默认值 | Description / 说明 |
|---|---|---|
| `volume` | `1.0` | Volume / 音量 |
| `pan` | `0.0` | Pan / 声像 |
| `pitch` | `1.0` | Pitch multiplier / 音高倍率 |
| `speed` | `1.0` | Playback speed multiplier / 播放速度倍率 |
| `loop` | `false` | Loop playback / 循环播放 |

### 🔉 Sound

| Property / 属性 | Type / 类型 | Description / 说明 |
|---|---|---|
| `.volume` | getter/setter | Volume 0.0 ~ 1.0+ / 音量 |
| `.pan` | getter/setter | Pan -1.0 ~ 1.0 / 声像 |
| `.pitch` | getter/setter | Pitch multiplier / 音高倍率 |
| `.speed` | getter/setter | Playback speed multiplier (× pitch) / 播放速度倍率 |
| `.loop` | getter/setter | Loop playback / 循环播放 |
| `.playing` | `boolean` | Is playing / 是否正在播放 |
| `.paused` | `boolean` | Is paused / 是否暂停 |
| `.position` | `number` | Current frame position / 当前帧位置 |
| `.length` | `number` | Total frames / 总帧数 |
| `.currentTime` | `number` | Current time (ms) / 当前毫秒位置 |
| `.duration` | `number` | Total duration (ms) / 总时长 |
| `.disposed` | `boolean` | Is disposed / 是否已释放 |
| `.onended` | callback | Playback ended callback / 播放结束回调 |

| Method / 方法 | Description / 说明 |
|---|---|
| `.play()` | Start or resume playback / 开始播放 |
| `.stop()` | Stop and reset to beginning / 停止并重置到开头 |
| `.pause()` | Pause (keep position) / 暂停（保留位置） |
| `.resume()` | Resume from paused position / 从暂停处恢复 |
| `.seek(frame)` | Seek to frame / 跳转到指定帧 |
| `.fadeIn(volumeEnd?, durationMs?)` | Fade in and play / 淡入播放 |
| `.fadeTo(volumeEnd, durationMs)` | Fade volume / 渐变音量 |
| `.stopWithFade(durationMs?)` | Fade out and stop / 淡出停止 |
| `.setPosition(x, y, z)` | Set 3D position / 设置 3D 位置 |
| `.setSpatializationEnabled(bool)` | Enable/disable spatial audio / 空间音频 |
| `.setAttenuationModel(model)` | 0=none, 1=inverse, 2=linear, 3=exponential |
| `.setRolloff(rolloff)` | Set rolloff / 设置衰减率 |
| `.setDopplerFactor(factor)` | Set Doppler factor / 设置多普勒因子 |
| `.setMinGain(gain)` | Set min gain / 最小增益 |
| `.setMaxGain(gain)` | Set max gain / 最大增益 |
| `.setMinDistance(d)` | Set min distance / 最小距离 |
| `.setMaxDistance(d)` | Set max distance / 最大距离 |
| `.setCone(inner, outer, gain)` | Set sound cone / 设置听锥 |
| `.dispose()` | Release resources / 释放资源 |

**Events / 事件**

| Event | Description / 说明 |
|---|---|
| `ended` | Playback reached the end / 播放结束 |
| `pause` | Sound was paused / 暂停 |
| `resume` | Sound was resumed / 恢复播放 |

```typescript
s.addEventListener("ended", handler);
s.addEventListener("pause", () => console.log("paused"));
s.addEventListener("resume", () => console.log("resumed"));
```

---

## 📄 License / 许可

[MIT]

---

<div align="center">
<sub>Built with 🦕 Deno + <a href="https://miniaud.io">miniaudio</a> · <a href="https://github.com/mackron/miniaudio">GitHub</a></sub>
</div>
