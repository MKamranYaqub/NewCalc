// --- Rates (string keys for 6/4/3/2 columns) ---
window.RATES = {
  "Tier 1": {
    products: {
      "2yr Fix": { 6: 0.0589, 4: 0.0679, 3: 0.0739, 2: 0.0789 },
      "3yr Fix": { 6: 0.0639, 4: 0.0709, 3: 0.0746, 2: 0.0779 },
      "2yr Tracker": {
        6: 0.0159,
        4: 0.0259,
        3: 0.0314,
        2: 0.0364,
        isMargin: true,
      },
    },
  },
  "Tier 2": {
    products: {
      "2yr Fix": { 6: 0.0639, 4: 0.0729, 3: 0.0789, 2: 0.0839 },
      "3yr Fix": { 6: 0.0689, 4: 0.0759, 3: 0.0796, 2: 0.0829 },
      "2yr Tracker": {
        6: 0.0209,
        4: 0.0309,
        3: 0.0364,
        2: 0.0414,
        isMargin: true,
      },
    },
  },
  "Tier 3": {
    products: {
      "2yr Fix": { 6: 0.0679, 4: 0.0769, 3: 0.0829, 2: 0.0879 },
      "3yr Fix": { 6: 0.0729, 4: 0.0799, 3: 0.0836, 2: 0.0869 },
      "2yr Tracker": {
        6: 0.0239,
        4: 0.0339,
        3: 0.0394,
        2: 0.0444,
        isMargin: true,
      },
    },
  },
};

// --- Build the format calc.js expects: window.rates ---
window.rates = {};
window.PRODUCT_TYPES = ["2yr Fix", "3yr Fix", "2yr Tracker"];
window.FEE_COLS = ["6", "4", "3", "2"];

// Transform RATES into rates format with term info
Object.keys(window.RATES).forEach(tier => {
  const products = window.RATES[tier].products;
  Object.keys(products).forEach(productName => {
    const productData = products[productName];
    const isTracker = productData.isMargin === true;
    const term = productName.includes("3yr") ? 36 : 24;
    
    if (!window.rates[productName]) {
      window.rates[productName] = {
        isTracker: isTracker,
        term: term,
        6: productData[6],
        4: productData[4],
        3: productData[3],
        2: productData[2]
      };
    }
  });
});

// --- Additional criteria constants ---
window.MIN_ICR = {
  Fix: 1.25,
  Tracker: 1.3,
};

// --- Loan limits ---
window.MIN_LOAN = 150000;
window.MAX_LOAN = 3000000;

// Base BBR values
window.STANDARD_BBR = 0.04;
window.STRESS_BBR = 0.0425;

// --- Product terms (in months) ---
window.TERM_MONTHS = {
  "2yr Fix": 24,
  "3yr Fix": 36,
  "2yr Tracker": 24,
};

// --- Revert rate offsets by Tier (decimals) ---
window.REVERT_RATE = {
  "Tier 1": { add: 0.0 },
  "Tier 2": { add: 0.004 },
  "Tier 3": { add: 0.01 },
};

// --- Total term (in years) ---
window.TOTAL_TERM = 10;

// --- ERC structure per product type ---
window.ERC = {
  "2yr Fix": ["4%", "3%", "then no ERC"],
  "3yr Fix": ["4%", "3%", "2%", "then no ERC"],
  "2yr Tracker": ["4%", "3%", "then no ERC"],
};

// Lead capture destination
window.LEAD_TO = "leads@example.com";

// Current MVR
window.CURRENT_MVR = 0.0859; 