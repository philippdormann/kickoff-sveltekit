// Utils
import { redirect } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';

// Database
import db from '$lib/server/database';
import { Users } from '$models/user';

export const load = async (event) => {
  if (!event.locals.user) {
    redirect('/login', { type: 'error', message: 'Please login to view this page' }, event);
  }
  const getUserAccounts = await db.query.Users.findFirst({
    where: eq(Users.id, event.locals.user.id),
    columns: {},
    with: {
      userAccounts: {
        columns: {
          accountId: true,
          role: true
        },
        with: {
          account: {
            columns: {
              id: true,
              publicId: true,
              name: true,
              avatar: true
            },
            with: {
              members: {
                columns: {},
                with: {
                  user: {
                    columns: {
                      id: true,
                      email: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return {
    userAccounts: getUserAccounts?.userAccounts
  };
};
