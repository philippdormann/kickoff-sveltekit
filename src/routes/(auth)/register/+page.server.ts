// Types
import type { Action } from './$types';

// Utils
import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import { setFormFail, setFormError } from '$lib/utils/helpers/forms';
import { eq } from 'drizzle-orm';
import { sendEmail } from '$lib/utils/mail/mailer';
import { Argon2id } from 'oslo/password';
import { generateNanoId } from '$lib/utils/helpers/nanoid';

// Schemas
import { registrationSchema } from '$lib/validations/auth';

// Database
import db from '$lib/server/database';
import { Users } from '$models/user';
import { Accounts, UsersAccounts } from '$models/account';

export async function load({ locals }) {
  // redirect to `/` if logged in
  if (locals.user) redirect(302, '/');

  const form = await superValidate(zod(registrationSchema));

  return {
    metadata: {
      title: 'Register'
    },
    form
  };
}

const register: Action = async (event) => {
  const form = await superValidate(event.request, zod(registrationSchema));

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

    const existingUser = await db.query.Users.findFirst({
      where: eq(Users.email, email),
      columns: {
        id: true
      }
    });

    if (existingUser) {
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

    const userId = generateNanoId();
    const userHashedPassword = await new Argon2id().hash(password);

    try {
      await db.transaction(async (tx) => {
        const createUser = await tx
          .insert(Users)
          .values({
            id: userId,
            email,
            hashedPassword: userHashedPassword
          })
          .returning();

        const createAccount = await tx
          .insert(Accounts)
          .values({
            type: 'personal',
            name: email.split('@')[0]
          })
          .returning();

        const accountId = createAccount[0].id;

        await tx.insert(UsersAccounts).values({
          userId: createUser[0].id,
          accountId: accountId,
          role: 'admin'
        });
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

    redirect(
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
