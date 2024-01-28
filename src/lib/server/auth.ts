// Packages
import { Lucia, TimeSpan } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';

// Utils
import db from '$lib/server/database';
import { users, sessions } from '$lib/db/models/auth';

// Stores
import { dev } from '$app/environment';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const auth = new Lucia(adapter, {
  getUserAttributes: (attributes: DatabaseUserAttributes) => {
    return {
      email: attributes.email,
      avatar: attributes.avatar
    };
  },
  sessionExpiresIn: new TimeSpan(30, 'd'),
  sessionCookie: {
    name: '__auth_session',
    attributes: {
      secure: !dev,
      sameSite: 'strict'
    }
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof auth;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  avatar: string;
}
