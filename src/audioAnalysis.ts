export type AudioAnalysis = { bpm?: number; musicalKey?: string; chord?: string; rhythm: string; confidence: number; duration: number };
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function pearson(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
  let top = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; top += x * y; aa += x * x; bb += y * y; }
  return top / (Math.sqrt(aa * bb) || 1);
}
function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len, wr0 = Math.cos(angle), wi0 = Math.sin(angle);
    for (let i = 0; i < n; i += len) { let wr = 1, wi = 0; for (let j = 0; j < len / 2; j++) { const u = i + j, v = u + len / 2; const vr = real[v] * wr - imag[v] * wi, vi = real[v] * wi + imag[v] * wr; real[v] = real[u] - vr; imag[v] = imag[u] - vi; real[u] += vr; imag[u] += vi; const nw = wr * wr0 - wi * wi0; wi = wr * wi0 + wi * wr0; wr = nw; } }
  }
}
function getKey(chroma: number[]) {
  const sum = chroma.reduce((a, b) => a + b, 0);
  if (!sum || Math.max(...chroma) / sum > 0.72) return { key: undefined, confidence: 0 };
  const normalized = chroma.map(v => v / sum); let best = -Infinity, second = -Infinity, bestName = "";
  for (let tonic = 0; tonic < 12; tonic++) for (const [mode, profile] of [["major", MAJOR], ["minor", MINOR]] as const) {
    const rotated = profile.map((_, i) => profile[(i - tonic + 12) % 12]), score = pearson(normalized, rotated);
    if (score > best) { second = best; best = score; bestName = `${NOTE_NAMES[tonic]} ${mode}`; } else if (score > second) second = score;
  }
  return { key: best > 0.15 ? bestName : undefined, confidence: Math.max(0, Math.min(1, (best - Math.max(0, second)) * 2.4)) };
}
export async function analyzeAudio(blob: Blob, options: { rhythmSensitivity?: number; detectChord?: boolean } = {}): Promise<AudioAnalysis> {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Ta przeglądarka nie obsługuje analizy audio.");
  const context = new AudioContextCtor();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer()), duration = buffer.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Nie udało się odczytać długości audio.");
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)), length = buffer.length, mono = new Float32Array(length);
    for (const channel of channels) for (let i = 0; i < length; i++) mono[i] += channel[i] / channels.length;
    // Energy/onset envelope at ~100 Hz; entirely local, no audio is uploaded.
    const frameSize = 1024, hop = Math.max(1, Math.floor(buffer.sampleRate / 100)), onset: number[] = []; let previous = 0;
    for (let start = 0; start + frameSize < length; start += hop) { let energy = 0; for (let j = 0; j < frameSize; j += 2) energy += mono[start + j] ** 2; const rms = Math.sqrt(energy / (frameSize / 2)); onset.push(Math.max(0, rms - previous)); previous = rms; }
    const smooth = onset.map((_, i) => ((onset[i - 1] || 0) + onset[i] * 2 + (onset[i + 1] || 0)) / 4), mean = smooth.reduce((a, b) => a + b, 0) / (smooth.length || 1), sensitivity = Math.max(0, Math.min(100, options.rhythmSensitivity ?? 55)), threshold = 0.5 - sensitivity * 0.003, centered = smooth.map(v => Math.max(0, v - mean * threshold)), frameRate = buffer.sampleRate / hop;
    let bestLag = 0, bestScore = 0, secondScore = 0; const minLag = Math.max(1, Math.floor(frameRate * 60 / 240)), maxLag = Math.min(Math.floor(frameRate * 60 / 40), Math.floor(centered.length / 2));
    for (let lag = minLag; lag <= maxLag; lag++) { let score = 0, normA = 0, normB = 0; for (let i = lag; i < centered.length; i++) { score += centered[i] * centered[i - lag]; normA += centered[i] ** 2; normB += centered[i - lag] ** 2; } score /= Math.sqrt(normA * normB) || 1; if (score > bestScore) { secondScore = bestScore; bestScore = score; bestLag = lag; } else if (score > secondScore) secondScore = score; }
    let bpm: number | undefined = bestLag ? Math.round(frameRate * 60 / bestLag) : undefined;
    if (bpm && bpm < 65 && bpm * 2 <= 240) bpm *= 2; else if (bpm && bpm > 180 && bpm / 2 >= 40) bpm = Math.round(bpm / 2);
    const bpmConfidence = Math.max(0, Math.min(1, (bestScore - secondScore) * 3 + bestScore * 0.35)); if (duration < 1.2 || bestScore < 0.08) bpm = undefined;
    // Chroma analysis using Hann-windowed FFT frames and musical key profiles.
    const fftSize = 4096, chroma = new Array(12).fill(0), fftHop = 2048, totalFrames = Math.max(0, Math.floor((length - fftSize) / fftHop) + 1), stride = Math.max(1, Math.ceil(totalFrames / 100));
    for (let frame = 0, count = 0; frame + fftSize <= length && count < 100; frame += fftHop * stride, count++) {
      const real = new Float64Array(fftSize), imag = new Float64Array(fftSize); let frameEnergy = 0;
      for (let i = 0; i < fftSize; i++) { const v = mono[frame + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1))); real[i] = v; frameEnergy += v * v; }
      if (frameEnergy < 1e-5) continue; fft(real, imag);
      for (let bin = 4; bin < fftSize / 2; bin++) { const hz = bin * buffer.sampleRate / fftSize; if (hz < 55 || hz > 5000) continue; const midi = Math.round(69 + 12 * Math.log2(hz / 440)); if (midi >= 24 && midi <= 108) chroma[((midi % 12) + 12) % 12] += Math.hypot(real[bin], imag[bin]); }
    }
    const keyResult = getKey(chroma);
    // Best-fit triad estimate from the chroma energy. This is a chord guess, not transcription.
    let chord: string | undefined;
    if (options.detectChord !== false && chroma.reduce((a,b)=>a+b,0) > 0) {
      const roots = NOTE_NAMES;
      let bestChord = -Infinity;
      for (let root = 0; root < 12; root++) for (const mode of ["maj", "min"] as const) {
        const chordTones = mode === "maj" ? [root, (root+4)%12, (root+7)%12] : [root, (root+3)%12, (root+7)%12];
        const other = Array.from({length:12},(_,i)=>i).filter(i=>!chordTones.includes(i));
        const score = chordTones.reduce((sum,i)=>sum+chroma[i],0) - other.reduce((sum,i)=>sum+chroma[i],0)*0.12;
        if (score > bestChord) { bestChord = score; chord = `${roots[root]}${mode === "min" ? "m" : ""}`; }
      }
    }
    const peaks = centered.map((v, i) => ({ v, t: i / frameRate })).filter(p => p.v > mean * (1.1 - sensitivity * 0.005)), beatPeriod = bpm ? 60 / bpm : 0; let phaseStrength = 0;
    if (beatPeriod && peaks.length > 3) { const phaseBins = new Array(8).fill(0); for (const p of peaks) phaseBins[Math.floor(((p.t % beatPeriod) / beatPeriod) * 8) % 8] += p.v; phaseStrength = Math.max(...phaseBins) / (phaseBins.reduce((a, b) => a + b, 0) || 1); }
    const rhythm = duration < 1.2 ? "Za krótki sample do oceny rytmu" : !bpm ? "Rytm niepewny / nieregularny" : phaseStrength > 0.3 ? "Regularny puls" : "Rytm z synkopami lub luźny";
    return { bpm, musicalKey: keyResult.key, chord, rhythm, confidence: Math.round(Math.max(bpmConfidence, keyResult.confidence) * 100), duration };
  } finally { await context.close().catch(() => {}); }
}
