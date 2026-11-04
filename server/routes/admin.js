const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const Admin = require("../models/Admin");
const { createToken } = require("../middleware/auth");


/* =========================
   ADMIN SIGNUP
========================= */

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Enter a username, valid email, and password between 12 and 72 characters"
      });
    }

    if (await Admin.exists({})) {
      return res.status(403).json({
        message: "Admin registration is closed. Sign in with an existing admin account."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: { username: newAdmin.username, email: newAdmin.email },
      token: createToken(newAdmin)
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Admin registration failed" });
  }
});


/* =========================
   ADMIN SIGNIN
========================= */

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      message: "Signin successful",
      admin: { username: admin.username, email: admin.email },
      token: createToken(admin)
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ message: "Signin failed" });
  }
});

module.exports = router;