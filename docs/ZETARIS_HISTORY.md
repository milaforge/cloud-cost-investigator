# Dedicated investigation history

[Documentation index](README.md)

The app works on its first run without history. To demonstrate useful history on a
later run, it needs one durable table containing compact, timestamped decisions.
Current AWS facts continue to come from Zayan's direct tools. Do not copy AWS exports
or credentials into this table, and do not treat past records as current evidence.

## Smallest suitable deployment

Use a dedicated local lakehouse on the Zetaris server **if its local storage is
persistent across service restarts**. This avoids adding a database service or AWS
resources. If the administrator already operates a writable JDBC database, a dedicated
table there is also suitable. A Lightning database containing demo file registrations
is not proof of an appendable backing store.

The current credential can run `SELECT 1`. The initial catalog probe found no JDBC
datasources or lakehouses; the user subsequently confirmed successful local lakehouse
creation using the setup below; a subsequent read-only API probe independently found
`CCI_HISTORY`. Table creation, restricted permissions and history
append/read still need verification. An empty grant listing does not establish either
admin access or denial. Executed evidence
is recorded in [EXECUTION_PLAN.md](EXECUTION_PLAN.md).

## Required local Docker setup: history lakehouse

Complete this once before configuring Zetaris investigation-history persistence.
The user confirmed this setup works on 2026-10-23. It is not required for the
first-run CLI over mock evidence, and does not by itself prove history append/read.

The supplied Compose deployment mounts the persistent `customer-data` named volume
read/write in both `driver` and `api`. Both services set:

```yaml
ZETARIS_LOCAL_FILE_SYTEM_ROOT_PATH: /home/zetaris/customer-data/shared
```

Use a dedicated directory **under that configured access root**. The sibling
`/home/zetaris/customer-data/cci-history` was rejected with “Invalid file path to
access”, despite being inside the same volume. `/` is not the lakehouse storage path.
“Local” means the filesystem visible to Zetaris inside its containers.

### Configure the provisioning path

