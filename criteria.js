// criteria.js - Unified criteria for both Residential and Commercial
window.CRITERIA_CONFIG = {
  Residential: {
    propertyQuestions: [
      {
        key: "hmo",
        label: "HMO",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Up to 6 beds (Tier 2)", tier: 2 },
          { label: "More than 6 beds (Tier 3)", tier: 3 },
        ],
      },
      {
        key: "mufb",
        label: "MUFB",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Up to 6 units (Tier 2)", tier: 2 },
          { label: "Less than 30 units (Tier 3)", tier: 3 },
        ],
      },
      {
        key: "holiday",
        label: "Holiday Let?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 3 },
        ],
      },
      {
        key: "flatAboveComm",
        label: "Flat above commercial?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
    ],
    applicantQuestions: [
      {
        key: "expat",
        label: "Expat",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Yes - UK footprint (Tier 2)", tier: 2 },
          { label: "Yes - Without UK footprint (Tier 3)", tier: 3 },
        ],
      },
      {
        key: "fnational",
        label: "Foreign National",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Yes - with ILR (Tier 2)", tier: 2 },
          { label: "Yes - Without ILR (Tier 3)", tier: 3 },
        ],
      },
      {
        key: "ftl",
        label: "First Time Landlord?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
      {
        key: "offshore",
        label: "Offshore company?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 3 },
        ],
      },
      {
        key: "mortgageArrears",
        label: "Mortgage Arrears (in last 24 months)",
        options: [
          { label: "No", tier: 1 },
          { label: "0 in 24", tier: 1 },
          { label: "0 in 18", tier: 2 },
          { label: "Any (by referral)", tier: 3 },
        ],
      },

      {
        key: "unsecuredArrears",
        label: "Unsecured Arrears (in last 24 months)",
        options: [
          { label: "No", tier: 1 },
          { label: "0 in 24", tier: 1 },
          { label: "0 in 12", tier: 2 },
          { label: "Any (by referral)", tier: 3 },
        ],
      },
      {
  key: "ccjDefault",
  label: "CCJ & Default (last 24 months)",
  helper: "Ignore <£350, telecom, utility",  // ✅ <- Add this line
  options: [
    { label: "No", tier: 1 },
    { label: "0 in 24", tier: 1 },
    { label: "0 in 18", tier: 2 },
    { label: "Any (by referral)", tier: 3 },
  ],
},

      {
        key: "bankruptcy",
        label: "Bankruptcy",
        options: [
          { label: "Never", tier: 1 },
          { label: "Discharged (by referral)", tier: 3 },
        ],
      },
    ],
  },

  Commercial: {
    propertyQuestions: [
      {
        key: "hmo",
        label: "HMO",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Up to 12 beds (Tier 1)", tier: 1 },
          { label: "More than 12 beds (Tier 2)", tier: 2 },
        ],
      },
      {
        key: "mufb",
        label: "MUFB",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Up to 12 units (Tier 1)", tier: 1 },
          { label: "More than 12 units (Tier 2)", tier: 2 },
        ],
      },
      {
        key: "ownerocc",
        label: "Owner Occupier?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
      {
        key: "devexit",
        label: "Developer Exit?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
    ],
    applicantQuestions: [
      {
        key: "expat",
        label: "Expat",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Yes (Tier 2)", tier: 2 },
        ],
      },{
        key: "fnational",
        label: "Foreign National",
        options: [
          { label: "No (Tier 1)", tier: 1 },
          { label: "Yes (Tier 2)", tier: 2 },
        ],
      },
      {
        key: "ftl",
        label: "First Time Landlord?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
      {
        key: "offshore",
        label: "Offshore Company?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
      {
  key: "mortgageArrears",
  label: "Mortgage Arrears",
  options: [
    { label: "No", tier: 1 },
    { label: "2 in 18, 0 in 6", tier: 1 },
    { label: "All considered by referral", tier: 2 },
  ],
},
{
  key: "unsecuredArrears",
  label: "Unsecured Arrears",
  options: [
    { label: "No", tier: 1 },
    { label: "2 in last 18", tier: 1 },
    { label: "All considered by referral", tier: 2 },
  ],
},{
  key: "ccjDefault",
  label: "CCJ & Default",
  helper: "Ignore <£350, telecom, utility",
  options: [
    { label: "No", tier: 1 },
    { label: "2 in 18, 0 in 6", tier: 1 },
    { label: "All considered by referral", tier: 2 },
  ],
},{
  key: "bankruptcy",
  label: "Bankruptcy",
  options: [
    { label: "Never", tier: 1 },
    { label: "Discharged > 3 years", tier: 1 },
    { label: "All considered by referral", tier: 2 },
  ],
},
    ],
  },

  /* --------------------------- CENTRAL MAX LTV RULES --------------------------- */
  // Add this block inside window.CRITERIA_CONFIG in criteria.js,
  // ensuring the correct max LTVs for each property type and rule are defined.

  maxLTVRules: {
    default: {
      Residential: 75,
      Commercial: 70, // <-- This is the likely source of your 65% issue if propertyType is Commercial
      "Semi-Commercial": 70,
    },
    retention: {
      // Maps Property Type -> Loan LTV (from drop-down) -> Actual Max LTV
      Residential: { 75: 75, 65: 65 },
      Commercial: { 75: 70, 65: 65 }, // Example: Retention 75% Commercial capped at 70%
      "Semi-Commercial": { 75: 70, 65: 65 },
    },
    flatAboveCommOverrides: {
      "Tier 2": 60, // <-- This can cap Residential at 60% if Flat Above Comm is 'Yes' and tier is 2
      "Tier 3": 70,
    },
  },
};
