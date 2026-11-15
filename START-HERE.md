# Einsteinminds code update — start here

This is an **update patch for the existing GitHub repository**, not a replacement website and not a Netlify package.

Your stack is:

- GitHub: `https://github.com/HamUniversal/Einsteinminds`
- Supabase: `fxxjainrhtdezyzbqynn`
- Hostinger: `https://hpanel.hostinger.com/websites/einsteinminds.com`

## What this update changes

- Removes the appended code that fabricated a 2.4-million resource count, fake course titles, ratings and reviews.
- Uses the existing 227 published provider listings in Supabase.
- Displays all 24 knowledge domains and their actual live category counts.
- Adds the Pre-K through Entrepreneur learning-level filter, without guessing a provider's age suitability.
- Retrieves provider-page metadata from the existing Supabase function.
- Adds an external-site confirmation and opens only the stored provider URL through the Supabase outbound gateway in a new tab.
- Removes the iframe-based in-app browser and the legacy Netlify deployment files.
- Adds GitHub validation tests and a Hostinger-native Git deployment guide.

## Apply it to GitHub

1. Open the GitHub repository and create a new branch from `main`, named `upgrade/resource-network-v1`.
2. Download the repository's current source ZIP from GitHub and extract it into a working folder.
3. Extract this update ZIP into that same folder, merging the folders and allowing the new update files to be added. Do not delete the original `index.html`.
4. Open Terminal in that folder and run:

   ```bash
   node scripts/apply-update.mjs
   node --test tests/*.test.cjs
   node scripts/validate-release.mjs
   ```

5. Review the changed files. Commit the changes to the upgrade branch and open a pull request to `main`. Do not merge until the checks are green and the website has been reviewed.

The updater inserts the two JavaScript files and stylesheet into the existing `index.html`; it also replaces the previous Netlify README with the new GitHub/Supabase/Hostinger guide.

## Connect Hostinger after the code is approved

Open [einsteinminds.com in Hostinger hPanel](https://hpanel.hostinger.com/websites/einsteinminds.com). Back up the existing site first. Then connect `HamUniversal/Einsteinminds` through Hostinger's GitHub deployment integration and select `main` after the approved pull request is merged. Keep automatic deployment paused for the first release; after GitHub validation passes, use Hostinger's manual **Redeploy** action. Turn automatic deployment on later only when `main` requires reviewed pull requests and passing GitHub checks.

For a custom PHP/HTML website, Hostinger's route is **Manage site → Advanced → Git**. A Node.js web app has a separate Connect to GitHub flow. The repository is a static HTML/CSS/JavaScript site, so use the flow matching the website type shown in hPanel. Do not connect the production domain to the temporary upgrade branch.

## Supabase changes

No migration or Edge Function redeployment is included. The required tables and four live functions already exist. The database currently has no reviewed learning-stage mappings, so specific learning-stage filters will be empty until evidence is reviewed and recorded. That is intentional; the app must not invent age suitability.

## Important limit

This package has not been pushed to your GitHub repository or deployed to Hostinger. The connected GitHub write action rejected branch creation with HTTP 403, so no production branch was changed. The package is ready for review and application in your repository.
