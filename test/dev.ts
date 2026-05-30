import { AudioContext, Sound } from "../mod.ts";
import { assertEquals, assertAlmostEquals } from "@std/assert";

const MP3 = "test/audio/Aria Math-C418#1Pt0X.mp3";
const WAV = "test/audio/die.wav";

Deno.test("AudioContext init / close", async () => {
  const ctx = new AudioContext({ sampleRate: 44100, channels: 2 });
  assertEquals(ctx.state, "closed");

  await ctx.init();
  assertEquals(ctx.state, "running");
  assertEquals(ctx.sampleRate, 44100);

  ctx.close();
  assertEquals(ctx.state, "closed");
});

Deno.test("load MP3 file", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(MP3);
  assert(s instanceof Sound);
  assert(s.handle >= 0);
  assert(s.length > 0, "MP3 length should be > 0");
  assert(s.duration > 0, "MP3 duration should be > 0");

  ctx.close();
});

Deno.test("load WAV file", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  assert(s.handle >= 0);
  assertEquals(s.length, 48510);
  assertEquals(s.duration, 1100);

  ctx.close();
});

Deno.test("volume / pan / pitch / speed / loop setters and getters", async () => {
  const ctx = new AudioContext();
  await ctx.init();
  const s = ctx.createSound(MP3);

  s.volume = 0.5;
  assertEquals(s.volume, 0.5);

  s.pan = -0.8;
  assertEquals(s.pan, -0.8);

  s.pitch = 1.5;
  assertEquals(s.pitch, 1.5);

  s.speed = 2;
  assertEquals(s.speed, 2);

  s.speed = 1;
  assertEquals(s.speed, 1);

  s.loop = true;
  assertEquals(s.loop, true);
  s.loop = false;
  assertEquals(s.loop, false);

  ctx.close();
});

Deno.test("speed via createSound options", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV, { speed: 2 });
  assertEquals(s.speed, 2);

  ctx.close();
});

Deno.test("play / stop / playing state", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  assertEquals(s.playing, false);

  s.play();
  assertEquals(s.playing, true);

  await new Promise((r) => setTimeout(r, 100));
  assert(s.position > 0, "position should advance after play");
  assert(s.currentTime > 0, "currentTime should advance after play");

  s.stop();
  await new Promise((r) => setTimeout(r, 50));
  assertEquals(s.playing, false);
  assertEquals(s.position, 0, "stop() should reset position to 0");

  ctx.close();
});

Deno.test("pause / resume", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  assertEquals(s.paused, false);

  s.play();
  await new Promise((r) => setTimeout(r, 50));
  assert(s.position > 0);

  const posBefore = s.position;
  s.pause();
  assertEquals(s.paused, true);
  assertEquals(s.playing, false);

  await new Promise((r) => setTimeout(r, 100));
  assertEquals(s.position, posBefore, "position should not change while paused");

  s.resume();
  assertEquals(s.paused, false);
  assertEquals(s.playing, true);

  s.stop();
  ctx.close();
});

Deno.test("pause event", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  const p = Promise.withResolvers<void>();
  s.addEventListener("pause", () => p.resolve());
  s.play();
  await new Promise((r) => setTimeout(r, 30));
  s.pause();
  await p.promise;

  ctx.close();
});

Deno.test("resume event", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  const p = Promise.withResolvers<void>();
  s.addEventListener("resume", () => p.resolve());
  s.play();
  await new Promise((r) => setTimeout(r, 30));
  s.pause();
  s.resume();
  await p.promise;

  s.stop();
  ctx.close();
});

Deno.test("seek WAV", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  s.seek(24000);
  s.play();
  await new Promise((r) => setTimeout(r, 50));

  assert(s.position > 20000, `seek position ${s.position} should be near 24000`);

  s.stop();
  ctx.close();
});

