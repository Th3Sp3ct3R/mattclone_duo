import { consumeJson } from '@julio/api/queue/rabbitmq';
import { sendEmail } from '@julio/api/email/mailer';

export async function startEmailWorker() {
  await consumeJson('emails', async (job) => {
    if (job?.type === 'welcome') {
      const tpl = job.template || {};
      await sendEmail({
        to: job.to,
        subject: tpl.subject || 'Welcome',
        text: tpl.text || '',
        html: tpl.html || ''
      });
    }
  });
}





