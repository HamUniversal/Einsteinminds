# Einstein Minds — Release Capability Matrix

**Audit date:** 18 November 2026  
**Source branch:** `upgrade/resource-network-v2`  
**Production site:** https://einsteinminds.com  
**Backend project:** `fxxjainrhtdezyzbqynn`

This matrix separates a visible interface from a connected service and from a fully tested production workflow. A page, button or code path is not treated as proof that an end-to-end service is complete.

## Current application surface

The current front end contains 13 principal views: Home, Ask Einstein, Explore Knowledge, Resource Library, My Learning, My Portfolio, Assessments, Wellbeing, Screen Time, Educator Studio, Parent Dashboard, Institutional Dashboard and Settings.

| Area | Current capability | Status / boundary |
|---|---|---|
| Adult accounts | Supabase signup, sign-in, password recovery, session-aware navigation and protected routes | Implemented in source; production email and full account lifecycle still require end-to-end tests |
| Home recommendations | First learning goal can select a matching resource category; saved resources are excluded when alternatives exist | Category-level relevance only; not an AI ranking, quality review or age-suitability check |
| Resource directory | Supabase search, category counts, learning-level filter controls, provider details and controlled outbound links | Connected; the 227 listings have not been independently reviewed |
| Ask Einstein | Authenticated Groq-backed assistant, supported modes, supplied conversation history and directory-resource lookup | Connected in source/backend; a real signed-in production prompt still needs a controlled end-to-end test |
| Document analysis | Browser extraction for PDF, DOCX, TXT, Markdown and HTML; bounded text is sent to the authenticated agent | Partial: 15 MB/file, 40 PDF pages, 26,000 extracted characters; no scanned-PDF OCR, embedded-image inspection or visual table/layout extraction |
| Learning goals | Adult users can create and adjust local/account-synced goals and track simple progress | Implemented as a personal planning tool; not a full adaptive course-management engine |
| Lesson drafting | Adult AI lesson-drafting flow using the configured agent | Available subject to AI provider health; educator verification and professional approval workflows are not implemented |
| Portfolio | Users can save self-submitted work and export learning data | Implemented; entries are not independently assessed or certified |
| Assessments | Learners can generate and take personal practice sets | No educator-assigned assessment or class-gradebook service |
| Wellbeing | Optional breathing, journal and mood check-in tools | Journal and mood data remain in the browser; this is not therapy, diagnosis or crisis response |
| Screen-time | In-app session timer, user-set planning limits and local session history | Does not monitor or control other apps, devices or children |
| Parent tools | Adult-facing family digital-wellbeing agreement and the account holder's own tools | No child profiles, child monitoring or child AI access |
| Educator tools | General lesson-planning assistance for adult accounts | No educator identity verification, class roster, class management or learner analytics |
| Institutional | Private interest-request form | No institutional accounts, SSO, LMS/OneRoster, district administration, DPA or automated notification workflow |
| Payments | PayPal plan preflight and subscription create/cancel/return handlers | Not launch-verified: zero subscription rows and zero webhook events; sandbox transaction lifecycle must be tested |
| Accessibility/settings | Theme, text scale, contrast, motion and language controls in the interface | Full cross-device and per-language QA remains required |

## Live Supabase inventory checked 18 November 2026

### Edge Functions

The six active deployed Edge Functions were inspected on 18 November 2026. The `resource-search` v21 deployment was verified active after the personalized recommendation change.

| Function | Deployed version | JWT verification |
|---|---:|---|
| `agent` | 36 | Required |
| `resource-search` | 21 | Not required; read-only published catalogue |
| `resource-outbound` | 16 | Not required; validates catalogue IDs and stored official hosts |
| `provider-introduction` | 15 | Required |
| `paypal-subscriptions` | 11 | Required |
| `paypal-webhook` | 9 | Not required at transport layer; PayPal signature verification is required |

The updated goal-category recommendation source passed the release validation suite and is deployed to Supabase as `resource-search` v21. The active function version and the new category/exclusion code paths were verified after deployment; a signed-in browser journey with real saved-resource and goal data remains to be tested.

### Database row counts

| Table | Rows |
|---|---:|
| `profiles` | 1 |
| `resource_categories` | 24 |
| `resources` | 227 |
| `resource_category_links` | 231 |
| `resource_sources` | 229 |
| `resource_verification_evidence` | 0 |
| `resource_outbound_events` | 2 |
| `paypal_subscriptions` | 0 |
| `paypal_webhook_events` | 0 |
| `user_workspaces` | 1 |
| `institutional_access_requests` | 0 |

All 227 resources are published, but zero are independently reviewed, zero have reviewed learning-stage assignments, and zero have provider-identity confirmation recorded. The directory must not be presented as vetted, accredited or age-safe. Category matches do not establish that a provider is suitable for a particular learner.

## Outstanding release blockers

1. Run the full eight-migration plus four-file catalogue-seed procedure against a separate empty Supabase project and verify the expected table counts.
2. Enable Supabase leaked-password protection. The current security advisor reports it disabled.
3. Confirm production SMTP delivery for signup confirmation and password recovery.
4. Complete signed-in browser testing for Ask Einstein, chat history, document extraction, account switching and workspace sync.
5. Complete a PayPal sandbox purchase, approval, webhook delivery, database state check and cancellation.
6. Complete a signed-in front-end test of goal-category recommendations, saved-resource exclusion and the Refresh action against the deployed `resource-search` v21 endpoint.
7. Run responsive desktop/mobile and keyboard/screen-reader checks across all 13 views.
8. Review the directory records, provenance and learning-stage evidence before making claims about safety, accuracy, quality or suitability.

## Release decision

**Not yet a fully launch-approved release.** The source contains meaningful connected functionality, but the blockers above remain. No production Hostinger deployment is implied by a passing GitHub build. The website ZIP is only the static front end; the repository source ZIP is a snapshot of all tracked repository files. The historical migrations and a dated public catalogue seed are included; the remaining reproducibility check is a fresh-project restore rehearsal.
