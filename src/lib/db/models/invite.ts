import { pgTable, text, timestamp, serial, integer, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateNanoId } from '../../utils/helpers/nanoid';

import { Accounts } from './account';

export const statusEnum = pgEnum('status', ['pending', 'accepted', 'expired']);

export const Invites = pgTable(
  'Invite',
  {
    id: serial('id').primaryKey(),
    accountId: integer('account_id')
      .notNull()
      .references(() => Accounts.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    token: text('token')
      .notNull()
      .unique()
      .$default(() => generateNanoId({ token: true })),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date'
    }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    status: statusEnum('status').notNull().default('pending')
  },
  (Invites) => {
    return {
      accountIdIdx: index('invite_account_id_idx').on(Invites.accountId)
    };
  }
);

export const invitesRelations = relations(Invites, ({ one }) => ({
  account: one(Accounts, {
    fields: [Invites.accountId],
    references: [Accounts.id]
  })
}));
