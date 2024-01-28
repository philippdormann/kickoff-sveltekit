// Types
import type { Action } from './$types';

// Utils
import db from '$lib/server/database';
import { auth } from '$lib/server/auth';
import { users } from '$lib/db/models/auth';
import { eq } from 'drizzle-orm';
import { redirect } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms/server';
import { registrationSchema } from '$lib/validations/auth';
import { setFormFail, setFormError } from '$lib/utils/helpers/forms';
import { sendEmail } from '$lib/utils/mail/mailer';
import { generateId } from 'lucia';
import { Argon2id } from 'oslo/password';

export async function load({ locals }) {
  // redirect to `/` if logged in
  if (locals.user) throw redirect(302, '/');

  const form = await superValidate(registrationSchema);

  return {
    metadata: {
      title: 'Register'
    },
    form
  };
}

const register: Action = async (event) => {
  const form = await superValidate(event.request, registrationSchema);

  if (!form.valid) {
    return setFormFail(form, {
      removeSensitiveData: ['password', 'passwordConfirmation']
    });
  } else {
    const { email, password, passwordConfirmation } = form.data;

    if (password !== passwordConfirmation) {
      return setFormError(
        form,
        'Passwords do not match',
        {
          field: 'passwordConfirmation',
          removeSensitiveData: ['password', 'passwordConfirmation']
        },
        event
      );
    }

    const getUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    const user = getUsers[0];

    if (user) {
      return setFormError(
        form,
        'Email is already taken',
        {
          field: 'email',
          removeSensitiveData: ['password', 'passwordConfirmation']
        },
        event
      );
    }

    const userId = generateId(12);
    const hashedPassword = await new Argon2id().hash(password);

    try {
      await db.insert(users).values({
        id: userId,
        email,
        hashed_password: hashedPassword
      });

      // Automatically log in the user
      try {
        const session = await auth.createSession(userId, {});
        const sessionCookie = auth.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '.',
          ...sessionCookie.attributes
        });
      } catch (e: any) {
        console.log(e);
      }
    } catch (e: any) {
      console.log(e);

      return setFormError(
        form,
        'Something went wrong. Please try again later.',
        {
          status: 500,
          removeSensitiveData: ['password', 'passwordConfirmation']
        },
        event
      );
    }

    // Send welcome email
    try {
      sendEmail(email, 'Welcome to SvelteKit!', 'Welcome');
    } catch (e: any) {
      console.log(e);
    }

    throw redirect(
      '/login',
      {
        type: 'success',
        message: 'Registered successfully.'
      },
      event
    );
  }
};

export const actions = { register };
