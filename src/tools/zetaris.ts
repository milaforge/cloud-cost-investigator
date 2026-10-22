import { randomUUID } from "node:crypto";

export async function queryZetaris(sql: string) {
  const base = process.env.ZETARIS_BASE_URL;
  const key = process.env.ZETARIS_API_KEY;
  const orgId = process.env.ZETARIS_ORG_ID;

  if (!base || !key || !orgId) {
    throw new Error("Missing Zetaris configuration");
  }

  // Initial proof of connectivity. Production tools should
  // use fixed, allowlisted, read-only query templates.
  const response = await fetch(
    `${base.replace(/\/$/, "")}/api/proxy/sql-editor/sqls/run-query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Org-ID": orgId,
        "X-Request-ID": randomUUID(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, limit: 100 }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Zetaris HTTP ${response.status}`);
  }

  return response.json();
}
