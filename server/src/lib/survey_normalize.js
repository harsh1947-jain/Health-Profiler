
import { z } from "zod";

/** Required fields */
export const REQUIRED_FIELDS = ["age", "smoker", "exercise", "diet"];

const ExerciseEnum = ["never","rarely","sometimes","often","daily"];
const DietCanon = [
  "high sugar","high fat","high salt","processed","balanced","vegetarian","low carb","low fat","high protein"
];

// Helpers
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["yes","y","true","1"].includes(s)) return true;
  if (["no","n","false","0"].includes(s)) return false;
  return undefined;
};

const normExercise = (v) => {
  const s = String(v || "").trim().toLowerCase();
  const map = {
    never: "never", none: "never", "no exercise": "never",
    rarely: "rarely", seldom: "rarely",
    sometimes: "sometimes", occasional: "sometimes",
    often: "often", regular: "often", "3-5x/week":"often",
    daily: "daily", everyday: "daily"
  };
  return map[s] || (ExerciseEnum.includes(s) ? s : undefined);
};

const normDiet = (v) => {
  const s = String(v || "").trim().toLowerCase();
  // allow phrases like "high sugar", "high-sugar", "lots of sugar"
  if (/(high[\s-]?sugar|sugary|lots of sugar)/i.test(s)) return "high sugar";
  if (/(high[\s-]?fat|fatty)/i.test(s)) return "high fat";
  if (/(high[\s-]?salt|salty)/i.test(s)) return "high salt";
  if (/(processed|packaged|junk)/i.test(s)) return "processed";
  if (/balanced/.test(s)) return "balanced";
  if (/vegetarian|veg/.test(s)) return "vegetarian";
  if (/(low[\s-]?carb)/.test(s)) return "low carb";
  if (/(low[\s-]?fat)/.test(s)) return "low fat";
  if (/(high[\s-]?protein)/.test(s)) return "high protein";
  return DietCanon.includes(s) ? s : undefined;
};

const tryNumber = (v) => {
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^\d.]/g,""));
  return Number.isFinite(n) ? n : undefined;
};

/** Parse from JSON body directly when possible */
export function parseJsonAnswers(obj) {
  const schema = z.object({
    age: z.number().int().positive().optional(),
    smoker: z.boolean().optional(),
    exercise: z.string().optional(),
    diet: z.string().optional()
  });
  const safe = schema.safeParse(obj);
  if (!safe.success) return { };
  const a = safe.data;
  const answers = {};
  if (a.age !== undefined) answers.age = tryNumber(a.age);
  if (a.smoker !== undefined) answers.smoker = toBool(a.smoker);
  if (a.exercise !== undefined) answers.exercise = normExercise(a.exercise);
  if (a.diet !== undefined) answers.diet = normDiet(a.diet);
  return answers;
}

/** Parse from free text lines like:
 *  Age: 42 | Smoker: yes | Exercise: rarely | Diet: high sugar
 */
export function parseKeyValueText(text) {
  const pairs = {};
  const lines = String(text)
    .split(/[\r\n]+/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z ]+)\s*[:\-]\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const raw = m[2].trim();

    if (/^age$/.test(key)) pairs.age = tryNumber(raw);
    else if (/^smoker$/.test(key)) pairs.smoker = toBool(raw);
    else if (/^exercise$/.test(key)) pairs.exercise = normExercise(raw);
    else if (/^diet$/.test(key)) pairs.diet = normDiet(raw);
  }
  return pairs;
}

/** Compute missing fields list */
export function findMissing(answers) {
  return REQUIRED_FIELDS.filter(k => answers[k] === undefined);
}

/** Confidence: proportion of fields filled, with a small boost if format was JSON */
export function computeConfidence(answers, wasJson=false, ocrConfidence=0.9) {
  const filled = REQUIRED_FIELDS.reduce((n,k)=> n + (answers[k] !== undefined ? 1 : 0), 0);
  const frac = filled / REQUIRED_FIELDS.length; // 0..1
  const parseBoost = wasJson ? 0.1 : 0;
  // Blend with OCR confidence when provided
  return Math.max(0, Math.min(1, 0.7*frac + parseBoost*frac + 0.3*ocrConfidence));
}
