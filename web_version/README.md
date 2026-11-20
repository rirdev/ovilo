# OVILO Web Version

Full-featured web release of the **OVILO** streaming platform (Movies, TV Series, Music with Synced Lyrics, BDIX package explorer, Cloud Library & Dynamic Theming).

## 🚀 Features in Web Mode

- **Movies & TV Series**: Live TMDB integration (Trending, Popular, Top Rated, Discover by Genre, Multi-Search, Cast & Crew, Season / Episode selector).
- **Direct Streaming**: High-speed embed player (VidSrc, VidLink, SuperEmbed) with multi-server failover and instant fullscreen.
- **Showcase Music & Lyrics**: iTunes Search & Top Charts integration, web audio streaming with synchronized `.lrc` lyrics parsing.
- **BDIX & FTP Explorer**: Browse packages, search releases across Server 1 and Server 2, and play direct media links.
- **Cloud Library & Sync**: Firebase Auth & Firestore synchronization for favorites, watch history, and custom settings (with automatic `localStorage` offline fallback).
- **Material 3 Dynamic Theming**: Adaptive color extraction from media posters with smooth transitions and glassmorphic UI.

## 🛠️ Development & Local Run

```bash
cd web_version
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 📦 Production Build

```bash
npm run build
```

The optimized static production assets will be generated in `dist/`.

## 🌐 Deployment

### Netlify
1. Connect your repository to Netlify.
2. Set the Base directory to `web_version` (or deploy from root if repository root is web_version).
3. Build command: `npm run build`
4. Publish directory: `dist`
5. (Already preconfigured with `netlify.toml` for SPA routing and security headers).

### Vercel
1. Import repository on Vercel.
2. Select `web_version` as Root Directory.
3. Framework Preset: **Vite**.
4. Output directory: `dist`.
