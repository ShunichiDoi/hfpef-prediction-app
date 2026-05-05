const form = document.querySelector("#predictionForm");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const sampleBtn = document.querySelector("#sampleBtn");

const $ = (name) => form.elements[name];
const value = (name) => {
  const raw = $(name)?.value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};
const checked = (name) => Boolean($(name)?.checked);
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));

function syncBmi(changed) {
  const height = value("height") / 100;
  const weight = value("weight");
  if (changed === "bmi" || !height || !weight) return;
  $("bmi").value = (weight / (height * height)).toFixed(1);
}

function h2fpef() {
  let score = 0;
  const details = [];
  if (value("bmi") > 30) {
    score += 2;
    details.push("BMI >30: +2");
  }
  if (value("antihypertensives") >= 2) {
    score += 1;
    details.push("抗高血圧薬2剤以上: +1");
  }
  if (checked("af")) {
    score += 3;
    details.push("心房細動: +3");
  }
  if (value("pasp") > 35) {
    score += 1;
    details.push("PASP >35: +1");
  }
  if (value("age") > 60) {
    score += 1;
    details.push("年齢 >60: +1");
  }
  if (value("eePrime") > 9) {
    score += 1;
    details.push("E/e' >9: +1");
  }
  return { score, probability: score / 9, details };
}

function hfpefAba() {
  const af = checked("af") ? 1 : 0;
  const logit =
    -7.78875077116607 +
    0.0625642747159337 * value("age") +
    0.135149246234458 * value("bmi") +
    2.04080564803471 * af;
  const probability = sigmoid(logit);
  return {
    score: probability,
    probability,
    details: [
      `logit = ${logit.toFixed(2)}`,
      `年齢 ${value("age")}、BMI ${value("bmi").toFixed(1)}、AF ${af}`,
    ],
  };
}

function hfaPeff() {
  const age = value("age");
  const male = $("sex").value === "male";
  const af = checked("af");
  const septalCut = age >= 75 ? 5 : 7;
  const lateralCut = age >= 75 ? 7 : 10;

  const functionalMajor =
    value("septalE") > 0 && value("septalE") < septalCut ||
    value("lateralE") > 0 && value("lateralE") < lateralCut ||
    value("eePrime") >= 15 ||
    value("trVmax") > 2.8 ||
    value("pasp") > 35;
  const functionalMinor =
    (value("eePrime") >= 9 && value("eePrime") <= 14) ||
    (value("gls") > 0 && value("gls") < 16);
  const functional = functionalMajor ? 2 : functionalMinor ? 1 : 0;

  const laviMajor = af ? value("lavi") > 40 : value("lavi") > 34;
  const laviMinor = af
    ? value("lavi") >= 34 && value("lavi") <= 40
    : value("lavi") >= 29 && value("lavi") <= 34;
  const lvmiMajor = male
    ? value("lvmi") >= 149 && value("rwt") > 0.42
    : value("lvmi") >= 122 && value("rwt") > 0.42;
  const lvmiMinor = male ? value("lvmi") >= 115 : value("lvmi") >= 95;
  const morphologicalMajor = laviMajor || lvmiMajor;
  const morphologicalMinor =
    laviMinor || lvmiMinor || value("rwt") > 0.42 || value("wallThickness") >= 12;
  const morphological = morphologicalMajor ? 2 : morphologicalMinor ? 1 : 0;

  const bnp = value("bnp");
  const ntprobnp = value("ntprobnp");
  const biomarkerMajor = af
    ? ntprobnp > 660 || bnp > 240
    : ntprobnp > 220 || bnp > 80;
  const biomarkerMinor = af
    ? (ntprobnp >= 365 && ntprobnp <= 660) || (bnp >= 105 && bnp <= 240)
    : (ntprobnp >= 125 && ntprobnp <= 220) || (bnp >= 35 && bnp <= 80);
  const biomarker = biomarkerMajor ? 2 : biomarkerMinor ? 1 : 0;

  const score = functional + morphological + biomarker;
  return {
    score,
    probability: score / 6,
    details: [
      `Functional ${functional}/2`,
      `Morphological ${morphological}/2`,
      `Biomarker ${biomarker}/2`,
    ],
  };
}

