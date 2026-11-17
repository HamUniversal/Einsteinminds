# Einstein Minds public resource catalogue seed

Snapshot date: **18 November 2026**  
Source: live public catalogue in Supabase project `fxxjainrhtdezyzbqynn`

This folder restores the public, published resource catalogue for a new Einstein Minds database. The source rows were read from the live public tables, keeping resource IDs, source IDs, category mappings, timestamps and provenance fields.

## Contents

| File | Rows | Purpose |
|---|---:|---|
| `00_resource_categories.sql` | 24 | Active directory categories |
| `01_resources.sql` | 227 | Published provider directory records |
| `02_resource_category_links.sql` | 231 | Resource-to-category mappings |
| `03_resource_sources.sql` | 229 | Catalogue provenance/source records |
| `99_verify.sql` | — | Checks expected row counts after restore |

The seed files use PostgreSQL `jsonb_to_recordset` and stable conflict keys. They are safe to re-run against the same schema and do not delete rows. Category mapping import resolves category UUIDs through the stable category slug, so it also works when category UUIDs differ from the exported production IDs.

## Restore order

1. Apply all eight SQL migrations from `supabase/migrations/` in chronological filename order to a new Supabase project.
2. Connect to that project's PostgreSQL database with an appropriately privileged database role.
3. Run `00_resource_categories.sql`, `01_resources.sql`, `02_resource_category_links.sql`, then `03_resource_sources.sql`.
4. Run `99_verify.sql` and confirm all four counts match the expected values.
5. Configure Supabase Auth redirect settings and server-side Edge Function secrets separately. The seed does not create Auth users, subscription records, webhook ledger events, workspace rows or institutional requests.

Example using a PostgreSQL connection URI supplied securely at runtime:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/00_resource_categories.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/01_resources.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/02_resource_category_links.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/03_resource_sources.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/99_verify.sql
```

Do not commit or share the database connection URI. Prefer a new, empty project for a full restore. The SQL scripts are upserts, not a production synchronization tool: applying this dated snapshot to an already-running catalogue may restore older metadata fields.

## Data quality and intended use

These are published directory entries and provenance records—not an independently reviewed or accredited curriculum. At export time, all 227 resource rows were published, but the verification-evidence table held zero rows. No provider had an independently reviewed learning-stage assignment or confirmed provider identity. A category match does not establish safety, quality, age appropriateness, availability or educational outcomes.

The source snapshot excludes outbound click analytics, Auth identities, profiles, private workspace data, institutional enquiries, subscription rows, webhook records and secrets.
