import { redirect } from 'sveltekit-flash-message/server';

export const load = async (event) => {
  // redirect to `/` if logged in
  if (!event.locals.user) {
    redirect('/login', { type: 'error', message: 'Please login to view this page' }, event);
  }
};
