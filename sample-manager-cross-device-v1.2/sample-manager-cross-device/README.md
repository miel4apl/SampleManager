# Sample Manager — Windows + iOS PWA (shared library)

This is a paired project. Windows is the source of truth: it scans the chosen folder directly and exposes a small, token-protected read-only API. The iOS PWA connects to that API to browse and play samples without importing/copying the audio to the phone.

## Windows setup
1. Install Node.js LTS.
2. Open `windows` in VS Code.
3. Run `npm install`.
4. Run `npm run electron:dev`.
5. In Sample Manager, choose your sample folder and click rescan.
6. In the desktop library bar, note the `http://<LAN-IP>:8787` address and the token. Keep the token private.
7. Allow Sample Manager / Node.js through Windows Defender Firewall on **Private networks only** if Windows asks. Both devices must be on the same Wi-Fi for a direct LAN connection.

The API listens on port 8787 and is read-only. It only serves supported audio files inside the selected root folder. The access token is saved in the Windows app settings. Do not forward port 8787 directly to the public internet.

## iOS PWA setup
1. Build `ios-pwa`: open that folder in VS Code, then run `npm install` and `npm run build`.
2. Publish the `ios-pwa/dist` contents to an HTTPS static host.
3. Open the PWA on iPhone and go to **Biblioteka z komputera**.
4. Enter the Windows API address (e.g. `http://192.168.1.25:8787`) and token shown by the desktop app; tap **Połącz / odśwież**.
5. Search and play files from the computer. Tap refresh after adding/removing files on Windows.

## Important networking note
A hosted HTTPS PWA may be prevented by iOS Safari from calling a plain HTTP LAN API because of mixed-content/security restrictions. If that happens, the reliable solution is to expose the Windows API through a trusted HTTPS tunnel/reverse proxy (for example, a private Tailscale Serve or Cloudflare Tunnel endpoint) and enter that HTTPS URL in the PWA. Do not disable browser security. Direct LAN mode also requires the PC to be on and both devices to be on the same network. This project does not automatically sync the audio to cloud storage.

## Current behavior and limits
- Windows folder path is remembered and the app scans it without copying the audio.
- **New:** the desktop app publishes tags, category, favorite flag and analysis results (BPM, key, chord, rhythm, confidence) to the built-in API after every scan/analysis/edit. The index is stored in `library-index.json` in the app's user-data folder, so the iPhone sees the last known tags even before the desktop UI finishes loading. Run the batch analysis on Windows first; files not analysed yet show only name/path/size.
- **New:** `/api/audio` supports HTTP `Range` requests and streams from disk. Without this Safari on iPhone refuses to play remote audio. `HEAD` is supported; the token may also be sent as `Authorization: Bearer <token>`.
- **New:** the iPhone remote view has one shared player (tap a row), BPM range / key / category / favorites filters, sorting by name, BPM or key, paging (60 rows at a time) and a **Na iPhone** button that downloads a file with its tags into the local IndexedDB library, where the pack generator and ZIP export work offline.
- The key filter matches the same key and its relative major/minor (e.g. `Cm` also shows `Eb`). Files without a detected key are hidden while it is active.
- Tags are still edited on Windows; the iPhone remote view is read-only. A downloaded copy lives in the iPhone's own library and is not synced back.
- Analysis values are estimates; check by ear. Keep the access token private. The API is read-only, but anyone with the token and network access can listen to files in the selected folder.

## Validation
Verified in a Linux sandbox: `tsc -b` and `vite build` pass for both `windows` and `ios-pwa`, and the HTTP API was exercised against a stubbed Electron (token check, metadata merge, Range 206/416, path-traversal block). Not verified: running the Electron window itself, `npm run dist:win`, and a real iPhone over your network. Run `npm install` and `npm run build` in each project folder, then test on the device.
