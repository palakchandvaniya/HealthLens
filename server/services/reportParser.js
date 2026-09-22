/* =========================================================
   HEALTHLENS - MEDICAL REPORT PARSER
   Extracts laboratory rows from the report's own PDF text.
========================================================= */

const sampleResults = [
  { testName: "Hemoglobin", value: 13.2, unit: "g/dL", referenceMin: 12, referenceMax: 16, referenceText: "12.0–16.0", explanation: "Hemoglobin is a protein in red blood cells that helps carry oxygen around the body.", wellness: "A balanced diet containing iron, folate and vitamin B12 can support normal blood health.", method: "" },
  { testName: "Vitamin D", value: 18, unit: "ng/mL", referenceMin: 30, referenceMax: 100, referenceText: "30–100", explanation: "Vitamin D helps support bones, muscles and normal body functions.", wellness: "Discuss low reported vitamin D with a healthcare professional. Safe sunlight exposure and a balanced diet may support general wellness.", method: "" },
  { testName: "Fasting Glucose", value: 94, unit: "mg/dL", referenceMin: 70, referenceMax: 99, referenceText: "70–99", explanation: "Fasting glucose measures the amount of glucose in the blood after fasting.", wellness: "Regular physical activity and balanced meals are general habits that support metabolic wellness.", method: "" },
  { testName: "Total Cholesterol", value: 214, unit: "mg/dL", referenceMin: 125, referenceMax: 200, referenceText: "125–200", explanation: "Total cholesterol is a measure of cholesterol carried in the blood.", wellness: "Heart-healthy eating patterns and regular activity are general wellness measures to discuss with a professional.", method: "" },
  { testName: "HDL Cholesterol", value: 56, unit: "mg/dL", referenceMin: 40, referenceMax: 80, referenceText: "40–80", explanation: "HDL is one type of cholesterol involved in transporting cholesterol in the bloodstream.", wellness: "Regular activity and a balanced diet can support cardiovascular wellness.", method: "" },
  { testName: "LDL Cholesterol", value: 128, unit: "mg/dL", referenceMin: 0, referenceMax: 130, referenceText: "0–130", explanation: "LDL is a type of cholesterol that is commonly included in a lipid profile.", wellness: "Discuss the full lipid profile with a healthcare professional for context.", method: "" },
  { testName: "Platelets", value: 248, unit: "10³/µL", referenceMin: 150, referenceMax: 450, referenceText: "150–450", explanation: "Platelets help the blood form clots when bleeding occurs.", wellness: "This result is within the sample report's reference range.", method: "" },
  { testName: "WBC", value: 7.4, unit: "10³/µL", referenceMin: 4, referenceMax: 11, referenceText: "4.0–11.0", explanation: "White blood cells are part of the body's immune system.", wellness: "This result is within the sample report's reference range.", method: "" }
];

function statusFor(value, min, max) {
  if (Number.isFinite(min) && value < min) return "below";
  if (Number.isFinite(max) && value > max) return "above";
  return "within";
}

export function getDemoResults() {
  return sampleResults.map((item) => ({
    ...item,
    status: statusFor(item.value, item.referenceMin, item.referenceMax)
  }));
}

