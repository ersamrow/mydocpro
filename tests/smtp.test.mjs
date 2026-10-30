import test from "node:test";
import assert from "node:assert/strict";
import { smtpOptions } from "../server/contact.js";
const env = {
  SMTP_HOST: "smtp.example.com",
  SMTP_USERNAME: "user",
  SMTP_PASSWORD: "test",
  CONTACT_FROM_EMAIL: "sender@example.com",
  CONTACT_ADMIN_EMAIL: "admin@example.com",
};
test("SMTP uses verified TLS and disables logging", () => {
  const settings = smtpOptions(env);
  assert.equal(settings.requireTLS, true);
  assert.equal(settings.port, 587);
  assert.equal(settings.tls.rejectUnauthorized, true);
  assert.equal(settings.debug, false);
  const ssl = smtpOptions({ ...env, SMTP_ENCRYPTION: "ssl" });
  assert.equal(ssl.secure, true);
  assert.equal(ssl.port, 465);
});
test("invalid SMTP settings fail closed", () => {
  for (const patch of [
    { SMTP_PASSWORD: "" },
    { SMTP_HOST: "bad;host" },
    { SMTP_PORT: "0" },
    { SMTP_PORT: "70000" },
    { SMTP_PORT: "abc" },
    { SMTP_ENCRYPTION: "none" },
    { CONTACT_ADMIN_EMAIL: "bad" },
  ])
    assert.throws(() => smtpOptions({ ...env, ...patch }));
});
