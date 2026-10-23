-- Run once as a provisioning administrator in the Zetaris SQL editor.
-- CCI_HISTORY must already exist. This creates only the dedicated history table.
-- No IF NOT EXISTS: inspect an existing table rather than silently accepting its schema.
CREATE TABLE CCI_HISTORY.investigations.records (
  record_id STRING,
  schema_version INT,
  investigation_id STRING,
  account_id STRING,
  region STRING,
  instance_id STRING,
  recorded_at_utc STRING,
  observed_from_utc STRING,
  observed_to_utc STRING,
  source_mode STRING,
  verdict STRING,
  summary_json STRING
)
USING iceberg;

-- Verify the schema; the application also checks it before reads/appends.
DESCRIBE CCI_HISTORY.investigations.records;
-- Separately configure and verify the app user's effective table-scoped SELECT/INSERT
-- permissions in Zetaris Access Control. Do not give the runtime user administrator access.