function clean(value = "") {
  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isMethod(line = "") {
  return /^METHOD\s*:/i.test(clean(line));
}

function isNoise(line = "") {
  const value = clean(line);
  if (!value) return true;
  if (/^(?:Page \d+ Of \d+|View Details|View Report)$/i.test(value)) return true;
  if (/^(?:Final|ResultsTest Report StatusUnits|Test Report Status Units|Interpretation\(s\))$/i.test(value)) return true;
  if (/^(?:DIAGNOSTIC REPORT|PATIENT NAME|PATIENT ID|ACCESSION NO|AGE\/SEX|ABHA NO|DRAWN|RECEIVED|REPORTED|REF\. DOCTOR|CLNT\.PATIENT ID)$/i.test(value)) return true;
  if (/^(?:HEALTH CHECK-UP PACKAGE|HAEMATOLOGY|BIOCHEMISTRY|SPECIALISED CHEMISTRY|CLINICAL PATH|BLOOD COUNTS|RBC AND PLATELET INDICES|WBC DIFFERENTIAL COUNT|MORPHOLOGY \(MICROSCOPY\)|LIPID PROFILE WITH|IRON AND TIBC STUDIES|TMT OR ECHO|CLINICAL PROFILE|COMPLETE BLOOD COUNT(?: \(CBC\))?|PLATELETS COUNT|DIFFERENTIAL COUNT OF WBC)$/i.test(value)) return true;
  if (/^(?:Agilus Diagnostics|Mumbai,|Maharashtra,|Tel:|CIN -|ULR No\.)/i.test(value)) return true;
  return false;
}

function isInterpretationLabel(line = "") {
  const value = clean(line);
  return /^(?:Normal|Desirable|Optimal|Near Optimal|Borderline|Borderline High|High|Very High|Low|Deficiency|Insufficiency|Sufficiency|Excess|Toxicity|Pre-diabetes|Diabetes diagnosis|Therapeutic goals|Action suggested|Normal Range|Pre-diabetic Range|Diabetic Range|Non-diabetic Adult|glucose:|mellitus:)/i.test(value);
}

function getNumbers(text = "") {
  return [...String(text).matchAll(/[-+]?\d+(?:\.\d+)?/g)].map((m) => ({
    value: Number(m[0].replace(/,/g, "")),
    index: m.index
  }));
}

function findReferenceStart(line = "") {
  const patterns = [
    /\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?/i,
    /(?:up\s*to|upto)\s*\d+(?:\.\d+)?/i,
    /(?:<\s*=|<=|=<|>=|=>|>|<)\s*(?:or\s*=\s*)?\d+(?:\.\d+)?/i,
    /\b(?:normal|desirable|optimal|low|high|deficiency|insufficiency|sufficiency|excess|toxicity|non-diabetic)\b\s*:?\s*(?:<|<=|=<|>=|=>|>|\s)?\s*\d/i
  ];

  let start = line.length;
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && Number.isInteger(match.index)) start = Math.min(start, match.index);
  }
  return start;
}

function looksLikeReference(line = "") {
  const value = clean(line);
  if (/^(?:Lab\. No\.|Patient|Doctor|Date|Gender|Age|Test parameters|Observed values|Reference range)/i.test(value)) return false;
  if (/\b\d{4}-\d{1,2}-\d{1,2}\b/.test(value)) return false;
  return (
    /\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?/.test(value) ||
    /(?:up\s*to|upto)\s*\d+(?:\.\d+)?/i.test(value) ||
    /(?:<\s*=|<=|=<|<\s*\/\s*=|<|>|>=|=>|>\s*\/\s*=)\s*(?:or\s*=\s*)?\d+(?:\.\d+)?/i.test(value) ||
    /(?:normal|desirable|optimal|low|high|deficiency|insufficiency|sufficiency|excess|toxicity|non-diabetic|pre-diabetes)\s*:?\s*(?:<|<=|=<|>|>=|=>)?\s*\d/i.test(value)
  );
}

function extractUnit(text = "") {
  const value = clean(text).toLowerCase().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ");
  const units = [
    "mm at 1 hr", "μiu/ml", "µiu/ml", "thou/μl", "thou/µl", "mil/μl", "mil/µl",
    "ng/ml", "ng/dl", "pg/ml", "pg", "μg/dl", "µg/dl", "mg/dl", "g/dl", "gm%", "u/l", "/hpf", "fl", "cubic u", "million/cmm", "cells/cu.mm", "per cmm", "x 1000 per cmm", "x 1000", "%", "ratio"
  ];
  const found = units.find((unit) => value.includes(unit));
  return found ? found.replace("µ", "μ") : "";
}

