import { pgTable, pgEnum, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const role = pgEnum('role', ['ADMIN', 'MEMBER']);

export const users = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    email: text('email').unique(),
    hashed_password: text('hashed_password'),
    role: text('role', { enum: ['ADMIN', 'MEMBER'] })
      .notNull()
      .default('MEMBER'),
    avatar: text('avatar'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
  },
  (users) => {
    return {
      emailIdx: uniqueIndex('email_idx').on(users.email)
    };
  }
);

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date'
  }).notNull()
});

export const tokens = pgTable(
  'token',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    expiresAt: timestamp('expires_at').notNull()
  },
  (tokens) => {
    return {
      userIdIdx: uniqueIndex('user_id_idx').on(tokens.userId)
    };
  }
);
