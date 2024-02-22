import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';
import { auth } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  if (!event.locals.session) redirect(302, '/');

  try {
    await auth.invalidateSession(event.locals.session.id);
    const sessionCookie = auth.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  } catch (error) {
    console.log(error);
    redirect(
      '/',
      {
        type: 'error',
        message: 'Something went wrong. Please try again later.'
      },
      event
    );
  }

  redirect(
    '/',
    {
      type: 'success',
      message: 'Logged out successfully'
    },
    event
  );
};
