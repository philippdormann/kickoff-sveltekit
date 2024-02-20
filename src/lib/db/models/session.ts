import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { Users } from './user';

export const Sessions = pgTable('Session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date'
  }).notNull()
});
