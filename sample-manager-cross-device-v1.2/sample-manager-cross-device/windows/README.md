# Sample Manager for Windows — v1.0

Desktop edition based on Sample Manager v5.0. The app can scan a selected Windows folder and its subfolders directly. Audio files remain in place; only metadata, tags, favorites and analysis results are stored in the app's local IndexedDB. The selected folder path is saved in Electron user settings and restored after restart.

## Start in development mode
1. Install Node.js LTS on Windows.
2. Extract this ZIP to a normal writable folder.
3. Open that folder in VS Code.
4. In the VS Code terminal run `npm install`.
5. Run `npm run electron:dev`.
6. In Sample Manager click **Wybierz folder sampli** and select e.g. `D:\Samples`. The app will remember it next time.

## Build an installable Windows app
Run `npm install`, then `npm run dist:win`. The installer is created in `release/`. Electron downloads its runtime during installation, so first setup requires internet access.

## How the disk library works
- Recursively scans WAV, MP3, AIFF, M4A, AAC, OGG, FLAC and OPUS files.
- Doesn't copy the audio into the app database. It stores file paths and metadata; audio bytes are read only when previewing, analyzing or exporting.
- Folder path is stored in the Electron app's user-data settings file.
- If files are moved or deleted outside the app, use **Skanuj ponownie** to refresh the index.
- Removing a library entry doesn't delete the original audio file from disk; rescanning will index files that are still in the chosen folder.
- Analysis runs locally in the app. BPM/key/chord results are estimates and should be checked by ear.

## Included features
- Sample Manager v5.0 generator: styles, pack types, ranked sample selection and ZIP export with `manifest.json`.
- Smart filename/folder tagging, tag editing and refresh.
- Audio preview and waveform-based estimated BPM, key, rhythm and dominant chord analysis.
- Favorites and search.

## Notes
- This is a Windows desktop app, not a web server. The selected folder is read directly by the Electron main process.
- ZIP export gathers the chosen audio files into the generated pack; it does not move originals.
- The PWA file/folder import controls remain available for manually importing files, but for a disk-backed library use the desktop folder selector.
