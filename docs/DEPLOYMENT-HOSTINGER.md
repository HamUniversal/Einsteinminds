# Hostinger deployment from GitHub

Einsteinminds is a static HTML/CSS/JavaScript application. Use Hostinger's native GitHub integration for the production deployment; GitHub Actions in this repository run validation only. There are no FTP passwords or Netlify secrets in GitHub Actions.

## Connect the Hostinger website

1. Back up the current `einsteinminds.com` website files from hPanel before connecting a repository. Hostinger notes that changing/connecting a deployment repository can overwrite files in the target directory.
2. In Hostinger hPanel, open **Websites → einsteinminds.com → Manage site**.
3. Open **Advanced → Git**.
4. Choose **Connect with GitHub** and authorize Hostinger for the `HamUniversal/Einsteinminds` repository.
5. Select the intended branch (`main` after the reviewed update has been merged).
6. Set the deployment root to the repository root, which contains `index.html`, `assets/`, and `.htaccess`.
7. Confirm the destination belongs to `einsteinminds.com`, then deploy.
8. Keep automatic deployment paused for the first release. After GitHub validation passes and the reviewed pull request is merged, use Hostinger's **Redeploy** action and confirm the intended commit in deployment history.
9. Enable automatic deployment only after GitHub `main` requires pull-request review and passing validation checks; otherwise Hostinger may deploy before GitHub Actions finishes.

Hostinger's Git integration supports custom PHP/HTML websites on eligible Web and Cloud hosting plans. Node.js websites use Hostinger's separate Node.js GitHub deployment flow; Hostinger AI Builder websites do not support this integration. Check the website type shown in hPanel before choosing the flow.

## Local validation

```bash
node scripts/apply-update.mjs
node --check assets/resource-network-core.js
node --check assets/einsteinminds-resource-network.js
node --test tests/*.test.cjs
node scripts/validate-release.mjs
```

## Rollback

Use Hostinger's Git deployment history to redeploy the last known-good deployment, or revert the GitHub commit and redeploy the selected branch. Keep the pre-upgrade file backup until the new version has passed a live smoke test.

## No additional Hostinger secrets

For this native Git integration, do not add FTP credentials as GitHub Actions secrets. GitHub authorization is handled through Hostinger's OAuth connection. No Supabase secret is required in Hostinger for the static frontend.
