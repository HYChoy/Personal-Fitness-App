# LiftLog PWA

LiftLog is a static installable web app for tracking weightlifting programs, exercise defaults, local overrides, active workouts, rest timers, and completed workout history.

## Run Locally

From this folder:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Publish For iPhone Install

iPhone home-screen installation works best from an HTTPS website. Upload the contents of this `web-app` folder to any static host, such as Netlify, Vercel, Cloudflare Pages, or GitHub Pages.

The hosted folder must include:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`

## Install On iPhone

In Safari:

1. Open the hosted HTTPS URL.
2. Tap Share.
3. Tap Add to Home Screen.
4. Tap Add.

In Chrome:

1. Open the hosted HTTPS URL.
2. Open the browser menu.
3. Tap Add to Home Screen or Install app.

Your programs and workout history are stored locally in that browser on that iPhone.

