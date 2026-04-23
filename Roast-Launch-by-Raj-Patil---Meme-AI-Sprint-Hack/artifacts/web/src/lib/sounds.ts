let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    _ctx = new C();
  }
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

const KEY = "roastlaunch:muted";
let _muted: boolean =
  typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
const listeners = new Set<(m: boolean) => void>();

export function isMuted(): boolean {
  return _muted;
}
export function setMuted(m: boolean) {
  _muted = m;
  try {
    localStorage.setItem(KEY, m ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l(m));
  if (m) {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }
}
export function subscribeMute(fn: (m: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.18,
  startOffset = 0,
) {
  if (_muted) return;
  try {
    const c = ctx();
    const t = c.currentTime + startOffset;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {}
}

function sweep(
  fromFreq: number,
  toFreq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.2,
) {
  if (_muted) return;
  try {
    const c = ctx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {}
}

function noise(dur: number, gain = 0.15, filterFreq = 1200) {
  if (_muted) return;
  try {
    const c = ctx();
    const t = c.currentTime;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  } catch {}
}

export const Sound = {
  tick() {
    tone(880, 0.08, "square", 0.12);
  },
  fire() {
    noise(0.45, 0.25, 1800);
    sweep(120, 60, 0.45, "sawtooth", 0.18);
  },
  click() {
    tone(660, 0.05, "triangle", 0.1);
  },
  wagmi() {
    // ascending major arpeggio + air-horn-ish sweep
    tone(523.25, 0.18, "square", 0.12, 0);
    tone(659.25, 0.18, "square", 0.12, 0.12);
    tone(783.99, 0.22, "square", 0.14, 0.24);
    tone(1046.5, 0.45, "square", 0.16, 0.4);
    sweep(400, 1100, 0.6, "sawtooth", 0.1);
  },
  ngmi() {
    // descending death sound + glass-shatter noise
    sweep(660, 80, 0.9, "sawtooth", 0.22);
    setTimeout(() => noise(0.35, 0.18, 4500), 200);
    setTimeout(() => tone(55, 0.5, "sine", 0.25), 600);
  },
  dyor() {
    // warning warble
    tone(440, 0.18, "square", 0.18, 0);
    tone(330, 0.18, "square", 0.18, 0.2);
    tone(440, 0.18, "square", 0.18, 0.4);
    tone(330, 0.22, "square", 0.18, 0.6);
  },
};

export function speak(text: string, voiceHint = "male"): void {
  if (_muted) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = voiceHint === "female" ? 1.15 : 0.9;
    u.volume = 0.95;
    const voices = synth.getVoices();
    if (voices.length) {
      const preferred =
        voices.find((v) =>
          voiceHint === "female"
            ? /female|samantha|victoria|karen|tessa/i.test(v.name)
            : /male|daniel|alex|fred|google.*us/i.test(v.name),
        ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) u.voice = preferred;
    }
    synth.speak(u);
  } catch {}
}

export function stopSpeak(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}
