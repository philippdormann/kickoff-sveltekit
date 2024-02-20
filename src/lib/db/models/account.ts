import { pgTable, text, timestamp, serial, primaryKey, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateNanoId } from '../../utils/helpers/nanoid';

import { Users } from './user';
import { Invites } from './invite';

export const typeEnum = pgEnum('type', ['personal', 'team']);

export const Accounts = pgTable('Account', {
  id: serial('id').primaryKey(),
  publicId: text('public_id')
    .notNull()
    .unique()
    .$default(() => generateNanoId()),
  type: typeEnum('type').notNull().default('team'),
  name: text('name').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
});

export const AccountsRelations = relations(Accounts, ({ many }) => ({
  members: many(UsersAccounts),
  invites: many(Invites)
}));

export const roleEnum = pgEnum('role', ['admin', 'member']);

export const UsersAccounts = pgTable(
  'Users_Accounts',
  {
    accountId: integer('account_id')
      .notNull()
      .references(() => Accounts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    role: roleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').notNull().defaultNow()
  },
  (t) => ({
    pk: primaryKey({ columns: [t.accountId, t.userId] })
  })
);

export const UsersAccountsRelations = relations(UsersAccounts, ({ one }) => ({
  account: one(Accounts, {
    fields: [UsersAccounts.accountId],
    references: [Accounts.id]
  }),
  user: one(Users, {
    fields: [UsersAccounts.userId],
    references: [Users.id]
  })
}));