function normalizeName(value = "") {
  let name = clean(value)
    .replace(/\b(?:High|Low|Normal|Optimal|Desirable)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const replacements = [
    ["W\.B\.C\.", "WBC"],
    ["R\.B\.C\.", "RBC"],
    ["WHITEBLOODCELL", "WHITE BLOOD CELL"],
    ["REDBLOODCELL", "RED BLOOD CELL"],
    ["MEANCORPUSCULARVOLUME", "MEAN CORPUSCULAR VOLUME"],
    ["MEANCORPUSCULARHEMOGLOBIN", "MEAN CORPUSCULAR HEMOGLOBIN"],
    ["MEANPLATELETVOLUME", "MEAN PLATELET VOLUME"],
    ["REDCELLDISTRIBUTIONWIDTH", "RED CELL DISTRIBUTION WIDTH"],
    ["ABSOLUTENEUTROPHILCOUNT", "ABSOLUTE NEUTROPHIL COUNT"],
    ["ABSOLUTELYMPHOCYTECOUNT", "ABSOLUTE LYMPHOCYTE COUNT"],
    ["ABSOLUTEMONOCYTECOUNT", "ABSOLUTE MONOCYTE COUNT"],
    ["ABSOLUTEEOSINOPHILCOUNT", "ABSOLUTE EOSINOPHIL COUNT"],
    ["ABSOLUTEBASOPHILCOUNT", "ABSOLUTE BASOPHIL COUNT"],
    ["TOTALPROTEIN", "TOTAL PROTEIN"],
    ["ALBUMIN/GLOBULINRATIO", "ALBUMIN/GLOBULIN RATIO"],
    ["ALKALINEPHOSPHATASE", "ALKALINE PHOSPHATASE"],
    ["GAMMAGLUTAMYLTRANSFERASE", "GAMMA GLUTAMYL TRANSFERASE"],
    ["VERYLOWDENSITYLIPOPROTEIN", "VERY LOW DENSITY LIPOPROTEIN"],
    ["CHOLESTEROLLDL", "CHOLESTEROL LDL"],
    ["NONHDLCHOLESTEROL", "NON HDL CHOLESTEROL"],
    ["HDLCHOLESTEROL", "HDL CHOLESTEROL"],
    ["CHOLESTEROL,TOTAL", "CHOLESTEROL, TOTAL"],
    ["TOTALIRONBINDINGCAPACITY", "TOTAL IRON BINDING CAPACITY"],
    ["VITAMINB12", "VITAMIN B12"],
    ["ALANINEAMINOTRANSFERASE", "ALANINE AMINOTRANSFERASE"],
    ["ASPARTATEAMINOTRANSFERASE", "ASPARTATE AMINOTRANSFERASE"],
    ["BILIRUBIN,TOTAL", "BILIRUBIN, TOTAL"],
    ["BILIRUBIN,DIRECT", "BILIRUBIN, DIRECT"],
    ["BILIRUBIN,INDIRECT", "BILIRUBIN, INDIRECT"],
    ["URICACID", "URIC ACID"],
    ["TSH(ULTRASENSITIVE)", "TSH (ULTRASENSITIVE)"],
    ["%SATURATION", "% SATURATION"],
    ["HBA1C", "HbA1c"],
    ["FBS-FASTING BLOOD SUGAR(GLUCOSE)", "FBS - FASTING BLOOD SUGAR (GLUCOSE)"]
  ];

  for (const [from, to] of replacements) name = name.replace(new RegExp(from, "i"), to);

  // PDF text extraction can concatenate a section heading with the first
  // laboratory test on that page. Strip only the known report-heading prefix
  // so the stored terminology remains the actual test name.
  name = name
    .replace(/^Test Report Status Units\s+/i, "")
    .replace(/^HEALTH CHECK-UP PACKAGE\s*-\s*5\s+PLATINUM\s+MALE\s+/i, "")
    .replace(/^BLOOD COUNTS,?\s*EDTA WHOLE BLOOD\s+/i, "")
    .replace(/^IRON AND TIBC STUDIES,?\s*SERUM\s+/i, "")
    .replace(/^LIPID PROFILE WITH CALCULATED LDL,?\s*SERUM\s+/i, "")
    .replace(/^CLINICAL PROFILE\s+/i, "")
    .replace(/^mg\/dL\s+/i, "")
    .replace(/^g\/dL\s+/i, "")
    .replace(/^U\/L\s+/i, "")
    .trim();

  // When a PDF duplicates a long analyte name around the value, prefer the
  // meaningful test portion rather than storing the whole concatenated line.
  const duplicateName = name.match(/^(.*?)(?:\s+serum)?\s+\1$/i);
  if (duplicateName?.[1]) name = duplicateName[1].trim();

  if (/HBA1C/i.test(name)) name = "HbA1c";
  if (/^COMPLETE BLOOD COUNT\s+/i.test(name)) name = name.replace(/^COMPLETE BLOOD COUNT\s+/i, "");
  if (/^PLATELETS COUNT\s+PLATELET COUNT$/i.test(name)) name = "Platelet Count";
  if (/^CREATININE, SERUM CREATININE$/i.test(name)) name = "CREATININE";
  if (/^URIC ACID, SERUM URIC ACID$/i.test(name)) name = "URIC ACID";
  if (/^VITAMIN B12\(CYANOCOBALAMINE\), SERUM VITAMIN B12$/i.test(name)) name = "VITAMIN B12";
  if (/^25\s*-\s*HYDROXYVITAMIN D\(VITAMIN D TOTAL\),?SERUM 25\s*-\s*HYDROXYVITAMIN D$/i.test(name)) name = "VITAMIN D (25-OH)";
  if (/^TSH 3RD GENERATION ULTRASENSITIVE, SERUM TSH \(ULTRASENSITIVE\)$/i.test(name)) name = "TSH (ULTRASENSITIVE)";
  if (/^ERYTHROCYTE SEDIMENTATION RATE .*?E\.S\.R$/i.test(name)) name = "ERYTHROCYTE SEDIMENTATION RATE (ESR)";
  if (/^E\.S\.R$/i.test(name)) name = "ESR";
  if (/^ASPARTATE AMINOTRANSFERASE$/i.test(name)) name = "ASPARTATE AMINOTRANSFERASE (AST/SGOT)";
  return name;
}

function findCandidate(block) {
  for (let i = block.length - 1; i >= Math.max(0, block.length - 8); i -= 1) {
    const line = clean(block[i]);
    if (!line || isNoise(line) || isInterpretationLabel(line)) continue;
    if (/^(?:Pre-diabetes|Diabetes diagnosis|Therapeutic goals|Action suggested|mellitus:|glucose:)/i.test(line)) continue;

    const numbers = getNumbers(line);
    if (!numbers.length) continue;

    const hasReferenceOnLine = looksLikeReference(line);
    const nextLine = clean(block[i + 1] || "");
    const hasReferenceOnNextLine = looksLikeReference(nextLine);

    // A reference must be on the same row or immediately after it. This
    // prevents a result-less row such as BUN 9 mg/dL from borrowing the
    // reference range of the next test.
    if (!hasReferenceOnLine && !hasReferenceOnNextLine) continue;

    const referenceStart = findReferenceStart(line);
    const prefix = line.slice(0, referenceStart);
    const prefixNumbers = getNumbers(prefix);

    if (!prefixNumbers.length) {
      // If the line itself is a range such as "0-1 0-5 /HPF", it is not a
      // numeric result row.
      if (hasReferenceOnLine && /\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?/.test(line)) continue;
      const result = numbers[0];
      return { index: i, value: result.value, valueIndex: result.index, line };
    }

    const result = prefixNumbers[prefixNumbers.length - 1];
    return { index: i, value: result.value, valueIndex: result.index, line };
  }

  return null;
}

function findName(candidate, block) {
  const beforeValue = candidate.line.slice(0, candidate.valueIndex).trim();
  const nameFromLine = normalizeName(beforeValue);

  if (nameFromLine && !isInterpretationLabel(nameFromLine)) {
    if (/^T3$/i.test(nameFromLine) || /^T4$/i.test(nameFromLine)) {
      const heading = block.slice(Math.max(0, candidate.index - 3), candidate.index)
        .map(clean)
        .find((line) => /TOTAL T[34].*SERUM/i.test(line));
      if (heading) return normalizeName(heading);
    }

    // Some PDFs split a long test name over two lines immediately before the
    // method. If the next line is not a reference, it is part of the name.
    const nextLine = clean(block[candidate.index + 1] || "");
    if (nextLine && !looksLikeReference(nextLine) && !isNoise(nextLine) && !isInterpretationLabel(nextLine)) {
      const continuation = normalizeName(`${nameFromLine} ${nextLine}`);
      if (continuation && continuation.length <= 90) return continuation;
    }

    return nameFromLine;
  }

  const previous = block.slice(Math.max(0, candidate.index - 3), candidate.index)
    .map(clean)
    .filter((line) => line && !isNoise(line) && !isInterpretationLabel(line) && !looksLikeReference(line));

  return normalizeName(previous.join(" "));
}

function parseReference(evaluationText, value, resultLine) {
  const text = clean(evaluationText);
  const resultStatus = clean(resultLine);
  const statusPrefix = resultStatus.slice(0, Math.max(0, findReferenceStart(resultStatus)));
  const explicitHigh = /\bHigh\b(?!\s*:)/i.test(statusPrefix);
  const explicitLow = /\bLow\b(?!\s*:)/i.test(statusPrefix);

  const rangeMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/g)]
    .map((m) => ({ min: Number(m[1]), max: Number(m[2]), index: m.index }));
  const lessMatches = [...text.matchAll(/(?:<\s*=|<=|=<|<\s*\/\s*=|<)\s*(?:or\s*=\s*)?(\d+(?:\.\d+)?)/gi)]
    .map((m) => ({ value: Number(m[1]), index: m.index }));
  const greaterMatches = [...text.matchAll(/(?:>\s*=|>=|=>|>\s*\/\s*=|>)\s*(?:or\s*=\s*)?(\d+(?:\.\d+)?)/gi)]
    .map((m) => ({ value: Number(m[1]), index: m.index }));
  const uptoMatches = [...text.matchAll(/(?:up\s*to|upto)\s*(\d+(?:\.\d+)?)/gi)]
    .map((m) => ({ value: Number(m[1]), index: m.index }));

  let referenceMin = null;
  let referenceMax = null;
  let status = null;

  const firstRange = rangeMatches[0];
  const firstLess = lessMatches[0];
  const firstUpto = uptoMatches[0];
  const firstGreater = greaterMatches[0];

  // Use the first reference expression appearing after the result. This avoids
  // treating later interpretation categories such as 200-239 as the primary
  // range when the report first says "Desirable <200".
  const candidates = [
    firstRange ? { type: "range", index: firstRange.index } : null,
    firstLess ? { type: "less", index: firstLess.index } : null,
    firstUpto ? { type: "upto", index: firstUpto.index } : null,
    firstGreater ? { type: "greater", index: firstGreater.index } : null
  ].filter(Boolean).sort((a, b) => a.index - b.index);

  const first = candidates[0];

  if (first?.type === "range") {
    referenceMin = firstRange.min;
    referenceMax = firstRange.max;
    // Some exported reports use 0 - 0 as an empty placeholder rather than
    // a real biological reference interval. Do not classify a result from it.
    if (referenceMin === 0 && referenceMax === 0) {
      return { referenceMin: null, referenceMax: null, status: null };
    }
  } else if (first?.type === "less") {
    referenceMax = firstLess.value;
  } else if (first?.type === "upto") {
    referenceMax = firstUpto.value;
  } else if (first?.type === "greater") {
    referenceMin = firstGreater.value;
  }

  if (explicitHigh) {
    status = "above";
  } else if (explicitLow) {
    status = "below";
  } else if (referenceMin !== null && referenceMax !== null) {
    status = statusFor(value, referenceMin, referenceMax);
  } else if (referenceMax !== null) {
    status = value <= referenceMax ? "within" : "above";
  } else if (referenceMin !== null) {
    status = value >= referenceMin ? "within" : "below";
  }

  // HDL-style reports explicitly define a low cutoff and a high cutoff.
  if (!explicitHigh && !explicitLow && /\bLow\b/i.test(text) && /\bHigh\b/i.test(text) && firstLess && firstGreater) {
    referenceMin = firstLess.value;
    referenceMax = firstGreater.value;
    status = value < referenceMin ? "below" : value >= referenceMax ? "above" : "within";
  }

  return { referenceMin, referenceMax, status };
}

