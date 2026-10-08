import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and password (min 8) are required" });
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const inserted = await query(
    `INSERT INTO users (email, password_hash, role, provider)
     VALUES ($1, $2, 'user', 'local')
     RETURNING id, email, role`,
    [email.toLowerCase(), passwordHash]
  );

  const user = inserted.rows[0];
  const token = createToken(user);
  return res.status(201).json({ token, user });
});

router.post("/bootstrap-admin", async (req, res) => {
  const { email, password, token } = req.body || {};

  if (!config.adminBootstrapToken) {
    return res.status(400).json({ error: "ADMIN_BOOTSTRAP_TOKEN is not configured" });
  }

  if (token !== config.adminBootstrapToken) {
    return res.status(403).json({ error: "Invalid bootstrap token" });
  }

  const adminCount = await query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
  if (adminCount.rows[0].count > 0) {
    return res.status(409).json({ error: "Admin already exists" });
  }

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and password (min 8) are required" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const inserted = await query(
    `INSERT INTO users (email, password_hash, role, provider)
     VALUES ($1, $2, 'admin', 'local')
     RETURNING id, email, role`,
    [email.toLowerCase(), passwordHash]
  );

  return res.status(201).json({ user: inserted.rows[0] });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const result = await query(
    "SELECT id, email, role, password_hash FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await query("SELECT id, email, role, provider, created_at FROM users WHERE id = $1", [
    req.user.sub
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user: result.rows[0] });
});

export default router;
