// Web Audio API sound system for Marble Rush Arena
// Default muted because mobile browsers block autoplay

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = true;

export function isMuted() { return _muted; }

export function toggleMute(): boolean {
  _muted = !_muted;
  if (masterGain) masterGain.gain.value = _muted ? 0 : 0.3;
  return _muted;
}

export function setMuted(m: boolean) {
  _muted = m;
  if (masterGain) masterGain.gain.value = _muted ? 0 : 0.3;
}

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _muted ? 0 : 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return { ctx: audioCtx, gain: masterGain! };
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.3) {
  try {
    const { ctx, gain } = ensureContext();
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(vol, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(env);
    env.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playNoise(duration: number, vol = 0.1) {
  try {
    const { ctx, gain } = ensureContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const env = ctx.createGain();
    env.gain.setValueAtTime(vol, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(env);
    env.connect(gain);
    source.start();
  } catch {}
}

export function playCountdownBeep(final = false) {
  playTone(final ? 880 : 440, 0.15, 'square', 0.2);
}

export function playGateRelease() {
  playNoise(0.3, 0.15);
  playTone(220, 0.3, 'sawtooth', 0.15);
}

export function playCollision() {
  playTone(600 + Math.random() * 400, 0.05, 'square', 0.08);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, 'sine', 0.25), i * 120);
  });
}

export function playLose() {
  const notes = [400, 350, 300, 250];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, 'sawtooth', 0.15), i * 150);
  });
}

export function playMarbleRolling(intensity = 0.3) {
  playNoise(0.05, intensity * 0.05);
}
