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
import * as m from '$lib/utils/messages';

// Schemas
import {
  createAccountInviteSchema,
  editAccountSchema,
  leaveAccountSchema,
  deleteAccountSchema
} from '$lib/validations/account';

// Database
import db from '$lib/server/database';
import { Accounts, UsersAccounts } from '$models/account';
import { Invites } from '$models/invite';

export const load = async (event) => {
  if (!event.locals.user) {
    redirect('/login', { type: 'error', message: m.general.unauthorized }, event);
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
    redirect('/', { type: 'error', message: m.accounts.notFound }, event);
  }

  if (!account.members.find((m) => m.userId === event.locals.user?.id)) {
    redirect('/', { type: 'error', message: m.accounts.unauthorized }, event);
  }

  const createAccountInviteForm = await superValidate({ accountId: account.id }, zod(createAccountInviteSchema), {
    id: 'create-account-invite-form',
    errors: false
  });

  const editAccountForm = await superValidate({ accountId: account.id, name: account.name }, zod(editAccountSchema), {
    id: 'edit-account-form',
    errors: false
  });

  const leaveAccountForm = await superValidate(zod(leaveAccountSchema), {
    id: 'leave-account-form'
  });

  const deleteAccountForm = await superValidate({ accountId: account.id }, zod(deleteAccountSchema), {
    id: 'delete-account-form',
    errors: false
  });

  return {
    account,
    createAccountInviteForm,
    editAccountForm,
    leaveAccountForm,
    deleteAccountForm
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
      return setFormError(createAccountInviteForm, m.accounts.invite.send.alreadyMember, {
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

      return setFormError(createAccountInviteForm, m.general.error, {
        status: 500
      });
    }

    redirect({ type: 'success', message: `An invite has been sent to ${email}` }, event);
  }
};

const editAccount: Action = async (event) => {
  const editAccountForm = await superValidate(event.request, zod(editAccountSchema));

  if (!editAccountForm.valid) {
    return setFormFail(editAccountForm);
  }

  const { accountId, name } = editAccountForm.data;

  if (accountId && name) {
    try {
      await db.update(Accounts).set({ name: name }).where(eq(Accounts.id, accountId));
    } catch (error) {
      redirect(
        {
          status: 500,
          type: 'error',
          message: m.general.error
        },
        event
      );
    }

    redirect({ type: 'success', message: m.accounts.edit.success }, event);
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
        status: 500,
        type: 'error',
        message: m.general.error
      },
      event
    );
  }

  redirect('/settings/accounts', { type: 'success', message: m.accounts.leave.success }, event);
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

      return setFormError(deleteAccountForm, m.general.error, {
        status: 500
      });
    }

    redirect('/settings/accounts', { type: 'success', message: m.accounts.delete.success }, event);
  }
};

export const actions: Actions = { createAccountInvite, editAccount, leaveAccount, deleteAccount };