function getReference(candidate, block) {
  const start = findReferenceStart(candidate.line);
  let firstReference = candidate.line.slice(start).trim();

  if (!looksLikeReference(firstReference)) {
    firstReference = clean(block[candidate.index + 1] || "");
  }

  const followingReferences = block
    .slice(candidate.index + 1, candidate.index + 6)
    .map(clean)
    .filter(looksLikeReference);

  const evaluationText = [firstReference, ...followingReferences].filter(Boolean).join(" ");
  const displayReference = firstReference.replace(/^(?:High|Low)\s+/i, "").trim();
  const rawUnit = extractUnit(displayReference) || followingReferences.map(extractUnit).find(Boolean) || extractUnit(candidate.line);
  const unitMap = {
    "g/dl": "g/dL",
    "mg/dl": "mg/dL",
    "ng/ml": "ng/mL",
    "pg/ml": "pg/mL",
    "μg/dl": "μg/dL",
    "μiu/ml": "μIU/mL",
    "u/l": "U/L",
    "fl": "fL",
    "ratio": "RATIO",
    "thou/μl": "thou/μL",
    "mil/μl": "mil/μL"
  };
  const unit = unitMap[rawUnit.toLowerCase()] || rawUnit;

  return { displayReference, evaluationText, unit };
}

