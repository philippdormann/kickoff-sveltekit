import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

// Schemas
import * as userSchema from '$models/user';
import * as sessionSchema from '$models/session';
import * as tokenSchema from '$models/token';
import * as accountSchema from '$models/account';
import * as inviteSchema from '$models/invite';

export const pool = new pg.Pool({
  connectionString: process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL
});

const db = drizzle(pool, {
  schema: {
    ...userSchema,
    ...sessionSchema,
    ...tokenSchema,
    ...accountSchema,
    ...inviteSchema
  }
});
export default db;
