// Utils
import { redirect } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';
import * as m from '$lib/utils/messages';

// Database
import db from '$lib/server/database';
import { Invites } from '$models/invite';
import { UsersAccounts } from '$models/account';

export const load = async (event) => {
  if (!event.locals.user) {
    redirect('/login', { type: 'error', message: m.general.unauthorized }, event);
  }

  const accountId = event.url.searchParams.get('account');
  const inviteToken = event.url.searchParams.get('token');
  if (!inviteToken || !accountId) {
    redirect('/', { type: 'error', message: m.accounts.invite.recieve.invalidUrl }, event);
  }

  const invite = await db.query.Invites.findFirst({
    where: eq(Invites.accountId, parseInt(accountId)) && eq(Invites.token, inviteToken)
  });

  if (!invite) {
    redirect('/', { type: 'error', message: m.accounts.invite.recieve.invalidUrl }, event);
  }

  if (invite.email !== event.locals.user?.email) {
    redirect('/', { type: 'error', message: m.accounts.invite.recieve.invalidUrl }, event);
  }

  if (invite.status !== 'pending') {
    redirect('/', { type: 'error', message: m.accounts.invite.recieve.claimed }, event);
  }

  if (invite.expiresAt < new Date(Date.now())) {
    await db.update(Invites).set({ status: 'expired' }).where(eq(Invites.id, invite.id));

    redirect('/', { type: 'error', message: m.accounts.invite.recieve.expiredUrl }, event);
  }

  try {
    const addUserToAccount = await db.insert(UsersAccounts).values({
      accountId: invite.accountId,
      userId: event.locals.user?.id,
      role: 'member'
    });

    if (addUserToAccount) {
      await db
        .update(Invites)
        .set({
          status: 'accepted'
        })
        .where(eq(Invites.id, invite.id));
    }
  } catch (error) {
    console.log(error);
    redirect(
      '/',
      {
        status: 500,
        type: 'error',
        message: m.general.error
      },
      event
    );
  }

  redirect(
    '/settings/accounts',
    {
      type: 'success',
      message: m.accounts.invite.recieve.success
    },
    event
  );
};
