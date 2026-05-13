# MapExplorer 🗺️

A real-world fog-of-war map exploration app inspired by *Don't Starve*. The map starts completely dark — only areas you physically walk through are revealed.

## How It Works

- The map is covered by a fully opaque black canvas
- As you move, GPS tracks your position and "erases" a circle in the canvas using `Canvas.destination-out` — revealing the real map underneath
- Explored areas are saved locally and restored on next launch

## Features

- **Don't Starve-style fog of war** — map is hidden, not dimmed
- **Real-world GPS tracking** — works without Google Play Services (uses `navigator.geolocation` inside WebView)
- **Amap (高德) tiles** — accurate Chinese map data with GCJ-02 coordinate system
- **WGS-84 → GCJ-02 conversion** — GPS coordinates correctly aligned to map tiles
- **Zoom-aware reveal radius** — 80-meter real-world radius, scales correctly at any zoom level
- **Persistent exploration** — explored areas survive app restarts via AsyncStorage

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Expo (managed) | No native toolchain needed |
| Map | Leaflet.js (in WebView) | Full canvas compositing control |
| GPS | `navigator.geolocation` | No Google Play Services dependency |
| Storage | AsyncStorage | Local persistence |

## Getting Started

**Requirements:** Node.js 18+, [Expo Go](https://expo.dev/go) app on your phone

```bash
git clone https://github.com/BeinuoYang/MapExplorer.git
cd MapExplorer
npm install
npx expo start --tunnel
```

Scan the QR code with Expo Go. Grant location permission when prompted.

## Project Structure

```
MapExplorer/
├── App.js                  # Entry point, permission handling
├── assets/
│   └── mapHtml.js          # Core: Leaflet map + fog-of-war canvas
├── screens/
│   └── MapScreen.js        # WebView container + GPS message bridge
├── hooks/
│   └── useLocation.js      # GPS tracking (fallback only)
└── utils/
    └── storage.js          # AsyncStorage read/write
```

## Future Ideas

- [ ] Exploration statistics (km² revealed)
- [ ] Export exploration map as image
- [ ] Raspberry Pi portable device build
- [ ] Achievements and milestones
- [ ] Multi-device sync

## License

MIT
