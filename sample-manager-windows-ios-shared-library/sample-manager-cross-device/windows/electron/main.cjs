const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

let mainWindow;
let apiServer;
let apiToken = crypto.randomBytes(18).toString('hex');
const API_PORT = 8787;
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
async function readSettings() {
  try { return JSON.parse(await fs.readFile(settingsPath(), 'utf8')); }
  catch { return {}; }
}
async function writeSettings(settings) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
}
function insideRoot(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
const audioExt = new Set(['.wav','.wave','.mp3','.aiff','.aif','.m4a','.aac','.ogg','.flac','.opus']);
async function walk(root, current = root, out = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) await walk(root, full, out);
    else if (entry.isFile() && audioExt.has(path.extname(entry.name).toLowerCase())) {
      const st = await fs.stat(full);
      out.push({ path: full, name: entry.name, relativePath: path.relative(root, full), size: st.size, modifiedAt: st.mtimeMs, extension: path.extname(entry.name).slice(1).toLowerCase() });
    }
  }
  return out;
}

function lanAddresses() {
  const found = [];
  for (const entries of Object.values(os.networkInterfaces())) for (const item of (entries || [])) {
    if (item.family === 'IPv4' && !item.internal) found.push(item.address);
  }
  return found;
}
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function startLibraryApi() {
  const settings = await readSettings();
  if (settings.apiToken) apiToken = settings.apiToken;
  else { settings.apiToken = apiToken; await writeSettings(settings); }
  apiServer = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
    try {
      const url = new URL(req.url, `http://127.0.0.1:${API_PORT}`);
      if (url.pathname === '/api/health') return json(res, 200, { ok: true, app: 'Sample Manager', version: 1 });
      if (url.searchParams.get('token') !== apiToken) return json(res, 401, { error: 'Nieprawidłowy token. Skopiuj go z aplikacji Windows.' });
      const root = (await readSettings()).libraryFolder;
      if (url.pathname === '/api/library') {
        if (!root) return json(res, 200, { folder: null, files: [] });
        let files = [];
        try { files = await walk(root); } catch {}
        return json(res, 200, { folder: path.basename(root), count: files.length, files: files.map(f => ({ name: f.name, relativePath: f.relativePath, size: f.size, modifiedAt: f.modifiedAt, extension: f.extension })) });
      }
      if (url.pathname === '/api/audio') {
        const relative = url.searchParams.get('path');
        if (!root || !relative) return json(res, 400, { error: 'Brak folderu lub ścieżki pliku.' });
        const full = path.resolve(root, relative);
        if (!insideRoot(path.resolve(root), full) || !audioExt.has(path.extname(full).toLowerCase())) return json(res, 403, { error: 'Niedozwolona ścieżka.' });
        const stat = await fs.stat(full);
        if (!stat.isFile()) return json(res, 404, { error: 'Nie znaleziono pliku.' });
        const ext = path.extname(full).toLowerCase();
        const types = { '.wav':'audio/wav','.wave':'audio/wav','.mp3':'audio/mpeg','.aiff':'audio/aiff','.aif':'audio/aiff','.m4a':'audio/mp4','.aac':'audio/aac','.ogg':'audio/ogg','.flac':'audio/flac','.opus':'audio/ogg' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
        return fs.readFile(full).then(buf => res.end(buf));
      }
      return json(res, 404, { error: 'Nieznany endpoint.' });
    } catch (err) { return json(res, 500, { error: 'Błąd serwera biblioteki.' }); }
  });
  apiServer.listen(API_PORT, '0.0.0.0');
}

ipcMain.handle('library:server-info', async () => ({ port: API_PORT, token: apiToken, addresses: lanAddresses() }));
ipcMain.handle('library:get-folder', async () => (await readSettings()).libraryFolder || null);
ipcMain.handle('library:choose-folder', async () => {
  const old = (await readSettings()).libraryFolder;
  const result = await dialog.showOpenDialog(mainWindow, { title: 'Wybierz główny folder sampli', defaultPath: old || app.getPath('music'), properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return null;
  const folder = result.filePaths[0];
  const settings = await readSettings(); settings.libraryFolder = folder; await writeSettings(settings);
  return folder;
});
ipcMain.handle('library:scan', async () => {
  const root = (await readSettings()).libraryFolder;
  if (!root) return { folder: null, files: [] };
  try { const st = await fs.stat(root); if (!st.isDirectory()) return { folder: null, files: [] }; }
  catch { return { folder: null, files: [] }; }
  return { folder: root, files: await walk(root) };
});
ipcMain.handle('library:read-audio', async (_event, target) => {
  if (typeof target !== 'string') throw new Error('Nieprawidłowa ścieżka pliku.');
  const root = (await readSettings()).libraryFolder;
  const full = path.resolve(target);
  if (!root || !insideRoot(path.resolve(root), full)) throw new Error('Plik znajduje się poza wybranym folderem sampli.');
  const ext = path.extname(full).toLowerCase();
  if (!audioExt.has(ext)) throw new Error('Nieobsługiwany format audio.');
  return await fs.readFile(full);
});
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 650, backgroundColor: '#101116', title: 'Sample Manager', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  if (!app.isPackaged) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(async () => { await startLibraryApi(); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (apiServer) apiServer.close(); });
