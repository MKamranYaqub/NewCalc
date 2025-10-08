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
        key: "adverse",
        label: "Adverse Credit?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 1 },
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
        label: "Expat / Foreign National",
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
        key: "adverse",
        label: "Adverse Credit?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 1 },
        ],
      },
    ],
  },

  /* --------------------------- CENTRAL MAX LTV RULES --------------------------- */
  maxLTVRules: {
    default: {
      Residential: 75,
      Commercial: 70,
    },
    retention: {
      Residential: {
        65: 75,
        75: 75,
      },
      Commercial: {
        65: 75,
        75: 75,
      },
    },
    flatAboveCommOverrides: {
      "Tier 2": 60,
      "Tier 3": 70,
    },
  },
};
