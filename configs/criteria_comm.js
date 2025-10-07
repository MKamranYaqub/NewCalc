// criteria_comm.js
window.CRITERIA_COMM = {
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
    ],
  
    adverseQuestions: [
      {
        key: "adverse",
        label: "Adverse Credit?",
        options: [
          { label: "No", tier: 1 },
          { label: "Yes", tier: 2 },
        ],
      },
      {
        key: "mortArrears",
        label: "Mortgage Arrears",
        options: [
          { label: "No", tier: 1 },
          { label: "2 in 18, 0 in 6", tier: 1 },
          { label: "Other, more recent", tier: 2 },
        ],
      },
      {
        key: "unsArrears",
        label: "Unsecured Arrears",
        options: [
          { label: "No", tier: 1 },
          { label: "2 in last 18", tier: 1 },
          { label: "Other, more recent", tier: 2 },
        ],
      },
      {
        key: "ccjDefault",
        label: "CCJ & Defaults",
        options: [
          { label: "No", tier: 1 },
          { label: "2 in 18, 0 in 6", tier: 1 },
          { label: "Other, more recent", tier: 2 },
        ],
      },
      {
        key: "bankruptcy",
        label: "Bankruptcy",
        options: [
          { label: "Never", tier: 1 },
          { label: "Discharged >3yrs", tier: 1 },
          { label: "Other, more recent", tier: 2 },
        ],
      },
    ],
  
    tierRules: {
      // you can add weighting logic here later
      maxTier: 2,
      mapping: {
        ownerocc: { Yes: 2, No: 1 },
        devexit: { Yes: 2, No: 1 },
        flatAboveComm: { Yes: 2, No: 1 },
        expat: { "Yes (Tier 2)": 2, "No (Tier 1)": 1 },
        ftl: { Yes: 2, No: 1 },
        offshore: { Yes: 2, No: 1 },
      },
    },
  };
  