// Env Variables
import { EMAIL_SENDER, EMAIL_HOST, EMAIL_PASSWORD } from '$env/static/private';

// Utils
import { createTransport } from 'nodemailer';
import { fail } from '@sveltejs/kit';
import { render } from 'svelte-email';

// Templates
import WelcomeTemplate from '$lib/utils/mail/templates/Welcome.svelte';
import ResetPasswordTemplate from '$lib/utils/mail/templates/ResetPassword.svelte';
import AccountInviteTemplate from '$lib/utils/mail/templates/AccountInvite.svelte';

export const sendEmail = async (to: string, subject: string, templateName: string, templateData?: any) => {
  if (to && subject && templateName) {
    const transporter = createTransport({
      host: EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_SENDER,
        pass: EMAIL_PASSWORD,
      },
    });

    let html;

    switch (templateName) {
      case 'Welcome':
        html = render({
          template: WelcomeTemplate
        });
        break;
      case 'ResetPassword':
        html = render({
          template: ResetPasswordTemplate,
          props: {
            url: templateData?.url
          }
        });
        break;
      case 'AccountInvite':
        html = render({
          template: AccountInviteTemplate,
          props: {
            url: templateData?.url
          }
        });
        break;
      default:
        return fail(402);
    }

    const options = {
      from: EMAIL_SENDER,
      to,
      subject,
      html
    };

    await transporter.sendMail(options);
    console.log('Email sent successfully');
  }
};
