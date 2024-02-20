// Types
import type { Action } from './$types';

// Env Variables
import { PUBLIC_BASE_URL } from '$env/static/public';

// Utils
import db from '$lib/server/database';
import { auth } from '$lib/server/auth';
import { Users } from '$models/user';
import { Tokens } from '$models/token';
import { eq } from 'drizzle-orm';
import { redirect } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { requestPasswordResetSchema } from '$lib/validations/auth';
import { setFormFail, setFormError } from '$lib/utils/helpers/forms';
import { sendEmail } from '$lib/utils/mail/mailer';
import { Argon2id } from 'oslo/password';
import { generateNanoId } from '$lib/utils/helpers/nanoid';

export async function load({ locals }) {
  // redirect user if already logged in
  if (locals.user) throw redirect(302, '/');

  const form = await superValidate(zod(requestPasswordResetSchema));

  return {
    metadata: {
      title: 'Request Password Reset'
    },
    form
  };
}

const requestPasswordReset: Action = async (event) => {
  const form = await superValidate(event.request, zod(requestPasswordResetSchema));

  if (!form.valid) {
    return setFormFail(form);
  }

  const { email } = form.data;

  const user = await db.query.Users.findFirst({
    where: eq(Users.email, email),
    columns: {
      id: true
    }
  });

  if (!user) {
    // we send a success message even if the user doesn't exist to prevent email enumeration
    throw redirect(
      '/',
      {
        type: 'success',
        message: 'An email has been sent to reset your password!'
      },
      event
    );
  }

  try {
    const timestamp = new Date(Date.now() + 1000 * 60 * 10);

    const createOrUpdateTokens = await db
      .insert(Tokens)
      .values({
        userId: user.id,
        expiresAt: timestamp
      })
      .onConflictDoUpdate({
        target: Tokens.userId,
        set: { key: generateNanoId({ token: true }), expiresAt: timestamp }
      })
      .returning();

    const token = createOrUpdateTokens[0];

    await auth.invalidateUserSessions(user.id);
    const tempPassword = new Argon2id().hash(`temp_${user.id}`);
    await db
      .update(Users)
      .set({ hashedPassword: await tempPassword })
      .where(eq(Users.id, user.id));

    const url = new URL(`${PUBLIC_BASE_URL}/reset-password/${user.id}?token=${token?.key}`);

    await sendEmail(email, 'Reset Password', 'ResetPassword', { url: url });
  } catch (error) {
    console.log(error);
    return setFormError(form, 'Something went wrong. Please try again later.', {
      status: 500
    });
  }

  throw redirect(
    '/',
    {
      type: 'success',
      message: 'An email has been sent to reset your password!'
    },
    event
  );
};

export const actions = { requestPasswordReset };
