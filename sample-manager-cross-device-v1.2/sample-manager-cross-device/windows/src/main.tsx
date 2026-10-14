import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioLines, Search, Plus, Play, Pause, Heart, Music2, SlidersHorizontal, FolderOpen, Trash2, Headphones, FolderPlus, Tags, Sparkles, X, Waves, Package, Download, WandSparkles } from "lucide-react";
import { analyzeAudio } from "./audioAnalysis";
import "./style.css";

type Sample = {
  id: string; name: string; category: string; type: string; size: number; duration?: number;
  favorite: boolean; addedAt: number; blob?: Blob; filePath?: string; tags?: string[]; sourceFolder?: string; bpm?: number; musicalKey?: string; analysisBpm?: number; analysisKey?: string; rhythm?: string; analysisConfidence?: number; chord?: string; analyzedAt?: number;
};
const DB_NAME = "sample-manager-db";
const STORE = "samples";
const categories = ["Wszystkie", "Kick", "Snare", "Clap", "Hi-hat", "Bass", "Synth", "Pad", "FX", "Vocal", "Perc", "Inne"];
const audioExt = /\.(wav|wave|mp3|aiff|aif|m4a|aac|ogg|flac|opus)$/i;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function allSamples(): Promise<Sample[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as Sample[]).sort((a, b) => b.addedAt - a.addedAt));
    req.onerror = () => reject(req.error);
  });
}
async function saveSample(sample: Sample) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(sample); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
async function removeSample(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
function prettySize(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function prettyTime(seconds?: number) { if (seconds === undefined || !Number.isFinite(seconds)) return "—:—"; return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
function categoryFromName(name: string) {
  const n = name.toLowerCase().replace(/[_-]+/g, " ");
  if (/\b(kick|bd|bass drum|808 kick)\b/.test(n)) return "Kick";
  if (/\b(snare|rimshot|rim shot)\b/.test(n)) return "Snare";
  if (/\b(clap|handclap)\b/.test(n)) return "Clap";
  if (/\b(hi.?hat|hihat|hat|hh|open hat|closed hat)\b/.test(n)) return "Hi-hat";
  if (/\b(bass|sub|808|reese|low end|bassline)\b/.test(n)) return "Bass";
  if (/\b(pad|atmosphere|ambient|drone|texture)\b/.test(n)) return "Pad";
  if (/\b(vocal|vox|voice|spoken|chant|acapella|a cappella|adlib|ad lib)\b/.test(n)) return "Vocal";
  if (/\b(fx|sfx|riser|uplifter|downlifter|impact|sweep|whoosh|transition|reverse|downer|hit|noise|glitch)\b/.test(n)) return "FX";
  if (/\b(synth|lead|arp|arpeggio|pluck|keys|piano|chord|stab|organ|rhodes|electric piano|ep)\b/.test(n)) return "Synth";
  if (/\b(perc|percussion|shaker|tambourine|conga|bongo|tom)\b/.test(n)) return "Perc";
  return "Inne";
}
function smartMetadata(file: File) {
  const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
  const text = `${path} ${file.name}`.toLowerCase().replace(/[_-]+/g, " ");
  const category = categoryFromName(text);
  const tags = new Set<string>();
  const rules: [RegExp, string][] = [
    [/\b(loop|loops|phrase|phrases|musical phrase)\b/, "loop"], [/\b(one.?shot|oneshot|single hit|single-hit)\b/, "one-shot"],
    [/\b(dry|unprocessed)\b/, "dry"], [/\b(wet|reverb|reverbed|delay)\b/, "wet"], [/\b(vintage|oldschool|old school|retro|classic)\b/, "vintage"],
    [/\b(analog|analogue|tape|cassette|vinyl)\b/, "analog"], [/\b(organic|acoustic|live|recorded)\b/, "organic"],
    [/\b(distorted|distortion|dirty|grit|saturated|fuzz)\b/, "distorted"], [/\b(clean|pure|pristine)\b/, "clean"],
    [/\b(dark|deep|moody|ominous)\b/, "dark"], [/\b(bright|shiny|sparkle|airy)\b/, "bright"], [/\b(soft|gentle|smooth|mellow)\b/, "soft"],
    [/\b(hard|punchy|punch|aggressive|heavy)\b/, "punchy"], [/\b(ambient|atmosphere|atmospheric|drone|soundscape)\b/, "ambient"],
    [/\b(techno|industrial techno)\b/, "techno"], [/\b(house|deep house|tech house|afro house|progressive house)\b/, "house"],
    [/\b(trap|drill|808 mafia)\b/, "trap"], [/\b(hip.?hop|boom bap|lo.?fi|lofi)\b/, "hip-hop"],
    [/\b(cinematic|trailer|orchestral|score)\b/, "cinematic"], [/\b(stereo|wide|stereo wide)\b/, "stereo"], [/\b(mono)\b/, "mono"],
    [/\b(female|woman|girl|her)\b/, "female"], [/\b(male|man|boy|him)\b/, "male"],
    [/\b(melodic|melody|melodic techno)\b/, "melodic"], [/\b(groove|groovy|swing|shuffle)\b/, "groove"],
    [/\b(warm|warmth|tube|soulful)\b/, "warm"], [/\b(futuristic|sci.?fi|cyberpunk)\b/, "futuristic"],
    [/\b(chill|chillout|downtempo|relax)\b/, "chill"], [/\b(energetic|energy|festival|anthem)\b/, "energetic"],
    [/\b(royalty.?free|no.?copyright)\b/, "royalty-free"], [/\b(stem|stems|multitrack)\b/, "stem"],
    [/\b(kick|bd|bass drum)\b/, "kick"], [/\b(snare|rimshot|rim shot)\b/, "snare"], [/\b(clap|handclap)\b/, "clap"],
    [/\b(hi.?hat|hihat|closed hat|open hat)\b/, "hi-hat"], [/\b(shaker|tambourine|conga|bongo|tom|percussion)\b/, "percussion"],
    [/\b(bass|sub|808|reese|bassline)\b/, "bass"], [/\b(pad|texture|drone)\b/, "texture"], [/\b(vocal|vox|voice|acapella|adlib)\b/, "vocal"],
    [/\b(riser|uplifter|downlifter|impact|sweep|whoosh|transition|reverse|glitch)\b/, "fx"],
  ];
  for (const [regex, tag] of rules) if (regex.test(text)) tags.add(tag);
  if (category !== "Inne") tags.add(category.toLowerCase());
  const bpmMatch = text.match(/(?:^|\D)(\d{2,3})\s*bpm\b|\b(\d{2,3})bpm\b/);
  const bpmRaw = bpmMatch ? Number(bpmMatch[1] || bpmMatch[2]) : undefined;
  const bpm = bpmRaw && bpmRaw >= 40 && bpmRaw <= 240 ? bpmRaw : undefined;
  const keyMatch = text.match(/\b([a-g](?:#|b)?\s?(?:major|minor|maj|min|m))\b|\b([a-g](?:#|b)?m)\b/i);
  const musicalKey = keyMatch ? (keyMatch[1] || keyMatch[2]).replace(/\s+/g, " ").trim() : undefined;
  const sourceFolder = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "";
  // Add reliable, low-cost metadata from path and filename without pretending to analyse the waveform.
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext) tags.add(ext);
  if (bpm) tags.add("tempo-tagged");
  if (musicalKey) tags.add("key-tagged");
  if (/\b(kit|drumkit|drum kit)\b/.test(text)) tags.add("kit");
  if (/\b(stem|stems)\b/.test(text)) tags.add("stem");
  if (/\b(royalty.?free|free sample)\b/.test(text)) tags.add("royalty-free");
  const folderParts = sourceFolder.split("/").filter(Boolean);
  folderParts.slice(-2).forEach(part => { const cleaned = part.toLowerCase().replace(/[_-]+/g, " ").trim(); if (cleaned.length > 2 && cleaned.length < 28 && !/^\d+$/.test(cleaned)) tags.add(cleaned); });
  return { category, tags: Array.from(tags).slice(0, 16), bpm, musicalKey, sourceFolder };
}
function readDuration(file: File): Promise<number | undefined> {
  return new Promise(resolve => {
    const audio = document.createElement("audio"); const url = URL.createObjectURL(file); let settled = false;
    const done = (value?: number) => { if (settled) return; settled = true; URL.revokeObjectURL(url); resolve(value); };
    audio.preload = "metadata"; audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : undefined); audio.onerror = () => done();
    audio.src = url; window.setTimeout(() => done(), 3000);
  });
}

type PackKind = "balanced" | "drums" | "harmonic" | "loops" | "oneshots" | "bass" | "vocals" | "fx" | "textures" | "starter";
type PackCandidate = { sample: Sample; score: number; reasons: string[] };
const NOTE_INDEX: Record<string, number> = { C:0, "C#":1, "C♯":1, Db:1, "D♭":1, D:2, "D#":3, "D♯":3, Eb:3, "E♭":3, E:4, F:5, "F#":6, "F♯":6, Gb:6, "G♭":6, G:7, "G#":8, "G♯":8, Ab:8, "A♭":8, A:9, "A#":10, "A♯":10, Bb:10, "B♭":10, B:11 };
function parseKey(value?: string): { tonic: number; minor: boolean } | undefined {
  if (!value) return;
  const normalized = value.trim().replace(/major/i, "maj").replace(/minor/i, "min");
  const match = normalized.match(/^([A-Ga-g](?:#|b|♯|♭)?)\s*(m|min|maj)?$/i);
  if (!match) return;
  const noteName = match[1][0].toUpperCase() + match[1].slice(1).replace("♯", "#").replace("♭", "b");
  const tonic = NOTE_INDEX[noteName];
  if (tonic === undefined) return;
  return { tonic, minor: /^(m|min)$/i.test(match[2] || "") };
}
function keyCompatibility(a?: string, b?: string): number | undefined {
  const x = parseKey(a), y = parseKey(b); if (!x || !y) return;
  const distance = Math.min((x.tonic-y.tonic+12)%12, (y.tonic-x.tonic+12)%12);
  if (distance === 0 && x.minor === y.minor) return 1;
  if (distance === 0 || (distance === 3 && x.minor !== y.minor) || (distance === 9 && x.minor !== y.minor)) return 0.86;
  if (distance === 5 || distance === 7) return 0.65;
  if (distance === 2 || distance === 10) return 0.42;
  return 0.12;
}
function rankSamples(samples: Sample[], opts: { bpm: number; key: string; kind: PackKind; genre: string; count: number }): PackCandidate[] {
  const keyWanted = opts.key === "Bez preferencji" ? undefined : opts.key;
  const categoryMap: Record<PackKind, string[]> = {
    balanced: ["Kick","Snare","Clap","Hi-hat","Bass","Synth","Pad","FX","Vocal","Perc"],
    drums: ["Kick","Snare","Clap","Hi-hat","Perc"], harmonic: ["Bass","Synth","Pad","Vocal"],
    loops: [], oneshots: ["Kick","Snare","Clap","Hi-hat","Perc","FX"], bass: ["Bass"], vocals: ["Vocal"], fx: ["FX"],
    textures: ["Pad","FX"], starter: ["Kick","Snare","Clap","Hi-hat","Perc","Bass","Synth","Pad","FX"]
  };
  const genreWords: Record<string, string[]> = {
    "Deep House":["deep house","house","deep","groove","warm","organ","piano","soulful"], "Progressive House":["progressive","house","uplift","melodic","atmosphere"],
    "Tech House":["tech house","house","groove","perc","driving"], "Afro House":["afro","house","organic","percussion","tribal"], "Melodic House":["melodic","house","emotional","pad","piano"],
    "Melodic Techno":["melodic techno","melodic","techno","dark","atmosphere"], "Peak-Time Techno":["techno","industrial","dark","driving","punchy"], "Minimal Techno":["minimal","techno","dry","perc","click"],
    "Hard Techno":["hard techno","techno","hard","industrial","distorted"], "Trance":"trance uplifting supersaw arpeggio euphoric melodic".split(" "), "Drum & Bass":["drum and bass","dnb","breakbeat","bass","break"],
    "UK Garage / 2-Step":["garage","ukg","2-step","shuffle","swing","vocal"], "Dubstep":["dubstep","wobble","bass","sub","heavy"], "Trap":["trap","808","hi-hat","dark","snare"],
    "Hip-Hop / Boom Bap":["hip-hop","boom bap","lofi","vinyl","soulful"], "Lo-Fi":["lofi","lo-fi","vinyl","tape","dusty","warm"], "R&B / Soul":["r&b","soul","soulful","vocal","warm","rhodes"],
    "Synthwave / Retrowave":["synthwave","retro","vintage","analog","synth","80s"], "Ambient / Drone":["ambient","atmosphere","cinematic","drone","pad"], "Cinematic / Orchestral":["cinematic","trailer","orchestral","impact","strings"],
    "Pop / Electronic":["pop","electronic","bright","vocal","synth"], "Rock / Industrial":["rock","industrial","guitar","distorted","live"], "Uniwersalna":[]
  };
  const targetWords = genreWords[opts.genre] || [];
  const seenFiles = new Set<string>();
  const uniqueSamples = samples.filter(sample => { const signature = `${sample.name.toLowerCase()}|${sample.size}`; if (seenFiles.has(signature)) return false; seenFiles.add(signature); return true; });
  const candidates = uniqueSamples.map(sample => {
    const reasons: string[] = []; let score = 28;
    const category = sample.category || "Inne";
    const text = `${sample.name} ${sample.sourceFolder || ""} ${sample.category} ${(sample.tags||[]).join(" ")}`.toLowerCase();
    const hasLoop = /\b(loop|loops|phrase|phrases|groove|break|beat|pattern)\b/.test(text);
    const hasOneShot = /\b(one.?shot|oneshot|hit|shot|kick|snare|clap|hihat|hi.?hat|perc|impact)\b/.test(text) || (!!sample.duration && sample.duration < 2.5);
    const kindMatches: Record<PackKind, boolean> = {
      balanced: categoryMap.balanced.includes(category), drums: categoryMap.drums.includes(category), harmonic: categoryMap.harmonic.includes(category),
      loops: hasLoop, oneshots: hasOneShot && categoryMap.oneshots.includes(category), bass: category === "Bass", vocals: category === "Vocal", fx: category === "FX", textures: categoryMap.textures.includes(category),
      starter: categoryMap.starter.includes(category)
    };
    if (kindMatches[opts.kind]) { score += opts.kind === "balanced" || opts.kind === "starter" ? 18 : 32; reasons.push(opts.kind === "loops" ? "loop / fraza" : category); }
    else score -= opts.kind === "balanced" ? 5 : opts.kind === "starter" ? 8 : 30;
    const bpm = sample.analysisBpm || sample.bpm;
    if (bpm) {
      const variants = [bpm, bpm*2, bpm/2]; const delta = Math.min(...variants.map(v => Math.abs(v-opts.bpm)));
      const bpmScore = Math.max(0, 1-delta/Math.max(6, opts.bpm*0.15)); score += bpmScore * 25;
      reasons.push(`${bpm} BPM${delta <= 2 ? " · tempo zgodne" : delta <= 8 ? " · tempo bliskie" : ""}`);
    } else { score += 5; reasons.push("BPM nieznane · neutralnie"); }
    const sampleKey = sample.analysisKey || sample.musicalKey;
    const compat = keyWanted ? keyCompatibility(sampleKey, keyWanted) : undefined;
    if (compat !== undefined) { score += compat * 22; reasons.push(`${sampleKey} · ${compat >= .85 ? "tonalnie pasuje" : compat >= .6 ? "możliwa zgodność" : "sprawdź słuchem"}`); }
    else if (keyWanted) { score += 4; reasons.push("tonacja nieznana · neutralnie"); }
    const matches = targetWords.filter(word => text.includes(word));
    if (targetWords.length) { score += Math.min(18, matches.length*4); if (matches.length) reasons.push(`styl: ${Array.from(new Set(matches)).slice(0,3).join(", ")}`); else score -= 5; }
    if (sample.favorite) { score += 3; reasons.push("ulubiony"); }
    if (sample.analysisConfidence !== undefined && sample.analysisConfidence >= 65) score += 3;
    if (sample.chord && keyWanted) { const chordFit = keyCompatibility(sample.chord, keyWanted); if (chordFit !== undefined) score += chordFit * 4; }
    if (sample.duration && sample.duration < 0.3 && !["oneshots","drums","fx","starter"].includes(opts.kind)) score -= 8;
    if (sample.duration && sample.duration > 8 && ["oneshots","drums"].includes(opts.kind)) score -= 6;
    return { sample, score: Math.round(Math.max(0, Math.min(100, score))), reasons };
  });
  const remaining = candidates.sort((a,b) => b.score-a.score); const selected: PackCandidate[] = []; const categoryCounts: Record<string, number> = {}; const nameCounts: Record<string, number> = {};
  while (remaining.length && selected.length < opts.count) {
    let bestIndex = 0, bestValue = -Infinity;
    remaining.forEach((candidate, index) => {
      const categoryPenalty = (["balanced","starter"].includes(opts.kind) ? (categoryCounts[candidate.sample.category] || 0) * 8 : 0);
      const folder = candidate.sample.sourceFolder || ""; const folderPenalty = folder ? (nameCounts[folder] || 0) * 2 : 0;
      const value = candidate.score - categoryPenalty - folderPenalty;
      if (value > bestValue) { bestValue = value; bestIndex = index; }
    });
    const [chosen] = remaining.splice(bestIndex,1); selected.push(chosen); categoryCounts[chosen.sample.category] = (categoryCounts[chosen.sample.category] || 0)+1;
    const folder = chosen.sample.sourceFolder || ""; if (folder) nameCounts[folder] = (nameCounts[folder] || 0)+1;
  }
  return selected;
}
function crc32(data: Uint8Array) {
  let crc = -1; for (const byte of data) { crc ^= byte; for (let k=0;k<8;k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ -1) >>> 0;
}
function zipStored(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder(); const locals: Uint8Array[] = [], centrals: Uint8Array[] = []; let offset = 0;
  const u16 = (v:number) => [v&255,(v>>>8)&255]; const u32 = (v:number) => [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  for (const file of files) {
    const name = enc.encode(file.name), data = file.data, crc = crc32(data);
    const local = new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);
    const central = new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
    locals.push(local); centrals.push(central); offset += local.length;
  }
  const centralSize = centrals.reduce((n,a)=>n+a.length,0), count = files.length;
  const end = new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(count),...u16(count),...u32(centralSize),...u32(offset),...u16(0)]);
  return new Blob([...locals,...centrals,end] as BlobPart[], {type:"application/zip"});
}
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=filename; a.click(); window.setTimeout(()=>URL.revokeObjectURL(url), 1500); }

function App() {
  const [samples, setSamples] = useState<Sample[]>([]); const [query, setQuery] = useState(""); const [category, setCategory] = useState("Wszystkie");
  const [tagFilter, setTagFilter] = useState("Wszystkie tagi"); const [favoritesOnly, setFavoritesOnly] = useState(false); const [playingId, setPlayingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Wersja 3: lokalna analiza BPM, tonacji i rytmu bez wysyłania audio."); const [loading, setLoading] = useState(true);
  const [importProgress, setImportProgress] = useState(""); const [showPackBuilder, setShowPackBuilder] = useState(false); const [serverUrl, setServerUrl] = useState(""); const [serverStatus, setServerStatus] = useState("Serwer opcjonalny — biblioteka działa lokalnie."); const [iosImportMode, setIosImportMode] = useState("files"); const [detectChords, setDetectChords] = useState(true); const [rhythmAnalyzerEnabled, setRhythmAnalyzerEnabled] = useState(true); const [rhythmSensitivity, setRhythmSensitivity] = useState(55); const [chordConfidence, setChordConfidence] = useState(45); const [batchAnalyzing, setBatchAnalyzing] = useState(false); const [packGenre, setPackGenre] = useState("Deep House"); const [packBpm, setPackBpm] = useState(117); const [packKey, setPackKey] = useState("Cm"); const [packCount, setPackCount] = useState(50); const [packKind, setPackKind] = useState<PackKind>("balanced"); const [packCandidates, setPackCandidates] = useState<PackCandidate[]>([]); const [analyzingId, setAnalyzingId] = useState<string | null>(null); const [editingSample, setEditingSample] = useState<Sample | null>(null); const [editTags, setEditTags] = useState("");
  const fileInput = useRef<HTMLInputElement>(null); const folderInput = useRef<HTMLInputElement>(null); const audioRef = useRef<HTMLAudioElement>(null); const objectUrlRef = useRef<string | null>(null);
  async function refresh() { try { setSamples(await allSamples()); } catch { setMessage("Nie udało się otworzyć lokalnej bazy. Uruchom aplikację przez localhost lub HTTPS."); } finally { setLoading(false); } }
  async function getSampleBlob(sample: Sample): Promise<Blob> {
    if (sample.blob instanceof Blob) return sample.blob;
    if (sample.filePath && window.sampleManagerDesktop) {
      const bytes = await window.sampleManagerDesktop.readAudio(sample.filePath);
      return new Blob([new Uint8Array(bytes).buffer], { type: sample.type.startsWith("audio/") ? sample.type : "application/octet-stream" });
    }
    throw new Error(`Brak danych audio dla pliku: ${sample.name}`);
  }
  async function scanDesktopFolder() {
    const desktop = window.sampleManagerDesktop;
    if (!desktop) { await refresh(); return; }
    setLoading(true);
    try {
      const result = await desktop.scanFolder();
      if (!result.folder) { await refresh(); setDesktopFolder(null); setMessage("Wybierz folder sampli na dysku, aby zbudować bibliotekę bez kopiowania plików."); return; }
      setDesktopFolder(result.folder);
      const existing = await allSamples();
      const byId = new Map(existing.map(item => [item.id, item]));
      for (let i = 0; i < result.files.length; i++) {
        const entry = result.files[i];
        const id = `desktop:${entry.path.toLowerCase()}`;
        const old = byId.get(id);
        const fakeFile = new File([], entry.name, { type: "audio/" + entry.extension });
        Object.defineProperty(fakeFile, "webkitRelativePath", { value: entry.relativePath });
        const meta = smartMetadata(fakeFile);
        const sample: Sample = { ...old, id, name: entry.name, category: old?.category && old.category !== "Inne" ? old.category : meta.category, type: "audio/" + entry.extension, size: entry.size, favorite: old?.favorite ?? false, addedAt: old?.addedAt ?? entry.modifiedAt, filePath: entry.path, blob: undefined, tags: old?.tags?.length ? old.tags : meta.tags, sourceFolder: entry.relativePath.includes("\\") ? entry.relativePath.split("\\").slice(0,-1).join("\\") : entry.relativePath.split("/").slice(0,-1).join("/"), bpm: old?.bpm ?? meta.bpm, musicalKey: old?.musicalKey ?? meta.musicalKey };
        await saveSample(sample);
      }
      // Keep previously indexed entries from this folder only if they still exist; metadata for other imported files remains intact.
      const currentPaths = new Set(result.files.map(entry => `desktop:${entry.path.toLowerCase()}`));
      for (const item of existing) if (item.id.startsWith("desktop:") && !currentPaths.has(item.id)) await removeSample(item.id);
      await refresh(); setMessage(`Biblioteka z dysku: ${result.files.length} plików audio. Pliki pozostają w oryginalnym folderze — nie są kopiowane do aplikacji.`);
    } catch (error) { setMessage(error instanceof Error ? `Nie udało się zeskanować folderu: ${error.message}` : "Nie udało się zeskanować folderu."); await refresh(); }
    finally { setLoading(false); }
  }
  async function chooseDesktopFolder() {
    const desktop = window.sampleManagerDesktop;
    if (!desktop) { setMessage("Tryb folderu bezpośredniego jest dostępny w aplikacji Windows, nie w zwykłej przeglądarce."); return; }
    const folder = await desktop.chooseFolder();
    if (folder) await scanDesktopFolder();
  }
  const [desktopFolder, setDesktopFolder] = useState<string | null>(null);
  const [desktopServerInfo, setDesktopServerInfo] = useState<{port:number;token:string;addresses:string[]}|null>(null);
  useEffect(() => { if (window.sampleManagerDesktop) { void scanDesktopFolder(); void window.sampleManagerDesktop.getServerInfo().then(setDesktopServerInfo); } else void refresh(); }, []);
  // Publish tags + analysis results (BPM, key, chord, rhythm) to the Electron main process so the iPhone sees them through /api/library.
  useEffect(() => {
    const desktop = window.sampleManagerDesktop;
    if (!desktop?.publishIndex || loading) return;
    const timer = window.setTimeout(() => {
      const entries = samples.filter(s => s.filePath).map(s => ({ filePath: s.filePath as string, category: s.category, tags: s.tags || [], bpm: s.analysisBpm || s.bpm, key: s.analysisKey || s.musicalKey, rhythm: s.rhythm, chord: s.chord, confidence: s.analysisConfidence, duration: s.duration, favorite: s.favorite, analyzed: !!s.analyzedAt }));
      void desktop.publishIndex(entries).catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [samples, loading]);
  useEffect(() => { if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  const allTags = useMemo(() => Array.from(new Set(samples.flatMap(s => s.tags || []))).sort((a,b) => a.localeCompare(b)), [samples]);
  const visible = useMemo(() => samples.filter(s => {
    const searchText = `${s.name} ${s.category} ${(s.tags || []).join(" ")} ${s.sourceFolder || ""} ${s.analysisBpm || s.bpm || ""} ${s.analysisKey || s.musicalKey || ""} ${s.rhythm || ""} ${s.chord || ""}`.toLowerCase();
    return (category === "Wszystkie" || s.category === category) && (tagFilter === "Wszystkie tagi" || (s.tags || []).includes(tagFilter)) && (!favoritesOnly || s.favorite) && searchText.includes(query.toLowerCase());
  }), [samples, category, tagFilter, favoritesOnly, query]);

  async function importFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter(file => audioExt.test(file.name) || file.type.startsWith("audio/"));
    let imported = 0; let skipped = list.length - files.length;
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; setImportProgress(`Analizuję ${i + 1}/${files.length}: ${file.name}`);
      const meta = smartMetadata(file); const duration = await readDuration(file);
      const sample: Sample = { id: crypto.randomUUID(), name: file.name, category: meta.category, type: file.type || file.name.split(".").pop()?.toUpperCase() || "AUDIO", size: file.size, duration, favorite: false, addedAt: Date.now(), blob: file, tags: meta.tags, sourceFolder: meta.sourceFolder, bpm: meta.bpm, musicalKey: meta.musicalKey };
      await saveSample(sample); imported++;
    }
    await refresh(); setImportProgress("");
    setMessage(imported ? `Zaimportowano ${imported} plik(ów)${skipped ? `; pominięto ${skipped} plik(ów) nieaudio` : ""}. Tagi i kategorie rozpoznano z nazw i ścieżek folderów.` : "Nie znaleziono obsługiwanych plików audio.");
    if (fileInput.current) fileInput.current.value = ""; if (folderInput.current) folderInput.current.value = "";
  }
  async function analyzeOne(sample: Sample) {
    if (analyzingId) return;
    setAnalyzingId(sample.id); setMessage(`Analizuję zawartość audio: ${sample.name}`);
    try {
      const result = await analyzeAudio(await getSampleBlob(sample), { rhythmSensitivity, detectChord: detectChords });
      await saveSample({ ...sample, analysisBpm: rhythmAnalyzerEnabled ? result.bpm : sample.analysisBpm, analysisKey: result.musicalKey, chord: detectChords && result.confidence >= chordConfidence ? result.chord : sample.chord, rhythm: rhythmAnalyzerEnabled ? result.rhythm : sample.rhythm, analysisConfidence: result.confidence, analyzedAt: Date.now(), duration: result.duration });
      await refresh();
      setMessage(`Analiza zakończona: ${sample.name}. Wyniki są szacunkowe i zależą od rodzaju sampla.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Nie udało się przeanalizować audio: ${error.message}` : "Nie udało się przeanalizować audio.");
    } finally { setAnalyzingId(null); }
  }
  async function testServer() {
    const endpoint = serverUrl.trim();
    if (!endpoint) { setServerStatus("Wpisz adres serwera albo pozostaw puste, aby pracować offline."); return; }
    setServerStatus("Sprawdzam połączenie…");
    try {
      const response = await fetch(endpoint, { method: "GET", mode: "cors" });
      setServerStatus(response.ok ? `Serwer odpowiada: HTTP ${response.status}.` : `Serwer odpowiada kodem HTTP ${response.status}.`);
    } catch { setServerStatus("Nie udało się połączyć. Sprawdź adres, CORS i czy serwer jest uruchomiony. Import oraz analiza lokalna nadal działają."); }
  }
  async function retagLibrary() {
    if (!samples.length) { setMessage("Najpierw zaimportuj sample do biblioteki."); return; }
    setBatchAnalyzing(true); let updated = 0;
    try {
      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i]; setImportProgress(`Odświeżam tagi ${i + 1}/${samples.length}: ${sample.name}`);
        const file = new File([await getSampleBlob(sample)], sample.name, { type: sample.type.startsWith("audio/") ? sample.type : "" });
        Object.defineProperty(file, "webkitRelativePath", { value: sample.sourceFolder ? `${sample.sourceFolder}/${sample.name}` : sample.name });
        const meta = smartMetadata(file);
        const tags = Array.from(new Set([...(sample.tags || []), ...meta.tags])).slice(0, 20);
        await saveSample({ ...sample, category: sample.category === "Inne" ? meta.category : sample.category, tags, bpm: sample.bpm || meta.bpm, musicalKey: sample.musicalKey || meta.musicalKey });
        updated++;
      }
      await refresh(); setMessage(`Tagowanie odświeżone: ${updated} sampli. Zachowano tagi ręczne i istniejące metadane.`);
    } catch (error) { setMessage(error instanceof Error ? `Nie udało się odświeżyć tagów: ${error.message}` : "Nie udało się odświeżyć tagów."); }
    finally { setBatchAnalyzing(false); setImportProgress(""); }
  }
  async function analyzeLibrary() {
    if (batchAnalyzing || !samples.length) { if (!samples.length) setMessage("Najpierw zaimportuj sample do biblioteki."); return; }
    setBatchAnalyzing(true);
    let done = 0, failed = 0;
    try {
      for (const sample of samples) {
        setImportProgress(`Analizator: ${done + failed + 1}/${samples.length} — ${sample.name}`);
        try {
          const result = await analyzeAudio(await getSampleBlob(sample), { rhythmSensitivity, detectChord: detectChords });
          await saveSample({ ...sample, analysisBpm: rhythmAnalyzerEnabled ? result.bpm : sample.analysisBpm, analysisKey: result.musicalKey, chord: detectChords && result.confidence >= chordConfidence ? result.chord : sample.chord, rhythm: rhythmAnalyzerEnabled ? result.rhythm : sample.rhythm, analysisConfidence: result.confidence, analyzedAt: Date.now(), duration: result.duration });
          done++;
        } catch { failed++; }
      }
      await refresh(); setMessage(`Analiza biblioteki zakończona: ${done} poprawnie, ${failed} pominiętych/błędnych.`);
    } finally { setBatchAnalyzing(false); setImportProgress(""); }
  }
  async function toggleFavorite(sample: Sample) { await saveSample({ ...sample, favorite: !sample.favorite }); await refresh(); }
  async function deleteOne(sample: Sample) { if (sample.filePath) { setMessage(`„${sample.name}” pochodzi z folderu na dysku. Aby usunąć go z widoku biblioteki, przenieś plik poza folder źródłowy i kliknij „Skanuj ponownie”. Oryginał nie zostanie usunięty przez aplikację.`); return; } if (!window.confirm(`Usunąć „${sample.name}” z biblioteki?`)) return; if (playingId === sample.id) stopAudio(); await removeSample(sample.id); await refresh(); }
  function stopAudio() { audioRef.current?.pause(); if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; setPlayingId(null); }
  async function play(sample: Sample) { if (playingId === sample.id) { stopAudio(); return; } if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); try { const blob = await getSampleBlob(sample); const url = URL.createObjectURL(blob); objectUrlRef.current = url; if (audioRef.current) { audioRef.current.src = url; audioRef.current.play().then(() => setPlayingId(sample.id)).catch(() => setMessage("Nie udało się odtworzyć pliku w tej przeglądarce.")); } } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się odczytać pliku audio."); } }
  function openTagEditor(sample: Sample) { setEditingSample(sample); setEditTags((sample.tags || []).join(", ")); }
  async function saveEditedTags() { if (!editingSample) return; const tags = Array.from(new Set(editTags.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean))).slice(0, 20); await saveSample({ ...editingSample, tags }); setEditingSample(null); await refresh(); setMessage("Zapisano tagi sampla."); }
  const totalBytes = samples.reduce((sum, s) => sum + s.size, 0);
  function generatePack() {
    if (!samples.length) { setMessage("Najpierw zaimportuj sample do biblioteki."); return; }
    const ranked = rankSamples(samples, { bpm: packBpm, key: packKey, kind: packKind, genre: packGenre, count: packCount });
    setPackCandidates(ranked); setShowPackBuilder(true); setMessage(`Generator wybrał ${ranked.length} sampli na podstawie tempa, tonacji, kategorii i tagów.`);
  }
  async function exportPack() {
    if (!packCandidates.length) return;
    setMessage("Przygotowuję ZIP z wybranymi samplami i manifestem…");
    try {
      const used = new Set<string>(); const files: {name:string;data:Uint8Array}[] = [];
      for (const item of packCandidates) {
        const original = item.sample.name.replace(/[\\/:*?"<>|]/g, "_"); let name = original; let n = 2;
        while (used.has(name.toLowerCase())) { const dot = original.lastIndexOf("."); name = dot > 0 ? `${original.slice(0,dot)} (${n++})${original.slice(dot)}` : `${original} (${n++})`; }
        used.add(name.toLowerCase()); files.push({name: `samples/${name}`, data: new Uint8Array(await (await getSampleBlob(item.sample)).arrayBuffer())});
      }
      const manifest = { app: "Sample Manager", version: "5.0", createdAt: new Date().toISOString(), settings: { genre: packGenre, targetBpm: packBpm, targetKey: packKey, kind: packKind }, samples: packCandidates.map((item,i) => ({ file: files[i].name, originalName: item.sample.name, category: item.sample.category, tags: item.sample.tags || [], detectedBpm: item.sample.analysisBpm || item.sample.bpm || null, detectedKey: item.sample.analysisKey || item.sample.musicalKey || null, rhythm: item.sample.rhythm || null, chord: item.sample.chord || null, rankScore: item.score, reasons: item.reasons })) };
      files.push({name:"manifest.json",data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
      downloadBlob(zipStored(files), `Sample-Manager-${packGenre.replace(/[^a-z0-9]+/gi,"-")}-${packBpm}BPM.zip`); setMessage(`Gotowe: ZIP zawiera ${packCandidates.length} sampli i manifest JSON.`);
    } catch (error) { setMessage(error instanceof Error ? `Nie udało się utworzyć ZIP: ${error.message}` : "Nie udało się utworzyć paczki ZIP."); }
  }
  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark"><AudioLines size={23}/></div><div className="brand"><strong>sample<span>manager</span></strong><small>VERSION 5.0 · SMART PACK BUILDER</small></div><button className="icon-button" aria-label="Ulubione" onClick={() => setFavoritesOnly(v => !v)}><Heart size={20} fill={favoritesOnly ? "currentColor" : "none"}/></button></header>
    <section className="hero"><div className="eyebrow"><span className="live-dot"/> OFFLINE SOUND LIBRARY</div><h1>Twój dźwięk.<br/><em>Twój porządek.</em></h1><p>Importuj pojedyncze sample albo całe foldery. Automatyczne tagowanie pomaga szybko znaleźć brzmienie.</p>
      <div className="import-actions"><button className="primary-button" onClick={() => fileInput.current?.click()}><Plus size={18}/> Importuj pliki</button><button className="secondary-button folder-button" onClick={() => folderInput.current?.click()}><FolderPlus size={18}/> Dodaj folder</button></div>
      <input ref={fileInput} type="file" accept="audio/*,.wav,.wave,.mp3,.aiff,.aif,.m4a,.aac,.ogg,.flac,.opus" multiple hidden onChange={e => void importFiles(e.target.files)}/>
      <input ref={folderInput} type="file" {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} multiple hidden onChange={e => void importFiles(e.target.files)}/>
      {importProgress && <div className="progress-note"><span className="spinner"/>{importProgress}</div>}
    </section>
    {window.sampleManagerDesktop && <section className="desktop-library-bar"><div><strong>Folder biblioteki</strong><span title={desktopFolder || "Nie wybrano folderu"}>{desktopFolder || "Nie wybrano folderu sampli"}</span><small>Bez kopiowania audio · folder zapamiętywany po ponownym uruchomieniu</small>{desktopServerInfo && <small className="lan-share">Dostęp dla iPhone’a: {desktopServerInfo.addresses.length ? desktopServerInfo.addresses.map(ip => `http://${ip}:${desktopServerInfo.port}`).join(" · ") : `port ${desktopServerInfo.port}`}<br/>Token: {desktopServerInfo.token} · wpisz adres i token w aplikacji iOS</small>}</div><button className="primary-button" onClick={() => void chooseDesktopFolder()}><FolderOpen size={17}/>{desktopFolder ? "Zmień folder" : "Wybierz folder sampli"}</button><button className="secondary-button" onClick={() => void scanDesktopFolder()}><Waves size={16}/>Skanuj ponownie</button></section>}
    <div className="pack-promo"><div className="pack-promo-icon"><Package size={22}/></div><div className="pack-promo-copy"><strong>Generator inteligentnych paczek</strong><span>Ranking według BPM, tonacji, stylu i różnorodności</span></div><button className="primary-button pack-open" onClick={() => {setShowPackBuilder(v=>!v); setPackCandidates([]);}}><WandSparkles size={17}/>{showPackBuilder ? "Zamknij" : "Stwórz paczkę"}</button></div>
    {showPackBuilder && <section className="pack-builder"><div className="section-heading"><div><div className="eyebrow">SMART RANKING ENGINE</div><h2>Generator <span>paczek</span></h2></div><div className="heading-icon"><Package size={20}/></div></div>
      <p className="pack-description">Dobiera pliki z biblioteki według stylu, typu paczki, tempa, tonacji i różnorodności. Brakujące metadane dostają neutralną ocenę, a nie automatyczną karę.</p>
      <div className="pack-form-grid"><label>Styl<select value={packGenre} onChange={e=>setPackGenre(e.target.value)}><option>Deep House</option><option>Progressive House</option><option>Tech House</option><option>Afro House</option><option>Melodic House</option><option>Melodic Techno</option><option>Peak-Time Techno</option><option>Minimal Techno</option><option>Hard Techno</option><option>Trance</option><option>Drum &amp; Bass</option><option>UK Garage / 2-Step</option><option>Dubstep</option><option>Trap</option><option>Hip-Hop / Boom Bap</option><option>Lo-Fi</option><option>R&amp;B / Soul</option><option>Synthwave / Retrowave</option><option>Ambient / Drone</option><option>Cinematic / Orchestral</option><option>Pop / Electronic</option><option>Rock / Industrial</option><option>Uniwersalna</option></select></label><label>Tempo docelowe<input type="number" min={40} max={240} value={packBpm} onChange={e=>setPackBpm(Math.max(40,Math.min(240,Number(e.target.value)||117)))}/><small>BPM</small></label><label>Tonacja<select value={packKey} onChange={e=>setPackKey(e.target.value)}>{["Cm","C","C#m","Dm","D","D#m","Em","F","Fm","F#m","G","Gm","G#m","Am","A","B♭m","B♭","Bm","Bez preferencji"].map(k=><option key={k}>{k}</option>)}</select></label><label>Liczba sampli<select value={packCount} onChange={e=>setPackCount(Number(e.target.value))}><option value={20}>20 sampli</option><option value={50}>50 sampli</option><option value={100}>100 sampli</option><option value={200}>200 sampli</option></select></label><label className="pack-kind-field">Typ paczki<select value={packKind} onChange={e=>setPackKind(e.target.value as PackKind)}><option value="balanced">Zrównoważona</option><option value="drums">Perkusja</option><option value="harmonic">Harmoniczna</option><option value="loops">Loopy i frazy</option><option value="oneshots">One-shoty / pojedyncze uderzenia</option><option value="bass">Bass / sub / 808</option><option value="vocals">Vocal / acapella</option><option value="fx">FX / przejścia / impacty</option><option value="textures">Tekstury / pady / drony</option><option value="starter">Starter kit — miks kategorii</option></select></label></div>
      <details className="advanced-settings"><summary>Ustawienia zaawansowane <span>Serwer · iOS · analiza audio</span></summary><div className="pack-extra-grid">
        <section className="pack-extra-card"><div className="extra-title"><FolderOpen size={17}/><strong>Serwer</strong></div><p>Opcjonalny adres serwera do testu połączenia. Audio nadal jest analizowane lokalnie.</p><label>Adres API / serwera<input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} placeholder="https://twoj-serwer.example/api/health" inputMode="url"/></label><div className="extra-actions"><button className="secondary-button" onClick={()=>void testServer()}>Sprawdź serwer</button><span className="extra-status">{serverStatus}</span></div></section>
        <section className="pack-extra-card"><div className="extra-title"><Plus size={17}/><strong>Import iOS</strong></div><p>Na iPhonie wybierz pliki przez systemowy selektor Pliki. Wybór całych folderów zależy od Safari.</p><label>Tryb importu<select value={iosImportMode} onChange={e=>setIosImportMode(e.target.value)}><option value="files">Pliki audio z aplikacji Pliki</option><option value="folder">Folder (jeśli Safari udostępnia)</option></select></label><button className="secondary-button" onClick={()=>iosImportMode === "folder" ? folderInput.current?.click() : fileInput.current?.click()}><FolderPlus size={15}/> Wybierz z Plików</button></section>
        <section className="pack-extra-card"><div className="extra-title"><Music2 size={17}/><strong>Chord Detection</strong></div><p>Szacuje dominujący akord z profilu chroma FFT. Wynik poniżej ustawionej pewności jest pomijany; to nie pełna transkrypcja progresji.</p><label className="toggle-field"><input type="checkbox" checked={detectChords} onChange={e=>setDetectChords(e.target.checked)}/> Wykrywaj akord</label><label>Próg zapisu wyniku (pewność ogólna)<input type="range" min={0} max={100} value={chordConfidence} onChange={e=>setChordConfidence(Number(e.target.value))}/><small>{chordConfidence}% — wynik poniżej progu nie zostanie zapisany</small></label></section>
        <section className="pack-extra-card"><div className="extra-title"><Waves size={17}/><strong>Rhythm Analyzer</strong></div><p>Analiza ataków i autokorelacji szacuje tempo oraz regularność pulsu.</p><label className="toggle-field"><input type="checkbox" checked={rhythmAnalyzerEnabled} onChange={e=>setRhythmAnalyzerEnabled(e.target.checked)}/> Włącz analizę rytmu / BPM</label><label>Czułość wykrywania<input type="range" min={0} max={100} value={rhythmSensitivity} onChange={e=>setRhythmSensitivity(Number(e.target.value))}/><small>{rhythmSensitivity}% — wyższa wartość reaguje na cichsze ataki</small></label></section>
      </div></details>
      <div className="pack-main-actions"><button className="primary-button" onClick={generatePack}><WandSparkles size={17}/> Dobierz i oceń sample</button><button className="secondary-button" onClick={()=>void analyzeLibrary()} disabled={batchAnalyzing}><Waves size={17}/>{batchAnalyzing ? "Przetwarzam bibliotekę…" : "Analizuj bibliotekę"}</button><button className="secondary-button" onClick={()=>void retagLibrary()} disabled={batchAnalyzing}><Tags size={17}/>Odśwież tagi</button></div>
      {packCandidates.length>0 && <div className="pack-results"><div className="pack-results-head"><div><strong>{packCandidates.length} wybranych sampli</strong><span>Ranking uwzględnia styl, dopasowanie i różnorodność folderów/kategorii.</span></div><button className="primary-button" onClick={()=>void exportPack()}><Download size={17}/> Eksport ZIP</button></div><div className="ranked-list">{packCandidates.map((item,index)=><div className="ranked-item" key={item.sample.id}><span className="rank-number">{String(index+1).padStart(2,"0")}</span><div className="ranked-main"><strong>{item.sample.name}</strong><small>{item.reasons.join(" · ")}</small></div><div className="rank-score"><strong>{item.score}</strong><span>/100</span></div></div>)}</div><p className="pack-description">Wynik to heurystyczna ocena dopasowania, nie gwarancja muzycznej zgodności. Przed użyciem sprawdź sample słuchem.</p></div>}
    </section>}
    <section className="stats"><div className="stat-card"><span>W BIBLIOTECE</span><strong>{samples.length.toLocaleString("pl-PL")}</strong><small>plików audio</small></div><div className="stat-card"><span>ZAJĘTE MIEJSCE</span><strong>{prettySize(totalBytes)}</strong><small>lokalnie na urządzeniu</small></div><div className="stat-card"><span>ULUBIONE</span><strong>{samples.filter(s => s.favorite).length}</strong><small>zapisanych dźwięków</small></div></section>
    <section className="library-section"><div className="section-heading"><div><div className="eyebrow">BROWSE COLLECTION</div><h2>Biblioteka <span>sampli</span></h2></div><div className="heading-icon"><FolderOpen size={20}/></div></div>
      <label className="search-box"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj nazwy, tagu, BPM, tonacji…"/><SlidersHorizontal size={17}/></label>
      <div className="category-row">{categories.map(c => <button key={c} className={`chip ${category === c ? "selected" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {allTags.length > 0 && <div className="tag-filter"><Tags size={15}/><select aria-label="Filtr tagów" value={tagFilter} onChange={e => setTagFilter(e.target.value)}><option>Wszystkie tagi</option>{allTags.map(tag => <option key={tag}>{tag}</option>)}</select><span>{allTags.length} tagów</span></div>}
      {loading ? <div className="empty-state"><div className="empty-icon"><Music2 size={26}/></div><h3>Otwieram bibliotekę…</h3></div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Headphones size={27}/></div><h3>{samples.length ? "Nic tu nie ma" : "Zacznij od pierwszego sampla"}</h3><p>{samples.length ? "Zmień wyszukiwanie, kategorię lub filtr tagów." : "Wybierz pliki audio albo cały folder z samplami."}</p><button className="secondary-button" onClick={() => folderInput.current?.click()}><FolderPlus size={17}/> Dodaj folder audio</button></div> :
      <div className="sample-list">{visible.map((s, i) => <article className="sample-row" key={s.id}><button className={`play-button ${playingId === s.id ? "is-playing" : ""}`} aria-label={playingId === s.id ? "Zatrzymaj" : "Odtwórz"} onClick={() => play(s)}>{playingId === s.id ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button><div className="sample-art" style={{"--art": i % 4} as React.CSSProperties}><AudioLines size={22}/></div>
        <div className="sample-info"><strong title={s.name}>{s.name}</strong><div className="sample-meta"><span>{s.category}</span><i/><span>{s.type.toUpperCase()}</span><i/><span>{prettyTime(s.duration)}</span>{(s.analysisBpm || s.bpm) && <><i/><span>{s.analysisBpm || s.bpm} BPM{s.analysisBpm ? " · analiza" : ""}</span></>}{(s.analysisKey || s.musicalKey) && <><i/><span>{s.analysisKey || s.musicalKey}{s.analysisKey ? " · analiza" : ""}</span></>}</div>
        {(s.tags?.length || s.sourceFolder || s.rhythm || s.chord) ? <div className="sample-tags">{s.rhythm && <span className="analysis-pill" title={`Pewność estymacji: ${s.analysisConfidence ?? 0}%`}>{s.rhythm}{s.analysisConfidence !== undefined ? ` · ${s.analysisConfidence}%` : ""}</span>}{s.chord && <span className="analysis-pill" title="Szacowany dominujący akord">Akord: {s.chord}</span>}{(s.tags || []).slice(0, 4).map(tag => <button className="tag-pill" key={tag} onClick={() => setTagFilter(tag)}>{tag}</button>)}{(s.tags?.length || 0) > 4 && <span className="more-tags">+{s.tags!.length - 4}</span>}{s.sourceFolder && <span className="folder-path" title={s.sourceFolder}><FolderOpen size={11}/>{s.sourceFolder}</span>}</div> : null}</div>
        <button className={`tiny-action ${analyzingId === s.id ? "analyzing" : ""}`} aria-label="Analizuj audio" title="Analizuj BPM, tonację i rytm z dźwięku" disabled={!!analyzingId} onClick={() => void analyzeOne(s)}><Waves size={16}/></button><button className="tiny-action" aria-label="Edytuj tagi" title="Edytuj tagi" onClick={() => openTagEditor(s)}><Tags size={16}/></button><button className={`tiny-action ${s.favorite ? "favorited" : ""}`} aria-label="Ulubione" onClick={() => void toggleFavorite(s)}><Heart size={17} fill={s.favorite ? "currentColor" : "none"}/></button><button className="tiny-action delete-action" aria-label="Usuń" onClick={() => void deleteOne(s)}><Trash2 size={16}/></button>
      </article>)}</div>}
    </section>
    <footer className="bottom-note"><span className="privacy-dot"/>{message}</footer>
    <nav className="bottom-nav"><div className="nav-item active"><Music2 size={19}/><span>Biblioteka</span></div><button className="nav-item" onClick={() => {setFavoritesOnly(v => !v); window.scrollTo({top: 0, behavior: "smooth"});}}><Heart size={19}/><span>Ulubione</span></button><button className="nav-item" onClick={() => setMessage("Analiza audio działa lokalnie. Kliknij ikonę fali przy samplu, aby oszacować BPM, tonację i charakter pulsu.")}><Sparkles size={19}/><span>Tagowanie</span></button></nav>
    {editingSample && <div className="modal-backdrop" role="presentation" onClick={e => {if (e.target === e.currentTarget) setEditingSample(null);}}><section className="tag-modal" role="dialog" aria-modal="true" aria-labelledby="tag-modal-title"><div className="modal-head"><div><div className="eyebrow">CUSTOM METADATA</div><h3 id="tag-modal-title">Edytuj tagi</h3></div><button className="tiny-action" onClick={() => setEditingSample(null)} aria-label="Zamknij"><X size={18}/></button></div><p>{editingSample.name}</p><label className="edit-tags-label">Tagi oddzielone przecinkami<textarea value={editTags} onChange={e => setEditTags(e.target.value)} rows={4} placeholder="np. warm, house, loop, dark"/></label><div className="modal-actions"><button className="secondary-button" onClick={() => setEditingSample(null)}>Anuluj</button><button className="primary-button" onClick={() => void saveEditedTags()}>Zapisz tagi</button></div></section></div>}
    <audio ref={audioRef} onEnded={() => setPlayingId(null)} onError={() => setPlayingId(null)}/>
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
