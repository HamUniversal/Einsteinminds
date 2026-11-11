# Deployment Guide

## Netlify (Recommended)

### Via UI
1. Go to [app.netlify.com](https://app.netlify.com)
2. **Add new site → Import an existing project**
3. Select your forked `einsteinminds` repo
4. Build settings auto-detect from `netlify.toml`
5. Deploy

### Via CLI
\```bash
npm install -g netlify-cli
netlify login
netlify link
netlify deploy --prod
\```

### Custom Domain
1. Site settings → Domain management → Add custom domain
2. Follow DNS instructions Netlify provides
3. SSL auto-provisions (free)

## GitHub Pages (Alternative)

1. Move `public/index.html` to repo root
2. Settings → Pages → Deploy from branch → `main` / `root`

## Vercel / Cloudflare Pages

Both work — set the publish/output directory to `public`.

## Environment Variables

For the current single-file build, **none are required**.
When you wire up a real backend (Supabase, Stripe, PRIVO), populate
`.env` from `.env.example` and add them in your host's dashboard.

## Post-Deploy Checklist

- [ ] Homepage loads with animations
- [ ] Theme toggle works (light/dark/auto)
- [ ] Language switcher cycles all 14 languages
- [ ] Sign-up → age-gate → onboarding flow runs
- [ ] Ask Einstein returns responses and respects guest limits
- [ ] Crisis flow triggers on safeguarding keywords
- [ ] Screen-time timer counts and persists after reload
- [ ] Mobile responsive at 375px width