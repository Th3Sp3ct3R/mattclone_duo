export function renderWelcomeEmail({ email }) {
  const subject = `Welcome`;
  const text = `Welcome, ${email}.\n\nYou have successfully signed in.`;
  const html = `<p><strong>Welcome</strong>, ${email}.</p><p>You have successfully signed in.</p>`;
  return { subject, text, html };
}
