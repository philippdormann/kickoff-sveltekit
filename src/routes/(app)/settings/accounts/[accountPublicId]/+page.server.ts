// Env Variables
import { PUBLIC_BASE_URL } from '$env/static/public';

// Types
import type { Action, Actions } from '@sveltejs/kit';

// Utils
import { redirect } from 'sveltekit-flash-message/server';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/client';
import { setFormFail, setFormError } from '$lib/utils/helpers/forms';
import { and, eq } from 'drizzle-orm';
import { sendEmail } from '$lib/utils/mail/mailer';

// Schemas
import { createAccountInviteSchema, deleteAccountSchema, leaveAccountSchema } from '$lib/validations/account';

// Database
import db from '$lib/server/database';
import { Accounts, UsersAccounts } from '$models/account';
import { Invites } from '$models/invite';

export const load = async (event) => {
  if (!event.locals.user) {
    redirect('/login', { type: 'error', message: 'Please login to view this page' }, event);
  }

  const account = await db.query.Accounts.findFirst({
    where: eq(Accounts.publicId, event.params.accountPublicId),
    with: {
      members: {
        columns: {
          userId: true,
          role: true,
          joinedAt: true
        },
        with: {
          user: {
            columns: {
              email: true,
              avatar: true
            }
          }
        }
      }
    }
  });

  if (!account) {
    redirect('/', { type: 'error', message: 'Account not found' }, event);
  }

  if (!account.members.find((m) => m.userId === event.locals.user?.id)) {
    redirect('/', { type: 'error', message: 'You are not a member of this account' }, event);
  }

  const createAccountInviteForm = await superValidate({ accountId: account.id }, zod(createAccountInviteSchema), {
    id: 'create-account-invite-form',
    errors: false
  });
  const deleteAccountForm = await superValidate({ accountId: account.id }, zod(deleteAccountSchema), {
    id: 'delete-account-form',
    errors: false
  });

  const leaveAccountForm = await superValidate(zod(leaveAccountSchema), {
    id: 'leave-account-form'
  });

  return {
    account,
    createAccountInviteForm,
    deleteAccountForm,
    leaveAccountForm
  };
};

const createAccountInvite: Action = async (event) => {
  const createAccountInviteForm = await superValidate(event.request, zod(createAccountInviteSchema));

  if (!createAccountInviteForm.valid) {
    return setFormFail(createAccountInviteForm);
  }

  const { accountId, email } = createAccountInviteForm.data;

  if (accountId && email) {
    if (email === event.locals.user?.email) {
      return setFormError(createAccountInviteForm, 'You are already a member of this account.', {
        status: 500,
        field: 'email'
      });
    }

    try {
      const invite = await db
        .insert(Invites)
        .values({
          accountId: accountId,
          email: email,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 168)
        })
        .returning();

      const inviteUrl = `${PUBLIC_BASE_URL}/invites?account=${accountId}&token=${invite[0].token}`;
      console.log(inviteUrl);

      try {
        sendEmail(email, 'Join Our Kickoff SvelteKit Account', 'AccountInvite', {
          url: inviteUrl
        });
      } catch (e: any) {
        console.log(e);
      }
    } catch (error) {
      console.log(error);

      return setFormError(createAccountInviteForm, 'Something went wrong. Please try again later.', {
        status: 500
      });
    }

    redirect({ type: 'success', message: `An invite has been sent to ${email}!` }, event);
  }
};

const leaveAccount: Action = async (event) => {
  const leaveAccountForm = await superValidate(event.request, zod(leaveAccountSchema));

  if (!leaveAccountForm.valid) {
    return setFormFail(leaveAccountForm);
  }

  const { accountId, userId } = leaveAccountForm.data;

  try {
    await db
      .delete(UsersAccounts)
      .where(and(eq(UsersAccounts.accountId, accountId), eq(UsersAccounts.userId, userId.toString())));
  } catch (error) {
    redirect(
      {
        type: 'error',
        message: 'Something went wrong. Please try again later.'
      },
      event
    );
  }

  redirect('/settings/accounts', { type: 'success', message: 'You have successfully left the account.' }, event);
};

const deleteAccount: Action = async (event) => {
  const deleteAccountForm = await superValidate(event.request, zod(deleteAccountSchema));

  if (!deleteAccountForm.valid) {
    return setFormFail(deleteAccountForm);
  }

  const { accountId } = deleteAccountForm.data;

  if (accountId) {
    try {
      await db.delete(Accounts).where(eq(Accounts.id, accountId));
    } catch (error) {
      console.log(error);

      return setFormError(deleteAccountForm, 'Something went wrong. Please try again later.', {
        status: 500
      });
    }

    redirect('/settings/accounts', { type: 'success', message: 'Account was successfully deleted!' }, event);
  }
};

export const actions: Actions = { createAccountInvite, leaveAccount, deleteAccount };
