const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createToken, requireAuth } = require("../middleware/auth");

const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";

before(() => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
});

after(() => {
  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});

const invokeAuth = (authorization) => {
  const request = {
    method: "GET",
    path: "/api/students",
    get: () => authorization
  };
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  let nextCalled = false;

  requireAuth(request, response, () => {
    nextCalled = true;
  });

  return { request, response, nextCalled };
};

test("rejects requests without a bearer token", () => {
  const { response, nextCalled } = invokeAuth(undefined);
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("accepts a valid signed token", () => {
  const token = createToken({ email: "admin@example.com" });
  const { request, nextCalled } = invokeAuth(`Bearer ${token}`);

  assert.equal(nextCalled, true);
  assert.deepEqual(request.admin, { email: "admin@example.com" });
});

test("rejects a token with a modified signature", () => {
  const token = createToken({ email: "admin@example.com" });
  const [payload, signature] = token.split(".");
  const alteredSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  const alteredToken = `${payload}.${alteredSignature}`;
  const { response, nextCalled } = invokeAuth(`Bearer ${alteredToken}`);

  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});
