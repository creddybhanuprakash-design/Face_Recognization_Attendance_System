const crypto = require("node:crypto");

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters");
  }
  return secret;
};

const createToken = (admin) => {
  const payload = Buffer.from(JSON.stringify({
    email: admin.email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

  return `${payload}.${signature}`;
};

const requireAuth = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  if (
    req.method === "POST" &&
    (req.path === "/admin/signup" || req.path === "/admin/signin")
  ) {
    return next();
  }

  const authorization = req.get("authorization") || "";
  const [payload, signature, extra] = authorization.replace(/^Bearer\s+/i, "").split(".");

  if (!payload || !signature || extra) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const expectedSignature = crypto.createHmac("sha256", getSecret()).update(payload).digest();
    const providedSignature = Buffer.from(signature, "base64url");

    if (
      expectedSignature.length !== providedSignature.length ||
      !crypto.timingSafeEqual(expectedSignature, providedSignature)
    ) {
      return res.status(401).json({ message: "Invalid or expired authentication token" });
    }

    const tokenData = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof tokenData.email !== "string" ||
      typeof tokenData.exp !== "number" ||
      tokenData.exp <= Math.floor(Date.now() / 1000)
    ) {
      return res.status(401).json({ message: "Invalid or expired authentication token" });
    }

    req.admin = { email: tokenData.email };
    return next();
  } catch (error) {
    if (error.message === "JWT_SECRET must be set to at least 32 characters") {
      return next(error);
    }
    return res.status(401).json({ message: "Invalid or expired authentication token" });
  }
};

module.exports = { createToken, getSecret, requireAuth };
