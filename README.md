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

## Run it on your computer

The Cloud Agent VM is not your laptop. `http://localhost:3000` only works on the machine where you start the app.

```bash
git clone https://github.com/rajeevketha/webAppETL.git
cd webAppETL
git checkout cursor/salesforce-etl-flowline-99e1
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. First compile can take a few seconds; after that it should feel instant.

If you open the app through a Cloud Agent **Ports** forward, every click goes over the remote tunnel and will feel slow. Run `npm run dev` on your own machine for the fast path.

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
