/* ============================
   RATES.JS — Unified for Resi + Commercial + Retention
   ============================ */

/* ---------- Residential Rates ---------- */
window.RATES = {
  "Tier 1": {
    products: {
      "2yr Fix": { 6: 0.0589, 4: 0.0639, 3: 0.0679, 2: 0.0719 },
      "3yr Fix": { 6: 0.0639, 4: 0.0679, 3: 0.0719, 2: 0.0749 },
      "2yr Tracker": { 6: 0.0159, 4: 0.0209, 3: 0.0249, 2: 0.0289, isMargin: true },
    },
  },
  "Tier 2": {
    products: {
      "2yr Fix": { 6: 0.0639, 4: 0.0679, 3: 0.0719, 2: 0.0749 },
      "3yr Fix": { 6: 0.0679, 4: 0.0719, 3: 0.0759, 2: 0.0789 },
      "2yr Tracker": { 6: 0.0209, 4: 0.0259, 3: 0.0299, 2: 0.0339, isMargin: true },
    },
  },
  "Tier 3": {
    products: {
      "2yr Fix": { 6: 0.0729, 4: 0.0779, 3: 0.0819, 2: 0.0849 },
      "3yr Fix": { 6: 0.0769, 4: 0.0809, 3: 0.0849, 2: 0.0879 },
      "2yr Tracker": { 6: 0.0239, 4: 0.0289, 3: 0.0329, 2: 0.0369, isMargin: true },
    },
  },
};

window.PRODUCT_TYPES = ["2yr Fix", "3yr Fix", "2yr Tracker"];
window.MIN_LOAN = 150000;
window.MAX_LOAN = 3000000;
window.STANDARD_BBR = 0.0400;
window.STRESS_BBR = 0.0425;
window.TERM_MONTHS = { "2yr Fix": 24, "3yr Fix": 36, "2yr Tracker": 24 };
window.TOTAL_TERM = 10;
window.CURRENT_MVR = 0.0859;

/* ---------- Commercial / Semi-Commercial Rates ---------- */
window.RATES_Commercial = {
  "Tier 1": {
    products: {
      "3yr Fix": { 6: 0.0719, 4: 0.0789, 2: 0.0859 },
      "2yr Fix": { 6: 0.0659, 4: 0.0749, 2: 0.0859 },
      "2yr Tracker": { 6: 0.0269, 4: 0.0369, 2: 0.0474, isMargin: true },
    },
  },
  "Tier 2": {
    products: {
      "3yr Fix": { 6: 0.0749, 4: 0.0819, 2: 0.0889 },
      "2yr Fix": { 6: 0.0699, 4: 0.0789, 2: 0.0899 },
      "2yr Tracker": { 6: 0.0319, 4: 0.0419, 2: 0.0524, isMargin: true },
    },
  },
};

window.PRODUCT_TYPES_Commercial = ["2yr Fix", "3yr Fix", "2yr Tracker"];
window.MIN_LOAN_Commercial = 150000;
window.MAX_LOAN_Commercial = 2000000;
window.STANDARD_BBR_Commercial = 0.04;
window.STRESS_BBR_Commercial = 0.0425;
window.TERM_MONTHS_Commercial = { "2yr Fix": 24, "3yr Fix": 36, "2yr Tracker": 24 };
window.TOTAL_TERM_Commercial = 10;
window.CURRENT_MVR_Commercial = 0.0859;

/* ---------- Retention Adjusted Rates ---------- */
function cloneAndAdjustRates(baseRates, adj) {
  const adjusted = {};
  for (const tier in baseRates) {
    adjusted[tier] = { products: {} };
    for (const p in baseRates[tier].products) {
      const prod = baseRates[tier].products[p];
      const newProd = {};
      for (const k in prod) {
        if (k === "isMargin") newProd[k] = prod[k];
        else newProd[k] = +(prod[k] - adj).toFixed(4);
      }
      adjusted[tier].products[p] = newProd;
    }
  }
  return adjusted;
}

// Retention -65% LTV (−0.40%)
window.RATES_Retention_65 = {
  Residential: cloneAndAdjustRates(window.RATES, 0.004),
  Commercial: cloneAndAdjustRates(window.RATES_Commercial, 0.004),
};

// Retention -75% LTV (−0.30%)
window.RATES_Retention_75 = {
  Residential: cloneAndAdjustRates(window.RATES, 0.003),
  Commercial: cloneAndAdjustRates(window.RATES_Commercial, 0.003),
};

// Retention Fee Adjustments
window.RETENTION_FEE_ADJUST = {
  arrangement: -0.005,
  proc: -0.005,
};

/* ---------- Notes ----------
- Retention 65% and 75% apply -0.4% / -0.3% to all base rates.
- Arrangement & Proc fees are automatically reduced by 0.5%.
- Commercial and Semi-Commercial use the same tables.
-------------------------------- */
