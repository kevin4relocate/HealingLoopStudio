# Healing Loop Studio

A deployable, **static** website that procedurally renders an anatomically recognizable, resting **wireframe human** with neon light trails, cosmic particles, flowers, and a 10-second loop. **No video API, account, backend, or paid service required.**

The whole scene is created with deterministic Canvas geometry rather than a downloaded copyrighted image. Body, face, bent arms, hands, torso, legs, energy streams and petals are procedural. Scenes vary by seed, color theme, particle positions/density, and human pose.

## Run locally

```bash
python3 -m http.server 8787
# Visit http://localhost:8787
```

The `npm run build` command only copies static files, no npm install needed:

```bash
npm run build
# Output in dist/
```

## Deploy Cloudflare Pages with GitHub

1. Push project files to your GitHub repo root.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the GitHub repository.
4. Set **Framework preset: None**, **Build command: `npm run build`**, **Build output directory: `dist`**.
5. Deploy. The app runs over HTTPS and uses browser rendering (not Cloudflare CPU).

## Video export

- `Generate random 10s video` generates a fresh scene and exports it.
- 10 seconds × 30 FPS = **300 frames**.
- The preview and every particle animation use an exact **period of 10 seconds**; at time 10, the scene matches time 0.
- Preferred export: H.264 **MP4** through the browser's **WebCodecs** API, with `mp4-muxer` lazily imported from `esm.sh` during export. This requires an internet connection to the CDN. It records the 300 frames at precise time stamps and gives the best seam accuracy.
- Fallback: WebM through `MediaRecorder`, realtime, if MP4 is unavailable. Its frame timing is browser-controlled and less exact. Use updated Chrome/Edge on desktop and HTTPS for best results.
- Rendering is local; export speed depends on GPU/CPU. 1080p is substantially slower.

## Notes / limitations

- The result is a **stylized procedural 2.5D projected human mesh**, not a photorealistic AAA human model or a fully rigged Three.js humanoid. The visual is deliberately neon wireframe, 3D projected and composited on a 2D canvas.
- The wireframe is built from connected anatomical tube rings, not an image pasted into an animation. The figure stays still while lighting/particles move.
- A mathematically cyclic source animation does not guarantee every video player or editor will cut seamlessly because some introduce encoder timestamp rounding or transition frames. Use direct concatenation without crossfade; the MP4 output has 300 evenly sampled source frames.
- Browser video encoding is not supported uniformly. If MP4 fails, the app falls back to WebM.
- This initial version does **not** replicate the exact mesh or logo of any third-party creator; visuals are newly generated.

## Code map

- `src/engine.js` — seeded geometry, humanoid wireframe meshes, periodic streams and particle field.
- `src/exporter.js` — exact-frame H.264 MP4 via WebCodecs, WebM fallback.
- `src/main.js` — GUI controls, auto-generation, download and progress.
- `src/style.css` — responsive studio interface.