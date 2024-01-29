// Types
import type { Action, Actions } from './$types';

// Utils
import db from '$lib/server/database';
import { users } from '$lib/db/models/auth';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms/server';
import { loginSchema } from '$lib/validations/auth';
import { setFormFail, setFormError } from '$lib/utils/helpers/forms';
import { Argon2id } from 'oslo/password';

export async function load({ locals }) {
  // redirect to `/` if logged in
  if (locals.user) throw redirect(302, '/');

  const form = await superValidate(loginSchema);

  return {
    metadata: {
      title: 'Login'
    },
    form
  };
}

const login: Action = async (event) => {
  const form = await superValidate(event.request, loginSchema);

  if (!form.valid) {
    return setFormFail(form, { removeSensitiveData: ['password'] });
  } else {
    const { password, email } = form.data;

    try {
      const existingUsersArray = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      const user = existingUsersArray[0];

      if (!user) {
        return setFormError(
          form,
          'Incorrect email or password',
          {
            status: 401,
            field: 'email',
            removeSensitiveData: ['password']
          },
          event
        );
      }

      const validPassword = await new Argon2id().verify(
        user.hashed_password!,
        password
      );

      if (!validPassword) {
        return setFormError(
          form,
          'Incorrect email or password',
          {
            status: 401,
            field: 'email',
            removeSensitiveData: ['password']
          },
          event
        );
      }

      const session = await auth.createSession(user.id, {});
      const sessionCookie = auth.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch (e: any) {
      return setFormError(
        form,
        'Something went wrong. Please try again later.',
        {
          status: 500,
          removeSensitiveData: ['password']
        },
        event
      );
    }
  }

  throw redirect(
    '/',
    {
      type: 'success',
      message: 'Logged in successfully'
    },
    event
  );
};

export const actions: Actions = { login };