Deno.test("ended event on WAV", async () => {
  const ctx = new AudioContext({ pollIntervalMs: 30 });
  await ctx.init();

  const s = ctx.createSound(WAV);
  s.seek(44000);
  const ended = Promise.withResolvers<void>();

  s.addEventListener("ended", () => ended.resolve());
  s.play();
  await ended.promise;

  assertEquals(s.playing, false);
  ctx.close();
});

Deno.test("onended callback on WAV", async () => {
  const ctx = new AudioContext({ pollIntervalMs: 30 });
  await ctx.init();

  const s = ctx.createSound(WAV);
  s.seek(44000);
  const ended = Promise.withResolvers<void>();

  s.onended = () => ended.resolve();
  s.play();
  await ended.promise;

  ctx.close();
});

Deno.test("fadeIn / fadeTo / stopWithFade", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const a = ctx.createSound(WAV);
  a.fadeIn(1, 200);
  await new Promise((r) => setTimeout(r, 50));
  a.stop();

  const b = ctx.createSound(WAV);
  b.play();
  b.fadeTo(0.3, 200);
  await new Promise((r) => setTimeout(r, 50));
  b.stop();

  const c = ctx.createSound(WAV);
  c.play();
  c.stopWithFade(200);
  await new Promise((r) => setTimeout(r, 50));

  ctx.close();
});

Deno.test("playOneShot", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  ctx.playOneShot(WAV, 1.0);
  ctx.playOneShot(WAV, 0.5);
  await new Promise((r) => setTimeout(r, 300));

  ctx.close();
});

Deno.test("masterVolume", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const orig = ctx.masterVolume;
  ctx.masterVolume = 0.3;
  assertAlmostEquals(ctx.masterVolume, 0.3, 0.001);
  ctx.masterVolume = orig;

  ctx.close();
});

Deno.test("3D spatial audio setters", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(MP3);
  s.setSpatializationEnabled(true);
  s.setPosition(1, 2, 3);
  s.setAttenuationModel(1);
  s.setRolloff(2);
  s.setDopplerFactor(0.5);
  s.setMinGain(0.1);
  s.setMaxGain(3);
  s.setMinDistance(1);
  s.setMaxDistance(50);
  s.setCone(0.5, 1.0, 0.2);

  s.play();
  await new Promise((r) => setTimeout(r, 50));
  s.stop();
  ctx.close();
});

Deno.test("dispose / double close safety", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const s = ctx.createSound(WAV);
  s.play();
  s.dispose();
  assertEquals(s.disposed, true);
  assertEquals(s.playing, false);
  s.dispose();
  s.stop();
  s.play();
  s.seek(0);
  s.fadeIn();
  s.fadeTo(0, 100);
  s.stopWithFade();
  s.setPosition(0, 0, 0);
  assertEquals(s.position, 0);
  assertEquals(s.length, 0);

  ctx.close();
  ctx.close();
});

Deno.test("multiple concurrent sounds", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  const sounds: Sound[] = [];
  for (let i = 0; i < 5; i++) {
    const s = ctx.createSound(WAV, { loop: true, volume: 0.2 + i * 0.1 });
    s.play();
    sounds.push(s);
  }

  await new Promise((r) => setTimeout(r, 200));
  for (const s of sounds) assertEquals(s.playing, true);

  for (const s of sounds) s.stop();
  ctx.close();
});

Deno.test("load error throws", async () => {
  const ctx = new AudioContext();
  await ctx.init();

  try {
    ctx.createSound("nonexistent.wav");
    throw new Error("should have thrown");
  } catch (e) {
    assert(e instanceof Error && e.message.includes("failed to load"));
  }

  ctx.close();
});

Deno.test("AudioContext without init throws", () => {
  const ctx = new AudioContext();
  try {
    ctx.createSound("x.wav");
    throw new Error("should have thrown");
  } catch (e) {
    assert(e instanceof Error && e.message.includes("not running"));
  }
  assertEquals(ctx.state, "closed");
});

function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg ?? "assertion failed");
}