function parseBlock(block, method) {
  const candidate = findCandidate(block);
  if (!candidate) return null;

  const testName = findName(candidate, block);
  if (!testName || testName.length > 90) return null;
  if (!isPlausibleTestName(testName)) return null;
  if (/^(?:High|Low|Optimal|Desirable|Near Optimal|Borderline|Very High|Normal)$/i.test(testName)) return null;
  if (/^(?:Reg\.no|ULR No|REFERENCE|Interpretation|The percent)/i.test(testName)) return null;

  const reference = getReference(candidate, block);
  if (!reference.displayReference) return null;

  const parsed = parseReference(reference.evaluationText, candidate.value, candidate.line);
  if (!parsed.status) return null;

  return {
    testName,
    value: candidate.value,
    unit: reference.unit,
    referenceMin: parsed.referenceMin,
    referenceMax: parsed.referenceMax,
    referenceText: reference.displayReference,
    status: parsed.status,
    method: clean(method.replace(/^METHOD\s*:\s*/i, "")),
    explanation: `${testName} is a laboratory measurement reported in the uploaded report.`,
    wellness: ""
  };
}

function isNumericOnly(line = "") {
  const value = clean(line).replace(/,/g, "");
  return /^[-+]?\d+(?:\.\d+)?$/.test(value);
}

