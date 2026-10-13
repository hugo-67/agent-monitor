# Development

```sh
npm test
npm run typecheck
npm run build
```

- `src/main/`: Electron lifecycle, IPC bridge, filesystem monitor.
- `src/traces/`: provider adapters and normalization.
- `src/graph/`: agent relationship and run derivation.
- `src/shared/`: provider-independent contracts.
- `src/renderer/`: React Flow dashboard, details, trace viewer, Zustand state.

Renderer edits reload during `npm run dev`. The dev server prefers port 5173 and moves to the next free port when it is taken; Electron always opens the port Vite actually bound (`scripts/dev.mjs`). Extra arguments pass to Electron, e.g. `npm run dev -- --inspect`. Restart that command after changing main-process or preload code. Build outputs are `dist/` and `dist-electron/`.

Trace detection and normalization follow the concepts in the neighboring `jsonl-viewer` project. The Electron bridge follows the [context isolation guidance](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

## Memory bounds

Only the selected run has parsed trace bodies in memory. Its live detail view retains the latest 200 normalized entries per agent, with individual displayed entries capped at 64 KiB. JSONL metrics are folded across the entire selected file even when older display entries are discarded. Hermes database metrics come from its stored session counters; its reader queries only the latest 200 message rows per selected agent. Original trace files remain unchanged. Oversized malformed lines are skipped so a partial write cannot grow an unbounded buffer.

The app icon lives in `build/`: `icon.png` (1024 px, used for the window and the macOS Dock during development), `icon.icns` for macOS, and `icon.ico` for Windows.

`npm run screenshots` rebuilds the app and regenerates the README images in `docs/images/` from synthetic sessions.

`npm run test:smoke` builds the application and runs the Electron acceptance scenario with temporary synthetic sessions. It requires a desktop session and verifies explicit run selection, live nodes and edges, details, completion, and switching runs.

## Production build

```sh
npm run build
npm start
```

`npm run dev:web` provides a browser-only demo; local trace discovery requires Electron.

## Packaging and releases

`npm run dist` packages installers for the current platform into `release/` using `electron-builder.yml` (macOS `.dmg`/`.zip`, Windows NSIS `.exe`, Linux `.AppImage`). Builds are unsigned; macOS builds are ad-hoc signed so Apple Silicon can open them.

Pushing a `v*` tag runs `.github/workflows/release.yml`, which packages on macOS, Windows, and Linux runners and publishes a GitHub release with `.github/release-notes.md`. Bump `version` in `package.json` before tagging.


## Hardened Ubuntu AppImage

Security-hardened builds intentionally require Chromium's user-namespace sandbox.
`electron-builder` v26 otherwise emits an unsafe `--no-sandbox` desktop launch
argument. `appImage.executableArgs` replaces that default, and the main process
rejects `--no-sandbox` and `--disable-sandbox`, including flags inserted
automatically by the AppImage runtime on restricted hosts.

Test namespace availability on your Linux host with
`unshare -Ur true`. A successful namespace probe alone does **not**
prove that the Chromium sandbox initialized, but a failed probe signals that
you should not run the AppImage without fixing host configuration. In
particular, do not add `--no-sandbox` just to work around launch errors.

The packaged renderer additionally denies outgoing HTTP(S), WebSocket and FTP
requests at the Electron session layer; its production CSP uses
`connect-src 'none'`. This is not a complete OS-level network sandbox for
the privileged main process. For stronger compartmentalization, run as a
low-privilege user with read-only traces and no network access.

Security branch CI runs tests, refreshes and commits the lockfile for
Electron 44.7.0, checks npm vulnerabilities, builds a Linux AppImage,
extracts it without launching the GUI, verifies desktop Exec flags and the
bundled fail-closed guard, and uploads the AppImage plus SHA-256 checksums.
The checks do not replace dynamic sandbox or malicious-native-code analysis.

Set `AGENT_MONITOR_POLLING=1` to use a polling trace watcher when
native filesystem change notifications are unavailable or unreliable.
Polling has higher filesystem overhead than native notifications.

## Ubuntu 24.04+ AppArmor namespace setup

Ubuntu's AppArmor restrictions on unprivileged user namespaces can cause
electron-builder's AppRun shim to append `--no-sandbox`. The hardened
application correctly rejects that flag. Rebuilding the AppImage alone
cannot change the host's namespace policy.

**Recommended (Ubuntu .deb):** download the hardened .deb from the
[Ubuntu fix release](https://github.com/hugo-67/agent-monitor/releases/tag/ubuntu-sandbox-fix-20261013),
then run `sudo apt install ./agent-monitor-*.deb`. The package installs
a profile allowing user namespaces only for the installed Agent Monitor
executable, preserving the Electron/Chromium sandbox.

**Portable AppImage:** keep the AppImage at a stable absolute path,
make it executable, then download `setup-ubuntu-appimage.sh` from the
same release and run
`bash setup-ubuntu-appimage.sh /absolute/path/to/agent-monitor-*.AppImage`.
The script needs sudo only to install/reload
`/etc/apparmor.d/agent-monitor-appimage`; this profile attaches to the
exact AppImage path. If you move or rename it, rerun the script.
Undo with `bash setup-ubuntu-appimage.sh --remove`.

The profile follows Ubuntu's recommended narrowly scoped
`flags=(unconfined) { userns, }` pattern. It does not globally disable
AppArmor, bypass Chromium's sandbox, or access your agent trace files.
