# Einsteinminds — GitHub + Supabase + Hostinger

**Reinventing Education for the Future**

This project uses GitHub as the source repository, Supabase for authentication and the live resource catalogue, and Hostinger for `einsteinminds.com` hosting. There is no Netlify deployment path.

## Architecture

- **GitHub:** canonical application source and review history.
- **Supabase:** project `fxxjainrhtdezyzbqynn` (`Einsteinminds`, `us-west-2`); Auth, 24 knowledge domains, resource records, search, provider metadata and controlled outbound links.
- **Hostinger:** production hosting for `einsteinminds.com`; connect the repository using Hostinger's native GitHub integration from hPanel.
- **GitHub Actions:** validates syntax, tests and release contents. It does not deploy production.

## Live catalogue facts — checked 15 November 2026

| Measure | Supabase value |
|---|---:|
| Knowledge domains | 24 |
| Published provider listings | 227 |
| Category assignments | 231 |
| Source/provenance records | 229 |
| Verification-evidence records | 0 |
| Resources with learning-stage assignment | 0 |
| Editorially reviewed resources | 0 |

The interface must not call the current directory "verified", "top-ranked", "approved" or "recommended". Listings are labelled as not independently reviewed unless later evidence records support a stronger status.

The previous appended v9 patches generated a synthetic 2.4-million-resource catalogue, fabricated titles and ratings, and Google search destinations. The update removes that generator and returns the displayed catalogue total to the actual Supabase count.

## Learning-level filter

The interface supports:

1. Pre-K / Early Years
2. Kindergarten
3. Elementary / Primary
4. Middle School
5. High School / Upper Secondary
6. Vocational / Technical
7. Undergraduate
8. Graduate / Postgraduate
9. Doctoral / Research
10. Professional / Continuing
11. Entrepreneur / Founder
12. Lifelong Learning

The Supabase `learning_stages` field currently has no reviewed mappings. Therefore, specific stage filters correctly return no results until provider-specific evidence is reviewed and stored. The interface does not infer learner age suitability from a provider name, topic, or marketing claim. "All learning levels" and "Not yet classified" remain available.

## Existing Supabase functions

The live Supabase project already contains these active Edge Functions:

| Function | Version | Role |
|---|---:|---|
| `agent` | 35 | Authenticated Groq learning assistant with Einstein Minds directory search, provider metadata, and extracted-document context |
| `resource-search` | 3 | Public published-resource search, category counts and stage filters |
| `resource-outbound` | 2 | Resolves a catalogue UUID, validates its stored HTTPS host, records a minimal click event and applies safe UTM tags |
| `provider-introduction` | 1 | Retrieves and caches metadata from the provider's official page |

### Ask Einstein document text analysis

The current working branch adds a first real document-understanding path:

- Attach PDF, DOCX, TXT, Markdown, or HTML files from the Ask Einstein interface.
- PDF text is extracted page by page in the browser with PDF.js 6.5.438; page labels are preserved for citations. DOCX text is extracted in the browser with Mammoth 1.13.0. TXT, Markdown, and HTML are read locally.
- File size is limited to 15 MB; PDFs are limited to 40 pages; extracted context is capped at 26,000 characters.
- Extracted text is sent with the user's question to the authenticated `agent` Edge Function and supplied to the Groq model as untrusted source material.
- The document itself is not uploaded to Supabase Storage or saved in the user's account. The file must be attached again after a page refresh.
- Scanned/image-only PDFs, OCR, embedded image analysis, and reliable visual/table layout extraction are not supported in this first version. If text cannot be extracted, the UI reports that instead of pretending the document was read.
- The deployed backend is `agent` v35 (`verify_jwt=true`). The frontend upload control and extraction code are committed to `feature/ask-einstein-groq-agent`; they are not live on the production site until that branch is reviewed and deployed through Hostinger.