function isPlausibleTestName(line = "") {
  const value = clean(line);
  if (!value || isNoise(value) || isInterpretationLabel(value)) return false;
  if (looksLikeReference(value) || isNumericOnly(value)) return false;
  if (/^(?:Description|Sample Collected|Collected on|Patient|Age|Gender|Results?|Units?|Reference|Biological|Lab Parameters|Lab Panel|Disclaimer|Apollo Clinic|Health Report|Final|Page|Interpretation|Test Report Status Units|Upto\b|<|<=|>=|=>)/i.test(value)) return false;
  if (/^(?:The |This |These |Your |During |Being |With |For |It |If |A |An )/i.test(value)) return false;
  if (/[:;]$/.test(value)) return false;
  if (value.length > 90) return false;
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) return false;

  // Laboratory reports commonly use uppercase test names. Also allow normal
  // title case for simpler reports such as the HealthLens sample PDF.
  const upper = (value.match(/[A-Z]/g) || []).length;
  const lower = (value.match(/[a-z]/g) || []).length;
  const looksUppercase = upper >= 2 && upper >= lower;
  const commonLabWord = /hemoglobin|haemoglobin|glucose|cholesterol|triglyceride|platelet|wbc|rbc|vitamin|creatinine|urea|bilirubin|albumin|globulin|thyroid|tsh|t3|t4|eosinophil|lymphocyte|neutrophil|monocyte|basophil|hematocrit|haematocrit|pcv|mcv|mch|mchc|rdw|uric acid|protein|sodium|potassium|calcium|iron|ferritin|esr|crp|insulin|hba1c|a1c|ph|specific gravity|pus cells|epithelial cells|hours|fasting|post meal|prandial/i.test(value);

  return looksUppercase || commonLabWord;
}

function makeParsedResult(testName, value, referenceLine, statusLine = referenceLine, method = "") {
  const parsed = parseReference(referenceLine, value, statusLine);
  if (!parsed.status) return null;
  const unit = extractUnit(referenceLine) || extractUnit(statusLine);
  const normalizedName = normalizeName(testName);
  if (!normalizedName || normalizedName.length > 90 || !isPlausibleTestName(normalizedName)) return null;
  if (/^(?:High|Low|Optimal|Desirable|Near Optimal|Borderline|Very High|Normal)$/i.test(normalizedName)) return null;
  return {
    testName: normalizedName,
    value,
    unit,
    referenceMin: parsed.referenceMin,
    referenceMax: parsed.referenceMax,
    referenceText: clean(referenceLine),
    status: parsed.status,
    method: clean(method),
    explanation: `${normalizedName} is a laboratory measurement reported in the uploaded report.`,
    wellness: ""
  };
}

function parseInlineLabRows(lines = []) {
  const results = [];
  // Layout-aware extraction normally gives a complete laboratory row, e.g.
  // "Haemoglobin : 11.6 gm% 12 - 14.5".
  const rangeAtEnd = /(?:\(\s*)?([-+]?\d+(?:\.\d+)?)\s*[-–]\s*([-+]?\d+(?:\.\d+)?)(?:\s*\))?(?:\s+.*)?$/;
  const valuePattern = /^(.*?)\s*:\s*([-+]?\d+(?:,\d{3})*(?:\.\d+)?)\s*(.*?)\s+(?:\(\s*)?[-+]?\d+(?:\.\d+)?\s*[-–]\s*[-+]?\d+(?:\.\d+)?(?:\s*\))?(?:\s+.*)?$/;

  for (const raw of lines) {
    const line = clean(raw);
    if (!line.includes(":")) continue;
    if (/^(?:Lab\. No\.|Patient|Doctor|Date|Gender|Age|Reference range indicators|Please note|Test Preformed)/i.test(line)) continue;

    const match = line.match(valuePattern);
    if (!match) continue;

    const [, rawName, rawValue, middle] = match;
    const rangeMatch = line.match(rangeAtEnd);
    if (!rangeMatch) continue;

    const testName = normalizeName(rawName);
    const value = Number(rawValue.replace(/,/g, ""));
    if (!Number.isFinite(value) || !isPlausibleTestName(testName)) continue;

    const referenceLine = `${rangeMatch[1]} - ${rangeMatch[2]}`;
    const parsed = makeParsedResult(testName, value, referenceLine, line);
    if (!parsed) continue;

    parsed.unit = extractUnit(middle) || extractUnit(line);
    addUnique(results, parsed);
  }

  return results;
}

