// Stores
import { dev } from '$app/environment';

// Utils
import { Lucia, TimeSpan } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';

// Database
import db from '$lib/server/database';
import { Users } from '$models/user';
import { Sessions } from '$models/session';

const adapter = new DrizzlePostgreSQLAdapter(db, Sessions, Users);

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
