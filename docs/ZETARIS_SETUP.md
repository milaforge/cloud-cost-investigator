# Zetaris setup

[What](../README.md) · [How](HOW.md)

Zetaris stores investigation history and operator follow-through. It is an external
service; `npm ci` does not install it. The standalone demo can run without Zetaris.
This guide covers installation and persistent storage; continue to the
[history guide](ZETARIS_HISTORY.md#required-app-configuration-and-table-setup)
for the table, dedicated app account, connection settings and verification.

## Install Zetaris

Follow the official [Docker Desktop installation guide](https://kbase.zetaris.com/knowledge/docker-installation-on-docker-desktop).
It covers Docker Desktop and Git prerequisites, the
[Zetaris Freemium deployment repository](https://github.com/zetaris/Freemium),
registry access, container startup and initial administrator creation. Complete
any required image-access activation before pulling the images. Use the guide
and Compose file for your deployment version; service names and paths can differ.
For another hosting environment, use the official
[deployment guides](https://kbase.zetaris.com/knowledge/zetaris-deployment).

Once the services are running, sign in to the Zetaris Web UI as the provisioning
administrator. If Zetaris is already installed, start with the storage checks below.

## Smallest suitable deployment

Use a dedicated local lakehouse on the Zetaris server **if its local storage is
persistent across service restarts**. This avoids adding a database service or AWS
resources. If the administrator already operates a writable JDBC database, a dedicated
table there is also suitable. A Lightning database containing demo file registrations
is not proof of an appendable backing store.

For current deployment proof and permission gaps, see the [execution plan](EXECUTION_PLAN.md). Connectivity or a lakehouse registration alone does not prove scoped append/read support.

## Required local Docker setup: history lakehouse

Complete this as the deployment administrator before enabling Zetaris persistence. It is optional for a first investigation; directory provisioning alone does not prove history append/read.

The supplied deployment used for this project mounts the persistent `customer-data` named volume
read/write in both `driver` and `api`. Before running the commands below, inspect
your Compose file: confirm both services share that persistent mount, their
runtime user/group identities, and the local filesystem access root. In this
deployment both services set:

```yaml
ZETARIS_LOCAL_FILE_SYTEM_ROOT_PATH: /home/zetaris/customer-data/shared
```

Use a dedicated directory **under that configured access root**. The sibling
`/home/zetaris/customer-data/cci-history` was rejected with “Invalid file path to
access”, despite being inside the same volume. `/` is not the lakehouse storage path.
“Local” means the filesystem visible to Zetaris inside its containers.

### Configure the provisioning path

On a fresh computer, first follow [the app setup](HOW.md#configure-your-investigation).
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
permission steps in the [history guide](ZETARIS_HISTORY.md#required-app-configuration-and-table-setup).

## Connect Cloud Cost Investigator

After the directory is writable and `CCI_HISTORY` is registered:

1. [Create the dedicated history table](ZETARIS_HISTORY.md#3-create-the-dedicated-table-as-administrator).
2. [Create a dedicated non-admin app account and configure the connection](ZETARIS_HISTORY.md#4-configure-the-app-identity-and-environment).
   Scope access to `CCI_HISTORY.investigations.records`; keep Grant Option disabled
   and verify effective permissions and overwrite restrictions.
3. [Verify reads, then explicitly enable the retained synthetic append/readback probe](ZETARIS_HISTORY.md#5-verify-reads-then-opt-into-a-synthetic-write).

A writable directory or successful lakehouse registration does not prove the table
schema, restricted permissions or a working history integration. Keep appends disabled
until the account and table checks are complete. Use the Web UI HTTP origin for the
app connection, never the storage path.
