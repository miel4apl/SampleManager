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
- iOS shows file name/path/size and plays the remote audio. The current remote view is read-only; edits, tagging and pack generation continue to operate on the iPhone's own local IndexedDB library, not on the Windows index.
- File metadata served remotely is based on file names and paths; it does not yet expose the Windows app's analyzed BPM/key/chord tags to iOS.
- Keep the access token private. The API is read-only, but anyone with the token and network access can listen to files in the selected folder.

## Validation
ZIP/project files were assembled and source edits were made. A complete `npm install`, build and real-device network test have not been confirmed in this environment. Run `npm install` and `npm run build` in each project folder to validate locally.
