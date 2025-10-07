


import Tesseract from "tesseract.js";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

import {
  parseJsonAnswers,
  parseKeyValueText,
  findMissing,
  computeConfidence,
  REQUIRED_FIELDS
} from "../lib/survey_normalize.js";
import { answersToFactors, scoreRisk, buildRecommendations } from "../lib/risk_logic.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* --------------------- COMMON HELPERS --------------------- */
async function getAnswers(req) {
  let answers = {};
  let wasJson = false;

  // --- OCR if image is uploaded ---
  if (req.file) {
    const result = await Tesseract.recognize(req.file.path, "eng", {});
    const text = result.data.text || "";
    answers = parseKeyValueText(text);
    await fs.unlink(req.file.path).catch(() => {});
    return { answers, wasJson: false };
  }

  // --- JSON body ---
  if (
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0 &&
    (req.body.age !== undefined ||
      req.body.smoker !== undefined ||
      req.body.exercise !== undefined ||
      req.body.diet !== undefined)
  ) {
    answers = parseJsonAnswers(req.body);
    wasJson = true;
  } else if (typeof req.body.text === "string") {
    answers = parseKeyValueText(req.body.text);
  }

  return { answers, wasJson };
}

function sendPretty(res, data) {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data, null, 2));
}

/* ---------- Step 1: Parse ---------- */
export async function parseSurvey(req, res) {
  try {
    const { answers, wasJson } = await getAnswers(req);
    if (!Object.keys(answers).length) {
      return sendPretty(res, { error: "Provide JSON, text or image" });
    }

    const missing_fields = findMissing(answers);
    const confidence = Number(computeConfidence(answers, wasJson, 0.95));

    if (missing_fields.length > REQUIRED_FIELDS.length / 2) {
      return sendPretty(res, { status: "incomplete_profile", reason: ">50% fields missing" });
    }

    return sendPretty(res, { answers, missing_fields, confidence });
  } catch (err) {
    return sendPretty(res, { error: err.message || "Bad request" });
  }
}

/* ---------- Step 2: Factor Extraction ---------- */
export async function extractFactors(req, res) {
  try {
    const { answers } = await getAnswers(req);
    if (!Object.keys(answers).length) {
      return sendPretty(res, { error: "No valid answers found" });
    }

    const { factors } = answersToFactors(answers);
    const present = REQUIRED_FIELDS.filter((f) => answers[f] !== undefined).length;
    const confidence = present / REQUIRED_FIELDS.length;

    return sendPretty(res, { factors, confidence });
  } catch (err) {
    return sendPretty(res, { error: err.message || "Bad request" });
  }
}

/* ---------- Step 3: Risk Classification ---------- */
export async function classifyRisk(req, res) {
  try {
    const { answers } = await getAnswers(req);
    if (!Object.keys(answers).length) {
      return sendPretty(res, { error: "No valid answers found" });
    }

    const { factors } = answersToFactors(answers);
    const out = scoreRisk(answers, factors);

    return sendPretty(res, {
      risk_level: out.risk_level,
      score: out.score,
      rationale: out.rationale
    });
  } catch (err) {
    return sendPretty(res, { error: err.message || "Bad request" });
  }
}


/* ---------- Step 4: Recommendations (AI using Gemini) ---------- */
export async function generateRecommendations(req, res) {
  try {
    const { answers } = await getAnswers(req);
    if (!Object.keys(answers).length) {
      return sendPretty(res, { error: "No valid answers found" });
    }

    const { factors } = answersToFactors(answers);
    const risk = scoreRisk(answers, factors);

    const prompt = `
You are a helpful and safe health lifestyle assistant.

Risk Level: ${risk.risk_level} (score ${risk.score}/100)
Factors: ${factors.join(", ")}
Age: ${answers.age || "unknown"}
Diet: ${answers.diet || "unknown"}
Exercise: ${answers.exercise || "unknown"}

Write 3–5 very short, actionable, safe lifestyle recommendations to lower risk.
Each recommendation should be a short phrase of at most 5 words.
Return only a JSON array of short strings — no explanations, no notes, no disclaimers.

Example:
["Quit smoking","Reduce sugar","Walk 30 mins daily"]
`;

    let recommendations = [];
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const aiText = result.response.text();

      try {
        recommendations = JSON.parse(aiText);
      } catch {
        recommendations = [aiText];
      }
    } catch (e) {
      recommendations = buildRecommendations(risk, factors, answers);
    }

    // 🔹 Clean up — remove disclaimers & long extra text
    recommendations = recommendations
      .filter(r => !/diagnosis|clinician|doctor|medical/i.test(r)) // remove disclaimers
      .map(r =>
        r
          .replace(/\(.*?\)/g, "") // remove parentheses
          .replace(/\..*/, "")    // cut after first period
          .trim()
      )
      .filter(Boolean);

    return sendPretty(res, {
      risk_level: risk.risk_level,
      factors,
      recommendations,
      status: "ok"
    });
  } catch (err) {
    return sendPretty(res, { error: err.message || "Bad request" });
  }
}

