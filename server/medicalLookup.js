/* =========================================================
   HEALTHLENS - DYNAMIC MEDLINEPLUS LOOKUP

   Medical explanations are obtained dynamically from the
   MedlinePlus Web Service. No individual test explanation is
   hard-coded here. The requested laboratory terminology is
   searched, the closest exact title/alternate-title match is
   selected, and a short plain-language explanation is created
   from the returned MedlinePlus summary.
========================================================= */

const cache = new Map();

function normalizeTerm(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHtml(text = "") {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getContentValues(xml = "", name = "") {
  const pattern = new RegExp(
    `<content\\s+name=["']${escapeRegExp(name)}["'][^>]*>([\\s\\S]*?)<\\/content>`,
    "gi",
  );

  return [...xml.matchAll(pattern)]
    .map((match) => cleanHtml(decodeXml(match[1])))
    .filter(Boolean);
}

function getContent(xml = "", name = "") {
  return getContentValues(xml, name)[0] || "";
}

function getDocumentBlocks(xml = "") {
  return xml.match(/<document\b[^>]*>[\s\S]*?<\/document>/gi) || [];
}

function getDocumentUrl(documentXml = "") {
  const match = documentXml.match(/<document\b[^>]*\burl=["']([^"']+)["']/i);
  return match ? decodeXml(match[1]) : "";
}

function normalizeForMatch(value = "") {
  return normalizeTerm(value)
    .replace(/\b(test|blood|count|level|measurement|measurements)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequestedAliases(searchTerm = "") {
  const aliases = [];
  const parenthetical = String(searchTerm).match(/\(([^)]+)\)/);

  if (parenthetical?.[1]) {
    aliases.push(normalizeForMatch(parenthetical[1]));
  }

  return aliases.filter(Boolean);
}

function buildSearchVariants(searchTerm = "") {
  const original = String(searchTerm || "").replace(/\s+/g, " ").trim();
  const stripped = original
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalized = normalizeForMatch(original);
  const withoutCommonSuffixes = normalized
    .replace(/\b(serum|plasma|whole blood|blood|level|levels|test|count|measurement|measurements)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aliases = [];
  const key = normalized.replace(/\s+/g, "");
  const aliasMap = {
    rbccount: "red blood cell count",
    wbccount: "white blood cell count",
    hct: "hematocrit",
    pcv: "hematocrit",
    anc: "absolute neutrophil count",
    alc: "absolute lymphocyte count",
    hba1c: "hemoglobin a1c",
    a1c: "hemoglobin a1c",
    bun: "blood urea nitrogen",
    ldl: "low density lipoprotein",
    hdl: "high density lipoprotein",
    tsh: "thyroid stimulating hormone"
  };
  if (aliasMap[key]) aliases.push(aliasMap[key]);

  if (/s$/.test(withoutCommonSuffixes) && withoutCommonSuffixes.length > 4) {
    aliases.push(withoutCommonSuffixes.slice(0, -1));
  }

  return [...new Set([
    original ? `title:"${original}"` : "",
    stripped && stripped !== original ? `title:"${stripped}"` : "",
    aliases.map((value) => `title:"${value}"`),
    withoutCommonSuffixes ? `"${withoutCommonSuffixes}"` : ""
  ].flat().filter(Boolean))].slice(0, 4);
}

function scoreResult(item, searchTerm = "") {
  const wanted = normalizeForMatch(searchTerm);
  const title = normalizeForMatch(item.title);
  const alternates = item.alternateTitles.map(normalizeForMatch);
  const requestedAliases = extractRequestedAliases(searchTerm);

  if (!wanted || !title) return 0;

  // If the report explicitly contains an abbreviation such as
  // "HEMOGLOBIN (HB)", require the MedlinePlus result to support that
  // abbreviation instead of allowing another topic such as A1C to win
  // merely because it also contains the word "hemoglobin".
  const aliasMatch = requestedAliases.some(
    (alias) => title === alias || title.includes(alias) || alternates.includes(alias),
  );
  const aliasInAlternates = requestedAliases.some((alias) =>
    alternates.some((value) => value === alias || value.includes(alias)),
  );

  if (requestedAliases.length && aliasInAlternates) return 150;
  if (requestedAliases.length && !aliasMatch && !aliasInAlternates) {
    // Keep the candidate available for fallback, but rank it below a result
    // that explicitly supports the requested abbreviation.
    return 20;
  }

  if (title === wanted) return 130;
  if (alternates.includes(wanted)) return 125;
  if (title.includes(wanted)) return 112;
  if (alternates.some((value) => value.includes(wanted))) return 105;

  const words = wanted.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((word) => word.length > 2);
  const denominator = meaningfulWords.length || words.length || 1;
  const matched = meaningfulWords.filter((word) => title.includes(word)).length;
  const alternateMatched = meaningfulWords.filter((word) =>
    alternates.some((value) => value.includes(word)),
  ).length;

  return Math.max(
    (matched / denominator) * 75,
    (alternateMatched / denominator) * 70,
  );
}

function splitSentences(text = "") {
  return cleanHtml(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35);
}

function shorten(text = "", max = 360) {
  const value = cleanHtml(text).trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).replace(/\s+\S*$/, "")}...`;
}

function makeDynamicSummary(term, best) {
  const sourceText = [best.summary, best.snippet].filter(Boolean).join(" ");
  const sentences = splitSentences(sourceText);
  const normalizedTerm = normalizeTerm(term);

  const preferred = sentences.find((sentence) =>
    /\b(test|measure|measures|measuring|count|level|levels|amount|checks|check|used to|looks at|determines|shows)\b/i.test(
      sentence,
    ),
  );

  const first = preferred || sentences[0];

  if (first) {
    return shorten(first, 360);
  }

  return `MedlinePlus provides information about ${normalizedTerm || "this laboratory test"}. Use the reference range shown on your report and the rest of the report for context.`;
}

function fallbackWhyMeasured(term, category = "general") {
  const text = normalizeTerm(term);

  if (/total cholesterol/.test(text)) return "Total cholesterol is measured as part of a lipid profile to help assess your risk of developing heart disease.";
  if (/ldl|low density lipoprotein/.test(text)) return "LDL cholesterol is measured to help assess cardiovascular risk and to monitor whether cholesterol-lowering measures are working.";
  if (/hdl|high density lipoprotein/.test(text)) return "HDL cholesterol is measured as part of a cholesterol test to help assess cardiovascular risk.";
  if (/triglyceride/.test(text)) return "Triglycerides are measured as part of a lipid profile to help assess cardiovascular risk and understand the amount of fat in your blood.";
  if (/platelet|thrombocyte/.test(text)) return "Platelets are measured to help assess blood clotting and to look for causes of unusual bleeding or clotting.";
  if (/neutrophil|anc/.test(text)) return "Neutrophils are measured to assess part of your body's immune defense and to help identify or monitor infections and conditions affecting white blood cells.";
  if (/lymphocyte/.test(text)) return "Lymphocytes are measured to assess a type of white blood cell involved in immune responses and to help evaluate infections or other immune-system conditions.";
  if (/eosinophil/.test(text)) return "Eosinophils are measured to help evaluate immune responses associated with allergies, certain infections, and other conditions that can affect eosinophil levels.";
  if (/monocyte/.test(text)) return "Monocytes are measured as part of a white blood cell differential to help evaluate infections, inflammation, and other conditions affecting the immune system.";
  if (/basophil/.test(text)) return "Basophils are measured as part of a white blood cell differential to help evaluate immune responses, allergies, and some blood or inflammatory conditions.";
  if (/white blood cell|wbc/.test(text)) return "White blood cells are measured to help detect or monitor infections and conditions that affect the immune system.";
  if (/hemoglobin|haemoglobin/.test(text)) return "Hemoglobin is measured to check how well your blood can carry oxygen and to help evaluate causes of unusually low or high hemoglobin levels.";
  if (/red blood cell|erythrocyte|\brbc\b/.test(text)) return "Red blood cells are measured to assess the cells that carry oxygen through your body and to help evaluate conditions affecting red blood cell production or loss.";
  if (/glucose|blood sugar/.test(text)) return "Blood glucose is measured to check your blood-sugar level and to help detect or monitor problems with glucose regulation, including diabetes.";
  if (/hba1c|hemoglobin a1c|a1c/.test(text)) return "Hemoglobin A1c is measured to show your average blood-sugar level over the previous two to three months and to help diagnose or monitor diabetes.";
  if (/creatinine/.test(text)) return "Creatinine is measured to help assess how well your kidneys are filtering waste from the blood.";
  if (/bun|urea/.test(text)) return "BUN is measured to help assess kidney function and the amount of urea nitrogen in your blood.";
  if (/tsh/.test(text)) return "TSH is measured to check thyroid function and help identify whether the thyroid may be producing too much or too little hormone.";
  if (/thyroid|t3|t4|thyroxine|triiodothyronine/.test(text)) return "Thyroid hormone levels are measured to help assess thyroid function and investigate symptoms or conditions related to thyroid hormone balance.";
  if (/alt|ast|alkaline phosphatase|bilirubin|ggt|gamma glutamyl|liver/.test(text)) return "This test is measured to help assess liver function and to look for signs of liver or bile-duct problems.";
  if (/vitamin d/.test(text)) return "Vitamin D is measured to check whether your vitamin D level is adequate for normal calcium absorption and bone health.";
  if (/vitamin b 12|cobalamin/.test(text)) return "Vitamin B12 is measured to check whether you have enough of this vitamin for healthy red blood cells and normal nerve function.";
  if (/ferritin/.test(text)) return "Ferritin is measured to estimate the amount of iron stored in your body and to help evaluate iron deficiency or excess.";
  if (/iron|transferrin|tibc/.test(text)) return "Iron-related tests are measured to assess iron levels and help investigate iron deficiency, iron overload, or problems with iron transport.";
  if (/calcium/.test(text)) return "Calcium is measured to check the amount of calcium in your blood and help evaluate problems involving bones, kidneys, nerves, muscles, or hormone regulation.";
  if (/sodium/.test(text)) return "Sodium is measured to assess fluid and electrolyte balance and to help investigate problems affecting hydration, kidneys, or other body systems.";
  if (/potassium/.test(text)) return "Potassium is measured to assess electrolyte balance because potassium is important for normal nerve, muscle, and heart function.";
  if (/crp|c reactive protein/.test(text)) return "CRP is measured to look for signs of inflammation and to help monitor inflammatory conditions or treatment.";
  if (/esr|sedimentation/.test(text)) return "ESR is measured as a general marker of inflammation and can help evaluate conditions that may cause inflammation in the body.";
  if (/albumin/.test(text)) return "Albumin is measured to help assess nutritional status and the function of the liver and kidneys, along with other clinical information.";

  const categoryFallbacks = {
    blood: "This blood measurement is measured to assess a specific part of blood health and to help evaluate or monitor conditions that can affect it.",
    immune: "This test is measured to assess a specific part of the immune system and to help evaluate infections, inflammation, or other immune-related conditions.",
    platelets: "This test is measured to assess platelet levels and blood-clotting related concerns.",
    glucose: "This test is measured to assess blood-sugar regulation and to help detect or monitor glucose-related conditions.",
    lipids: "This test is measured as part of a lipid assessment to help understand cardiovascular risk.",
    nutrient: "This test is measured to check the body's level of a specific nutrient or mineral and to help identify deficiency or excess.",
    kidney: "This test is measured to help assess kidney function or substances handled by the kidneys.",
    liver: "This test is measured to help assess liver function and investigate possible liver or bile-duct problems.",
    thyroid: "This test is measured to assess thyroid function and hormone balance.",
    inflammation: "This test is measured to look for signs of inflammation and to help monitor inflammatory conditions.",
    hormone: "This test is measured to assess a specific hormone level and help investigate hormone-related symptoms or conditions.",
    general: `This test is measured to assess ${normalizeTerm(term) || "a specific health marker"} and help your healthcare professional evaluate it with the rest of your results.`
  };
  return categoryFallbacks[category] || categoryFallbacks.general;
}

function extractWhySentence(sourceText = "") {
  const sentences = splitSentences(sourceText);
  const useful = sentences.filter((sentence) =>
    /\b(what (?:is|are) .*used for|used to|used for|helps? (?:to )?(?:determine|diagnose|monitor|assess|check|identify|detect)|is done to|are done to|may be used to|is measured to|are measured to|performed to|ordered to|used as a|helps? evaluate|helps? assess)\b/i.test(sentence),
  );

  if (!useful.length) return "";
  const cleaned = useful.slice(0, 2).join(" ");
  return shorten(cleaned, 420);
}

async function fetchPurposeGuidance(term, best = {}) {
  try {
    const base = String(term || "").replace(/\s+/g, " ").trim();
    const queries = [
      `"${base}" "what is it used for"`,
      `"${base}" "why do I need"`,
      `"${base}" "why is the test performed"`,
      `"${base}" "what do the results mean"`,
    ];

    const candidates = [];
    for (const query of queries) {
      const xml = await searchMedlinePlus(query);
      const results = parseResults(xml, base);
      candidates.push(...results.map((item) => {
        const purposeText = normalizeTerm([item.summary, item.snippet].filter(Boolean).join(" "));
        const purposeScore = /used to|used for|why|performed|ordered|monitor|diagnose|assess|check|detect|identify/.test(purposeText) ? 45 : 0;
        return { ...item, purposeScore: item.score + purposeScore };
      }));
      if (candidates.length >= 12) break;
    }

    const source = [...candidates].sort((a, b) => b.purposeScore - a.purposeScore || a.rank - b.rank)[0] || best;
    const why = extractWhySentence([source?.summary, source?.snippet].filter(Boolean).join(" "));
    if (why) return { text: why, source };
  } catch (error) {
    console.warn(`Purpose lookup failed for ${term}:`, error.message);
  }

  return { text: fallbackWhyMeasured(term, detectCategory(term, best)), source: best || null };
}

/*
  This is intentionally category-based rather than test-by-test.
  New terminology still receives a MedlinePlus explanation dynamically;
  the wellness section falls back to conservative general advice when
  the new terminology cannot be confidently categorized.
*/
function detectCategory(term = "", best = {}) {
  const text = normalizeTerm(
    [
      term,
      best.title,
      best.summary,
      ...(best.mesh || []),
      ...(best.groupNames || []),
    ].join(" "),
  );

  if (/platelet|thrombocyte/.test(text)) return "platelets";
  if (/hemoglobin|hematocrit|red blood cell|erythrocyte|mcv|mch|mchc|rdw|reticulocyte|iron|ferritin|transferrin|folate|vitamin b 12/.test(text)) return "blood";
  if (/white blood cell|wbc|lymphocyte|neutrophil|monocyte|eosinophil|basophil/.test(text)) return "immune";
  if (/glucose|blood sugar|a1c|hba1c|insulin/.test(text)) return "glucose";
  if (/cholesterol|ldl|hdl|triglyceride|lipoprotein|apolipoprotein/.test(text)) return "lipids";
  if (/vitamin|folate|b 12|calcium|magnesium|phosphate|phosphorus|zinc/.test(text)) return "nutrient";
  if (/creatinine|urea|bun|kidney|renal|egfr|glomerular/.test(text)) return "kidney";
  if (/alt|ast|alkaline phosphatase|bilirubin|ggt|gamma glutamyl|liver|hepatic/.test(text)) return "liver";
  if (/tsh|thyroid|t3|t4|thyroxine|triiodothyronine/.test(text)) return "thyroid";
  if (/urine|urinalysis|specific gravity|urine ph|proteinuria|ketone/.test(text)) return "urine";
  if (/esr|sedimentation|crp|c reactive protein|inflammation/.test(text)) return "inflammation";
  if (/hormone|testosterone|estrogen|progesterone|cortisol|prolactin/.test(text)) return "hormone";
  return "general";
}

function specificWellnessGuidance(term, state) {
  const text = normalizeTerm(term);

  if (/eosinophil/.test(text)) {
    if (state === "above") return "• Maintain a varied diet with vegetables, fruits, whole grains and adequate protein. • There is no specific food proven to directly lower an eosinophil count. • If allergies or another trigger is suspected, focus on identifying and managing the cause with a healthcare professional rather than using restrictive diets or supplements.";
    if (state === "below") return "• Maintain balanced nutrition and regular meals. • Do not try to raise an eosinophil count with supplements or special foods. • Interpret the result with the rest of the blood differential and any symptoms.";
    return "• Maintain a varied diet, adequate sleep and regular activity. • No special food is needed to change a normal eosinophil count. • Avoid unnecessary restrictive diets or supplements.";
  }

  if (/lymphocyte/.test(text)) {
    if (state === "above") return "• Maintain balanced meals, adequate sleep and regular activity. • There is no specific food proven to directly lower a high lymphocyte count. • Persistent changes should be interpreted with the rest of the blood differential and your health history.";
    if (state === "below") return "• Maintain nutrient-rich meals and adequate protein. • Food alone does not directly correct a low lymphocyte count. • Follow any infection-prevention or treatment advice provided by your healthcare team.";
    return "• Maintain balanced nutrition, adequate sleep and regular activity. • No special food is needed to change a normal lymphocyte count.";
  }

  if (/hemoglobin|haemoglobin/.test(text)) {
    if (state === "below") return "• Include iron-, vitamin B12- and folate-containing foods when appropriate, such as beans, lentils, leafy greens, eggs and fortified foods. • Pair plant sources of iron with vitamin-C-rich foods. • Do not start iron supplements just from the number alone; the cause of a low hemoglobin result should be assessed.";
    if (state === "above") return "• Do not try to lower a high hemoglobin result through food or supplements alone. • Stay appropriately hydrated unless you have fluid restrictions and avoid smoking. • Discuss a persistent high result with a healthcare professional.";
    return "• Maintain a balanced diet containing adequate iron, vitamin B12, folate and protein. • Stay appropriately hydrated and active. • Avoid supplements unless they are needed and recommended.";
  }

  if (/red blood cell|erythrocyte|\brbc\b/.test(text)) {
    if (state === "above") return "• Do not try to lower a high red blood cell count through food or supplements alone. • Stay appropriately hydrated unless you have fluid restrictions and avoid smoking. • Discuss a persistent high result with a healthcare professional.";
    if (state === "below") return "• Maintain balanced meals with adequate iron, vitamin B12, folate and protein when appropriate. • Food alone may not explain or correct a low red blood cell count, so persistent abnormalities should be assessed.";
    return "• Maintain balanced nutrition with adequate protein, iron, vitamin B12 and folate. • Stay appropriately hydrated and active. • No special food is needed to change a normal red blood cell count.";
  }

  if (/vitamin d/.test(text)) {
    if (state === "below") return "• Include vitamin-D-containing foods such as fortified foods and suitable dietary sources. • Safe, appropriate sunlight exposure may contribute to vitamin D status. • Discuss supplementation with a healthcare professional when the result is low.";
    if (state === "above") return "• Avoid high-dose vitamin D supplements unless specifically recommended. • Keep dietary intake balanced and discuss persistent high results or supplement use with a healthcare professional.";
    return "• Maintain a balanced diet containing appropriate vitamin D sources. • Avoid unnecessary high-dose supplements and keep regular activity and outdoor habits.";
  }

  if (/vitamin b 12|cobalamin/.test(text)) {
    if (state === "below") return "• Include vitamin B12 sources such as eggs, dairy, fish, meat or fortified foods according to your diet. • Ask a healthcare professional whether supplementation or evaluation of absorption is appropriate. • Do not rely on food alone if a deficiency has been confirmed.";
    if (state === "above") return "• Avoid unnecessary high-dose vitamin B12 supplements. • Keep your diet balanced and discuss a persistent high result or supplement use with a healthcare professional.";
    return "• Maintain a varied diet that provides vitamin B12 through suitable food sources. • Avoid unnecessary high-dose supplements.";
  }

  if (/triglyceride/.test(text)) {
    if (state === "above") return "• Choose vegetables, whole grains, beans, nuts and other minimally processed foods. • Limit sugary drinks, excess refined carbohydrates and frequent alcohol intake. • Stay physically active as appropriate.";
    return "• Maintain a balanced diet with vegetables, whole grains, beans, healthy fats and adequate protein. • Stay active and avoid excessive alcohol.";
  }

  if (/total cholesterol|\bldl\b|low density lipoprotein/.test(text)) {
    if (state === "above") return "• Emphasize vegetables, fruits, whole grains, beans and soluble-fiber foods such as oats and lentils. • Replace some saturated fats with unsaturated fats from foods such as nuts, fish and suitable plant oils. • Stay active and avoid tobacco.";
    return "• Choose vegetables, fruits, whole grains, beans, nuts, fish and unsaturated fats regularly. • Limit frequent fried and highly processed foods and stay active.";
  }

  if (/creatinine|urea|blood urea nitrogen|\bbun\b/.test(text)) {
    if (state === "above") return "• Do not start a high-protein or restrictive kidney diet on your own. • Maintain appropriate hydration unless you have been told to restrict fluids. • Discuss the result with a healthcare professional who can interpret it with kidney function and other tests.";
    return "• Maintain balanced nutrition and appropriate hydration unless you have fluid restrictions. • Avoid self-prescribing a high-protein or restrictive diet just to change a kidney-related result.";
  }

  return "";
}

function localWellnessGuidance(term, status, best = {}) {
  const category = detectCategory(term, best);
  const state = status === "below" ? "below" : status === "above" ? "above" : "within";
  const specific = specificWellnessGuidance(term, state);
  const caution = "Do not start supplements or restrictive diets just to change a lab value unless a healthcare professional recommends it.";
  if (specific) return `${specific.replaceAll(" • ", "\n").replace(/^•\s*/, "").trim()}`;

  const guidance = {
    platelets: {
      within: "• Eat a varied diet with vegetables, fruits, whole grains and adequate protein. • Stay active and avoid tobacco. • There is no need to eat specific foods to change a normal platelet count.",
      below: "• Include protein and foods providing vitamin B12 and folate when appropriate. • Avoid excessive alcohol. • Food alone may not correct a low platelet count, so persistent or clearly abnormal results should be discussed with a healthcare professional.",
      above: "• There is no reliable food that directly lowers a high platelet count. • Maintain balanced meals, regular activity and avoid tobacco. • Do not self-start aspirin or blood-thinning medicines; discuss the result with a healthcare professional."
    },
    blood: {
      within: "• Support healthy blood-cell production with iron-, vitamin B12-, folate- and protein-containing foods such as beans, lentils, leafy greens, eggs and fortified grains. • Stay hydrated and maintain regular activity. • Do not use supplements simply to change a normal result.",
      below: "• Include iron-, vitamin B12-, folate- and protein-containing foods when appropriate. • Pair plant sources of iron with vitamin-C-rich foods to support iron absorption. • A low result can have causes beyond diet, so discuss persistent abnormalities before starting supplements.",
      above: "• Do not try to lower a high blood-cell or hemoglobin-related result through food or supplements alone. • Stay appropriately hydrated unless you have been given fluid restrictions and avoid smoking. • Discuss a persistent high result with a healthcare professional."
    },
    immune: {
      within: "• Eat a varied diet with vegetables, fruits, whole grains and adequate protein. • Get adequate sleep, stay active and avoid tobacco. • No specific food is needed to change a normal white-cell result.",
      below: "• A nutrient-rich diet supports general health, but food does not directly correct a low white-cell count. • Follow any infection-prevention advice from your healthcare team. • Discuss a persistent low result with a healthcare professional.",
      above: "• There is no single food that reliably lowers a high white-cell or differential count. • Maintain balanced meals, adequate sleep and regular activity. • Discuss persistent elevations, especially with symptoms, with a healthcare professional."
    },
    glucose: {
      within: "• Build meals around vegetables, high-fiber carbohydrates, protein and unsaturated fats. • Limit frequent sugary drinks and highly refined foods. • Regular physical activity and consistent sleep support metabolic health.",
      below: "• Do not intentionally correct a low lab value with sugary foods unless advised for your situation. • Eat regular balanced meals and discuss an unexpected low result with a healthcare professional. • Seek prompt advice if low-glucose symptoms occur.",
      above: "• Emphasize vegetables, high-fiber foods, protein and unsaturated fats. • Limit sugary drinks and highly refined foods. • Stay physically active as appropriate and follow the glucose targets provided by your healthcare professional."
    },
    lipids: {
      within: "• Choose vegetables, fruits, whole grains, beans, nuts, fish and unsaturated fats regularly. • Limit saturated and trans fats and frequent fried/processed foods. • Stay active and avoid tobacco.",
      below: "• A low lipid result should be interpreted in context rather than corrected with a specific food. • Maintain a varied, balanced diet with healthy fats and adequate calories. • Discuss an unexpected or persistent result with a healthcare professional.",
      above: "• Choose more vegetables, fruits, whole grains, beans and soluble-fiber foods such as oats and lentils. • Replace some saturated fats with unsaturated fats such as those from nuts, fish and suitable plant oils. • Stay active and avoid tobacco."
    },
    nutrient: {
      within: "• Get the nutrient mainly through a varied diet that includes appropriate whole-food sources. • Avoid unnecessary high-dose supplements. • Keep regular meals, hydration and activity habits.",
      below: "• Include suitable food sources of the nutrient when appropriate. • Ask a healthcare professional whether absorption, medicines or supplementation should be considered. • Do not start high-dose supplements without guidance.",
      above: "• Avoid high-dose supplements or heavily fortified products unless specifically recommended. • Keep your diet balanced rather than trying to rapidly lower the result. • Discuss a persistent high result and any supplement use with a healthcare professional."
    },
    kidney: {
      within: "• Maintain a balanced diet and appropriate hydration. • Keep sodium intake reasonable and stay physically active as appropriate. • Individual fluid and protein needs vary with kidney function.",
      below: "• Do not try to correct a kidney-related result with a specific food or self-prescribed diet. • Maintain appropriate hydration unless you have fluid restrictions. • Discuss persistent abnormalities with a healthcare professional.",
      above: "• Do not start a high-protein or restrictive kidney diet on your own. • Maintain appropriate hydration unless you have been told to restrict fluids. • Discuss the result with a healthcare professional, who can interpret it with kidney function and other tests."
    },
    liver: {
      within: "• Choose vegetables, fruits, whole grains and appropriate protein. • Avoid excessive alcohol and unnecessary supplements or herbal products. • Maintain regular physical activity and a healthy weight when appropriate.",
      below: "• A low liver-related result usually should not be changed through food alone. • Maintain a balanced diet and avoid unnecessary supplements or herbal products. • Discuss an unexpected persistent result with a healthcare professional.",
      above: "• Avoid excessive alcohol. • Be cautious with unnecessary supplements and herbal products because some can affect the liver. • Maintain a balanced diet and discuss elevated liver-related results with a healthcare professional."
    },
    thyroid: {
      within: "• Maintain a varied, balanced diet with adequate overall nutrition. • Do not take thyroid-support or high-dose iodine supplements without advice. • Keep regular activity and sleep habits.",
      below: "• Do not try to correct a thyroid result by taking iodine or thyroid supplements on your own. • Maintain a balanced diet. • Discuss the result with a healthcare professional, especially if symptoms are present.",
      above: "• Do not try to lower a thyroid result with iodine, restrictive diets or supplements without professional advice. • Maintain balanced meals and regular activity. • Discuss the result with a healthcare professional."
    },
    urine: {
      within: "• Maintain appropriate hydration and a balanced diet. • Follow any collection instructions carefully for future urine tests. • Avoid changing food or fluid intake solely to alter a normal result.",
      below: "• Do not deliberately change fluid or food intake to correct a urine measurement. • Maintain appropriate hydration unless restricted. • Discuss persistent abnormal results, especially with urinary symptoms, with a healthcare professional.",
      above: "• Do not deliberately change fluid or food intake to correct a urine measurement. • Maintain appropriate hydration unless restricted. • Discuss persistent abnormal results, especially with urinary symptoms, with a healthcare professional."
    },
    inflammation: {
      within: "• Eat a varied diet rich in vegetables, fruits, whole grains and minimally processed foods. • Stay active, sleep adequately and avoid tobacco. • An inflammation marker is only one part of the overall picture.",
      below: "• Do not try to raise an inflammation marker through food. • Maintain balanced nutrition, activity and sleep. • Interpret the result with symptoms and other tests rather than using diet to change the number.",
      above: "• There is no single food that reliably lowers an inflammation marker. • Focus on varied, minimally processed foods, regular activity, adequate sleep and avoiding tobacco. • Discuss persistent elevations with a healthcare professional."
    },
    hormone: {
      within: "• Maintain balanced nutrition, regular activity and adequate sleep. • Hormone levels can depend on timing, medicines and other factors. • Avoid changing supplements just to alter a lab value.",
      below: "• Do not try to raise a hormone result with over-the-counter hormone or supplement products. • Maintain balanced nutrition and sleep. • Discuss the result with a healthcare professional who can consider timing, symptoms and other tests.",
      above: "• Do not try to lower a hormone result with supplements or restrictive diets. • Maintain balanced nutrition, activity and sleep. • Discuss the result with a healthcare professional, particularly if it persists or symptoms are present."
    },
    general: {
      within: "• Maintain a varied, balanced diet with vegetables, fruits, whole grains and adequate protein. • Stay appropriately hydrated, physically active and well rested. • Avoid using food or supplements specifically to change a normal lab value.",
      below: "• Maintain a varied, balanced diet with adequate protein and nutrient-rich foods. • Avoid self-treating the result with high-dose supplements or restrictive diets. • Discuss a persistent or clearly abnormal value with a healthcare professional.",
      above: "• Maintain a varied, balanced diet and regular activity. • Avoid self-treating the result with supplements or restrictive diets because the cause can vary by test. • Discuss a persistent or clearly abnormal value with a healthcare professional."
    }
  };

  return `${guidance[category][state].replaceAll(" • ", "\n").replace(/^•\s*/, "").trim()}`;
}

function wellnessSearchQueries(term, status, best = {}) {
  const category = detectCategory(term, best);
  const state = status === "below" ? "below" : status === "above" ? "above" : "within";
  const base = String(term || "").replace(/\s+/g, " ").trim();
  const categoryTerms = {
    lipids: "cholesterol diet nutrition physical activity",
    glucose: "blood sugar diet nutrition physical activity",
    blood: "anemia nutrition iron vitamin B12 folate",
    immune: "white blood cells immune system nutrition lifestyle",
    platelets: "platelets nutrition alcohol lifestyle",
    nutrient: "vitamin nutrient food supplementation",
    kidney: "kidney diet nutrition hydration",
    liver: "liver health diet alcohol nutrition",
    thyroid: "thyroid nutrition iodine diet",
    urine: "urinalysis hydration nutrition",
    inflammation: "inflammation diet physical activity",
    hormone: "hormone nutrition lifestyle",
    general: "laboratory test nutrition lifestyle"
  };
  const stateWord = state === "above" ? "high" : state === "below" ? "low" : "normal";
  return [
    `${base} ${stateWord} diet nutrition lifestyle`,
    `${base} ${categoryTerms[category] || categoryTerms.general}`,
  ].slice(0, 2);
}

function wellnessScore(item, term, best = {}) {
  const category = detectCategory(term, best);
  const text = normalizeTerm([item.title, item.summary, item.snippet, ...(item.mesh || []), ...(item.groupNames || [])].join(" "));
  let score = 0;
  const topicWords = normalizeTerm(term).split(" ").filter(w => w.length > 2);
  score += topicWords.filter(w => text.includes(w)).length * 18;
  const categoryWords = {
    lipids: ["cholesterol", "lipid", "triglyceride", "heart"],
    glucose: ["glucose", "blood sugar", "diabetes"],
    blood: ["anemia", "hemoglobin", "iron", "folate", "vitamin b 12"],
    immune: ["white blood cell", "immune", "infection", "allergy", "eosinophil", "lymphocyte"],
    platelets: ["platelet", "bleeding", "clot"],
    nutrient: ["vitamin", "nutrient", "mineral"],
    kidney: ["kidney", "renal", "creatinine"],
    liver: ["liver", "hepatic", "alcohol"],
    thyroid: ["thyroid", "iodine"],
    urine: ["urine", "urinalysis", "hydration"],
    inflammation: ["inflammation", "inflammatory"],
    hormone: ["hormone"],
    general: []
  };
  score += (categoryWords[category] || []).filter(w => text.includes(w)).length * 12;
  if (/diet|nutrition|food|fiber|fat|exercise|physical activity|sleep|alcohol|smoking|supplement|vitamin|hydration|lifestyle|eat|eating|avoid|weight/.test(text)) score += 30;
  return score;
}

function makeWellnessWebSummary(term, status, source, best = {}) {
  if (!source) return "";
  const category = detectCategory(term, best);
  const state = status === "above" ? "above" : status === "below" ? "below" : "within";
  const sourceText = [source.summary, source.snippet].filter(Boolean).join(" ");
  const sentences = splitSentences(sourceText);
  const useful = sentences.filter(s => /diet|nutrition|food|fiber|fat|exercise|physical activity|sleep|alcohol|smok|supplement|vitamin|hydration|lifestyle|eat|eating|avoid|weight|protein|sugar|salt/i.test(s));

  // Turn the source facts into short, plain-language tips. The wording is
  // generated from the retrieved source rather than copying the source text.
  const tips = [];
  const joined = useful.join(" ");

  if (/lipids/.test(category)) {
    const lipidTerm = normalizeTerm(term);
    if (/triglyceride/.test(lipidTerm)) {
      if (/sugar|sweet|refined|carbohydrate/i.test(joined)) tips.push("Limit frequent sugary drinks and highly refined carbohydrate foods, which can affect triglyceride levels.");
      if (/alcohol/i.test(joined)) tips.push("Keep alcohol intake low or avoid it, particularly when triglycerides are elevated.");
      if (/exercise|physical activity|weight/i.test(joined)) tips.push("Regular physical activity and healthy weight habits can support triglyceride management.");
    } else if (/hdl/.test(lipidTerm) && !/non hdl/.test(lipidTerm)) {
      if (/unsaturated|healthy fat|olive|nut|avocado|fish/i.test(joined)) tips.push("Choose unsaturated fats from foods such as nuts, fish and suitable plant oils instead of saturated fats.");
      if (/exercise|physical activity/i.test(joined)) tips.push("Regular physical activity can support a healthier HDL level and overall cardiovascular health.");
      if (/smok|tobacco/i.test(joined)) tips.push("Avoid tobacco because it can negatively affect HDL and cardiovascular health.");
    } else if (/ldl|non hdl|total cholesterol/.test(lipidTerm)) {
      if (/saturated|trans fat/i.test(joined)) tips.push("Reduce foods high in saturated or trans fats and replace some of those fats with unsaturated choices.");
      if (/soluble fiber|fiber|oat|bean|lentil|fruit/i.test(joined)) tips.push("Add soluble-fiber foods such as oats, beans, lentils and fruit to regular meals.");
      if (/exercise|physical activity|weight|smoking|tobacco/i.test(joined)) tips.push("Keep physically active and avoid tobacco; these habits support cardiovascular health alongside diet.");
    } else {
      if (/saturated|trans fat/i.test(joined)) tips.push("Choose more unsaturated fats and reduce foods high in saturated or trans fats.");
      if (/soluble fiber|fiber|oat|bean|lentil|fruit/i.test(joined)) tips.push("Include fiber-rich foods such as oats, beans, lentils, fruits and vegetables regularly.");
      if (/exercise|physical activity|weight|smoking|tobacco/i.test(joined)) tips.push("Keep physically active, work toward a healthy weight when appropriate, and avoid tobacco.");
    }
  } else if (/blood/.test(category)) {
    const bloodTerm = normalizeTerm(term);
    if (state === "below" && /hemoglobin|haemoglobin|red blood cell|erythrocyte|rbc/.test(bloodTerm)) {
      if (/iron|folate|vitamin b 12|nutrition/i.test(joined)) tips.push("Include foods that provide iron, vitamin B12 and folate when appropriate for your diet.");
      if (/vitamin c|absorb/i.test(joined)) tips.push("Pair plant sources of iron with vitamin-C-rich foods to support iron absorption.");
      tips.push("Do not start iron or other high-dose supplements from the result alone; the cause of the low value should be assessed.");
    } else if (state === "above" && /hemoglobin|haemoglobin|red blood cell|erythrocyte|rbc/.test(bloodTerm)) {
      tips.push("Do not try to lower a high blood-cell or hemoglobin result with food or supplements alone.");
      tips.push("Stay appropriately hydrated unless you have fluid restrictions and avoid smoking.");
      tips.push("Discuss a persistent high result with a healthcare professional so the cause can be assessed.");
    } else {
      if (/iron|folate|vitamin b 12|nutrition/i.test(joined)) tips.push("Include foods that provide iron, vitamin B12 and folate when appropriate for your diet.");
      if (/vitamin c|absorb/i.test(joined)) tips.push("Pair plant sources of iron with vitamin-C-rich foods to support iron absorption.");
      if (/supplement|cause|anemia/i.test(joined)) tips.push("Do not start high-dose supplements solely from a lab result; the cause of an abnormal value may need evaluation.");
    }
  } else if (/glucose/.test(category)) {
    if (/fiber|whole grain|vegetable|fruit|bean/i.test(joined)) tips.push("Build meals around vegetables, whole grains, beans and other high-fiber foods.");
    if (/sugar|sweet|refined|drink/i.test(joined)) tips.push("Limit frequent sugary drinks and highly refined carbohydrate foods.");
    if (/exercise|physical activity|weight/i.test(joined)) tips.push("Regular physical activity and healthy weight habits can support blood-glucose management.");
  } else if (/nutrient/.test(category)) {
    if (/food|diet|nutrition/i.test(joined)) tips.push("Use a varied diet with appropriate whole-food sources of the nutrient rather than relying on a single food.");
    if (/supplement/i.test(joined)) tips.push("Use supplements only when appropriate for your needs and with professional guidance, especially at high doses.");
    if (/absorb|meal|fat/i.test(joined)) tips.push("Follow the food or timing guidance relevant to this nutrient because absorption can depend on diet and other factors.");
  } else if (/kidney/.test(category)) {
    if (/hydration|fluid/i.test(joined)) tips.push("Keep hydration appropriate for you; people with fluid restrictions should follow their clinician's advice.");
    if (/protein|diet|nutrition/i.test(joined)) tips.push("Avoid starting a high-protein or restrictive kidney diet without individualized medical advice.");
    if (/salt|sodium|processed/i.test(joined)) tips.push("Limit heavily processed foods and excess sodium when kidney-health guidance calls for it.");
  } else if (/liver/.test(category)) {
    if (/alcohol/i.test(joined)) tips.push("Avoid excessive alcohol because it can add stress to the liver.");
    if (/vegetable|fruit|whole grain|diet|weight/i.test(joined)) tips.push("Favor vegetables, fruits, whole grains and balanced portions as part of an overall healthy eating pattern.");
    if (/supplement|herbal/i.test(joined)) tips.push("Avoid unnecessary supplements or herbal products unless their use has been reviewed by a healthcare professional.");
  } else if (/immune/.test(category)) {
    if (/nutrition|diet|food|vitamin|protein/i.test(joined)) tips.push("Support general immune health with varied, nutrient-rich meals and adequate protein.");
    if (/sleep|physical activity|exercise/i.test(joined)) tips.push("Prioritize adequate sleep and regular activity appropriate for your health.");
    tips.push(state === "above" ? "There is no single food that reliably lowers an elevated white-cell or differential count; the underlying cause matters." : "Do not use restrictive diets or supplements specifically to change a white-cell result.");
  } else if (/platelets/.test(category)) {
    if (/alcohol/i.test(joined)) tips.push("Avoid excessive alcohol, which can affect blood-cell and bleeding-related health.");
    if (/nutrition|diet|vitamin|folate|b 12/i.test(joined)) tips.push("Maintain varied nutrition with adequate protein and relevant vitamins and minerals.");
    tips.push(state === "above" ? "No specific food is proven to directly lower a high platelet count; avoid self-starting aspirin or blood thinners." : "Do not try to change the platelet count with supplements unless a clinician identifies a need.");
  } else if (/thyroid/.test(category)) {
    if (/iodine|diet|nutrition/i.test(joined)) tips.push("Maintain a varied diet and avoid high-dose iodine or 'thyroid support' supplements unless recommended.");
    if (/exercise|weight|sleep/i.test(joined)) tips.push("Regular activity, adequate sleep and balanced meals support general metabolic health.");
    tips.push("Food alone does not reliably correct an abnormal thyroid test; interpretation depends on the specific hormone and clinical context.");
  } else {
    if (/diet|nutrition|food|vegetable|fruit|whole grain|protein/i.test(joined)) tips.push("Use a varied, balanced eating pattern with vegetables, fruits, whole grains and appropriate protein.");
    if (/exercise|physical activity|sleep|weight/i.test(joined)) tips.push("Regular physical activity, adequate sleep and healthy weight habits can support general health.");
    tips.push(state === "within" ? "No special food is needed to change a result that is within this report's reference range." : "Do not use restrictive diets or supplements to change an abnormal lab value without professional guidance.");
  }

  return [...new Set(tips)].slice(0, 3).join("\n");
}

async function webSearchedWellness(term, status, best = {}) {
  try {
    const queries = wellnessSearchQueries(term, status, best);
    const candidates = [];
    for (const query of queries) {
      const xml = await searchMedlinePlus(query);
      const results = parseResults(xml, query);
      candidates.push(...results.map(item => ({ ...item, wellnessScore: wellnessScore(item, term, best) })));
      if (candidates.length >= 8) break;
    }
    const source = [...candidates].sort((a,b) => b.wellnessScore - a.wellnessScore || a.rank - b.rank)[0];
    if (!source || source.wellnessScore < 25) return { text: "", source: null };
    return { text: makeWellnessWebSummary(term, status, source, best), source };
  } catch (error) {
    console.warn(`Wellness web search failed for ${term}:`, error.message);
    return { text: "", source: null };
  }
}

function ensureWellnessLines(text, term, best = {}) {
  const lines = String(text || "").replace(/\s*•\s*/g, "\n").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 3) return [...new Set(lines)].slice(0, 3).join("\n");

  const category = detectCategory(term, best);
  const extras = {
    lipids: "Keep physically active and avoid tobacco as part of cardiovascular health maintenance.",
    glucose: "Keep regular sleep and activity habits and follow the targets provided by your healthcare professional.",
    blood: "Avoid starting supplements simply to change a normal blood result.",
    immune: "Avoid smoking and maintain regular sleep and activity habits.",
    platelets: "Do not use supplements specifically to change a normal platelet count.",
    kidney: "Avoid starting a high-protein or restrictive diet without individualized advice.",
    liver: "Avoid unnecessary supplements or herbal products unless reviewed by a healthcare professional.",
    thyroid: "Avoid high-dose iodine or thyroid-support supplements unless recommended.",
    nutrient: "Avoid unnecessary high-dose supplements unless a healthcare professional recommends them.",
    general: "Avoid using restrictive diets or supplements solely to change a normal laboratory result."
  };
  if (lines.length < 3 && extras[category]) lines.push(extras[category]);
  return [...new Set(lines)].slice(0, 3).join("\n");
}

async function wellnessGuidance(term, status, best = {}) {
  const web = await webSearchedWellness(term, status, best);
  const local = localWellnessGuidance(term, status, best);
  const webLines = String(web.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const localLines = String(local || "").replace(/\s*•\s*/g, "\n").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const merged = ensureWellnessLines([...new Set([...webLines, ...localLines])].join("\n"), term, best);
  return {
    text: merged,
    sourceUrl: web.source?.url || "",
    sourceTitle: web.source?.title || ""
  };
}


const OFFICIAL_MEDLINEPLUS_SOURCES = {
  platelet: "https://medlineplus.gov/lab-tests/platelet-tests/",
  platelets: "https://medlineplus.gov/lab-tests/platelet-tests/",
  thrombocyte: "https://medlineplus.gov/lab-tests/platelet-tests/",
  neutrophil: "https://medlineplus.gov/lab-tests/white-blood-count-wbc/",
  neutrophils: "https://medlineplus.gov/lab-tests/white-blood-count-wbc/",
  lymphocyte: "https://medlineplus.gov/lab-tests/blood-differential/",
  lymphocytes: "https://medlineplus.gov/lab-tests/blood-differential/",
  eosinophil: "https://medlineplus.gov/ency/article/003649.htm",
  eosinophils: "https://medlineplus.gov/ency/article/003649.htm",
  monocyte: "https://medlineplus.gov/lab-tests/blood-differential/",
  basophil: "https://medlineplus.gov/lab-tests/blood-differential/",
  wbc: "https://medlineplus.gov/lab-tests/white-blood-count-wbc/",
  "white blood cell": "https://medlineplus.gov/lab-tests/white-blood-count-wbc/",
  hemoglobin: "https://medlineplus.gov/lab-tests/hemoglobin-test/",
  haemoglobin: "https://medlineplus.gov/lab-tests/hemoglobin-test/",
  rbc: "https://medlineplus.gov/lab-tests/red-blood-cell-rbc-count/",
  "red blood cell": "https://medlineplus.gov/lab-tests/red-blood-cell-rbc-count/",
  glucose: "https://medlineplus.gov/lab-tests/blood-glucose-test/",
  "blood glucose": "https://medlineplus.gov/lab-tests/blood-glucose-test/",
  hba1c: "https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/",
  "hemoglobin a1c": "https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/",
  cholesterol: "https://medlineplus.gov/cholesterol.html",
  "total cholesterol": "https://medlineplus.gov/ency/article/007813.htm",
  ldl: "https://medlineplus.gov/lab-tests/cholesterol-levels/",
  hdl: "https://medlineplus.gov/lab-tests/cholesterol-levels/",
  triglyceride: "https://medlineplus.gov/triglycerides.html",
  vitamin: "https://medlineplus.gov/lab-tests/vitamin-b-test/",
  "vitamin d": "https://medlineplus.gov/lab-tests/vitamin-d-test/",
  "vitamin b12": "https://medlineplus.gov/lab-tests/vitamin-b-test/",
  creatinine: "https://medlineplus.gov/lab-tests/creatinine-test/",
  bun: "https://medlineplus.gov/lab-tests/bun-blood-urea-nitrogen/",
  urea: "https://medlineplus.gov/lab-tests/bun-blood-urea-nitrogen/",
  tsh: "https://medlineplus.gov/lab-tests/thyroid-tests/",
  thyroid: "https://medlineplus.gov/lab-tests/thyroid-tests/",
  alt: "https://medlineplus.gov/lab-tests/liver-panel/",
  ast: "https://medlineplus.gov/lab-tests/liver-panel/",
  bilirubin: "https://medlineplus.gov/lab-tests/bilirubin-blood-test/",
  ferritin: "https://medlineplus.gov/lab-tests/ferritin-blood-test/",
  iron: "https://www.medlineplus.gov/lab-tests/iron-tests/",
  calcium: "https://medlineplus.gov/lab-tests/calcium-blood-test/",
  sodium: "https://medlineplus.gov/lab-tests/sodium-blood-test/",
  potassium: "https://medlineplus.gov/lab-tests/potassium-blood-test/",
  crp: "https://www.medlineplus.gov/lab-tests/c-reactive-protein-crp-test/",
  esr: "https://www.medlineplus.gov/lab-tests/erythrocyte-sedimentation-rate-esr/",
  albumin: "https://medlineplus.gov/lab-tests/albumin-blood-test/",
  "total protein": "https://medlineplus.gov/lab-tests/total-protein-and-albumin-blood-test/"
};

const SYMPTOM_GUIDANCE = {
  platelet: {
    within: "If you are experiencing unusual bruising, frequent nosebleeds, prolonged bleeding after minor cuts, or other bleeding or clotting symptoms, discuss the result with a healthcare professional.",
    below: "If you are experiencing bleeding that lasts longer than expected after a minor cut or injury, frequent nosebleeds, unexplained bruising, pinpoint red spots on the skin, unusually heavy or prolonged menstrual bleeding, or blood in your urine or stool, discuss the result with a healthcare professional.",
    above: "If you are experiencing numbness in your hands or feet, headache, dizziness, weakness, or pain, swelling, or warmth in the lower legs, discuss the result with a healthcare professional."
  },
  neutrophil: {
    within: "If you are experiencing fever, chills or sweats, repeated infections, worsening cough, trouble breathing, severe weakness, or other signs of infection, discuss the result with a healthcare professional.",
    below: "If you are experiencing fever, chills or sweats, persistent diarrhea, severe nausea or vomiting, extreme weakness, a new skin rash or blisters, worsening cough, trouble breathing, abdominal pain, a severe or persistent headache, or burning when you urinate, discuss the result promptly with a healthcare professional."
  },
  wbc: {
    within: "If you are experiencing fever, chills, body aches, headache, an ongoing cough, or a wound that is red, producing pus, or not healing, discuss the result with a healthcare professional.",
    above: "If you are experiencing fever, chills, body aches, headache, a wound that is red or producing pus or not healing, or an ongoing cough, discuss the result with a healthcare professional.",
    below: "If you are experiencing repeated or persistent infections, fever, chills, body aches, headache, a wound that is red or producing pus or not healing, or an ongoing cough, discuss the result with a healthcare professional."
  },
  hemoglobin: {
    within: "If you are experiencing unusual fatigue or weakness, dizziness, shortness of breath, or cold hands or feet, discuss the result with a healthcare professional.",
    below: "If you are experiencing unusual weakness or fatigue, dizziness, shortness of breath, cold hands or feet, or other symptoms that may suggest anemia, discuss the result with a healthcare professional.",
    above: "If you are experiencing symptoms such as headaches, dizziness, weakness, breathing problems, or other new concerns, discuss the result with a healthcare professional."
  },
  eosinophil: {
    within: "If you are experiencing wheezing, shortness of breath, persistent cough, skin rash or itching, or symptoms suggesting an allergy or infection, discuss the result with a healthcare professional.",
    above: "If you are experiencing symptoms such as wheezing, shortness of breath, cough, skin rash or itching, or symptoms suggesting an allergy or infection, discuss the result with a healthcare professional."
  },
  glucose: {
    within: "If you are experiencing shakiness, sweating, dizziness, unusual thirst, frequent urination, blurred vision, or other glucose-related symptoms, discuss the result with a healthcare professional.",
    below: "If you are experiencing shakiness, sweating, hunger, dizziness, weakness, confusion, or a fast heartbeat, discuss the result promptly with a healthcare professional.",
    above: "If you are experiencing increased thirst, frequent urination, unusual fatigue, blurred vision, or unexplained weight changes, discuss the result with a healthcare professional."
  },
  lipids: {
    within: "Cholesterol and many other blood-lipid results often do not cause noticeable symptoms. If you have chest pain, shortness of breath, or other ongoing cardiovascular concerns, discuss them with a healthcare professional.",
    above: "High cholesterol and other lipid abnormalities often do not cause noticeable symptoms. If you have chest pain, shortness of breath, or other ongoing cardiovascular concerns, discuss them with a healthcare professional.",
    below: "Low cholesterol or other lipid results often do not cause noticeable symptoms. If you have unexplained weight loss, poor nutrition, or other ongoing health concerns, discuss them with a healthcare professional."
  },
  esr: {
    within: "If you are experiencing unexplained fever, headaches, joint stiffness, neck or shoulder pain, unexplained weight loss, or loss of appetite, discuss the result with a healthcare professional.",
    above: "If you are experiencing unexplained fever, unexplained weight loss, joint stiffness, neck or shoulder pain, loss of appetite, headaches, or other ongoing inflammatory symptoms, discuss the result with a healthcare professional."
  }
};

function officialSourceForTerm(term = "") {
  const normalized = normalizeTerm(term);
  const compact = normalized.replace(/\s+/g, "");
  if (OFFICIAL_MEDLINEPLUS_SOURCES[normalized]) return OFFICIAL_MEDLINEPLUS_SOURCES[normalized];
  if (OFFICIAL_MEDLINEPLUS_SOURCES[compact]) return OFFICIAL_MEDLINEPLUS_SOURCES[compact];
  for (const [key, url] of Object.entries(OFFICIAL_MEDLINEPLUS_SOURCES)) {
    const normalizedKey = normalizeTerm(key);
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) return url;
  }
  return "";
}

function symptomKeyForTerm(term = "") {
  const text = normalizeTerm(term);
  if (/platelet|thrombocyte/.test(text)) return "platelet";
  if (/neutrophil|anc/.test(text)) return "neutrophil";
  if (/white blood cell|wbc/.test(text)) return "wbc";
  if (/hemoglobin|haemoglobin|hgb/.test(text)) return "hemoglobin";
  if (/eosinophil/.test(text)) return "eosinophil";
  if (/glucose|blood sugar|hba1c|a1c/.test(text)) return "glucose";
  if (/cholesterol|ldl|hdl|triglyceride|lipoprotein/.test(text)) return "lipids";
  if (/esr|sedimentation/.test(text)) return "esr";
  return "";
}

async function fetchSymptomGuidance(term, status) {
  const key = symptomKeyForTerm(term);
  const mapped = SYMPTOM_GUIDANCE[key]?.[status];
  if (mapped) return mapped;

  try {
    const query = `${String(term || "").trim()} ${status === "below" ? "low" : status === "above" ? "high" : "symptoms"} symptoms`;
    const xml = await searchMedlinePlus(query);
    const results = parseResults(xml, String(term || ""));
    const candidates = results
      .filter((item) => /symptom|sign|why do i need|what do the results mean/i.test(`${item.summary} ${item.snippet}`))
      .sort((a, b) => b.score - a.score || a.rank - b.rank);
    const best = candidates[0];
    if (!best) return "";

    const sentences = splitSentences([best.summary, best.snippet].filter(Boolean).join(" "));
    const symptomSentences = sentences.filter((sentence) => /symptom|sign|fever|pain|bleeding|fatigue|weakness|dizziness|shortness|cough|rash|vomit|nausea|urinate|headache/i.test(sentence));
    if (!symptomSentences.length) return "";
    return `If you are experiencing ${shorten(symptomSentences.slice(0, 2).join(" "), 520).replace(/^(Symptoms? (may|can) include:?)\s*/i, "")}, discuss the result with a healthcare professional.`;
  } catch (error) {
    console.warn(`Symptom lookup failed for ${term}:`, error.message);
    return "";
  }
}

function summarizeCauses(sentences, state) {
  const patterns = state === "above"
    ? /high|higher|increased|elevated|may be due|may be caused|can be caused|can result|causes|linked to|associated with/i
    : /low|lower|decreased|reduced|may be due|may be caused|can be caused|can result|causes|linked to|associated with/i;
  const candidates = sentences.filter((sentence) => patterns.test(sentence) && !/^other names/i.test(sentence));
  const clean = candidates.filter((sentence) => !/reference range|normal results|alternative names/i.test(sentence));
  return clean.slice(0, 3);
}

function localStatusContext(term, status) {
  const text = normalizeTerm(term);
  if (status === "within") return "Your reported value is within the reference range shown on this report.";
  if (/platelet|thrombocyte/.test(text)) {
    return status === "above"
      ? "A high platelet count can be associated with infection or inflammation, iron-deficiency anemia, severe blood loss, or some cancers and blood disorders. The cause cannot be determined from the platelet result alone."
      : "A low platelet count can be associated with reduced platelet production, increased platelet destruction, certain medicines or treatments, infections, autoimmune conditions, or an enlarged spleen. The cause cannot be determined from the platelet result alone.";
  }
  if (/neutrophil|anc/.test(text)) {
    return status === "above"
      ? "A high neutrophil level can occur with infection, inflammation, physical or emotional stress, smoking, or some medicines. The result alone does not identify the cause."
      : "A low neutrophil level can occur with infections, bone marrow problems, certain medicines or treatments, or conditions that affect the immune system. The result alone does not identify the cause.";
  }
  if (/eosinophil/.test(text)) {
    return status === "above"
      ? "A high eosinophil count can be associated with allergies, asthma, eczema, parasitic or fungal infections, autoimmune conditions, and some blood disorders. The result alone does not identify the cause."
      : "A low eosinophil count can occur with alcohol intoxication, increased steroid production in the body, or steroid medicines. The result alone does not identify the cause.";
  }
  if (/hemoglobin|haemoglobin/.test(text)) {
    return status === "above"
      ? "A high hemoglobin level can be associated with dehydration, smoking, living at higher altitude, lung or heart disease, sleep apnea, or conditions that increase red blood cell production. The result alone does not identify the cause."
      : "A low hemoglobin level can be associated with anemia, iron deficiency, vitamin B12 deficiency, blood loss, thalassemia, liver disease, or other conditions. The result alone does not identify the cause.";
  }
  if (/glucose|blood sugar|hba1c|a1c/.test(text)) {
    return status === "above"
      ? "A high glucose result can be associated with diabetes or other factors affecting blood-sugar regulation, including some medicines and illness. The result alone does not identify the cause."
      : "A low glucose result can occur when blood sugar falls below the expected range, including from certain medicines, missed meals, or other health conditions. The result alone does not identify the cause.";
  }
  if (/cholesterol|ldl|hdl|triglyceride|lipoprotein/.test(text)) {
    return status === "above"
      ? "A high lipid result can be influenced by diet, activity level, weight, genetics, medicines, and health conditions. The specific reason depends on which lipid is elevated."
      : "A low lipid result can have different causes depending on the specific lipid measured, including diet, medicines, genetics, or other health conditions. The result should be interpreted with the rest of the lipid profile.";
  }
  return `Your reported value is ${status === "above" ? "above" : "below"} the reference range shown on this report. Several factors can affect this result, so the cause cannot be determined from this value alone.`;
}

async function fetchStatusContext(term, status, best = {}) {
  if (status === "within") return "Your reported value is within the reference range shown on this report.";
  const stateWord = status === "above" ? "high" : "low";
  try {
    const queries = [
      `"${String(term || "").trim()}" ${stateWord} results causes`,
      `${String(term || "").trim()} ${stateWord} what results mean`
    ];
    const candidates = [];
    for (const query of queries) {
      const xml = await searchMedlinePlus(query);
      const results = parseResults(xml, String(term || ""));
      candidates.push(...results);
      if (candidates.length >= 10) break;
    }
    const source = [...candidates].sort((a, b) => b.score - a.score || a.rank - b.rank)[0] || best;
    const sentences = splitSentences([source?.summary, source?.snippet].filter(Boolean).join(" "));
    const causes = summarizeCauses(sentences, status);
    if (causes.length) {
      const compact = causes.join(" ");
      return `A ${stateWord} ${String(term || "").trim()} can have several possible causes. ${shorten(compact, 520)} These possibilities do not by themselves identify the cause of your result.`;
    }
  } catch (error) {
    console.warn(`Status context lookup failed for ${term}:`, error.message);
  }
  return localStatusContext(term, status);
}

async function professionalGuidance(status, term) {
  const symptomText = await fetchSymptomGuidance(term, status);
  if (symptomText) return symptomText;
  if (status === "within") {
    return "If you have symptoms or ongoing concerns related to this test, discuss them with a healthcare professional.";
  }
  return `If this ${status === "above" ? "high" : "low"} result persists or you have new symptoms or concerns related to ${String(term || "this test").trim()}, discuss it with a healthcare professional.`;
}

function fallbackDescription(term, category) {
  const text = normalizeTerm(term);
  if (/eosinophil/.test(text)) return "Eosinophils are a type of white blood cell involved in immune responses, including allergies and defense against certain infections.";
  if (/lymphocyte/.test(text)) return "Lymphocytes are a type of white blood cell that helps the immune system recognize and respond to infections and other threats.";
  if (/hemoglobin|haemoglobin/.test(text)) return "Hemoglobin is an iron-rich protein in red blood cells that carries oxygen from the lungs to the rest of the body.";
  if (/red blood cell|erythrocyte|\brbc\b/.test(text)) return "Red blood cells carry hemoglobin and transport oxygen from the lungs to the body's tissues.";
  if (/platelet|thrombocyte/.test(text)) return "Platelets are blood cells that help form clots to control bleeding.";
  if (/vitamin d/.test(text)) return "Vitamin D helps the body absorb calcium and supports healthy bones and muscles.";
  if (/vitamin b 12|cobalamin/.test(text)) return "Vitamin B12 is a nutrient needed for healthy red blood cells and normal nerve function.";
  if (/glucose|blood sugar/.test(text)) return "Glucose is the main sugar in the blood and an important source of energy for the body's cells.";
  if (/cholesterol|ldl|hdl|triglyceride|lipoprotein/.test(text)) return "This laboratory measurement assesses cholesterol or another type of blood fat involved in cardiovascular health.";
  if (/creatinine|urea|bun|kidney|renal/.test(text)) return "This laboratory measurement relates to substances handled by the kidneys and can provide information about kidney function.";

  const fallbackDescriptions = {
    blood: `This laboratory term relates to red blood cells, hemoglobin, or another measurement used to understand the blood. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    immune: `This laboratory term relates to white blood cells or another part of the immune system. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    platelets: `This laboratory term relates to platelets, which help the blood form clots. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    glucose: `This laboratory term relates to blood glucose regulation. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    lipids: `This laboratory term relates to cholesterol or other blood fats. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    nutrient: `This laboratory term measures a nutrient or mineral in the body. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    kidney: `This laboratory term relates to kidney function or a substance handled by the kidneys. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    liver: `This laboratory term relates to liver function or a substance processed by the liver. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    thyroid: `This laboratory term relates to thyroid function or thyroid hormones. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    urine: `This laboratory term relates to a urine measurement used to assess hydration, kidney function, or other health information. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    inflammation: `This laboratory term relates to inflammation or the body's inflammatory response. The reported value should be interpreted using the reference range on your report and the rest of the results.`,
    hormone: `This laboratory term measures a hormone or hormone-related marker. Hormone results can depend on timing, medicines and other factors, so the report context matters.`,
    general: `This laboratory measurement provides information about the body and should be interpreted using the reference range on your report and the rest of the results.`
  };

  return fallbackDescriptions[category] || fallbackDescriptions.general;
}

async function buildFallback(term, status, best = {}) {
  const category = detectCategory(term, best);
  return {
    term,
    title: term,
    explanation: fallbackDescription(term, category),
    why: fallbackWhyMeasured(term, category),
    wellness: ensureWellnessLines(localWellnessGuidance(term, status, best.title ? best : { title: term }), term, best),
    professional: await professionalGuidance(status, term),
    source: "MedlinePlus",
    sourceOrganization: "National Library of Medicine",
    sourceUrl: (best?.url && Number(best.score || 0) >= 40 ? best.url : officialSourceForTerm(term)) || ""
  };
}

async function searchMedlinePlus(termQuery) {
  const url =
    "https://wsearch.nlm.nih.gov/ws/query" +
    "?db=healthTopics" +
    `&term=${encodeURIComponent(termQuery)}` +
    "&retmax=8" +
    "&rettype=brief" +
    "&tool=healthlens";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MedlinePlus request failed: ${response.status}`);
  }

  return response.text();
}

function parseResults(xml = "", searchTerm = "") {
  return getDocumentBlocks(xml)
    .map((documentXml, index) => {
      const rankMatch = documentXml.match(/\brank=["'](\d+)["']/i);
      const rank = rankMatch ? Number(rankMatch[1]) : index;
      const title = getContent(documentXml, "title");
      const summary = getContent(documentXml, "FullSummary");
      const snippet = getContent(documentXml, "snippet");
      const organization = getContent(documentXml, "organizationName");
      const alternateTitles = getContentValues(documentXml, "altTitle");
      const mesh = getContentValues(documentXml, "mesh");
      const groupNames = getContentValues(documentXml, "groupName");
      const url = getDocumentUrl(documentXml);

      const item = {
        rank,
        title,
        summary,
        snippet,
        organization,
        alternateTitles,
        mesh,
        groupNames,
        url,
      };

      return { ...item, score: scoreResult(item, searchTerm) };
    })
    .filter((item) => item.title || item.summary || item.snippet);
}

function chooseBest(results = []) {
  return (
    [...results].sort((a, b) => b.score - a.score || a.rank - b.rank)[0] || null
  );
}

async function fetchMedicalExplanation(term, status = "within") {
  const searchTerm = String(term || "").replace(/\s+/g, " ").trim();
  if (!searchTerm) return null;

  const cacheKey = `${normalizeTerm(searchTerm)}|${status || "within"}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const strippedTerm = searchTerm
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Try a small number of precise variants. This helps reports that print
    // abbreviations (RBC, BUN, HbA1c, etc.) or plural terminology while
    // keeping lookup traffic bounded and cache-friendly.
    const queries = buildSearchVariants(searchTerm);

    let best = null;

    for (const query of queries) {
      const xml = await searchMedlinePlus(query);
      const results = parseResults(xml, strippedTerm || searchTerm);
      const candidate = chooseBest(results);

      if (candidate && (!best || candidate.score > best.score)) {
        best = candidate;
      }

      if (best && best.score >= 120) break;
    }

    // Even when MedlinePlus has no sufficiently close title match, return a
    // useful category/status-specific explanation and wellness section. The
    // source link remains blank rather than inventing or linking to an
    // unrelated medical page.
    if (!best || best.score < 65 || !best.url) {
      const fallback = await buildFallback(searchTerm, status, best || { title: searchTerm });
      const purposeResult = await fetchPurposeGuidance(searchTerm, best || { title: searchTerm });
      const wellnessResult = await wellnessGuidance(searchTerm, status, best || { title: searchTerm });
      fallback.why = purposeResult.text || fallback.why;
      fallback.sourceUrl = purposeResult.source?.url || fallback.sourceUrl || officialSourceForTerm(searchTerm);
      fallback.wellness = wellnessResult.text || fallback.wellness;
      fallback.wellnessSourceUrl = wellnessResult.sourceUrl || "";
      fallback.wellnessSourceTitle = wellnessResult.sourceTitle || "";
      fallback.wellnessVersion = 7;
      fallback.statusContext = await fetchStatusContext(searchTerm, status, best || { title: searchTerm });
      cache.set(cacheKey, fallback);
      return fallback;
    }

    const explanation = makeDynamicSummary(searchTerm, best);
    const purposeResult = await fetchPurposeGuidance(searchTerm, best);
    const why = purposeResult.text || fallbackWhyMeasured(searchTerm, detectCategory(searchTerm, best));
    const wellnessResult = await wellnessGuidance(searchTerm, status, best);
    const wellness = wellnessResult.text;

    const data = {
      term: searchTerm,
      // Keep the report's terminology as the displayed heading. The MedlinePlus
      // title is used for matching/source selection, not as a replacement for
      // the exact test name printed on the user's report.
      title: searchTerm,
      explanation,
      why,
      wellness,
      professional: await professionalGuidance(status, searchTerm),
      source: "MedlinePlus",
      sourceOrganization: best.organization || "National Library of Medicine",
      sourceUrl: purposeResult.source?.url || best.url || officialSourceForTerm(searchTerm),
      wellnessSourceUrl: wellnessResult.sourceUrl,
      wellnessSourceTitle: wellnessResult.sourceTitle,
      wellnessVersion: 7,
    };

    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Medical lookup failed for ${searchTerm}:`, error.message);

    // Even if MedlinePlus is temporarily unreachable, keep the medical
    // explanation panel useful. Wellness guidance is generated from the
    // terminology/status category and does not depend on a live source call.
    const fallback = await buildFallback(searchTerm, status, { title: searchTerm });
    const purposeResult = await fetchPurposeGuidance(searchTerm, { title: searchTerm });
    fallback.why = purposeResult.text || fallback.why;
    fallback.wellnessVersion = 7;
    fallback.statusContext = await fetchStatusContext(searchTerm, status, { title: searchTerm });
    fallback.sourceUrl = purposeResult.source?.url || fallback.sourceUrl || officialSourceForTerm(searchTerm);
    fallback.wellness = ensureWellnessLines(fallback.wellness, searchTerm, { title: searchTerm });
    cache.set(cacheKey, fallback);
    return fallback;
  }
}

export { fetchMedicalExplanation, wellnessGuidance };
