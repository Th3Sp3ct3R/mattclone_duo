import { Pool } from 'pg';

export const DEFAULT_BATCH_SIZE = 1000;

export function createLegacyPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    max: 2
  });
}

export async function tableExists(client, tableName, schemaName = 'public') {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      ) AS exists
    `,
    [schemaName, tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

export async function countRows(client, tableName, { schemaName = 'public', where = '', values = [] } = {}) {
  if (!(await tableExists(client, tableName, schemaName))) return 0;
  const qualifiedName = quoteQualifiedName(schemaName, tableName);
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM ${qualifiedName}${where ? ` WHERE ${where}` : ''}`,
    values
  );
  return Number(result.rows[0]?.count || 0);
}

export async function readRows(client, queryText, values = []) {
  const result = await client.query(queryText, values);
  return result.rows;
}

export async function* readBatches(client, buildQuery, { batchSize = DEFAULT_BATCH_SIZE } = {}) {
  let offset = 0;
  while (true) {
    const { text, values = [] } = buildQuery({ limit: batchSize, offset });
    const result = await client.query(text, values);
    if (!result.rows.length) return;
    yield result.rows;
    if (result.rows.length < batchSize) return;
    offset += batchSize;
  }
}

export async function readTable(
  client,
  tableName,
  { schemaName = 'public', columns = '*', where = '', values = [], orderBy = '1' } = {}
) {
  if (!(await tableExists(client, tableName, schemaName))) return [];
  const qualifiedName = quoteQualifiedName(schemaName, tableName);
  const whereClause = where ? ` WHERE ${where}` : '';
  return readRows(client, `SELECT ${columns} FROM ${qualifiedName}${whereClause} ORDER BY ${orderBy}`, values);
}

export async function forEachTableBatch(
  client,
  tableName,
  callback,
  { schemaName = 'public', columns = '*', where = '', values = [], orderBy = '1', batchSize } = {}
) {
  if (!(await tableExists(client, tableName, schemaName))) return 0;
  const qualifiedName = quoteQualifiedName(schemaName, tableName);
  const whereClause = where ? ` WHERE ${where}` : '';
  let total = 0;

  for await (const rows of readBatches(
    client,
    ({ limit, offset }) => ({
      text: `SELECT ${columns} FROM ${qualifiedName}${whereClause} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      values: [...values, limit, offset]
    }),
    { batchSize }
  )) {
    total += rows.length;
    await callback(rows);
  }

  return total;
}

export function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function quoteQualifiedName(schemaName, tableName) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}
