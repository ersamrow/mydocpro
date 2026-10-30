import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createContactHandler, consumeLimit } from "../server/contact.js";
const env = {
  SMTP_HOST: "smtp.example.com",
  SMTP_USERNAME: "user",
  SMTP_PASSWORD: "test-only",
  CONTACT_FROM_EMAIL: "sender@example.com",
  CONTACT_ADMIN_EMAIL: "admin@example.com",
};
const input = {
  name: "Test User",
  email: "user@example.com",
  subject: "Testing",
  message: "A message long enough.",
};
async function request(
  body = input,
  {
    fail = 0,
    method = "POST",
    limit = async () => true,
    accept = "application/json",
    config = env,
    type = "application/json",
  } = {},
) {
  const sent = [];
  let code;
  let result;
  const headers = {};
  const handler = createContactHandler({
    env: config,
    limit,
    transport: () => ({
      sendMail: async (mail) => {
        sent.push(mail);
        if (sent.length === fail) throw Error("Test failure");
        return { accepted: [mail.to] };
      },
      close() {},
    }),
  });
  const res = {
    setHeader(k, v) {
      headers[k] = v;
    },
    status(s) {
      code = s;
      return this;
    },
    json(v) {
      result = v;
      return this;
    },
    send(v) {
      result = v;
      return this;
    },
  };
  await handler(
    {
      method,
      headers: { accept, "content-type": type },
      body,
      socket: { remoteAddress: "127.0.0.1" },
    },
    res,
  );
  return { code, result, headers, sent };
}
test("contact rejects malformed input, header injection and attachments without sending", async () => {
  for (const body of [
    { ...input, email: "bad" },
    { ...input, website: "spam" },
    { ...input, name: "a\nb" },
    { ...input, subject: ["x"] },
    { ...input, message: "short" },
    null,
  ]) {
    const r = await request(body);
    assert.equal(r.code, 400);
    assert.equal(r.sent.length, 0);
  }
  assert.equal(
    (await request(input, { type: "multipart/form-data" })).code,
    415,
  );
  assert.equal((await request(input, { method: "GET" })).code, 405);
});
test("contact sends separate fixed acknowledgement and admin message", async () => {
  const r = await request();
  assert.equal(r.code, 200);
  assert.equal(r.sent.length, 2);
  assert.equal(r.sent[0].replyTo, input.email);
  assert.equal(r.sent[1].replyTo, env.CONTACT_ADMIN_EMAIL);
  assert.ok(!r.sent[1].text.includes(input.message));
});
test("contact distinguishes admin delivery failure from acknowledgement failure", async () => {
  assert.equal((await request(input, { fail: 1 })).code, 503);
  const partial = await request(input, { fail: 2 });
  assert.equal(partial.code, 200);
  assert.match(partial.result.message, /do not need to submit again/);
});
test("missing SMTP and unavailable or exhausted rate store fail safely", async () => {
  assert.equal((await request(input, { config: {} })).code, 503);
  assert.equal(
    (
      await request(input, {
        limit: async () => {
          throw Error();
        },
      })
    ).code,
    503,
  );
  const r = await request(input, { limit: async () => false });
  assert.equal(r.code, 429);
  assert.equal(r.headers["Retry-After"], "3600");
  assert.equal(r.sent.length, 0);
});
test("non-JavaScript submission returns a readable response", async () => {
  const r = await request(input, {
    accept: "text/html",
    type: "application/x-www-form-urlencoded",
  });
  assert.equal(r.code, 200);
  assert.match(r.result, /Back to contact/);
});
test("rate limits are atomic across concurrent requests, hashed and expire", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mydocpro-react-test-"));
  try {
    const now = Date.now();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        consumeLimit("127.0.0.1", "user@example.com", { directory, now }),
      ),
    );
    assert.equal(results.filter(Boolean).length, 5);
    const data = await readFile(join(directory, "limits.json"), "utf8");
    assert.ok(!data.includes("user@example.com"));
    assert.ok(!data.includes("127.0.0.1"));
    assert.equal(
      await consumeLimit("127.0.0.1", "user@example.com", {
        directory,
        now: now + 3600001,
      }),
      true,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
