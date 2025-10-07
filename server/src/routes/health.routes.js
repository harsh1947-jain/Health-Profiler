


import { Router } from "express";
import multer from "multer";
import {
  parseSurvey,
  extractFactors,
  classifyRisk,
  generateRecommendations
} from "../controllers/survey.controller.js";

const router = Router();
const upload = multer({
  dest: "server/uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }
});

// unified routes
router.post("/:step", upload.single("form"), async (req, res) => {
  const { step } = req.params;
  try {
    if (step === "parse") return parseSurvey(req, res);
    if (step === "factors") return extractFactors(req, res);
    if (step === "risk") return classifyRisk(req, res);
    if (step === "recommendations") return generateRecommendations(req, res);

    return res.status(400).json({ error: "Invalid step. Use parse | factors | risk | recommendations." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal error" });
  }
});

export default router;