function mergeLabContinuationLines(lines = []) {
  const merged = [];
  for (let i = 0; i < lines.length; i += 1) {
    const current = clean(lines[i]);
    const next = clean(lines[i + 1] || "");
    if (current && next && isPlausibleTestName(current) && /^\([^)]{1,40}\)$/.test(next)) {
      merged.push(`${current} ${next}`);
      i += 1;
      continue;
    }
    if (current && next && isPlausibleTestName(current) && looksLikeReference(next)) {
      // Only merge when the next line actually contains an observed value and
      // a reference interval. This joins names split by PDF extraction without
      // merging headings or descriptive paragraphs.
      const numbers = [...next.matchAll(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?/g)];
      if (numbers.length >= 3 || /[-+]?\d+(?:\.\d+)?\s*[-–]\s*[-+]?\d+(?:\.\d+)?/.test(next)) {
        merged.push(`${current} ${next}`);
        i += 1;
        continue;
      }
    }
    merged.push(current);
  }
  return merged;
}

function parseGenericInlineRows(lines = []) {
  const results = [];
  lines = mergeLabContinuationLines(lines);
  // Handles rows without a colon, common in exported reports:
  // "TOTAL CHOLESTEROL 170 mg/dL 0 - 199.99 mg/dL"
  const rangePattern = /(?:\(\s*)?([-+]?\d+(?:\.\d+)?)\s*[-–]\s*([-+]?\d+(?:\.\d+)?)(?:\s*\))?/;

  for (const raw of lines) {
    const line = clean(raw).replace(/\*/g, " ").replace(/\s+/g, " ").trim();
    if (!line || line.includes(":") || /Sample Collected on/i.test(line)) continue;
    const rangeMatch = line.match(rangePattern);
    if (!rangeMatch) continue;
    const rangeIndex = rangeMatch.index;
    if (!Number.isInteger(rangeIndex)) continue;

    const beforeRange = line.slice(0, rangeIndex).trim();
    const numberMatches = [...beforeRange.matchAll(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?/g)];
    if (!numberMatches.length) continue;
    const valueMatch = numberMatches[numberMatches.length - 1];
    const value = Number(valueMatch[0].replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;

    const rawName = beforeRange.slice(0, valueMatch.index).trim();
    const testName = normalizeName(rawName);
    if (!isPlausibleTestName(testName)) continue;
    if (/^(?:Description|Reference range|Observed values|Test parameters|Normal|Desirable|High|Low|Blood|Glands|Heart|Kidney|Vitamins|Stomach|Lab Panel Results|Purpose of Visit)/i.test(testName)) continue;

    const referenceLine = `${rangeMatch[1]} - ${rangeMatch[2]}`;
    const parsed = makeParsedResult(testName, value, referenceLine, line);
    if (!parsed) continue;

    const middle = beforeRange.slice(valueMatch.index + valueMatch[0].length).trim();
    parsed.unit = extractUnit(middle) || extractUnit(line);
    addUnique(results, parsed);
  }

  return results;
}

function parseVerticalRows(lines = []) {
  const results = [];

  for (let i = 0; i < lines.length; i += 1) {
    const valueLine = clean(lines[i]);
    // PDF extraction often leaves a colon before the observed value, e.g.
    // ": 176.0". Accept that form as well as a bare numeric line.
    const valueMatch = valueLine.match(/^:?\s*([-+]?\d+(?:,\d{3})*(?:\.\d+)?)\s*$/);
    if (!valueMatch) continue;

    const value = Number(valueMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;

    let referenceIndex = -1;
    for (let j = i + 1; j <= Math.min(lines.length - 1, i + 3); j += 1) {
      if (looksLikeReference(lines[j])) {
        referenceIndex = j;
        break;
      }
      if (/^:?\s*[-+]?\d+(?:,\d{3})*(?:\.\d+)?\s*$/.test(clean(lines[j]))) break;
    }
    if (referenceIndex === -1) continue;

    const referenceLine = clean(lines[referenceIndex]);
    const parsed = parseReference(referenceLine, value, valueLine);
    if (!parsed.status) continue;

    // Find the nearest plausible test name before the result.
    let nameIndex = -1;
    for (let j = i - 1; j >= Math.max(0, i - 4); j -= 1) {
      const candidate = clean(lines[j]);
      if (isPlausibleTestName(candidate)) {
        nameIndex = j;
        break;
      }
    }
    if (nameIndex === -1) continue;

    let testName = normalizeName(lines[nameIndex]);
    const previous = clean(lines[nameIndex - 1] || "");
    if (previous && isPlausibleTestName(previous) && previous.length < 55 &&
        /(?:\(|,|\b(?:TOTAL|COUNT|PROFILE|TEST|SERUM|BLOOD|URINE|VITAMIN|GLUCOSE|CHOLESTEROL|HEMOGLOBIN|HAEMOGLOBIN|HOURS|FASTING|PRANDIAL|POST)\b)/i.test(testName)) {
      const combined = normalizeName(`${previous} ${testName}`);
      if (combined.length <= 90) testName = combined;
    }

    const unitLines = lines.slice(i + 1, referenceIndex).map(clean).filter(Boolean);
    const unit = unitLines.map(extractUnit).find(Boolean) || extractUnit(referenceLine);
    const result = makeParsedResult(testName, value, referenceLine, valueLine);
    if (result) {
      result.unit = unit || result.unit;
      addUnique(results, result);
    }
  }

  return results;
}

function parseColumnarRows(lines = []) {
  const results = [];
  // Handles PDFs whose table is extracted vertically as:
  // Test name -> ": value" -> unit -> reference range.
  for (let i = 0; i < lines.length; i += 1) {
    const valueMatch = clean(lines[i]).match(/^:?\s*([-+]?\d+(?:,\d{3})*(?:\.\d+)?)\s*$/);
    if (!valueMatch) continue;
    const value = Number(valueMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;

    let referenceIndex = -1;
    for (let j = i + 1; j <= Math.min(lines.length - 1, i + 3); j += 1) {
      if (looksLikeReference(lines[j])) { referenceIndex = j; break; }
    }
    if (referenceIndex === -1) continue;

    let nameIndex = -1;
    for (let j = i - 1; j >= Math.max(0, i - 5); j -= 1) {
      const candidate = clean(lines[j]);
      if (isPlausibleTestName(candidate)) { nameIndex = j; break; }
    }
    if (nameIndex === -1) continue;

    let testName = normalizeName(lines[nameIndex]);
    if (/^(?:Test parameters|Observed values|Reference range|Patient|Doctor|Date|Gender|Age)$/i.test(testName)) continue;

    const unit = lines.slice(i + 1, referenceIndex).map(clean).map(extractUnit).find(Boolean) || extractUnit(lines[referenceIndex]);
    const result = makeParsedResult(testName, value, lines[referenceIndex], lines[i]);
    if (result) { result.unit = unit || result.unit; addUnique(results, result); }
  }
  return results;
}

function addUnique(results, result) {
  if (!result) return;
  const key = `${normalizeName(result.testName).toLowerCase()}|${result.value}|${result.referenceText}`;
  if (!results.some((item) => `${normalizeName(item.testName).toLowerCase()}|${item.value}|${item.referenceText}` === key)) {
    results.push(result);
  }
}

export async function parseReportText(text) {
  const lines = String(text || "").split(/\r?\n/).map(clean);
  const results = [];
  const labLines = mergeLabContinuationLines(lines);

  // First pass: preserve the highly structured Agilus-style reports that
  // explicitly place METHOD after each result.
  let blockStart = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (!isMethod(lines[i])) continue;
    addUnique(results, parseBlock(lines.slice(blockStart, i), lines[i]));
    blockStart = i + 1;
  }

  // Second pass: many valid laboratory PDFs do not contain METHOD lines.
  // Support inline table rows and PDFs whose table columns are extracted
  // vertically. These passes are intentionally conservative and deduplicated.
  for (const result of parseInlineLabRows(labLines)) addUnique(results, result);
  for (const result of parseGenericInlineRows(labLines)) addUnique(results, result);
  for (const result of parseVerticalRows(labLines)) addUnique(results, result);
  for (const result of parseColumnarRows(labLines)) addUnique(results, result);

  return results;
}
