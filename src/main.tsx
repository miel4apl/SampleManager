import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioLines, Search, Plus, Play, Pause, Heart, Music2, SlidersHorizontal, FolderOpen, Trash2, Headphones, X } from "lucide-react";
import "./style.css";

type Sample = {
  id: string;
  name: string;
  category: string;
  type: string;
  size: number;
  duration?: number;
  favorite: boolean;
  addedAt: number;
  blob: Blob;
};

const DB_NAME = "sample-manager-db";
const STORE = "samples";
const categories = ["Wszystkie", "Kick", "Snare", "Clap", "Hi-hat", "Bass", "Synth", "Pad", "FX", "Vocal", "Perc", "Inne"];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(sample);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function removeSample(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function prettyTime(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return "—:—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
function categoryFromName(name: string) {
  const n = name.toLowerCase();
  if (n.includes("kick") || n.includes("bd")) return "Kick";
  if (n.includes("snare")) return "Snare";
  if (n.includes("clap")) return "Clap";
  if (n.includes("hat") || n.includes("hh")) return "Hi-hat";
  if (n.includes("bass") || n.includes("sub")) return "Bass";
  if (n.includes("pad")) return "Pad";
  if (n.includes("vocal") || n.includes("vox")) return "Vocal";
  if (n.includes("fx") || n.includes("riser") || n.includes("impact")) return "FX";
  if (n.includes("synth") || n.includes("lead")) return "Synth";
  if (n.includes("perc")) return "Perc";
  return "Inne";
}

function App() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Twoja biblioteka jest przechowywana na tym urządzeniu.");
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  async function refresh() {
    try { setSamples(await allSamples()); }
    catch { setMessage("Nie udało się otworzyć lokalnej bazy. Uruchom aplikację przez localhost lub HTTPS."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const visible = useMemo(() => samples.filter(s =>
    (category === "Wszystkie" || s.category === category) &&
    (!favoritesOnly || s.favorite) &&
    s.name.toLowerCase().includes(query.toLowerCase())
  ), [samples, category, favoritesOnly, query]);

  async function importFiles(list: FileList | null) {
    if (!list?.length) return;
    let imported = 0;
    for (const file of Array.from(list)) {
      if (!/\.(wav|wave|mp3|aiff|aif|m4a|aac|ogg|flac)$/i.test(file.name) && !file.type.startsWith("audio/")) continue;
      const audio = document.createElement("audio");
      const duration = await new Promise<number | undefined>(resolve => {
        const url = URL.createObjectURL(file);
        audio.preload = "metadata";
        audio.src = url;
        audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(audio.duration); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
        setTimeout(() => resolve(undefined), 2500);
      });
      await saveSample({
        id: crypto.randomUUID(), name: file.name, category: categoryFromName(file.name),
        type: file.type || file.name.split(".").pop()?.toUpperCase() || "AUDIO",
        size: file.size, duration, favorite: false, addedAt: Date.now(), blob: file
      });
      imported++;
    }
    await refresh();
    setMessage(imported ? `Zaimportowano ${imported} plik(ów). Są zapisane lokalnie.` : "Nie znaleziono obsługiwanych plików audio.");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function toggleFavorite(sample: Sample) {
    await saveSample({ ...sample, favorite: !sample.favorite });
    await refresh();
  }
  async function deleteOne(sample: Sample) {
    if (!window.confirm(`Usunąć „${sample.name}” z biblioteki?`)) return;
    if (playingId === sample.id) stopAudio();
    await removeSample(sample.id);
    await refresh();
  }
  function stopAudio() {
    audioRef.current?.pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPlayingId(null);
  }
  function play(sample: Sample) {
    if (playingId === sample.id) { stopAudio(); return; }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(sample.blob);
    objectUrlRef.current = url;
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().then(() => setPlayingId(sample.id)).catch(() => setMessage("Nie udało się odtworzyć pliku w tej przeglądarce."));
    }
  }

  const totalBytes = samples.reduce((sum, s) => sum + s.size, 0);

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-mark"><AudioLines size={23}/></div>
      <div className="brand"><strong>sample<span>manager</span></strong><small>YOUR OFFLINE SOUND LIBRARY</small></div>
      <button className="icon-button" aria-label="Ulubione" onClick={() => setFavoritesOnly(v => !v)}><Heart size={20} fill={favoritesOnly ? "currentColor" : "none"}/></button>
    </header>

    <section className="hero">
      <div className="eyebrow"><span className="live-dot"/> OFFLINE LIBRARY</div>
      <h1>Twój dźwięk.<br/><em>Twój porządek.</em></h1>
      <p>Wszystkie sample pod ręką. Bez chmury, bez konta, bez internetu.</p>
      <button className="primary-button" onClick={() => fileInput.current?.click()}><Plus size={19}/> Importuj sample</button>
      <input ref={fileInput} type="file" accept="audio/*,.wav,.wave,.mp3,.aiff,.aif,.m4a,.aac,.ogg,.flac" multiple hidden onChange={e => void importFiles(e.target.files)}/>
    </section>

    <section className="stats">
      <div className="stat-card"><span>W BIBLIOTECE</span><strong>{samples.length.toLocaleString("pl-PL")}</strong><small>plików audio</small></div>
      <div className="stat-card"><span>ZAJĘTE MIEJSCE</span><strong>{prettySize(totalBytes)}</strong><small>lokalnie na urządzeniu</small></div>
      <div className="stat-card"><span>ULUBIONE</span><strong>{samples.filter(s => s.favorite).length}</strong><small>zapisanych dźwięków</small></div>
    </section>

    <section className="library-section">
      <div className="section-heading"><div><div className="eyebrow">BROWSE COLLECTION</div><h2>Biblioteka <span>sampli</span></h2></div><div className="heading-icon"><FolderOpen size={20}/></div></div>
      <label className="search-box"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj sampli..." /><SlidersHorizontal size={17}/></label>
      <div className="category-row">{categories.map(c => <button key={c} className={`chip ${category === c ? "selected" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}</div>

      {loading ? <div className="empty-state"><div className="empty-icon"><Music2 size={26}/></div><h3>Otwieram bibliotekę…</h3></div> :
       visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Headphones size={27}/></div><h3>{samples.length ? "Nic tu nie ma" : "Zacznij od pierwszego sampla"}</h3><p>{samples.length ? "Zmień wyszukiwanie lub kategorię." : "Zaimportuj pliki audio z aplikacji Pliki na iPhonie. Zostaną zapisane lokalnie."}</p><button className="secondary-button" onClick={() => fileInput.current?.click()}><Plus size={17}/> Dodaj pliki audio</button></div> :
       <div className="sample-list">{visible.map((s, i) => <article className="sample-row" key={s.id}>
          <button className={`play-button ${playingId === s.id ? "is-playing" : ""}`} aria-label={playingId === s.id ? "Zatrzymaj" : "Odtwórz"} onClick={() => play(s)}>{playingId === s.id ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button>
          <div className="sample-art" style={{"--art": i % 4} as React.CSSProperties}><AudioLines size={22}/></div>
          <div className="sample-info"><strong title={s.name}>{s.name}</strong><div className="sample-meta"><span>{s.category}</span><i/> <span>{s.type.toUpperCase()}</span><i/> <span>{prettyTime(s.duration)}</span></div></div>
          <button className={`tiny-action ${s.favorite ? "favorited" : ""}`} aria-label="Ulubione" onClick={() => void toggleFavorite(s)}><Heart size={17} fill={s.favorite ? "currentColor" : "none"}/></button>
          <button className="tiny-action delete-action" aria-label="Usuń" onClick={() => void deleteOne(s)}><Trash2 size={16}/></button>
        </article>)}</div>}
    </section>

    <footer className="bottom-note"><span className="privacy-dot"/> {message}</footer>
    <nav className="bottom-nav"><div className="nav-item active"><Music2 size={19}/><span>Biblioteka</span></div><button className="nav-item" onClick={() => {setFavoritesOnly(v => !v); window.scrollTo({top: 0, behavior: "smooth"});}}><Heart size={19}/><span>Ulubione</span></button><button className="nav-item" onClick={() => setMessage("Dane pozostają lokalnie. Kopia zapasowa i edycja tagów będą w kolejnej wersji.")}><SlidersHorizontal size={19}/><span>Ustawienia</span></button></nav>
    <audio ref={audioRef} onEnded={() => setPlayingId(null)} onError={() => setPlayingId(null)} />
  </main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
