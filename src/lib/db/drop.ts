import db from '$lib/server/database';
import { sql } from 'drizzle-orm';

async function drop() {
  const tableSchema = db._.schema;
  if (!tableSchema) {
    throw new Error('No table schema found');
  }

  console.log('🗑️  Deleting all database tables');
  const queries = Object.values(tableSchema).map((table) => {
    console.log(`🧨 Preparing drop query for table: ${table.dbName}`);
    return sql.raw(`DROP TABLE "${table.dbName}" CASCADE;`);
  });

  console.log('📨 Sending drop queries...');

  await db.transaction(async (tx) => {
    await Promise.all(
      queries.map(async (query) => {
        if (query) await tx.execute(query);
      })
    );
  });

  console.log('✅ Database emptied');
}

drop().catch((e) => {
  console.error(e);
});
