# Flowline

Flowline is a Salesforce-first ETL web app. It is meant to replace ad-hoc spreadsheet work (and tools like Flodata) when moving data from Oracle or other databases into Salesforce.

## What it does

- **Connectors** for Salesforce, Oracle, PostgreSQL, MySQL, and CSV/Excel files
- **Pipelines** that extract from a table or query, transform rows, and load a Salesforce object
- **Field mapping** with auto-map, required-field checks, lookups, date/number transforms, and templates
- **Load operations**: insert, update, upsert (external id), delete, plus dry-run
- **File import** for CSV and Excel onto Account, Contact, Lead, Opportunity, or Case
- **Job history** with extracted / loaded / failed counts and row-level errors

A demo Oracle CRM schema and Salesforce metadata are seeded so you can map and load without live credentials. Live Salesforce username-password (or instance URL + access token) and live Postgres/MySQL connections are supported when you add a real connector.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test          # transform, automap, and validation unit tests
npm run build     # production build
```

Local state is stored in `data/flowline.db`. Uploaded files land in `uploads/`. Neither directory is committed.

## Typical path

1. Open **Overview** — three demo pipelines are already mapped.
2. Open **Oracle customers → Salesforce Account**, review the mapping, then **Run load**.
3. Use **File import** and `public/samples/accounts.csv` to load a spreadsheet into Account.
4. Add a real Salesforce connector when you have a sandbox connected app.

Passwords and tokens are stored only in the local SQLite database and are masked in API responses.
