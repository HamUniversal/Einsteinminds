# Resource Network Update — v1.0

## Replaces

- Legacy v9.0/v9.2 appended browser patches.
- Synthetic 2.4-million resource generator and fabricated learner ratings/reviews.
- In-app iframe browser used for external websites.
- Outdated Netlify setup documentation and deployment files.
- FTP-secret Hostinger GitHub Actions deploy workflow.

## Adds

- Supabase-backed resource directory via existing `resource-search` function.
- Live counts for the existing 24 knowledge domains.
- Pre-K, Kindergarten, Primary, Middle, Secondary, Vocational, Undergraduate, Graduate, Doctoral, Professional, Entrepreneur and Lifelong learning filters, plus Unclassified.
- Provider details using current official-page metadata from the existing `provider-introduction` function.
- External-site confirmation and safe new-tab handoff through `resource-outbound`.
- Device-local saved-provider list.
- Hostinger-native GitHub deployment documentation.
- GitHub Actions validation-only workflow and Node tests.

## Not changed

- Supabase schema, migrations, resources or RLS policies.
- Supabase Auth settings, deployed Edge Functions or function secrets.
- Hostinger website files, domain settings or DNS.

## Live-data caveat

At the 15 November 2026 audit, Supabase had 227 published resource records, 231 category mappings, 229 source records, no evidence-review rows and no learning-stage assignments. The interface reflects those facts and does not invent missing review or age data.
