// Types
import type { Action } from './$types';

// Utils
import { redirect } from 'sveltekit-flash-message/server';
import { error } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import { setFormFail, setFormError } from '$lib/utils/helpers/forms';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';
import * as m from '$lib/utils/messages';

// Scehmas
import { resetPasswordSchema } from '$lib/validations/auth';

// Database
import db from '$lib/server/database';
import { Users } from '$models/user';
import { Tokens } from '$models/token';

export async function load({ locals, params, url }) {
  // redirect user if already logged in
  if (locals.user) redirect(302, '/');

  const userIdParam: string | null = params.userId || null;
  const tokenParam: string | null = url.searchParams.get('token') || null;
  let email: string | null = null;

  if (userIdParam && tokenParam) {
    try {
      const token = await db.query.Tokens.findFirst({
        where: eq(Tokens.key, tokenParam),
        columns: {
          expiresAt: true
        },
        with: {
          user: {
            columns: {
              id: true,
              email: true
            }
          }
        }
      });

      if (!token) {
        error(400, 'Invalid Token');
      }

      if (token.expiresAt < new Date(Date.now())) {
        error(400, 'Expired Token');
      }

      email = token.user?.email ?? null;
    } catch (e: any) {
      error(e.status, e.body.message);
    }
  } else {
    redirect(302, '/reset-password');
  }

  const form = await superValidate({ email: email ?? '', token: tokenParam }, zod(resetPasswordSchema), {
    errors: false
  });

  return {
    metadata: {
      title: 'Reset Password'
    },
    form
  };
}

const reset: Action = async (event) => {
  const form = await superValidate(event.request, zod(resetPasswordSchema));

  if (!form.valid) {
    return setFormFail(form, {
      removeSensitiveData: ['password', 'passwordConfirmation']
    });
  } else {
    const { email, token, password, passwordConfirmation } = form.data;

    if (password !== passwordConfirmation) {
      return setFormError(
        form,
        m.resetPassword.passwordsMismatch,
        {
          status: 400,
          field: 'passwordConfirmation'
        },
        event
      );
    }
    try {
      await db
        .update(Users)
        .set({
          hashedPassword: await new Argon2id().hash(password)
        })
        .where(eq(Users.email, email));
    } catch (error) {
      return setFormError(
        form,
        m.general.error,
        {
          status: 500,
          removeSensitiveData: ['password', 'passwordConfirmation']
        },
        event
      );
    }

    await db.delete(Tokens).where(eq(Tokens.key, token));
  }

  redirect(
    '/login',
    {
      type: 'success',
      message: m.resetPassword.success
    },
    event
  );
};

export const actions = { reset };
