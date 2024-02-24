// Types
import { type Action } from '@sveltejs/kit';

// Utils
import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';
import { fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import { setFormError } from '$lib/utils/helpers/forms';
import { eq } from 'drizzle-orm';
import * as m from '$lib/utils/messages';

// Schemas
import { editUserSchema } from '$lib/validations/auth';

// Database
import db from '$lib/server/database';
import { Users } from '$models/user';
import { UsersAccounts, Accounts } from '$models/account';

export async function load(event) {
  if (!event.locals.user) {
    redirect('/login', { type: 'error', message: m.general.unauthorized }, event);
  }

  const form = await superValidate(zod(editUserSchema), {
    id: 'edit-user-form'
  });

  return {
    metadata: {
      title: 'User Profile'
    },
    form
  };
}

const editUser: Action = async (event) => {
  const form = await superValidate(event.request, zod(editUserSchema));

  if (!form.valid) {
    return fail(400, { form });
  } else {
    const user = event.locals.user;

    if (!user) {
      redirect(
        {
          type: 'error',
          message: m.general.unauthorized
        },
        event
      );
    }

    const { avatar } = form.data;

    if (!avatar) {
      redirect(
        {
          type: 'warning',
          message: m.userProfile.edit.noChanges
        },
        event
      );
    }

    console.log(user, avatar);

    if (avatar && typeof avatar === 'string') {
      try {
        await db.update(Users).set({ avatar }).where(eq(Users.id, user.id));
      } catch (error) {
        console.log(error);
        return setFormError(form, m.general.error, {
          status: 500,
          field: 'avatar'
        });
      }
    }

    redirect({ type: 'success', message: m.userProfile.edit.success }, event);
  }
};

const deleteUser: Action = async (event) => {
  const user = event.locals.user;

  if (!user) redirect('/', { type: 'error', message: m.general.unauthorized }, event);

  try {
    try {
      await auth.invalidateUserSessions(user.id);
      const sessionCookie = auth.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch {
      redirect(
        {
          type: 'error',
          message: m.general.error
        },
        event
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(UsersAccounts).where(eq(UsersAccounts.userId, user.id));
      await tx.delete(Accounts).where(eq(Accounts.name, user.email.split('@')[0]));
      await tx.delete(Users).where(eq(Users.id, user.id));
    });
  } catch (error) {
    console.log(error);
    redirect(
      {
        type: 'error',
        message: m.general.error
      },
      event
    );
  }

  redirect('/', { type: 'success', message: m.userProfile.delete.success }, event);
};

export const actions = { editUser, deleteUser };
