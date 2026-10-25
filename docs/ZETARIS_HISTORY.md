# Dedicated investigation history

[What](../README.md) · [How](HOW.md)

The app works on its first run without history. To demonstrate useful history on a
later run, it needs one durable table containing compact, timestamped decisions.
Current AWS facts continue to come from Zayan's direct tools. Do not copy AWS exports
or credentials into this table, and do not treat past records as current evidence.

## Required local Docker setup: history lakehouse

Follow [Zetaris installation and persistent storage provisioning](ZETARIS_SETUP.md)
to create the server-visible directory and register `CCI_HISTORY`. Then complete
the table, restricted app account and verification steps below. Directory creation
or lakehouse registration alone does not prove scoped append/read support.

## Required app configuration and table setup

The app connects to the **Web UI HTTP origin** and addresses a registered SQL table.
It does not access `/home/zetaris/customer-data/shared/cci-history` directly. Zetaris
retains that disk-path mapping in the registered `CCI_HISTORY` lakehouse.

### 3. Create the dedicated table as administrator

After registering `CCI_HISTORY`, run the CREATE TABLE
statement in [scripts/zetaris-history.sql](../scripts/zetaris-history.sql) once in the
Zetaris SQL editor as the provisioning administrator. It creates only
`CCI_HISTORY.investigations.records` using Iceberg; then run its DESCRIBE statement.
The adapter requires that exact v1 column layout and types before any read/append.
An existing table must be inspected rather than overwritten or silently accepted.

### 4. Configure the app identity and environment

Create a **new dedicated non-administrator app account** before using history
persistence in the deployed app. An administrator account with read/write access
can demonstrate functionality, but does not pass the least-privilege check.
Keep your existing administrator account for provisioning and permission management.

As the deployment administrator:

1. In **User Management**, create a separate account with user level **general**
   (the end-user level), a unique locally managed password, and no administrator
   role. Review all assigned and inherited roles; none may confer administrator
   access or broader data access. Zetaris distinguishes admin/general levels and
   separately assigned roles in its [SQL manual](https://kbase.zetaris.com/knowledge/sql-manual).
2. In **Access Control**, grant that app account **SELECT** and **INSERT** on
   **`CCI_HISTORY.investigations.records` only**. Use the most specific supported
   table scope; avoid granting all of `CCI_HISTORY`, all tables, or other data
   sources. Leave **Grant Option disabled**. Prefer direct table grants for this
   single app account; a dedicated role is optional, but its effective privileges
   must be equally narrow. Widget visibility alone does not establish table access;
   see [Zetaris roles and permissions](https://kbase.zetaris.com/knowledge/roles-permissions).
3. Confirm the account has no effective UPDATE, DELETE, TRUNCATE, DROP, ALTER,
   object-creation, user-management or privilege-granting authority. Check both
   direct grants and role inheritance, not only the visible SELECT/INSERT labels.
4. Verify the deployed backend or server-enforced policy prevents **INSERT
   OVERWRITE** for this identity. Zetaris documents INSERT as covering both inserts
   and overwrites; SELECT/INSERT labels alone cannot certify append-only access
   ([SQL guide](https://kbase.zetaris.com/knowledge/sql-guide)).
   If overwrite cannot be restricted, record the gap and keep the permission gate
   open rather than claiming append-only enforcement. Do not test destructive
   operations on the real history table. Any required denial tests belong on an
   administrator-provisioned disposable target with equivalent backend and policy.
5. Configure the app to authenticate as this new account, then perform the
   read/append verification in step 5 below. Record the user level, effective
   scope/privileges, Grant Option, inheritance review and overwrite enforcement
   in the [execution plan](EXECUTION_PLAN.md). Earlier administrator-based success
   does not replace verification under the new identity.

The application never creates users or grants itself privileges. The SQL adapter's
allowlisted append operation is an additional application safeguard; it does not
reduce the database permissions of an administrator credential.

Update only the Zetaris identity settings in your local `.env`; preserve unrelated
configuration and credentials. Use [.env.example](../.env.example) as a reference,
not as a replacement for the entire file. Fill in the new account locally and
never send or commit its password. Keep appends disabled during configuration:

```dotenv
ZETARIS_BASE_URL=http://127.0.0.1:3000
ZETARIS_ALLOW_HTTP=true
ZETARIS_AUTH_MODE=password
ZETARIS_USERNAME=your-app-username
ZETARIS_PASSWORD='your-app-password'
ZETARIS_ORG_ID=
ZETARIS_CCI_HISTORY_PATH=/home/zetaris/customer-data/shared/cci-history
ZETARIS_HISTORY_TABLE=CCI_HISTORY.investigations.records
ZETARIS_HISTORY_ALLOW_APPEND=false
```

The URL example is the supplied Compose UI port when the app runs on the same host.
Use your actual UI origin if a proxy, another port or another machine is involved.
Do not use the internal API port, a JDBC URL, or a filesystem path. Only use the HTTP
opt-in for the authorized connection; HTTPS remains preferred elsewhere.

Password mode POSTs `{username, password}` to `/api/auth/login` and uses the returned
`idToken` and `orgId`, following this deployed UI's verified contract. Leave
`ZETARIS_ORG_ID` empty to discover it; if supplied, it must match the login result.
Login tokens are not logged or persisted. Each query authenticates within its bounded
deadline; there is no refresh/write retry. Password mode never falls back to an old
administrator bearer credential.

Existing bearer-based setup remains supported with `ZETARIS_AUTH_MODE=token`,
`ZETARIS_API_KEY` containing a bearer token for the same dedicated non-admin
identity, and a matching `ZETARIS_ORG_ID`. An old administrator token must not be
used as an alternative runtime identity.
Without an explicit mode, nonempty username/password settings select password mode;
otherwise legacy token mode applies. This prevents new password configuration silently
using an old token. Quote passwords containing `.env` special characters.

### 5. Verify reads, then opt into a synthetic write

With the dedicated app user configured:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris:history
```

The first verifies login/query access with SELECT 1. When `ZETARIS_HISTORY_TABLE` is
set, the second verifies only the configured table schema; it does not require broad
catalog/grant enumeration. It does not certify restricted permissions or history writes.
Without a configured table it retains the original catalog-discovery behavior.

After table provisioning and permission review, set `ZETARIS_HISTORY_ALLOW_APPEND=true`
in `.env` and run this **manual, real write probe**:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris:roundtrip
```

It executes a mock B investigation, appends one labeled synthetic historical record,
and verifies an exact scoped readback. That record is retained; no DELETE operation
is implemented. It is separate from `npm test` and the manual LLM integration suite.
See [recorded append/read proof](history/execution-log.md#user-executed-zetaris-history-round-trip-2026-10-23) for prior results; functionality does not certify least privilege.
Missing schema, auth or write enablement fails explicitly.

## History table contract v1

One row per investigation/candidate; no raw provider responses or full trace dumps.
The app's narrow adapter is `src/tools/zetaris-history.ts`. Its target must be a
three-part table under `CCI_HISTORY`; other lakehouses/datasets are rejected.

| Column | Type | Meaning |
| --- | --- | --- |
| `record_id` | STRING | Stable SHA-256 of run/candidate IDs for retry comparison |
| `schema_version` | INT | Contract version, initially 1 |
| `investigation_id` | STRING | Original run identifier |
| `account_id`, `region`, `instance_id` | STRING | Scope for bounded historical lookup |
| `recorded_at_utc` | STRING | Canonical UTC completion time |
| `observed_from_utc`, `observed_to_utc` | STRING | Canonical UTC observation period |
| `source_mode` | STRING | Actual original evidence mode, e.g. mock or live |
| `verdict` | STRING | Current slice's validated disposition |
| `summary_json` | STRING | Bounded typed JSON: proposed/rejected UTC windows, historical evidence IDs and missing checks |

Reads validate schema, payloads and account/region isolation and return separately
labeled historical context IDs. Appends emit only INSERT INTO, encode values as
UTF-8 hex literals, and require exact read-after-write. An identical existing record
is reused; conflicting IDs or ambiguous writes fail without automatic retry. Iceberg
does not enforce a unique key here: this MVP assumes one writer, and the pre-read
is not a concurrency lock. Duplicate rows are detected as conflicts on append.

The investigation CLI reads scoped history when `ZETARIS_HISTORY_TABLE` is set
and appends validated summaries when `ZETARIS_HISTORY_ALLOW_APPEND=true`.
See the [both-store warm proof](evaluation/README.md#both-store-warm-proof) for the reproduction procedure.
Historical IDs never become current evidence citations.

Zetaris documents table-level SELECT and INSERT privileges. Its INSERT documentation
also includes overwrite operations, so SELECT/INSERT labels alone do not certify
append-only enforcement. The administrator must verify the chosen backend's effective
permissions; the application must additionally expose only a validated append operation
and bounded scoped reads, never model-authored SQL. Do not test denied destructive
operations against real data.

References: [Zetaris SQL Guide](https://kbase.zetaris.com/knowledge/sql-guide),
[SQL Manual](https://kbase.zetaris.com/knowledge/sql-manual).

## Decision follow-through (Oct 24)

The existing table also holds version 2 typed operator-decision and outcome
records, using the same columns and append-only permissions. Version 1 continues
to mean an investigation summary; ordinary history queries explicitly filter it.
No table DDL is required, but all readers of a scope must understand version 2
before introducing these rows there. Zetaris records no longer dictate planner
check order. See [the manual follow-up workflow](FOLLOW_UP.md) for deferred
reviews, accepted decisions, attributed outcomes, limits and real-service proof.