function breath2() {
  let score = 0;
  const details = [];
  if (value("ntprobnp") >= 125 || value("bnp") >= 35) {
    score += 2;
    details.push("NP上昇: +2");
  }
  if (value("ctr") >= 50) {
    score += 1;
    details.push("CTR >=50%: +1");
  }
  if (value("age") >= 65) {
    score += 2;
    details.push("年齢 >=65: +2");
  }
  if (checked("af")) {
    score += 1;
    details.push("心房細動: +1");
  }
  if (checked("cad")) {
    score += 1;
    details.push("冠動脈疾患: +1");
  }
  const anemiaCut = $("sex").value === "male" ? 13 : 12;
  if (value("hemoglobin") > 0 && value("hemoglobin") < anemiaCut) {
    score += 1;
    details.push("貧血: +1");
  }
  if (value("lvVoltage") >= 35) {
    score += 1;
    details.push("LV高電位: +1");
  }
  const probabilityMap = [
    0.04, 0.04, 0.19, 0.19, 0.5, 0.5, 0.77, 0.77, 0.93, 0.93,
  ];
  return { score, probability: probabilityMap[score] ?? 0.93, details };
}

function combinedModel(parts) {
  const h2 = parts.h2.probability;
  const aba = parts.aba.probability;
  const hfa = parts.hfa.probability;
  const br = parts.br.probability;
  const logit =
    -2.1 +
    value("wH2") * h2 +
    value("wAba") * aba +
    value("wHfa") * hfa +
    value("wBreath") * br;
  return sigmoid(logit);
}

function category(probability) {
  if (probability < 0.25) {
    return ["低リスク", "HFpEF以外の原因も含めて評価する層です。", "ok"];
  }
  if (probability < 0.65) {
    return ["中間リスク", "追加検査や専門医紹介を検討する層です。", "warn"];
  }
  return ["高リスク", "HFpEF精査と治療評価を強く検討する層です。", "danger"];
}

function explainRow(name, value01) {
  const percent = Math.round(value01 * 100);
  return `
    <div class="explain-row">
      <strong>${name}</strong>
      <div class="bar" style="--value:${clamp(value01)}"><span></span></div>
      <span>${percent}%</span>
    </div>
  `;
}

function render(changed) {
  syncBmi(changed);
  const parts = {
    h2: h2fpef(),
    aba: hfpefAba(),
    hfa: hfaPeff(),
    br: breath2(),
  };
  const combined = combinedModel(parts);
  const [cat, action, tone] = category(combined);

  document.querySelector("#h2fpefScore").textContent = parts.h2.score;
  document.querySelector("#abaProbability").textContent = Math.round(parts.aba.probability * 100);
  document.querySelector("#hfaPeffScore").textContent = parts.hfa.score;
  document.querySelector("#breath2Score").textContent = parts.br.score;
  document.querySelector("#combinedRisk").textContent = `${Math.round(combined * 100)}%`;
  document.querySelector("#combinedCategory").textContent = cat;
  document.querySelector("#combinedAction").textContent = action;
  document.querySelector("#riskRing").style.setProperty("--risk", combined.toFixed(3));
  document.querySelector("#riskRing").style.setProperty(
    "--accent",
    tone === "danger" ? "#be123c" : tone === "warn" ? "#b45309" : "#047857"
  );

  document.querySelector("#modelExplain").innerHTML =
    explainRow("H2FPEF", parts.h2.probability) +
    explainRow("HFpEF-ABA", parts.aba.probability) +
    explainRow("HFA-PEFF", parts.hfa.probability) +
    explainRow("BREATH2", parts.br.probability);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.tab));
  });
});

form.addEventListener("input", (event) => render(event.target.name));
form.addEventListener("change", (event) => render(event.target.name));

sampleBtn.addEventListener("click", () => {
  const values = {
    age: 76,
    sex: "female",
    height: 154,
    weight: 74,
    antihypertensives: 3,
    bnp: 145,
    ntprobnp: 720,
    hemoglobin: 11.2,
    ctr: 54,
    lvVoltage: 42,
    eePrime: 16,
    pasp: 46,
    trVmax: 3.1,
    septalE: 4.8,
    lateralE: 6.9,
    gls: 14.5,
    lavi: 48,
    lvmi: 126,
    rwt: 0.47,
    wallThickness: 13,
  };
  Object.entries(values).forEach(([key, next]) => {
    if ($(key)) $(key).value = next;
  });
  $("af").checked = true;
  $("cad").checked = true;
  render("sample");
});

render();
