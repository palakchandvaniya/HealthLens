import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import reportRoutes from "./routes/reports.js";
import { fetchMedicalExplanation } from "./medicalLookup.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// MIDDLEWARE
// ======================================================

// Allow the local Vite development server on any localhost/127.0.0.1 port.
// Vite may move from 5173 to another port (for example 5174) when 5173 is busy.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const isLocalDevelopmentOrigin =
        /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

      if (isLocalDevelopmentOrigin) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed."));
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "HealthLens API",
    time: new Date().toISOString(),
  });
});

// ======================================================
// AUTHENTICATION ROUTES
// ======================================================

app.use("/api/auth", authRoutes);

// ======================================================
// REPORT ROUTES
// ======================================================

app.use("/api/reports", reportRoutes);

// ======================================================
// DYNAMIC MEDICAL TERM LOOKUP
// MedlinePlus / U.S. National Library of Medicine
// ======================================================

app.get("/api/medical-term", async (req, res) => {
  try {
    const term = String(req.query.term || "").trim();
    const status = String(req.query.status || "within").trim();

    if (!term) {
      return res.status(400).json({
        error: "Medical term is required.",
      });
    }

    console.log(`Medical lookup: ${term}`);

    const explanation = await fetchMedicalExplanation(term, status);

    if (!explanation) {
      return res.json({
        found: false,
        explanation: null,
      });
    }

    return res.json({
      found: true,
      explanation,
    });
  } catch (error) {
    console.error("Medical term lookup error:", error);

    return res.status(500).json({
      error: "Unable to fetch medical information.",
    });
  }
});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || "Something went wrong.",
  });
});

// ======================================================
// START SERVER
// ======================================================

async function start() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healthlens",
    );

    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`HealthLens API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    console.error("Start MongoDB and run the server again.");

    process.exit(1);
  }
}

start();