The update calls these functions; it does not redeploy or replace them and does not require a database migration. The deployed function source and the four existing migration files still need to be exported into GitHub before GitHub can become the complete reproducible source of truth for the backend. See `supabase/README.md`.

## Apply the code update

1. Create a new branch in `HamUniversal/Einsteinminds` from the current `main` branch. Do not edit production `main` directly.
2. Extract this update bundle into the repository root, preserving the folder structure.
3. Run the updater from the repository root:

   ```bash
   node scripts/apply-update.mjs
   ```

   It removes the appended legacy v9.0/v9.2 patch blocks, inserts the new UI scripts and stylesheet into `index.html`, replaces the old Netlify-oriented `README.md`, removes stale Netlify deployment files and the malformed nested workflow, and updates the `SECURITY.md` deployment reference if present.

4. Run the checks:

   ```bash
   node --check assets/resource-network-core.js
   node --check assets/einsteinminds-resource-network.js
   node --test tests/*.test.cjs
   node scripts/validate-release.mjs
   ```

5. Review the complete Git diff and open a pull request. Merge only after the preview/build and the live Supabase requests have been checked.

## Connect Hostinger to GitHub

For a custom HTML website on an eligible Hostinger Web or Cloud hosting plan:

1. Open Hostinger hPanel → **Websites** → `einsteinminds.com` → **Manage site**.
2. Open **Advanced → Git**.
3. Choose **Connect with GitHub** and authorize Hostinger for `HamUniversal/Einsteinminds`.
4. Select the reviewed deployment branch (normally `main` after the pull request is merged).
5. Set the deployment root to the repository root containing `index.html`, `assets/`, and `.htaccess`.
6. Confirm the target website and deployment directory. Back up the existing website files first; changing the connected repository can overwrite files in the target directory.
7. For the first release, keep automatic deployment paused. After the GitHub validation workflow passes and the pull request is merged, use Hostinger's **Redeploy** action and confirm the deployment history shows the intended commit.
8. Enable automatic deployment only after `main` is protected by pull-request review and required passing GitHub checks; otherwise Hostinger may deploy a push before the validation workflow finishes.

Hostinger supports this Git integration for custom PHP/HTML websites on eligible Web and Cloud hosting plans. Node.js websites use a separate GitHub deployment flow. Hostinger AI Builder websites do not support this integration. Check the website type shown in hPanel before connecting. Official instructions: [Deploy a website from GitHub in Hostinger](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/).

**Production safety:** do not connect Hostinger to the update branch while it is still under review unless that branch is deliberately being used as a staging website/root. The production website should follow the approved branch only.

## Browser-side Supabase configuration

The existing browser application uses the Supabase project URL and a publishable key. A publishable key is intended for browser use. Never put a Supabase secret key or `service_role` key in `index.html`, static JavaScript, GitHub, or Hostinger public files.

The interface calls:

- `/functions/v1/resource-search`
- `/functions/v1/resource-outbound`
- `/functions/v1/provider-introduction`

No new Hostinger environment variable is required for this static frontend. Server-side Edge Functions continue to read their secrets from Supabase-managed function secrets.

## Rollback

Keep a backup of the current Hostinger files before the first deployment. For rollback, redeploy the last known-good commit in Hostinger's Git deployment history, or revert the GitHub commit and redeploy the selected branch. The update does not change Supabase tables or data, so UI rollback does not require a database rollback.

## Safeguards

- External providers open in a new tab only after an explicit confirmation.
- The browser passes a catalogue resource UUID, never an arbitrary URL, to the outbound gateway.
- The gateway resolves the destination from the stored record and checks the stored official host.
- UTM parameters contain no learner name, email, private search phrase or other personal learner data.
- Provider-page metadata is labelled as metadata supplied by the provider, not as Einsteinminds editorial review.
- Learning-stage mappings are not guessed.
- No synthetic catalogue entries, ratings, reviews or resource counts are generated.
