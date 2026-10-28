export const contactForm = `<form id="contact-form" class="contact-form" action="/api/contact.php" method="post">
 <h2>Send us a message</h2>
 <label for="contact-name">Your name</label><input id="contact-name" name="name" autocomplete="name" required maxlength="100">
 <label for="contact-email">Email address</label><input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254">
 <label for="contact-subject">Subject</label><input id="contact-subject" name="subject" required maxlength="150">
 <label for="contact-message">Message</label><textarea id="contact-message" name="message" rows="7" required minlength="10" maxlength="5000" aria-describedby="contact-note"></textarea>
 <div class="contact-trap" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
 <p id="contact-note">Your details and message will be sent to our support inbox. We’ll also email you a confirmation. Please do not include private documents, passwords or signatures. <a href="/privacy">Privacy details</a>.</p>
 <button class="primary" type="submit">Send message</button>
 <p id="contact-status" role="status" aria-live="polite" tabindex="-1"></p>
</form>`;

export function setupContactForm() {
 const form = document.querySelector('#contact-form');
 if (!form) return;
 form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  if (button.disabled) return;
  const status = form.querySelector('#contact-status');
  button.disabled = true;
  status.textContent = 'Sending your message…';
  try {
   const response = await fetch(form.action, {method:'POST', body:new URLSearchParams(new FormData(form)), headers:{Accept:'application/json'}});
   if (!response.headers.get('content-type')?.includes('application/json')) throw Error('The contact service is unavailable. Please email info@mydocpro.co.in.');
   const result = await response.json();
   if (!response.ok) throw Error(result.message || 'Could not send your message. Please try again later.');
   status.textContent = result.message;
   form.reset();
  } catch (error) {
   status.textContent = error instanceof TypeError ? 'Connection lost. Delivery could not be confirmed. Please check your inbox before retrying, or email info@mydocpro.co.in.' : error.message;
  } finally {
   button.disabled = false;
   status.focus();
  }
 });
}
