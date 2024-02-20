import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';
import { Users } from './user';
import { relations } from 'drizzle-orm';
import { generateNanoId } from '../../utils/helpers/nanoid';

export const Tokens = pgTable('Token', {
  id: serial('id').primaryKey(),
  key: text('key')
    .notNull()
    .unique()
    .$default(() => generateNanoId({ token: true })),
  userId: text('user_id')
    .references(() => Users.id, { onDelete: 'cascade' })
    .unique(),
  expiresAt: timestamp('expires_at').notNull()
});

export const TokensRelations = relations(Tokens, ({ one }) => ({
  user: one(Users, {
    fields: [Tokens.userId],
    references: [Users.id]
  })
}));
