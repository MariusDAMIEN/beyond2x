# Beyond2x

> Extended playback speed controls for YouTube.

Beyond2x extends YouTube's HTML5 playback controls beyond 2× while keeping the experience inside the player. It adds high-speed presets to YouTube's own Playback speed menu when that menu is available, with a refined in-player control ready as a resilient fallback.

Beyond2x is an independent open-source browser extension. It is not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Highlights

- Native-adjacent integration for **Settings → Playback speed** with 2.5× through 10× presets
- Instrument-cluster fallback panel with an interactive velocity gauge, acceleration nodes, and precision rate input
- Real-time synchronization with the active video's actual `playbackRate`
- Support for regular videos, playlists, Shorts, theater mode, fullscreen, and SPA navigation
- Local speed persistence through Chrome Storage
- Keyboard shortcuts: `]` increase, `[` decrease, `\` reset to 1×
- No telemetry, tracking, remote scripts, or external services

## Screenshots

The following paths are reserved for verified live-player captures:

- `docs/screenshots/native-speed-menu.png`
- `docs/screenshots/fallback-menu.png`
- `docs/screenshots/shorts-control.png`
- `docs/screenshots/fullscreen-control.png`

The fallback panel uses a Beyond2x instrument-cluster interface: a logarithmic acceleration gauge, animated needle, velocity rail, and precision controls. It is intentionally extension-owned so native YouTube speed entries can remain visually restrained.

## How it feels native

When YouTube renders its Playback speed submenu, Beyond2x detects the list from its menu structure and existing numeric speed options rather than depending only on translated labels. It adds extension-owned entries for speeds above 2× and leaves YouTube's original values untouched.

If the native menu is not available or its structure changes, Beyond2x keeps a polished player control available. The fallback supports every preset plus a precise custom speed from 0.1× to 16×.

## Supported speeds

Native and fallback presets: 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×, 2.5×, 3×, 4×, 5×, 6×, 8×, and 10×. Custom rates are accepted from 0.1× through 16×.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `]` | Increase speed by 0.25× |
| `[` | Decrease speed by 0.25× |
| `\` | Reset speed to 1× |

Shortcuts are ignored while typing in inputs, textareas, selects, and contenteditable elements.

## Install from a GitHub Release

1. Open the latest Beyond2x GitHub Release.
2. Download `beyond2x-vX.Y.Z.zip`.
3. Extract the ZIP.
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted Beyond2x folder.
8. Open or refresh YouTube.

Chrome does not directly install this GitHub ZIP as a normal Chrome Web Store extension. Extract it first, then use "Load unpacked".

## Install from source

```bash
git clone <repository-url>
cd beyond2x
npm ci
npm run build
```

Load the generated `dist/` directory from `chrome://extensions` using **Load unpacked**.

## Development

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run package
npm audit
```

`npm run dev` watches and rebuilds the content bundle. Reload the unpacked extension after rebuilding. `npm run package` creates `release/beyond2x-v1.0.0.zip` with the extension files at the archive root.

## Architecture

```text
src/
├── content/
│   ├── youtube-controller.ts  # video lifecycle, persistence, and shortcuts
│   ├── native-speed-menu.ts   # native menu discovery and extended entries
│   ├── player-ui.ts           # resilient fallback control and menu
│   ├── player-finder.ts       # isolated YouTube DOM discovery
│   └── navigation.ts          # SPA lifecycle events
├── shared/                    # speed domain logic and storage
└── styles/                    # tokens, fallback UI, and native-adjacent styles
```

The controller observes relevant navigation and DOM changes, rebinds when YouTube replaces a video element, restores the saved rate, and keeps UI state tied to the real media element. No YouTube source code, private player APIs, or network traffic are modified.

## Privacy, permissions, and security boundaries

Beyond2x requests only:

- `storage` to save the selected speed locally
- `https://www.youtube.com/*` to add its player UI on YouTube

Beyond2x only changes playback behavior inside the user's browser. It does not download videos, bypass DRM, modify advertising systems, manipulate engagement metrics, or communicate with external servers.

The extension collects no analytics or telemetry, performs no tracking, loads no remote JavaScript or CSS, and uses no CDN resources. It does not alter advertising, account activity, subscriptions, comments, likes, views, or streaming requests.

## Known limitations

YouTube can update its DOM without notice. Native speed-menu discovery is deliberately isolated in `native-speed-menu.ts` and uses a fallback control when a safe insertion point is not found. Live YouTube UI changes may require selector maintenance. Browser and media behavior ultimately determine which playback rates a particular video accepts.

## Contributing

Contributions are welcome. Please run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before opening a pull request.

## License

[MIT](LICENSE)
