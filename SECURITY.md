# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.x     | ✅ Active  |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Email **security@einsteinminds.org** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to acknowledge reports within **48 hours** and resolve critical
issues within **7 days**.

## Child Safety Is a Security Issue

At Einsteinminds, we treat safeguarding failures with the same severity
as code vulnerabilities. If you discover any issue that could compromise
a child's safety, privacy, or wellbeing, please report it immediately
using the channel above.

## Security Model

- **No third-party trackers** on child-facing surfaces
- **Data minimization** — we collect only what a feature requires
- **Client-side persistence** via localStorage (no hidden server storage)
- **COPPA 2026** Verifiable Parental Consent before unlocking AI features for under-13s
- **Content Security Policy** and security headers enforced via `netlify.toml`

## Responsible Disclosure

We maintain a hall-of-fame for researchers who responsibly disclose issues.
Thank you for helping keep learners safe.