import { verifyZetarisHistorySchema } from '../src/tools/zetaris-history.ts';
import { queryZetaris, parseZetarisTable } from '../src/tools/zetaris.ts';

// Fixed read-only queries only. Never print response rows, endpoints or credentials.
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--history'))
    throw new Error('zetaris_probe_arguments_invalid');
  const constant = parseZetarisTable(await queryZetaris('SELECT 1'));
  if (
    constant.headers.length !== 1 ||
    constant.headers[0] !== '1' ||
    constant.total !== 1 ||
    constant.data.length !== 1 ||
    !['1', 1].includes(constant.data[0][0] as string | number)
  )
    throw new Error('zetaris_constant_query_failed');
  const catalog: Record<string, { returned_rows: number; total: number }> = {};
  let historySchemaVerified = false;
  if (args[0] === '--history' && process.env.ZETARIS_HISTORY_TABLE) {
    await verifyZetarisHistorySchema();
    historySchemaVerified = true;
  } else if (args[0] === '--history') {
    for (const [name, sql] of [
      ['lightning_databases', 'SHOW LIGHTNING DATABASES'],
      ['jdbc_datasources', 'SHOW DATASOURCES'],
      ['lakehouses', 'SHOW DATALAKES'],
      ['explicit_grants', 'SHOW GRANT ON ALL'],
    ]) {
      const result = parseZetarisTable(await queryZetaris(sql));
      catalog[name] = {
        returned_rows: result.data.length,
        total: result.total,
      };
    }
  }
  console.log(
    JSON.stringify({
      transport: 'ok',
      sql_success_verified: true,
      ...(args[0] === '--history'
        ? { catalog, history_schema_verified: historySchemaVerified }
        : {}),
      history_read_write_verified: false,
    }),
  );
} catch (error) {
  const code =
    error instanceof Error &&
    /^zetaris_(?:configuration_required|configuration_invalid|login_configuration_required|org_mismatch|auth_unavailable|auth_invalid_response|auth_http_\d{3}|tls_verification_required|transport_unavailable|invalid_response|history_schema_mismatch|history_table_invalid|constant_query_failed|probe_arguments_invalid|http_\d{3})$/.test(
      error.message,
    )
      ? error.message
      : 'zetaris_probe_failed';
  console.log(JSON.stringify({ code, history_read_write_verified: false }));
  process.exitCode = 1;
}
