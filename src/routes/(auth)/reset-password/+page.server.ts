// Types
import type { Action } from './$types';

// Env Variables
import { PUBLIC_BASE_URL } from '$env/static/public';

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
import * as m from '$lib/utils/messages';

// Schemas
import { requestPasswordResetSchema } from '$lib/validations/auth';

// Database
import db from '$lib/server/database';
import { Users } from '$models/user';
import { Tokens } from '$models/token';

export async function load({ locals }) {
  // redirect user if already logged in
  if (locals.user) redirect(302, '/');

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
    redirect(
      '/',
      {
        type: 'success',
        message: m.requestResetPassword.success
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
    return setFormError(form, m.general.error, {
      status: 500
    });
  }

  redirect(
    '/',
    {
      type: 'success',
      message: m.requestResetPassword.success
    },
    event
  );
};

export const actions = { requestPasswordReset };
