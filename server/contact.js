import nodemailer from "nodemailer";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const email = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export function smtpOptions(env = process.env) {
  for (const key of [
    "SMTP_HOST",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "CONTACT_FROM_EMAIL",
    "CONTACT_ADMIN_EMAIL",
  ])
    if (!env[key]?.trim()) throw Error("Missing SMTP configuration");
  const encryption = (env.SMTP_ENCRYPTION || "tls").toLowerCase(),
    port = Number(env.SMTP_PORT || (encryption === "ssl" ? 465 : 587));
  if (
    !/^[a-zA-Z0-9.-]+$/.test(env.SMTP_HOST) ||
    !["tls", "ssl"].includes(encryption) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !email(env.CONTACT_FROM_EMAIL) ||
    !email(env.CONTACT_ADMIN_EMAIL)
  )
    throw Error("Invalid SMTP configuration");
  return {
    host: env.SMTP_HOST,
    port,
    secure: encryption === "ssl",
    requireTLS: encryption === "tls",
    auth: { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
  };
}
export function validateContact(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Error("Invalid form data.");
  const input = {};
  for (const key of ["name", "email", "subject", "message", "website"]) {
    if (body[key] !== undefined && typeof body[key] !== "string")
      throw Error("Invalid form data.");
    input[key] = (body[key] || "").trim();
  }
  if (input.website) throw Error("Please leave the website field empty.");
  for (const [key, max] of [
    ["name", 100],
    ["subject", 150],
    ["message", 5000],
  ])
    if (!input[key] || [...input[key]].length > max)
      throw Error("Please check your name, subject and message.");
  if (input.message.length < 10)
    throw Error("Please enter a message of at least 10 characters.");
  if (!email(input.email)) throw Error("Please enter a valid email address.");
  if (/[\r\n]/.test(input.name + input.subject))
    throw Error("Name and subject must be on one line.");
  return input;
}
// Atomic lock serializes workers on one Node host. No submitted content is stored.
export async function consumeLimit(
  ip,
  address,
  {
    directory = process.env.CONTACT_RATE_DIR ||
      join(tmpdir(), "mydocpro-contact"),
    now = Date.now(),
  } = {},
) {
  await mkdir(directory, { recursive: true });
  const lock = join(directory, "lock"),
    file = join(directory, "limits.json");
  let acquired = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await mkdir(lock);
      acquired = true;
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        if (now - (await stat(lock)).mtimeMs > 60000)
          await rm(lock, { recursive: true, force: true });
      } catch {}
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  if (!acquired) throw Error("Rate store busy");
  try {
    let store = {};
    try {
      store = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    for (const [key, times] of Object.entries(store)) {
      store[key] = times.filter((time) => time > now - 3600000);
      if (!store[key].length) delete store[key];
    }
    const keys = [
      createHash("sha256")
        .update("ip:" + ip)
        .digest("hex"),
      createHash("sha256")
        .update("email:" + address.toLowerCase())
        .digest("hex"),
      "global",
    ];
    if (
      keys.some(
        (key) => (store[key] || []).length >= (key === "global" ? 100 : 5),
      )
    )
      return false;
    for (const key of keys) (store[key] ??= []).push(now);
    const temp = join(directory, randomUUID() + ".tmp");
    try {
      await writeFile(temp, JSON.stringify(store), { mode: 0o600 });
      await rename(temp, file);
    } finally {
      await rm(temp, { force: true });
    }
    return true;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function createContactHandler({
  env = process.env,
  transport = (options) => nodemailer.createTransport(options),
  limit = consumeLimit,
} = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const respond = (code, message) => {
      res.status(code);
      if (req.headers.accept?.includes("application/json"))
        return res.json({ message });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(
        '<!doctype html><html lang="en"><meta charset="utf-8"><title>Contact MyDocPro</title><main><h1>Contact MyDocPro</h1><p>' +
          escape(message) +
          '</p><a href="/contact">Back to contact</a></main></html>',
      );
    };
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return respond(405, "Please submit the contact form.");
    }
    if (Number(req.headers["content-length"]) > 32768)
      return respond(413, "Your message is too large.");
    if (
      !/^(application\/json|application\/x-www-form-urlencoded)(;|$)/i.test(
        req.headers["content-type"] || "",
      )
    )
      return respond(
        415,
        "Attachments are not supported. Submit the contact form.",
      );
    let input;
    try {
      input = validateContact(req.body);
    } catch (e) {
      return respond(400, e.message);
    }
    let mailer;
    try {
      mailer = transport(smtpOptions(env));
    } catch {
      return respond(503, "Contact email is not configured. Please try later.");
    }
    try {
      let allowed;
      try {
        allowed = await limit(
          req.socket?.remoteAddress || "unknown",
          input.email,
        );
      } catch {
        return respond(
          503,
          "Contact service is temporarily unavailable. Please try later.",
        );
      }
      if (!allowed) {
        res.setHeader("Retry-After", "3600");
        return respond(429, "Too many messages. Please try again in an hour.");
      }
      const from = { name: "MyDocPro", address: env.CONTACT_FROM_EMAIL };
      async function send(message) {
        const result = await mailer.sendMail(message);
        if (!result.accepted?.length) throw Error("Message rejected");
      }
      try {
        await send({
          from,
          to: env.CONTACT_ADMIN_EMAIL,
          replyTo: input.email,
          subject: "MyDocPro contact message",
          text: `New contact message\n\nName: ${input.name}\nEmail: ${input.email}\nSubject: ${input.subject}\n\n${input.message}\n`,
        });
      } catch {
        return respond(
          503,
          "Your message could not be sent. Please email info@mydocpro.co.in directly.",
        );
      }
      try {
        await send({
          from,
          to: input.email,
          replyTo: env.CONTACT_ADMIN_EMAIL,
          subject: "We received your message - MyDocPro",
          text: "Thank you for contacting MyDocPro.\n\nYour message has been submitted to our support team. We will reply to this email address if a response is needed. No response time is guaranteed.\n\nIf you did not contact us, you can ignore this confirmation.\n\nMyDocPro\nhttps://mydocpro.co.in\n",
        });
      } catch {
        return respond(
          200,
          "Your message has been sent to support, but we could not send the confirmation email. You do not need to submit again.",
        );
      }
      return respond(
        200,
        "Your message has been sent. A confirmation email is on its way; please check your spam folder too.",
      );
    } finally {
      mailer.close?.();
    }
  };
}
