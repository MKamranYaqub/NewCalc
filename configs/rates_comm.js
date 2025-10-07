// --- Rates (string keys for 6/4/2 columns) ---
// Updated based on the "Commercial Rates" image provided.
window.RATES_Commercial = {
    "Tier 1": {
      products: {
        "3yr Fix": { 6: 0.0719, 4: 0.0789, 2: 0.0859 },
        "2yr Fix": { 6: 0.0659, 4: 0.0749, 2: 0.0859 },
        "2yr Tracker": {
          6: 0.0269,
          4: 0.0369,
          2: 0.0474,
          isMargin: true,
        },
      },
    },
    "Tier 2": {
      products: {
        "3yr Fix": { 6: 0.0749, 4: 0.0819, 2: 0.0889 },
        "2yr Fix": { 6: 0.0699, 4: 0.0789, 2: 0.0899 },
        "2yr Tracker": {
          6: 0.0319,
          4: 0.0419,
          2: 0.0524,
          isMargin: true,
        },
      },
    },
    
  };
  
  window.PRODUCT_TYPES_Commercial = ["2yr Fix", "3yr Fix", "2yr Tracker"];
  window.FEE_COLS_Commercial = ["6", "4", "3", "2"];
  
  // --- Additional criteria constants ---
  window.MIN_ICR_Commercial = {
    Fix: 1.25, // 125% minimum ICR
    Tracker: 1.3, // 130% minimum ICR
  };
  
  // --- Loan limits ---
  window.MIN_LOAN_Commercial = 150000;
  window.MAX_LOAN_Commercial = 2000000;
  
  // Base BBR values
  window.STANDARD_BBR_Commercial = 0.04; // 4.00% default (or pull from input if needed)
  window.STRESS_BBR_Commercial = 0.0425; // 4.25% → always 0.25% higher than standard
  
  // --- Product terms (in months) ---
  window.TERM_MONTHS_Commercial = {
    "2yr Fix": 24,
    "3yr Fix": 36,
    "2yr Tracker": 24, // 2-year tracker = 24 months
  };
  
  // --- Revert rate offsets by Tier (decimals) ---
  // Displayed as "MVR" or "MVR + X%"
  window.REVERT_RATE_Commercial = {
    "Tier 1": { add: 0.003 }, // 
    "Tier 2": { add: 0.015 }, // 
    
  };
  
  // --- Total term (in years) ---
  window.TOTAL_TERM_Commercial = 10; // always 10 years
  
  // --- ERC structure per product type ---
  window.ERC_Commercial = {
    "2yr Fix": ["4%", "3%", "then no ERC"], // Y1 = 4%, Y2 = 3%, then no ERC
    "3yr Fix": ["4%", "3%", "2%", "then no ERC"], // Y1 = 4%, Y2 = 3%, Y3 = 2%, then no ERC
    "2yr Tracker": ["4%", "3%", "then no ERC"], // No ERC
  };
  
  // Lead capture destination (change to your real inbox)
  window.LEAD_TO_Commercial = "leads@example.com";
  
  // ---- Current MVR -----//
  
  // --- Total term (in years) ---
  window.CURRENT_MVR_Commercial  = 0.0859; // always 10 years
  