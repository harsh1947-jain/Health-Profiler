


import express from "express";
import healthRouter from "./routes/health.routes.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// homepage route
app.get("/", (_, res) => {
  res.send("<h1>🚀 AI-Powered Health Risk Profiler</h1><p>Server is running on port 4000</p>");
});

// health check
app.get("/health", (_, res) => res.json({ ok: true }));

// mount API routes
app.use("/api/health", healthRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ AI-Powered Health Risk Profiler running at http://localhost:${PORT}`);
});
