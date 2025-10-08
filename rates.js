/* ============================
   RATES.JS — Full Retention Support (Resi Tiers 1-3 + Commercial)
   ============================ */

/* ---------- Residential Base Rates ---------- */
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

/* ---------- Commercial Base Rates ---------- */
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

/* ---------- Retention Rates ---------- */
const feeLevels = [5.5, 3.5, 2.5, 1.5];

window.RATES_Retention_65 = {
  Residential: {
    "Tier 1": {
      products: {
        "2yr Fix": { 5.5: 0.0529, 3.5: 0.0559, 2.5: 0.0589, 1.5: 0.0619 },
        "3yr Fix": { 5.5: 0.0569, 3.5: 0.0599, 2.5: 0.0629, 1.5: 0.0659 },
        "2yr Tracker": {
          5.5: 0.0119, 3.5: 0.0149, 2.5: 0.0179, 1.5: 0.0209,
          isMargin: true,
        },
      },
    },
    "Tier 2": {
      products: {
        "2yr Fix": { 5.5: 0.0559, 3.5: 0.0589, 2.5: 0.0619, 1.5: 0.0649 },
        "3yr Fix": { 5.5: 0.0599, 3.5: 0.0629, 2.5: 0.0659, 1.5: 0.0689 },
        "2yr Tracker": {
          5.5: 0.0149, 3.5: 0.0179, 2.5: 0.0209, 1.5: 0.0239,
          isMargin: true,
        },
      },
    },
    "Tier 3": {
      products: {
        "2yr Fix": { 5.5: 0.0609, 3.5: 0.0639, 2.5: 0.0669, 1.5: 0.0699 },
        "3yr Fix": { 5.5: 0.0649, 3.5: 0.0679, 2.5: 0.0709, 1.5: 0.0739 },
        "2yr Tracker": {
          5.5: 0.0189, 3.5: 0.0219, 2.5: 0.0249, 1.5: 0.0279,
          isMargin: true,
        },
      },
    },
  },
  Commercial: {
    "Tier 1": {
      products: {
        "2yr Fix": { 5.5: 0.0579, 3.5: 0.0609,  1.5: 0.0669 },
        "3yr Fix": { 5.5: 0.0619, 3.5: 0.0649,  1.5: 0.0709 },
        "2yr Tracker": {
          5.5: 0.0219, 3.5: 0.0249,  1.5: 0.0309,
          isMargin: true,
        },
      },
    },
    "Tier 2": {
      products: {
        "2yr Fix": { 5.5: 0.0609, 3.5: 0.0639,  1.5: 0.0699 },
        "3yr Fix": { 5.5: 0.0649, 3.5: 0.0679,  1.5: 0.0739 },
        "2yr Tracker": {
          5.5: 0.0249, 3.5: 0.0279,  1.5: 0.0339,
          isMargin: true,
        },
      },
    },
  },
};

window.RATES_Retention_75 = {
  Residential: {
    "Tier 1": {
      products: {
        "2yr Fix": { 5.5: 0.0539, 3.5: 0.0569, 2.5: 0.0599, 1.5: 0.0629 },
        "3yr Fix": { 5.5: 0.0579, 3.5: 0.0609, 2.5: 0.0639, 1.5: 0.0669 },
        "2yr Tracker": {
          5.5: 0.0129, 3.5: 0.0159, 2.5: 0.0189, 1.5: 0.0219,
          isMargin: true,
        },
      },
    },
    "Tier 2": {
      products: {
        "2yr Fix": { 5.5: 0.0569, 3.5: 0.0599, 2.5: 0.0629, 1.5: 0.0659 },
        "3yr Fix": { 5.5: 0.0609, 3.5: 0.0639, 2.5: 0.0669, 1.5: 0.0699 },
        "2yr Tracker": {
          5.5: 0.0159, 3.5: 0.0189, 2.5: 0.0219, 1.5: 0.0249,
          isMargin: true,
        },
      },
    },
    "Tier 3": {
      products: {
        "2yr Fix": { 5.5: 0.0619, 3.5: 0.0649, 2.5: 0.0679, 1.5: 0.0709 },
        "3yr Fix": { 5.5: 0.0659, 3.5: 0.0689, 2.5: 0.0719, 1.5: 0.0749 },
        "2yr Tracker": {
          5.5: 0.0199, 3.5: 0.0229, 2.5: 0.0259, 1.5: 0.0289,
          isMargin: true,
        },
      },
    },
  },
  Commercial: {
    "Tier 1": {
      products: {
        "2yr Fix": { 5.5: 0.0589, 3.5: 0.0619,  1.5: 0.0679 },
        "3yr Fix": { 5.5: 0.0629, 3.5: 0.0659,  1.5: 0.0719 },
        "2yr Tracker": {
          5.5: 0.0229, 3.5: 0.0259, 1.5: 0.0319,
          isMargin: true,
        },
      },
    },
    "Tier 2": {
      products: {
        "2yr Fix": { 5.5: 0.0619, 3.5: 0.0649,  1.5: 0.0709 },
        "3yr Fix": { 5.5: 0.0659, 3.5: 0.0689,  1.5: 0.0749 },
        "2yr Tracker": {
          5.5: 0.0259, 3.5: 0.0289,  1.5: 0.0349,
          isMargin: true,
        },
      },
    },
  },
};
window.FEE_COLUMN_KEYS = {
  Residential: [6, 4, 3, 2],
  Commercial: [6, 4, 2],

  RetentionResidential: [5.5, 3.5, 2.5, 1.5],
  RetentionCommercial: [5.5, 3.5, 1.5],
};
window.LOAN_LIMITS = {
  Residential: {
    MAX_ROLLED_MONTHS: 9,
    MAX_DEFERRED_FIX: 0.0125,
    MAX_DEFERRED_TRACKER: 0.02,
    MIN_ICR_FIX: 1.25,
    MIN_ICR_TRK: 1.30,
    TOTAL_TERM: 10,
  },
  Commercial: {
    MAX_ROLLED_MONTHS: 6,
    MAX_DEFERRED_FIX: 0.0125,
    MAX_DEFERRED_TRACKER: 0.015,
    MIN_ICR_FIX: 1.30,
    MIN_ICR_TRK: 1.35,
    TOTAL_TERM: 10,
  },
  "Semi-Commercial": {
    MAX_ROLLED_MONTHS: 6,
    MAX_DEFERRED_FIX: 0.0125,
    MAX_DEFERRED_TRACKER: 0.015,
    MIN_ICR_FIX: 1.25,
    MIN_ICR_TRK: 1.30,
    TOTAL_TERM: 10,
  },
};
