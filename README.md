# HACKOS — Hackathon Administration, Coordination and Operations System

HACKOS brings registrations, anti-fraud venue verification, team management, offline-capable QR check-in, project submissions, and judge scoring into one unified hackathon platform.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router v7
- **Backend / Database:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
- **Offline / PWA:** Service Worker, Cache API, IndexedDB (`offlineStore.ts`)
- **Hosting:** Vercel (Primary) & Render (Alternative Static Site)

---

## Deployment Guide

### Option 1: Vercel (Recommended)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Configure the project:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. Add the following **Environment Variables** in Vercel:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
4. Deploy. Vercel automatically uses `vercel.json` for SPA rewrites and caching headers.

### Option 2: Render Static Site

1. In the [Render Dashboard](https://dashboard.render.com), create a new **Static Site**.
2. Connect your repository: `Avantikadam/HackOS`.
3. Configure the build settings:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Render automatically reads `public/_redirects` (copied to `dist/_redirects`) to handle SPA client-side routing.

---

## Environment Variables

See `.env.example` for reference:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

> **Security Note:** Never expose the Supabase `service_role` key in frontend environment variables. Only the public `anon` key is permitted.

---

## PWA & Android Installation

HACKOS is a fully compliant Progressive Web App (PWA):
- **Web App Manifest:** `/manifest.webmanifest`
- **Service Worker:** `/sw.js` for precaching the application shell and network resilience
- **Offline Scan Store:** IndexedDB-backed offline door scanner (`src/utils/offlineStore.ts`)
- **Installability:** In Chrome on Android, tap the three-dot menu and select **"Add to Home screen"** or **"Install app"** to run in full standalone window mode.

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build test
npm run build
```

---

## License

[MIT](LICENSE) © 2026 Avantikadam
