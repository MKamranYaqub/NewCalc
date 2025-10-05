/* eslint-disable no-unused-vars */
const { useState, useMemo, useCallback } = React; // Added useCallback

/* --------------------------------- UI Bits --------------------------------- */
function SectionTitle({ children }) {
  return (
    <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#334155",
          textTransform: "normal",
          letterSpacing: "0.04em",
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        {children}
      </div>
      <div style={{ height: 1, background: "#e2e8f0", marginBottom: 8 }} />
    </div>
  );
}

// === NEW: Reusable Slider Component ===
function SliderInput({ label, min, max, step, value, onChange, formatValue, style }) {
  return (
    <div style={{ margin: "10px 0", ...style }}>
      <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>{label}: <b>{formatValue(value)}</b></label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

/* ----------------------------- GLOBAL CONSTANTS ---------------------------- */
const MAX_ROLLED_MONTHS = 9;
const MAX_DEFERRED_FIX = 0.0125;      // 1.25%
const MAX_DEFERRED_TRACKER = 0.02;    // 2.00%
const SHOW_FEE_COLS = ["6", "4", "3", "2"];

/* ------------------------------ UTIL FUNCTIONS ----------------------------- */
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmtMoney0 = (n) =>
  n || n === 0
    ? Number(n).toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      })
    : "—";
const fmtPct = (p, dp = 2) =>
  p || p === 0 ? `${(Number(p) * 100).toFixed(dp)}%` : "—";
const parsePct = (s) => {
  const v = String(s).trim().replace(/%/g, '');
  const n = Number(v) / 100;
  return Number.isFinite(n) ? n : null;
};

/* Tier/LTV rule */
function getMaxLTV(tier, flatAboveComm) {
  if (flatAboveComm === "Yes") {
    if (tier === "Tier 2") return 0.60;
    if (tier === "Tier 3") return 0.70;
  }
  return 0.75;
}
function formatRevertRate(tier) {
  const add = window.REVERT_RATE?.[tier]?.add ?? 0;
  return add === 0 ? "MVR" : `MVR + ${(add * 100).toFixed(2)}%`;
}
function formatERC(productType) {
  const ercArr = window.ERC?.[productType] ?? ["—"];
  return ercArr.join(" / ");
}

