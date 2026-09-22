import express from "express";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

const router = express.Router();

function tokenFor(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash });

    res.status(201).json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    res.json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (e) { next(e); }
});

router.post("/demo", async (req, res, next) => {
  try {
    const email = "demo@healthlens.local";
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: "Demo User",
        email,
        passwordHash: await bcrypt.hash("Demo@12345", 12)
      });
    }
    res.json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (e) { next(e); }
});


router.delete("/account", requireAuth, async (req, res, next) => {
  try {
    const reports = await Report.find({ userId: req.userId }).select("storedFileName").lean();

    await Report.deleteMany({ userId: req.userId });
    const deletedUser = await User.findByIdAndDelete(req.userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    await Promise.all(
      reports
        .map((report) => report.storedFileName)
        .filter(Boolean)
        .map(async (fileName) => {
          try {
            await fs.unlink(path.join(uploadsDir, path.basename(fileName)));
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        }),
    );

    res.json({ message: "Account deleted." });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("_id name email createdAt");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