On a fresh computer, first follow [the app setup](CLI_GUIDE.md#fresh-machine-setup).
Record this non-secret setting in the app's local `.env`:

```dotenv
ZETARIS_CCI_HISTORY_PATH=/home/zetaris/customer-data/shared/cci-history
```

This is a **provisioning reference**, not a runtime app setting. The app does not
read it, create the directory or register a lakehouse. Use the same value for
`history_dir` in step 1 and `storagePath` in step 2 (or the UI Storage path).
For remote Zetaris, the path belongs to the server containers, not your computer.
The app's `.env` is not automatically loaded by the deployment shell or SQL editor;
substitute the path explicitly in both places. Keep it under the deployment's
configured access root and on persistent storage.

### 1. Create the directory and verify access

Run from the directory containing the **Zetaris deployment's Compose file**, not
from this app repository unless it also contains that deployment:

```bash
history_dir=/home/zetaris/customer-data/shared/cci-history

docker compose exec driver mkdir -p "$history_dir"
docker compose exec driver chgrp 1001 "$history_dir"
docker compose exec driver chmod 2770 "$history_dir"

docker compose exec driver test -w "$history_dir"
docker compose exec api test -w "$history_dir"
```

Both `test -w` commands must exit 0; they print nothing on success. Group `1001`
matches the supplied deployment's driver group and the API's `group_add`. Mode
`2770` gives the owner/group access and makes new entries inherit the directory
group. If using a different deployment, verify its service identities and configured
root rather than copying these values. No Compose changes or restarts are needed
for directory creation in the existing shared volume. Retain that named volume to
retain the lakehouse across container recreation.

### 2. Register the lakehouse

Use either the lakehouse creation form with these values:

| Field | Value |
| --- | --- |
| Name | `CCI_HISTORY` |
| Storage type | `Local` |
| Storage path | `/home/zetaris/customer-data/shared/cci-history` |

Or execute this once in the SQL editor:

```sql
CREATE DATALAKE CCI_HISTORY OPTIONS (
  storageType 'Local',
  storagePath '/home/zetaris/customer-data/shared/cci-history'
);
```

Choose one registration method; do not repeat creation if the lakehouse already
exists. Check `SHOW DATALAKES` for `CCI_HISTORY` before proceeding to the table and
permission steps below. User-confirmed creation is recorded in
[EXECUTION_PLAN.md](EXECUTION_PLAN.md); an independent post-creation catalog probe
has since found the lakehouse. Actual history append/read remains outstanding.

## Required app configuration and table setup

The app connects to the **Web UI HTTP origin** and addresses a registered SQL table.
It does not access `/home/zetaris/customer-data/shared/cci-history` directly. Zetaris
retains that disk-path mapping in the registered `CCI_HISTORY` lakehouse.

### 3. Create the dedicated table as administrator

The user confirmed `CCI_HISTORY` exists with no table yet. Run the CREATE TABLE
statement in [scripts/zetaris-history.sql](../scripts/zetaris-history.sql) once in the
Zetaris SQL editor as the provisioning administrator. It creates only
`CCI_HISTORY.investigations.records` using Iceberg; then run its DESCRIBE statement.
The adapter requires that exact v1 column layout and types before any read/append.
An existing table must be inspected rather than overwritten or silently accepted.

### 4. Configure the app identity and environment

In Zetaris Access Control, grant your dedicated app user the required table-scoped
read/append access. Keep the runtime user separate from the provisioning administrator.
The application never grants itself privileges. Verify effective permissions, including
any inherited roles and backend overwrite semantics, before enabling appends.

Add the Zetaris section of [.env.example](../.env.example) to your existing local
`.env`; preserve other credentials and do not commit it:

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
`ZETARIS_API_KEY` containing the bearer token, and a matching `ZETARIS_ORG_ID`.
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
On 2026-10-23, the user reported this probe passed with
`history_read_write_verified: true`. This verifies real history append/read with
their configured connection and mock investigation evidence; it does not certify
the effective user's restricted permissions or automatic CLI history use. See
[the execution record](EXECUTION_PLAN.md#user-executed-zetaris-history-round-trip-2026-10-23).
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
See [the warm-run integration](CLI_GUIDE.md#h-mem-and-zetaris) for recorded proof.
Historical IDs never become current evidence citations.

Zetaris documents table-level SELECT and INSERT privileges. Its INSERT documentation
also includes overwrite operations, so SELECT/INSERT labels alone do not certify
append-only enforcement. The administrator must verify the chosen backend's effective
permissions; the application must additionally expose only a validated append operation
and bounded scoped reads, never model-authored SQL. Do not test denied destructive
operations against real data.

References: [Zetaris SQL Guide](https://kbase.zetaris.com/knowledge/sql-guide),
[SQL Manual](https://kbase.zetaris.com/knowledge/sql-manual).

## Proof after provisioning

1. Verify the table schema and the app identity's effective permissions without granting new privileges.
2. Append one synthetic, labeled history record with a unique ID; do not retry an ambiguous write blindly.
3. Read that same ID back and validate every field, scope, timestamp and source mode.
4. Verify duplicate handling and scope isolation with non-sensitive records. Leave probe records labeled rather than deleting them through the application.
5. Run the configured investigation CLI to exercise historical lookup/append, retaining separate history IDs and fresh-evidence citations.

Until then, a successful connectivity/catalog probe is not history integration proof:

```sh
NODE_TLS_REJECT_UNAUTHORIZED=1 ZETARIS_ALLOW_HTTP=true npm run probe:zetaris:history
```

HTTP is an explicitly authorized exception for this connection. HTTPS remains the
default; redirects remain disabled, and raw responses and private endpoints are not logged.


## Decision follow-through (Oct 24)

The existing table also holds version 2 typed operator-decision and outcome
records, using the same columns and append-only permissions. Version 1 continues
to mean an investigation summary; ordinary history queries explicitly filter it.
No table DDL is required, but all readers of a scope must understand version 2
before introducing these rows there. Zetaris records no longer dictate planner
check order. See [the manual follow-up workflow](FOLLOW_UP.md) for deferred
reviews, accepted decisions, attributed outcomes, limits and real-service proof.