/* ----------------------------------- App ----------------------------------- */
function App() {
  const [productType, setProductType] = useState("2yr Fix");
  
  // [MODIFIED] State for the new dropdown
  const [loanTypeRequired, setLoanTypeRequired] = useState("Max Optimum Gross Loan");
  const [specificNetLoan, setSpecificNetLoan] = useState("");
  
  // [NEW STATE] for Specific LTV slider
  const [specificLTV, setSpecificLTV] = useState(0.75); // Use max possible LTV as initial value
  
  // === NEW STATE FOR MANUAL OVERRIDE ===
  const [manualSettings, setManualSettings] = useState({});
  // === NEW STATE FOR RATE OVERRIDE ===
  const [rateOverrides, setRateOverrides] = useState({});
  // === NEW STATE FOR TEMPORARY RATE INPUT VALUE (to avoid recalculating on every keystroke)
  const [tempRateInput, setTempRateInput] = useState({});

  // Client / Lead
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

  // Property & income
  const [propertyValue, setPropertyValue] = useState("1000000");
  const [monthlyRent, setMonthlyRent] = useState("3000");

  const [validationError, setValidationError] = useState("");

  const cleanDigits = (v) => String(v).replace(/[^\d]/g, "");

  // Property drivers
  const [hmo, setHmo] = useState("No (Tier 1)");
  const [mufb, setMufb] = useState("No (Tier 1)");
  const [holiday, setHoliday] = useState("No");
  const [flatAboveComm, setFlatAboveComm] = useState("No");

  // Applicant drivers
  const [expat, setExpat] = useState("No (Tier 1)");
  const [ftl, setFtl] = useState("No");
  const [offshore, setOffshore] = useState("No");

  // Adverse
  const [adverse, setAdverse] = useState("No");
  const [mortArrears, setMortArrears] = useState("0 in 24");
  const [unsArrears, setUnsArrears] = useState("0 in 24");
  const [ccjDefault, setCcjDefault] = useState("0 in 24");
  const [bankruptcy, setBankruptcy] = useState("Never");

  // Tier
  const tier = useMemo(() => {
    const mapHmo = {
      "No (Tier 1)": 1,
      "Up to 6 beds (Tier 2)": 2,
      "More than 6 beds (Tier 3)": 3,
      No: 1,
      "Up to 6 beds": 2,
      "More than 6 beds": 3,
    };
    const mapMufb = {
      "No (Tier 1)": 1,
      "Up to 6 units (Tier 2)": 2,
      "Less than 30 units (Tier 3)": 3,
      No: 1,
      "Up to 6 units": 2,
      "Less than 30 units": 3,
    };
    const mapExp = {
      "No (Tier 1)": 1,
      "Yes - UK footprint (Tier 2)": 2,
      "Yes - Without UK footprint (Tier 3)": 3,
      No: 1,
      "UK footprint": 2,
      Yes: 3,
    };
    const yn3 = (v) => (v === "Yes" ? 3 : 1);

    let t = Math.max(mapHmo[hmo] || 1, mapMufb[mufb] || 1, mapExp[expat] || 1);

    if (yn3(holiday) === 3) t = 3;
    if (yn3(offshore) === 3) t = 3;

    // Flat above commercial: at least Tier 2 (but allow Tier 3 if other rules push it)
    if (flatAboveComm === "Yes") t = Math.max(t, 2);

    if (ftl === "Yes") t = Math.max(t, 2);

    if (adverse === "Yes") {
      const advMapMA = { "0 in 24": 1, "0 in 18": 2, "All considered by referral": 3 };
      const advMapUA = { "0 in 24": 1, "0 in 12": 2, "All considered by referral": 3 };
      const advMapCD = { "0 in 24": 1, "0 in 18": 2, "All considered by referral": 3 };
      const advMapBank = {
        Never: 1,
        "All considered by referral": 3,
      };
      const adverseTier = Math.max(
        advMapMA[mortArrears] || 1,
        advMapUA[unsArrears] || 1,
        advMapCD[ccjDefault] || 1,
        advMapBank[bankruptcy] || 1
      );
      t = Math.max(t, adverseTier);
    }

    return t === 1 ? "Tier 1" : t === 2 ? "Tier 2" : "Tier 3";
  }, [
    hmo,
    mufb,
    expat,
    holiday,
    flatAboveComm,
    ftl,
    offshore,
    adverse,
    mortArrears,
    unsArrears,
    ccjDefault,
    bankruptcy,
  ]);

  const selected = window.RATES[tier]?.products?.[productType];
  const isTracker = !!selected?.isMargin;

  // External constants
  const MIN_ICR_FIX = window.MIN_ICR?.Fix ?? 1.25;
  const MIN_ICR_TRK = window.MIN_ICR?.Tracker ?? 1.30;
  const MIN_LOAN = window.MIN_LOAN ?? 150000;
  const MAX_LOAN = window.MAX_LOAN ?? 3000000;
  const STANDARD_BBR = window.STANDARD_BBR ?? 0.04;
  const STRESS_BBR = window.STRESS_BBR ?? 0.0425;
  const TERM_MONTHS = window.TERM_MONTHS ?? {
    "2yr Fix": 24,
    "3yr Fix": 36,
    "2yr Tracker": 24,
    Tracker: 24, // backward-compat
  };
  const TOTAL_TERM = window.TOTAL_TERM ?? 10; // years
  const CURRENT_MVR = window.CURRENT_MVR; // e.g., 8.59%

  /* ------------------------------ Calculations ----------------------------- */
  const canShowMatrix = useMemo(() => {
    const mr = toNumber(monthlyRent);
    const pv = toNumber(propertyValue);
    const sn = toNumber(specificNetLoan);
    
    if (!mr) return false;
    
    // Check required inputs based on loan type
    if (loanTypeRequired === "Specific Net Loan") return !!sn && !!pv; // Need Net and PV
    if (loanTypeRequired === "Maximum LTV Loan") return !!pv;          // Need PV
    
    return !!pv; // For Max Optimum Gross Loan, need PV
  }, [monthlyRent, propertyValue, specificNetLoan, specificLTV, loanTypeRequired]); 

  /**
   * === MODIFIED: Compute loan for a column, optionally using manual settings / rate override ===
   */
  const computeForCol = useCallback((colKey, manualRolled, manualDeferred, overriddenRate) => {
    const base = selected?.[colKey];
    if (base == null && !overriddenRate) return null; // Must have a base rate OR an override

    const pv = toNumber(propertyValue);
    const mr = toNumber(monthlyRent);
    const sn = toNumber(specificNetLoan);
    const feePct = Number(colKey) / 100;

    const minICR = productType.includes("Fix") ? MIN_ICR_FIX : MIN_ICR_TRK;
    const maxLTVRule = getMaxLTV(tier, flatAboveComm);
    
    // Gross based on the product's max LTV rule
    const grossLTVRuleCap = pv ? pv * maxLTVRule : Infinity;

    // Gross based on the specific LTV slider if "Maximum LTV Loan" is selected
    const specificLTVCap = loanTypeRequired === "Maximum LTV Loan" && specificLTV != null
        ? pv * specificLTV
        : Infinity;
    
    // The LTV cap to apply
    const ltvCap = 
        loanTypeRequired === "Maximum LTV Loan"
            ? Math.min(specificLTVCap, grossLTVRuleCap)
            : grossLTVRuleCap;


    const termMonths = TERM_MONTHS[productType] ?? 24;

    const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;
    
    // Use overriddenRate if provided, otherwise fall back to base rate
    const actualBaseRate = overriddenRate != null ? overriddenRate : base;
    
    const displayRate = isTracker ? actualBaseRate + STANDARD_BBR : actualBaseRate;
    const stressRate = isTracker ? actualBaseRate + STRESS_BBR : displayRate;
    
    // Check if the actualBaseRate is the result of an override
    const isRateOverridden = overriddenRate != null;


    // Helper to evaluate for a given (rolled, d)
    const evalCombo = (rolledMonths, d) => {
      const monthsLeft = Math.max(termMonths - rolledMonths, 1);
      const stressAdj = Math.max(stressRate - d, 1e-6);

      // Rent-limited gross (ICR stress)
      let grossRent = Infinity;
      if (mr && stressAdj > 0) {
        // NOTE: original file used mr * term; using term-month rent as annualised across term
        const annualRent = mr * termMonths;
        grossRent = annualRent / (minICR * (stressAdj / 12) * monthsLeft);
      }

      // If user provided a Specific Net target, cap gross by back-solving:
      let grossFromNet = Infinity;
      if (loanTypeRequired === "Specific Net Loan" && sn != null && feePct < 1) {
        // Net = G - G*fee - G*(display-d)/12 * rolled - G*(d/12)*term
        // => G = Net / (1 - fee - ((display-d)/12)*rolled - (d/12)*term)
        const denom =
          1 -
          feePct -
          ((Math.max(displayRate - d, 0)) / 12) * rolledMonths -
          (d / 12) * termMonths;
        if (denom > 0.0000001) {
          grossFromNet = sn / denom;
        }
      }

      // Cap by LTV (rule or specific), ICR/rent, grossFromNet (if applicable), MAX_LOAN
      let eligibleGross = Math.min(ltvCap, grossRent, MAX_LOAN);

      // If Specific Net Loan is required, the gross is additionally capped by grossFromNet
      if (loanTypeRequired === "Specific Net Loan") {
          eligibleGross = Math.min(eligibleGross, grossFromNet);
      }
      
      if (eligibleGross < MIN_LOAN - 1e-6) eligibleGross = 0;

      const payRateAdj = Math.max(displayRate - d, 0);
      const feeAmt = eligibleGross * feePct;
      const rolledAmt = (eligibleGross * (payRateAdj / 12)) * rolledMonths;
      const deferredAmt = (eligibleGross * (d / 12)) * termMonths;
      const net = eligibleGross - feeAmt - rolledAmt - deferredAmt;
      const ltv = pv ? eligibleGross / pv : null;

      return {
        gross: eligibleGross,
        net,
        feeAmt,
        rolledAmt,
        deferredAmt,
        ltv,
        rolledMonths,
        d,
        payRateAdj,
      };
    };

    let best = null;

    // 1. If manual settings are provided (even partially), use the provided values,
    // falling back to safe defaults if the other value is missing.
    if (manualRolled != null || manualDeferred != null) {
      const rolled = Number.isFinite(manualRolled)
        ? manualRolled
        : 0; // default safe fallback

      const deferred = Number.isFinite(manualDeferred)
        ? manualDeferred
        : 0; // default safe fallback

      // Clamp both within valid ranges
      const safeRolled = Math.max(0, Math.min(rolled, MAX_ROLLED_MONTHS));
      const safeDeferred = Math.max(0, Math.min(deferred, deferredCap));

      let safeBest;
      try {
        safeBest = evalCombo(safeRolled, safeDeferred);
        if (!safeBest || !isFinite(safeBest.gross)) {
          console.warn("Invalid manual combo — resetting to 0/0");
          safeBest = evalCombo(0, 0);
        }
      } catch (err) {
        console.error("⚠️ evalCombo crashed:", err);
        safeBest = evalCombo(0, 0);
      }

      best = safeBest;
    }


    // 2. Otherwise ('Max Optimum Gross Loan', 'Maximum LTV Loan', and now 'Specific Net Loan'), run the optimization.
    // The previous `else if (loanTypeRequired === "Specific Net Loan")` has been removed 
    // to allow it to fall into the optimization loop below, restoring previous functionality.
    else { 
        // Search space
        const maxRolled = Math.min(MAX_ROLLED_MONTHS, termMonths);
        const step = 0.0001; // 0.01% steps; good balance of speed/precision
        const steps = Math.max(1, Math.round(deferredCap / step));

        for (let r = 0; r <= maxRolled; r += 1) {
          for (let j = 0; j <= steps; j += 1) {
            const d = j * step;
            const out = evalCombo(r, d);
            // Optimization logic: Maximize the Net Loan (Optimum)
            if (!best || out.net > best.net) {
              best = out;
            }
          }
        }
    }
    // [END FIXED LOGIC]
    
    if (!best) return null;

    // Build display strings based on chosen optimum (best)
    const fullRateText = isTracker
      ? `${(actualBaseRate * 100).toFixed(2)}% + BBR`
      : `${(displayRate * 100).toFixed(2)}%`;
    const payRateText = isTracker
      ? `${(best.payRateAdj * 100).toFixed(2)}% + BBR`
      : `${(best.payRateAdj * 100).toFixed(2)}%`;

    // Flags used by your existing UI banners
    const belowMin = best.gross > 0 && best.gross < MIN_LOAN - 1e-6;
    const hitMaxCap = Math.abs(best.gross - MAX_LOAN) < 1e-6;

    const ddAmount = best.gross * (best.payRateAdj / 12);

    return {
      productName: `${productType}, ${tier}`,
      fullRateText,
      // Store the *actual* rate used for display/editing
      actualRateUsed: actualBaseRate, 
      isRateOverridden,
      payRateText,
      deferredCapPct: best.d,          // now: ACTUAL chosen deferred (not the cap)
      net: best.net,
      gross: best.gross,
      feeAmt: best.feeAmt,
      rolled: best.rolledAmt,
      deferred: best.deferredAmt,
      ltv: best.ltv,
      rolledMonths: best.rolledMonths, // ACTUAL chosen rolled months
      directDebit: ddAmount,
      maxLtvRule: maxLTVRule,
      termMonths,
      belowMin,
      hitMaxCap,
      ddStartMonth: best.rolledMonths + 1,
      // NEW: Flag to indicate if this result came from a manual override
      isManual: manualRolled != null && manualDeferred != null
    };
  }, [
    selected, propertyValue, monthlyRent, specificNetLoan, specificLTV, loanTypeRequired, 
    productType, tier, flatAboveComm, MIN_ICR_FIX, MIN_ICR_TRK, MIN_LOAN, MAX_LOAN, STANDARD_BBR, 
    STRESS_BBR, TERM_MONTHS, isTracker
  ]);


  // Basic Gross per column: **no rolled months, no deferred interest**
  function computeBasicGrossForCol(colKey) {
    const base = selected?.[colKey];
    if (base == null) return null;

    const pv = toNumber(propertyValue);
    const mr = toNumber(monthlyRent);
    const sn = toNumber(specificNetLoan);
    const feePct = Number(colKey) / 100;

    const minICR = productType.includes("Fix") ? MIN_ICR_FIX : MIN_ICR_TRK;
    const maxLTVRule = getMaxLTV(tier, flatAboveComm);
    
    // Gross based on the product's max LTV rule
    const grossLTVRuleCap = pv ? pv * maxLTVRule : Infinity;

    // Gross based on the specific LTV slider if "Maximum LTV Loan" is selected
    const specificLTVCap = loanTypeRequired === "Maximum LTV Loan" && specificLTV != null
        ? pv * specificLTV
        : Infinity;
    
    // The LTV cap to apply
    const ltvCap = 
        loanTypeRequired === "Maximum LTV Loan"
            ? Math.min(specificLTVCap, grossLTVRuleCap)
            : grossLTVRuleCap;


    const displayRate = isTracker ? base + STANDARD_BBR : base;
    const stressRate = isTracker ? base + STRESS_BBR : displayRate;

    const deferred = 0;
    const termMonths = TERM_MONTHS[productType] ?? 24;
    const monthsLeft = termMonths;
    const stressAdj = Math.max(stressRate - deferred, 1e-6);

    let grossRent = Infinity;
    if (mr && stressAdj) {
      const annualRent = mr * termMonths;
      grossRent = annualRent / (minICR * (stressAdj / 12) * monthsLeft);
    }

    let grossFromNet = Infinity;
    if (loanTypeRequired === "Specific Net Loan" && sn != null && feePct < 1) {
      // Basic back-calc: Net ≈ Gross*(1 - feePct)
      const denom = 1 - feePct;
      if (denom > 0) grossFromNet = sn / denom;
    }

    // Cap by LTV (rule or specific), ICR/rent, grossFromNet (if applicable), MAX_LOAN
    let eligibleGross = Math.min(ltvCap, grossRent, MAX_LOAN);
    
    // If Specific Net Loan is required, the gross is additionally capped by grossFromNet
    if (loanTypeRequired === "Specific Net Loan") {
        eligibleGross = Math.min(eligibleGross, grossFromNet);
    }
    
    const ltvPct = pv ? Math.round((eligibleGross / pv) * 100) : null;

    return {
      grossBasic: eligibleGross,
      ltvPctBasic: ltvPct,
    };
  }
  
  // === MODIFIED: Memoized main calculation function that incorporates manual settings and rate override ===
  const allColumnData = useMemo(() => {
    if (!canShowMatrix) return [];
    const pv = toNumber(propertyValue); // Get property value once

    return SHOW_FEE_COLS
      .map((colKey) => {
        const manual = manualSettings[colKey];
        const overriddenRate = rateOverrides[colKey]; // Get overridden rate
        
        // Pass the overriddenRate to computeForCol
        const data = computeForCol(colKey, manual?.rolledMonths, manual?.deferredPct, overriddenRate);
        
        if (!data) return null;
        
        const netLtv = pv ? data.net / pv : null;

        return { colKey, netLtv, ...data }; 
      })
      .filter(Boolean);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType, tier, propertyValue, monthlyRent, specificNetLoan, specificLTV, loanTypeRequired, flatAboveComm, canShowMatrix, computeForCol, manualSettings, rateOverrides]);


  // Best summary across the four columns (by net)
const bestSummary = useMemo(() => {
  if (!canShowMatrix || !allColumnData.length) return null;
  const pv = toNumber(propertyValue) || 0;

  let best = null;
  for (const d of allColumnData) {
    if (!best || d.net > best.net) {
      best = {
        colKey: d.colKey,
        gross: d.gross,
        grossStr: fmtMoney0(d.gross),
        grossLtvPct: pv ? Math.round((d.gross / pv) * 100) : 0,
        net: d.net,
        netStr: fmtMoney0(d.net),
        netLtvPct: pv ? Math.round((d.net / pv) * 100) : 0, 
      };
    }
  }
  return best;
}, [allColumnData, canShowMatrix, propertyValue]);


  // === NEW: Handlers for rate override ===
  const handleRateInputChange = (colKey, value) => {
    // Only update the temporary input state
    setTempRateInput(prev => ({
        ...prev,
        [colKey]: value
    }));
  };
  
  const handleRateInputBlur = (colKey, value, originalRate) => {
    setTempRateInput(prev => ({ ...prev, [colKey]: undefined })); // Clear temporary input

    const parsedRate = parsePct(value);

    // Only set the override if the parsed rate is different from the original base rate
    if (parsedRate != null && Math.abs(parsedRate - originalRate) > 0.00001) {
        setRateOverrides(prev => ({
            ...prev,
            [colKey]: parsedRate
        }));
    } else {
        // If the user cleared the field or entered a bad value, remove the override
        setRateOverrides(prev => {
            const newState = { ...prev };
            delete newState[colKey];
            return newState;
        });
    }
  };


  // === Handlers for manual settings (rolled/deferred) ===
  const handleRolledChange = (colKey, value) => {
    setManualSettings(prev => ({
        ...prev,
        [colKey]: {
            ...prev[colKey],
            rolledMonths: value
        }
    }));
  };
  
  const handleDeferredChange = (colKey, value) => {
    setManualSettings(prev => ({
        ...prev,
        [colKey]: {
            ...prev[colKey],
            deferredPct: value
        }
    }));
  };
  
  const handleResetManual = (colKey) => {
      setManualSettings(prev => {
          const newState = { ...prev };
          delete newState[colKey];
          return newState;
      });
  }

  const handleResetRateOverride = (colKey) => {
    setRateOverrides(prev => {
        const newState = { ...prev };
        delete newState[colKey];
        return newState;
    });
  }


  /* --------------------------- Send Quote via Email --------------------------- */
  const handleSendQuote = async () => {
    setValidationError("");
    setSendStatus(null);

    // ... (rest of the handleSendQuote logic remains the same) ...
    if (!canShowMatrix || !bestSummary) {
      setValidationError("Please complete the calculation fields before sending email.");
      return;
    }

    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim()) {
      setValidationError("Please complete all client fields before sending email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+?\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    setSendStatus(null);

    try {
      const zapierWebhookUrl = "https://hooks.zapier.com/hooks/catch/10082441/uhocm7m/";

      // Use the memoized allColumnData
      const columnCalculations = allColumnData.map(d => ({ 
          feePercent: d.colKey, 
          ...d // includes rolledMonths, deferredCapPct, isManual etc.
      }));
      
      const basicGrossCalculations = SHOW_FEE_COLS
        .map((k) => {
          const d = computeBasicGrossForCol(k);
          return d ? { feePercent: k, ...d } : null;
        })
        .filter(Boolean);

      const payload = {
        requestId: `MFS-RESI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientName, clientPhone, clientEmail,
        propertyValue, monthlyRent, productType, 
        loanTypeRequired, 
        specificNetLoan,
        specificLTV,      
        hmo, mufb, holiday, flatAboveComm,
        expat, ftl, offshore,
        adverse, mortArrears, unsArrears, ccjDefault, bankruptcy,
        tier,
        bestSummary,
        allColumnData: columnCalculations,
        basicGrossColumnData: basicGrossCalculations,
        submissionTimestamp: new Date().toISOString(),
        revertRate: formatRevertRate(tier),
        totalTerm: `${TOTAL_TERM} years`,
        erc: formatERC(productType),
        currentMVR: CURRENT_MVR,
        standardBBR: STANDARD_BBR,
      };

      let success = false;

      // 1) JSON POST
      try {
        const res = await fetch(zapierWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) success = true;
      } catch (e) {
        console.warn("JSON POST failed (expected in browser due to CORS):", e);
      }

      // 2) Fallback form-encoded POST
      if (!success) {
        try {
          const form = new URLSearchParams();
          for (const [k, v] of Object.entries(payload)) {
            form.append(k, typeof v === "object" ? JSON.stringify(v) : String(v ?? ""));
          }
          const res2 = await fetch(zapierWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: form.toString(),
          });
          if (res2.ok) success = true;
        } catch (e2) {
          console.warn("Form-encoded POST failed:", e2);
        }
      }

      setSendStatus(success ? "success" : "error");
    } catch (error) {
      console.error("An unexpected error occurred in handleSendQuote:", error);
      setSendStatus("error");
    } finally {
      setSending(false);
    }
  };

  /* --------------------------- Inline value styles -------------------------- */
  const valueBoxStyle = {
    width: "100%",
    textAlign: "center",
    fontWeight: 400,
    background: "ffffff",
    borderRadius: 8,
    padding: "8px 10px",
  };

  const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;
  
  // Get max LTV for the slider max value
  const maxLTVForTier = getMaxLTV(tier, flatAboveComm);


  return (
    <div className="container">
      {/* --------------------- Property Details (full width) -------------------- */}
      <div className="card" style={{ gridColumn: "1 / -1", position: "relative" }}>
        <div className="note" style={{ marginBottom: 8 }}>
          Tier is calculated automatically from the inputs below. Current:{" "}
          <b>{tier}</b>
        </div>

        <div className="profile-grid">
          <SectionTitle>Property Type</SectionTitle>

          <div className="field">
            <label>HMO</label>
            <select value={hmo} onChange={(e) => setHmo(e.target.value)}>
              <option>No (Tier 1)</option>
              <option>Up to 6 beds (Tier 2)</option>
              <option>More than 6 beds (Tier 3)</option>
            </select>
          </div>

          <div className="field">
            <label>MUFB</label>
            <select value={mufb} onChange={(e) => setMufb(e.target.value)}>
              <option>No (Tier 1)</option>
              <option>Up to 6 units (Tier 2)</option>
              <option>Less than 30 units (Tier 3)</option>
            </select>
          </div>

          <div className="field">
            <label>Holiday Let?</label>
            <select value={holiday} onChange={(e) => setHoliday(e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="flat-above-commercial">Flat above commercial?</label>
            <select id="flat-above-commercial" value={flatAboveComm} onChange={(e) => setFlatAboveComm(e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
            <div style={{
              marginTop: 8,
              background: '#f1f5f9',
              color: '#475569',
              fontSize: 12,
              padding: '8px 10px',
              borderRadius: 8,
              textAlign: 'center'
            }}>
              Tier 2 LTV: 60% | Tier 3 LTV: 70%
            </div>
          </div>

          <SectionTitle>Applicant Details</SectionTitle>

          <div className="field">
            <label>Expat / Foreign National</label>
            <select value={expat} onChange={(e) => setExpat(e.target.value)}>
              <option>No (Tier 1)</option>
              <option>Yes - UK footprint (Tier 2)</option>
              <option>Yes - Without UK footprint (Tier 3)</option>
            </select>
          </div>

          <div className="field">
            <label>First Time Landlord?</label>
            <select value={ftl} onChange={(e) => setFtl(e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <div className="field">
            <label>Offshore company?</label>
            <select value={offshore} onChange={(e) => setOffshore(e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <div className="field">
            <label>Adverse Credit?</label>
            <select value={adverse} onChange={(e) => setAdverse(e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          {adverse === "Yes" && (
            <>
              <div className="field">
                <label>Mortgage Arrears</label>
                <select value={mortArrears} onChange={(e) => setMortArrears(e.target.value)}>
                  <option>0 in 24</option>
                  <option>0 in 18</option>
                  <option>All considered by referral</option>
                </select>
              </div>

              <div className="field">
                <label>Unsecured Arrears</label>
                <select value={unsArrears} onChange={(e) => setUnsArrears(e.target.value)}>
                  <option>0 in 24</option>
                  <option>0 in 12</option>
                  <option>All considered by referral</option>
                </select>
              </div>

              <div className="field">
                <label>CCJ & Defaults</label>
                <select value={ccjDefault} onChange={(e) => setCcjDefault(e.target.value)}>
                  <option>0 in 24</option>
                  <option>0 in 18</option>
                  <option>All considered by referral</option>
                </select>
              </div>

              <div className="field">
                <label>Bankruptcy</label>
                <select value={bankruptcy} onChange={(e) => setBankruptcy(e.target.value)}>
                  <option>Never</option>
                  <option>All considered by referral</option>
                </select>
              </div>
            </>
          )}

          <SectionTitle>Property & Product</SectionTitle>

          <div className="profile-grid property-product" style={{ gridColumn: "1 / -1" }}>
            <div className="field">
              <label>Property Value</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 350,000"
                value={propertyValue}
                onChange={(e) => setPropertyValue(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Monthly Rent</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 1,600"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
              />
            </div>

            {/* Loan Type Required Dropdown */}
            <div className="field">
              <label>Loan type required?</label>
              <select value={loanTypeRequired} onChange={(e) => setLoanTypeRequired(e.target.value)}>
                <option>Max Optimum Gross Loan</option>
                <option>Specific Net Loan</option>
                <option>Maximum LTV Loan</option>
              </select>
            </div>

            {/* Specific Net Loan Input (Conditional) */}
            {loanTypeRequired === "Specific Net Loan" && (
              <div className="field">
                <label>Specific Net Loan</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 200,000"
                  value={specificNetLoan}
                  onChange={(e) => setSpecificNetLoan(e.target.value)}
                />
              </div>
            )}

            {/* Specific LTV Slider (Conditional) */}
            {loanTypeRequired === "Maximum LTV Loan" && (
              <div className="field">
                <label>Specific LTV Cap</label>
                <div style={{
                    fontSize: 12,
                    color: '#475569',
                    marginBottom: 4
                }}>
                    LTV: <b>{(specificLTV * 100).toFixed(2)}%</b>
                </div>
                <input
                    type="range"
                    min={0.05} // Minimum LTV (e.g., 5%)
                    max={maxLTVForTier} // Max LTV is constrained by the current criteria
                    step={0.005} // 0.5% steps
                    value={specificLTV}
                    onChange={(e) => setSpecificLTV(Number(e.target.value))}
                    style={{ width: '100%' }}
                />
                <div style={{
                  marginTop: 8,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  Max LTV for {tier} is {(maxLTVForTier * 100).toFixed(2)}%
                </div>
              </div>
            )}
            

            <div className="field">
              <label>Product Type</label>
              <select value={productType} onChange={(e) => setProductType(e.target.value)}>
                {window.PRODUCT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------- Client Details & Lead (full) --------------------- */}
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h4>Email this Quote</h4>
        <div className="profile-grid">
          <div className="field">
            <label>Client Name</label>
            <input
              type="text"
              placeholder="e.g. John Smith"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Contact Number</label>
            <input
              type="tel"
              placeholder="e.g. 07123 456789"
              value={clientPhone}
              onChange={(e) => setClientPhone(cleanDigits(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="e.g. john@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button
              onClick={handleSendQuote}
              className="primaryBtn"
              disabled={sending || !canShowMatrix}
            >
              {sending ? "Sending…" : "Send Email"}
            </button>
            <div className="note"></div>
          </div>
        </div>

        {validationError && (
          <div style={{ marginTop: "16px", color: "#b91c1c", fontWeight: "500", textAlign: "center" }}>
            {validationError}
          </div>
        )}
        {sendStatus === "success" && (
          <div style={{ marginTop: "16px", padding: "16px", background: "#f0fdf4", border: "1px solid #4ade80", color: "#166534", borderRadius: "8px" }}>
            Email sent successfully!
          </div>
        )}
        {sendStatus === "error" && (
          <div style={{ marginTop: "16px", padding: "16px", background: "#fff1f2", border: "1px solid #f87171", color: "#b91c1c", borderRadius: "8px" }}>
            Failed to send email. Please try again later.
          </div>
        )}
      </div>

      {/* ===== Maximum Loan Summary ===== */}
      {canShowMatrix && bestSummary && (
        <div
          className="card"
          style={{
            gridColumn: "1 / -1",
            background: "#008891",
            color: "#fff",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              textAlign: "center",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            {loanTypeRequired === "Max Optimum Gross Loan" 
                ? "Based on the inputs, the maximum gross loan is:"
                : `${loanTypeRequired} is:`
            }
          </div>

          <div style={{ padding: "12px 16px" }}>
            <div
              style={{
                background: "#ffffff",
                color: "#111827",
                borderRadius: 8,
                padding: "14px 16px",
                fontSize: 22,
                fontWeight: 800,
                textAlign: "center",
              }}
            >
              {bestSummary.grossStr} @ {bestSummary.grossLtvPct}% LTV, {productType},{" "}
              {tier}, {Number(bestSummary.colKey)}% Fee
            </div>

            <div
              style={{
                marginTop: 8,
                background: "#00285b",
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 12px",
                textAlign: "center",
                fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 800, textDecoration: "underline" }}>
                Max net loan
              </span>{" "}
              <span style={{ opacity: 0.95 }}>
                (amount advanced day 1) is {bestSummary.netStr} @{" "}
                {bestSummary.netLtvPct}% LTV, {productType}, {tier},{" "}
                {Number(bestSummary.colKey)}% Fee
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------- OUTPUT MATRIX ---------------- */}
{canShowMatrix && (
  <div className="card" style={{ gridColumn: "1 / -1" }}>
    <div className="matrix">
      {(() => {
        const colData = allColumnData;
        const anyBelowMin = colData.some((d) => d.belowMin);
        const anyAtMaxCap = colData.some((d) => d.hitMaxCap);

        return (
          <>
            {(anyBelowMin || anyAtMaxCap) && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  margin: "8px 0 12px 0",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#7c2d12",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {anyBelowMin &&
                  "One or more gross loans are below the £150,000 minimum threshold. "}
                {anyAtMaxCap &&
                  "One or more gross loans are capped at the £3,000,000 maximum."}
              </div>
            )}

            {/* Labels */}
            <div
              className="matrixLabels"
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="labelsHead"></div>
              <div className="mRow"><b></b></div>
              <div className="mRow"><b>Product Name</b></div>
              <div className="mRow"><b>Full Rate (Editable)</b></div>
              <div className="mRow"><b>Pay Rate</b></div>
              <div className="mRow"><b>Net Loan <span style={{ fontSize: "11px", fontWeight: 400 }}>(advanced day 1)</span></b></div>
              <div className="mRow"><b>Max Gross Loan<span style={{ fontSize: "11px", fontWeight: 400 }}>(paid at redemption)</span></b></div>
              {/* === START: New 3-Row Structure for Gross Loan / Sliders === */}
              <div className="mRow"><b>Rolled Months</b></div>
              <div className="mRow"><b>Deferred Adjustment</b></div>
              
              {/* === END: New 3-Row Structure === */}

              <div className="mRow"><b>Product Fee</b></div>
              <div className="mRow"><b>Rolled Months Interest</b></div>
              <div className="mRow"><b>Deferred Interest</b></div>
              <div className="mRow"><b>Direct Debit</b></div>
              <div className="mRow"><b>Revert Rate</b></div>
              <div className="mRow"><b>Total Term | ERC</b></div>
              <div className="mRow"><b>Max Product LTV</b></div>
            </div>

            {/* Columns */}
            {colData.map((data, idx) => {
              const colKey = data.colKey;
              const headClass =
                idx === 0 ? "headGreen" : idx === 1 ? "headOrange" : idx === 2 ? "headTeal" : "headBlue";

              const manual = manualSettings[colKey];
              const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;
              const deferredStep = 0.0001;

              // Determine the value to show in the input field
              const rateDisplayValue = tempRateInput[colKey] !== undefined 
                ? tempRateInput[colKey] 
                : `${(data.actualRateUsed * 100).toFixed(2)}%`;
              
              const isOverridden = data.isRateOverridden;

              return (
                <div
                  key={colKey}
                  className="matrixCol"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div className={`matrixHead ${headClass}`}>BTL, {Number(colKey)}% Product Fee</div>

                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{data.productName}</div></div>
                  
                  {/* Full Rate Input */}
                  <div className="mRow">
                    <div 
                        className="mValue" 
                        style={{ 
                            ...valueBoxStyle, 
                            background: isOverridden ? '#fefce8' : '#fefce8', // Highlight yellow if overridden
                            padding: '4px 10px',
                            border: isOverridden ? '1px solid #fde047' : '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <input
                            type="text"
                            value={rateDisplayValue}
                            onChange={(e) => handleRateInputChange(colKey, e.target.value)}
                            onBlur={(e) => handleRateInputBlur(colKey, e.target.value, data.actualRateUsed)}
                            placeholder={data.fullRateText}
                            style={{
                                width: '100%',
                                border: 'none',
                                textAlign: 'center',
                                fontWeight: 700,
                                background: 'transparent',
                                color: isOverridden ? '#ca8a04' : '#1e293b',
                            }}
                        />
                        
                        {isOverridden && (
                            <button
                                onClick={() => handleResetRateOverride(colKey)}
                                style={{
                                    fontSize: 10,
                                    color: "#ca8a04",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    marginTop: 4,
                                }}
                            >
                                (Reset Rate)
                            </button>
                        )}
                    </div>
                  </div>
                  {/* End Full Rate Input */}

                  <div className="mRow">
                    <div className="mValue" style={valueBoxStyle}>
                      {data.payRateText}
                      <span style={{ fontWeight: 500, fontSize: 10, marginLeft: 6 }}>
                        (using {(data.deferredCapPct * 100).toFixed(2)}% deferred)
                      </span>
                    </div>
                  </div>
                  <div className="mRow">
                      <div className="mValue" style={valueBoxStyle}>
                        <span style={{ fontWeight: 700 }}>{fmtMoney0(data.net)}</span>
                        {data.netLtv != null && (
                          <span style={{ fontWeight: 400 }}>
                            {" "} @ {Math.round(data.netLtv * 100)}% LTV
                          </span>
                        )}
                      </div>
                  </div>  
                  {/* START: Gross Loan / Sliders */}
                  {/* Row 1: Gross Loan Value */}
                  <div className="mRow">
                      <div className="mValue" style={valueBoxStyle}>
                        <span style={{ fontWeight: 700 }}>{fmtMoney0(data.gross)}</span>
                        {data.ltv != null && (
                          <span style={{ fontWeight: 400 }}>
                            {" "} @ {Math.round(data.ltv * 100)}% LTV
                          </span>
                        )}
                      </div>
                  </div>
                  
                  {/* Row 2: Rolled Slider */}
                  <div className="mRow" style={{ alignItems: 'center' }}>
                      <div
                          style={{
                              width: '100%',
                              background: manual?.rolledMonths != null ? "#fefce8" : "#fff",
                              borderRadius: 8,
                              padding: "1px 1px",
                              marginTop: 4,
                              marginBottom: 4,
                          }}
                      >
                          <SliderInput
                            label=""
                            min={0}
                            max={Math.min(MAX_ROLLED_MONTHS, data.termMonths)}
                            step={1}
                            value={manual?.rolledMonths ?? data.rolledMonths}
                            onChange={(val) => handleRolledChange(colKey, val)}
                            formatValue={(v) => `${v} months`}
                            style={{ margin: "4px 0" }} // reduce margin
                          />
                      </div>
                  </div>
                  
                  {/* Row 3: Deferred Slider + Reset Button */}
                  <div className="mRow" style={{ alignItems: 'center' }}>
                      <div
                          style={{
                              width: '100%',
                              background: manual?.deferredPct != null ? "#fefce8" : "#fff",
                              borderRadius: 8,
                              padding: "1px 1px",
                              marginTop: 4,
                              marginBottom: 4,
                          }}
                      >
                          <SliderInput
                            label=""
                            min={0}
                            max={deferredCap}
                            step={deferredStep}
                            value={manual?.deferredPct ?? data.deferredCapPct}
                            onChange={(val) => handleDeferredChange(colKey, val)}
                            formatValue={(v) => fmtPct(v, 2)}
                            style={{ margin: "4px 0" }} // reduce margin
                          />

                          {(manual?.rolledMonths != null || manual?.deferredPct != null) && (
                            <button
                              onClick={() => handleResetManual(colKey)}
                              style={{
                                fontSize: 10,
                                color: "#ca8a04",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                marginTop: 4,
                                alignSelf: "end",
                                display: 'block',
                                width: '100%',
                                textAlign: 'right'
                              }}
                            >
                              (Reset to Optimum)
                            </button>
                          )}
                      </div>
                  </div>
                  {/* END: Gross Loan / Sliders */}

                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.feeAmt)} ({Number(colKey).toFixed(2)}%)</div></div>
                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.rolled)} ({data.rolledMonths} months)</div></div>
                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.deferred)} ({(data.deferredCapPct * 100).toFixed(2)}%)</div></div>
                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.directDebit)} from month {data.ddStartMonth}</div></div>
                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{formatRevertRate(tier)}</div></div>
                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{TOTAL_TERM} years | {formatERC(productType)}</div></div>
                  <div className="mRow"><div className="mValue" style={valueBoxStyle}>{(data.maxLtvRule * 100).toFixed(0)}%</div></div>
                </div>
              );
            })}
          </>
        );
      })()}
    </div>
  </div>
)}


      {/* ------------- EXTRA: Basic Gross (aligned under columns) + MVR/BBR ---- */}
      {canShowMatrix && (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          {/* advisory line (kept as-is; you can tweak the copy if you want) */}
          <div
            style={{
              textAlign: "center",
              color: "#7c2d12",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Results currently use optimum rolled and deferred interest for maximum net loan, *unless manually overridden by the sliders or the rate field.*
          </div>

          {/* Use the SAME .matrix grid so columns line up perfectly */}
          <div className="matrix" style={{ rowGap: 0 }}>
            {/* labels spacer column (same width as above: 200px) */}
            <div
              className="matrixLabels"
              style={{
                display: "grid",
                gridTemplateRows: `48px`,
                border: "1px solid transparent",
                background: "transparent",
              }}
            >
              <div className="mRow" style={{ justifyContent: "center", color: "#475569" }}>
                <b>Basic Gross (no roll/deferred)</b>
              </div>
            </div>

            {/* one aligned row per product column */}
            {SHOW_FEE_COLS.map((k, idx) => {
              const d = computeBasicGrossForCol(k);
              if (!d) return null;

              return (
                <div
                  key={`basic-${k}`}
                  className="matrixCol"
                  style={{
                    display: "grid",
                    gridTemplateRows: `48px`,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  }}
                >
                  <div className="mRow" style={{ padding: 6 }}>
                    <div
                      className="mValue"
                      style={{
                        width: "100%",
                        textAlign: "center",
                        fontWeight: 800,
                        background: "#f1f5f9",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      {fmtMoney0(d.grossBasic)}{" "}
                      <span style={{ fontWeight: 700 }}>
                        @ {d.ltvPctBasic != null ? `${d.ltvPctBasic}% LTV` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer line under the aligned row */}
            
          </div>
          <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: 12, fontSize: 12, color: "#334155" }}>
              <span style={{ marginRight: 16 }}>
                <b>MVR (Market Financial Solutions Variable Rate)</b> is currently{" "}
                {(CURRENT_MVR * 100).toFixed(2)}%
              </span>
              <span>
                <b>BBR</b> is currently {(STANDARD_BBR * 100).toFixed(2)}%
              </span>
            </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);