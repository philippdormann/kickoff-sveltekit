import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { UsersAccounts } from './account';

export const Users = pgTable('User', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  hashedPassword: text('hashed_password'),
  avatar: text('avatar'),
  admin: boolean('admin').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
});

export const UsersRelations = relations(Users, ({ many }) => ({
  userAccounts: many(UsersAccounts)
}));
