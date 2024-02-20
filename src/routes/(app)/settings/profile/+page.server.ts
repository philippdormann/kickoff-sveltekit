// Utils
import { type Action, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import db from '$lib/server/database';
import { Users } from '$models/user';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { editAccountSchema } from '$lib/validations/auth';
import { setFormError } from '$lib/utils/helpers/forms';
import { redirect } from 'sveltekit-flash-message/server';

export async function load() {
  const form = await superValidate(zod(editAccountSchema));

  return {
    metadata: {
      title: 'Profile'
    },
    form
  };
}

const edit: Action = async (event) => {
  const form = await superValidate(event.request, zod(editAccountSchema));

  if (!form.valid) {
    return fail(400, { form });
  } else {
    const user = event.locals.user;

    if (!user) {
      throw redirect(
        {
          type: 'error',
          message: 'You are not logged in'
        },
        event
      );
    }

    const { avatar } = form.data;

    if (!avatar) {
      throw redirect(
        {
          type: 'warning',
          message: 'No changes were made. Nothing to update.'
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
        return setFormError(form, 'Something went wrong. Please try again later.', {
          status: 500,
          field: 'avatar'
        });
      }
    }

    throw redirect({ type: 'success', message: 'Account updated' }, event);
  }
};

const cancel: Action = async (event) => {
  const user = event.locals.user;

  if (user) {
    try {
      await auth.invalidateUserSessions(user.id);
      const sessionCookie = auth.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch {
      throw redirect(
        {
          type: 'error',
          message: 'Something went wrong. Please try again later.'
        },
        event
      );
    }

    try {
      await db.delete(Users).where(eq(Users.id, user.id));
    } catch {
      throw redirect(
        {
          type: 'error',
          message: 'Something went wrong. Please try again later.'
        },
        event
      );
    }
  }

  throw redirect('/', { type: 'success', message: 'Account deleted.' }, event);
};

export const actions = { edit, cancel };
