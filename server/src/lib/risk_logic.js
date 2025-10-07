
/** Step 2 — Factor extraction */
export function answersToFactors(answers) {
  const factors = [];
  const rationale = [];

  if (answers.smoker === true) {
    factors.push("smoking");
    rationale.push("smoking");
  }

  if (answers.exercise === "never" || answers.exercise === "rarely") {
    factors.push("low exercise");
    rationale.push("low activity");
  }

  if (answers.diet) {
    if (["high sugar","processed","high fat","high salt"].includes(answers.diet)) {
      factors.push("poor diet");
      if (answers.diet === "high sugar") rationale.push("high sugar diet");
      if (answers.diet === "high fat") rationale.push("high fat diet");
      if (answers.diet === "high salt") rationale.push("high salt diet");
      if (answers.diet === "processed") rationale.push("processed foods");
    }
  }

  if (typeof answers.age === "number" && answers.age >= 45) {
    factors.push("age ≥45");
    rationale.push("age 45+");
  }

  // Deduplicate while preserving order
  const uniq = (arr) => [...new Set(arr)];
  return { factors: uniq(factors), rationale: uniq(rationale) };
}

/** Step 3 — Simple scoring (non-diagnostic) */
export function scoreRisk(answers, factors) {
  let score = 0;
  const why = [];

  if (answers.smoker === true) { score += 40; why.push("smoking"); }
  if (answers.exercise === "never") { score += 30; why.push("no exercise"); }
  else if (answers.exercise === "rarely") { score += 20; why.push("low activity"); }

  if (answers.diet === "high sugar") { score += 20; why.push("high sugar diet"); }
  if (answers.diet === "high fat") { score += 15; why.push("high fat diet"); }
  if (answers.diet === "high salt") { score += 10; why.push("high salt diet"); }
  if (answers.diet === "processed") { score += 10; why.push("processed foods"); }

  if (typeof answers.age === "number" && answers.age >= 45) { score += 10; why.push("age 45+"); }

  // Clamp and classify
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const risk_level = score >= 60 ? "high" : score >= 30 ? "moderate" : "low";
  // Prefer provided factors to build rationale, but fall back to why
  const rationale = (factors?.length ? factors : why);
  return { risk_level, score, rationale };
}

/** Step 4 — Actionable, non-diagnostic recommendations */
export function buildRecommendations({ risk_level }, factors, answers) {
  const recs = new Set();

  if (factors.includes("smoking")) {
    recs.add("Quit smoking (seek a cessation program)");
  }
  if (factors.includes("low exercise") || ["never","rarely"].includes(answers.exercise)) {
    recs.add("Start walking 30 minutes daily");
    recs.add("Aim for 150 minutes of moderate activity per week");
  }
  if (answers.diet === "high sugar" || factors.includes("poor diet")) {
    recs.add("Reduce added sugar and sugary beverages");
  }
  if (answers.diet === "high fat") recs.add("Prefer unsaturated fats; limit fried foods");
  if (answers.diet === "high salt") recs.add("Cut down on salt and processed snacks");
  if (answers.diet === "processed") recs.add("Cook more whole foods at home");

  if (answers.age >= 45) recs.add("Schedule regular health checkups");

  // General guardrails
  recs.add("This is not a diagnosis. Consult a clinician for personalized advice.");

  return Array.from(recs);
}
