# Contributing to Einsteinminds

Thank you for helping build the future of education. 🎓

## Our Mission Alignment

Every contribution must advance our core promise:
**universal access to verified knowledge, without exploiting learners.**

Before contributing, confirm your change:
- ✅ Does not introduce advertising or data sales
- ✅ Does not add manipulative engagement mechanics (streaks, infinite scroll, dark patterns)
- ✅ Preserves the safeguarding / crisis-response flows
- ✅ Maintains or improves accessibility (WCAG 2.2 AA)

## Development Setup

\```bash
git clone https://github.com/YOUR_USERNAME/einsteinminds.git
cd einsteinminds
python3 -m http.server 8000
\```

Open http://localhost:8000 in your browser. No npm dependencies are required.

## Project Architecture

Einsteinminds is a **zero-dependency single-file application** (`index.html`).
This is intentional — it maximizes global accessibility and minimizes supply-chain risk.

### Key modules (all in one file, clearly sectioned)
- **i18n engine** — 14-language translation system
- **Auth / VPC** — zero-trust sign-up & parental consent
- **Agent** — 12-mode AI companion
- **Lib** — resource library & filters
- **Screen** — digital wellbeing timer
- **Crisis** — safeguarding protocol

## Pull Request Process

1. Fork and create a feature branch: `git checkout -b feat/your-feature`
2. Keep changes focused and atomic
3. Follow existing code style (compact, functional)
4. Fill out the PR template completely
5. A maintainer will review within 5 business days

## Content Contributions

To add verified educational resources or platforms:
1. Ensure the source is reputable (institutional, peer-reviewed, or government)
2. Add it to the appropriate domain in the `CATS` data structure
3. Include a trust-tier assessment in your PR description

## Translation Contributions

We especially welcome native-speaker reviews of our 14 supported languages.
Check the `D.<lang>` dictionaries and correct any awkward phrasing.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). We enforce it strictly
to keep this a safe, welcoming project — especially given our focus on children's education.