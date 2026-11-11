# Architecture Overview

## Design Philosophy

Einsteinminds is a **zero-dependency monolith**: one HTML file containing
all CSS, markup, and JavaScript. This is a deliberate choice for an
education platform serving low-bandwidth regions and minimizing
supply-chain attack surface.

## Layers

\```
┌─────────────────────────────────────────┐
│  PRESENTATION  (CSS design tokens)      │
│  13 views · themes · 3D flags · motion  │
├─────────────────────────────────────────┤
│  INTERACTION   (vanilla JS modules)     │
│  Auth · VPC · Plans · Agent · Lib       │
├─────────────────────────────────────────┤
│  STATE         (localStorage)           │
│  session · goals · portfolio · consents │
├─────────────────────────────────────────┤
│  DATA          (embedded catalogs)      │
│  15 domains · 180 platforms · i18n      │
└─────────────────────────────────────────┘
\```

## Module Map

| Module | Responsibility |
|--------|---------------|
| `Auth` | Sign-up, age-gate, session, account registry |
| `VPC` | Verifiable Parental Consent (4-step) |
| `Onboard` | Epistemic Contract → Spark → Safeguarding |
| `Plans` | Equity Engine monetization & checkout |
| `Usage` | Daily prompt quota enforcement |
| `Agent` | 12-mode AI companion |
| `Lib` | Resource library, filters, pagination |
| `Screen` | Digital wellbeing timers & limits |
| `Crisis` | Red Line safeguarding protocol |
| `I18n` | 14-language translation engine |

## Path to Production

This build is a **high-fidelity, client-side prototype**. To serve real
learners at scale, the roadmap is:

1. **Database** → Supabase (Postgres + pgvector + Auth)
2. **AI** → real LLM behind a RAG + citation-enforcement layer
3. **Payments** → Stripe (Pro & Institutional)
4. **VPC** → certified provider (e.g., PRIVO)
5. **Compliance** → legal review before collecting any child data

See the deployment guide for hosting details.