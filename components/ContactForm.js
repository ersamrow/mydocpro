import { useState, useRef } from "react";
import Link from "next/link";
export default function ContactForm() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const status = useRef(null);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    setMessage("Sending your message…");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      setMessage(result.message);
      if (response.ok) form.reset();
    } catch {
      setMessage(
        "Connection lost. Delivery could not be confirmed. Please check your inbox before retrying, or email info@mydocpro.co.in.",
      );
    } finally {
      setBusy(false);
      status.current?.focus();
    }
  }
  return (
    <form
      id="contact-form"
      className="contact-form"
      action="/api/contact"
      method="post"
      onSubmit={submit}
    >
      <h2>Send us a message</h2>
      {[
        ["name", "Your name", "text", 100],
        ["email", "Email address", "email", 254],
        ["subject", "Subject", "text", 150],
      ].map(([name, label, type, max]) => (
        <label key={name} htmlFor={"contact-" + name}>
          {label}
          <input
            id={"contact-" + name}
            name={name}
            type={type}
            autoComplete={name === "subject" ? "off" : name}
            required
            maxLength={max}
          />
        </label>
      ))}
      <label htmlFor="contact-message">
        Message
        <textarea
          id="contact-message"
          name="message"
          rows="7"
          required
          minLength={10}
          maxLength={5000}
          aria-describedby="contact-note"
        />
      </label>
      <div className="contact-trap" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p id="contact-note">
        Your details and message will be sent to our support inbox. We’ll also
        email you a confirmation. Please do not include private documents,
        passwords or signatures. <Link href="/privacy">Privacy details</Link>.
      </p>
      <button className="primary" disabled={busy} type="submit">
        {busy ? "Sending…" : "Send message"}
      </button>
      <p
        ref={status}
        id="contact-status"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        {message}
      </p>
    </form>
  );
}
