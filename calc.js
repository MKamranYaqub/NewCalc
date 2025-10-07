const { useState, useMemo } = React;

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

/* ----------------------------- GLOBAL CONSTANTS ---------------------------- */
const MAX_ROLLED_MONTHS = 6;
const MAX_DEFERRED_FIX = 0.0125;     // 1.25%
const MAX_DEFERRED_TRACKER = 0.015;  // 1.50%

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

/* ---------------------------- Revert + ERC Text ---------------------------- */
function formatRevertRate(tier, cfg) {
  const add = cfg.REVERT_RATE?.[tier]?.add ?? 0;
  return add === 0 ? "MVR" : `MVR + ${(add * 100).toFixed(2)}%`;
}
function formatERC(productType, cfg) {
  const ercArr = cfg.ERC?.[productType] ?? ["—"];
  return ercArr.join(" / ");
}

/* ------------------------------- LTV helper -------------------------------- */
function getMaxLTV(tier, flatAboveComm, category, cfg) {
  // If explicit MAX_LTV provided in config, prefer it.
  if (cfg?.MAX_LTV) return cfg.MAX_LTV;

  // Keep legacy behaviours: Commercial/Semi -> 70%; Residential ~75% (with Tier 2 / flat above comm possibly reducing)
  if (category !== "Residential") return 0.70;
  if (tier === "Tier 2" || flatAboveComm === "Yes") return 0.70;
  return 0.75;
}

/* ----------------------------------- App ----------------------------------- */
function App() {
  /* --------- Category switch (decides which criteria/rates/constants to use) --------- */
  const [propertyCategory, setPropertyCategory] = useState("Residential");

  const isCommercialMode =
    propertyCategory === "Commercial" || propertyCategory === "Semi-Commercial";

  // Active configs (pull from window.* that your existing files define)
  const activeCriteria =
    isCommercialMode ? window.CRITERIA_COMM || window.CRITERIA_CONFIG_Commercial : window.CRITERIA_CONFIG;

  const activeRates =
    isCommercialMode ? window.RATES_Commercial : window.RATES;

  const activeProducts =
    isCommercialMode
      ? (window.PRODUCT_TYPES_Commercial || ["2yr Fix", "3yr Fix", "2yr Tracker"])
      : (window.PRODUCT_TYPES || ["2yr Fix", "5yr Fix", "Tracker"]);

  const activeFeeCols =
    isCommercialMode
      ? (window.FEE_COLS_Commercial || ["6", "4", "2"])
      : (window.SHOW_FEE_COLS || ["6", "4", "3", "2"]);

  const activeMIN_ICR =
    isCommercialMode ? window.MIN_ICR_Commercial : window.MIN_ICR;

  const activeMIN_LOAN =
    isCommercialMode ? (window.MIN_LOAN_Commercial ?? 150000) : (window.MIN_LOAN ?? 75000);

  const activeMAX_LOAN =
    isCommercialMode ? (window.MAX_LOAN_Commercial ?? 2000000) : (window.MAX_LOAN ?? 3000000);

  const activeSTANDARD_BBR =
    isCommercialMode ? (window.STANDARD_BBR_Commercial ?? 0.04) : (window.STANDARD_BBR ?? 0.04);

  const activeSTRESS_BBR =
    isCommercialMode ? (window.STRESS_BBR_Commercial ?? 0.0425) : (window.STRESS_BBR ?? 0.0425);

  const activeTERM_MONTHS =
    isCommercialMode
      ? (window.TERM_MONTHS_Commercial || { "2yr Fix": 24, "3yr Fix": 36, "2yr Tracker": 24, Tracker: 24 })
      : (window.TERM_MONTHS || { "2yr Fix": 24, "5yr Fix": 60, "Tracker": 24 });

  const activeTOTAL_TERM =
    isCommercialMode ? (window.TOTAL_TERM_Commercial ?? 10) : (window.TOTAL_TERM ?? 10);

  const activeMVR =
    isCommercialMode ? (window.CURRENT_MVR_Commercial ?? 0.0859) : (window.CURRENT_MVR ?? 0.0859);

  // Bundle to pass into helpers (so we don’t change signatures elsewhere)
  const activeCFG = useMemo(
    () => ({
      REVERT_RATE: isCommercialMode ? window.REVERT_RATE_Commercial : window.REVERT_RATE,
      ERC: isCommercialMode ? window.ERC_Commercial : window.ERC,
      MAX_LTV: isCommercialMode ? window.MAX_LTV_Commercial : window.MAX_LTV_Residential,
    }),
    [isCommercialMode]
  );

  /* ---------- Dynamic Criteria State (auto-initialised from activeCriteria) ---------- */
  const makeInitialCriteria = (cfg) => {
    const s = {};
    (cfg?.propertyQuestions || []).forEach((q) => (s[q.key] = q.options?.[0]?.label || ""));
    (cfg?.applicantQuestions || []).forEach((q) => (s[q.key] = q.options?.[0]?.label || ""));
    (cfg?.adverseQuestions || []).forEach((q) => (s[q.key] = q.options?.[0]?.label || ""));
    return s;
  };

  const [criteria, setCriteria] = useState(makeInitialCriteria(activeCriteria));
  // When category (and thus activeCriteria) changes, reset criteria values to that set’s defaults
  React.useEffect(() => {
    setCriteria(makeInitialCriteria(activeCriteria));
  }, [propertyCategory]);

  const handleCriteriaChange = (key, value) =>
    setCriteria((prev) => ({ ...prev, [key]: value }));

  /* --------------------------- Other user inputs/state --------------------------- */
  const [productType, setProductType] = useState(activeProducts[0] || "2yr Fix");
  React.useEffect(() => {
    // Reset product type to a valid option whenever category changes
    setProductType(activeProducts[0] || "2yr Fix");
  }, [propertyCategory]);

  const [useSpecificNet, setUseSpecificNet] = useState("No");
  const [specificNetLoan, setSpecificNetLoan] = useState("");

  const [propertyValue, setPropertyValue] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");

  // Client / Email
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [validationError, setValidationError] = useState("");

  const cleanDigits = (v) => String(v).replace(/[^\d]/g, "");
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  const isValidPhone = (v) => {
    const d = cleanDigits(v);
    return d.length >= 10 && d.length <= 15;
  };

  /* -------------------------------- Tier logic -------------------------------- */
  const tier = useMemo(() => {
    let t = 1;
    const allQs = [
      ...(activeCriteria?.propertyQuestions || []),
      ...(activeCriteria?.applicantQuestions || []),
      ...(activeCriteria?.adverseQuestions || []),
    ];
    for (const q of allQs) {
      const val = criteria[q.key];
      const match = (q.options || []).find((o) => o.label === val);
      if (match?.tier) t = Math.max(t, Number(match.tier));
    }
    return t === 1 ? "Tier 1" : "Tier 2";
  }, [criteria, activeCriteria]);

  const selected =
    activeRates?.[tier]?.products?.[productType] || {};

  const isTracker = !!selected?.isMargin;

  /* ------------------------------ Calculations ------------------------------ */
  const canShowMatrix = useMemo(() => {
    const mr = toNumber(monthlyRent);
    const pv = toNumber(propertyValue);
    const sn = toNumber(specificNetLoan);
    if (!mr) return false;
    if (useSpecificNet === "Yes") return !!sn;
    return !!pv;
  }, [monthlyRent, propertyValue, specificNetLoan, useSpecificNet]);

  function computeForCol(colKey) {
    const feePct = Number(colKey) / 100;
    const base = selected?.[colKey];
    if (base == null) return null;

    const displayRate = isTracker ? base + activeSTANDARD_BBR : base;
    const fullRateText = isTracker ? `${(base * 100).toFixed(2)}% + BBR` : `${(base * 100).toFixed(2)}%`;

    const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;
    const payRateAdj = Math.max(displayRate - deferredCap, 0);
    const payRateText = isTracker
      ? `${((base - deferredCap) * 100).toFixed(2)}% + BBR`
      : `${(payRateAdj * 100).toFixed(2)}%`;

    const pv = toNumber(propertyValue);
    const mr = toNumber(monthlyRent);
    const minICR = productType.includes("Fix")
      ? (activeMIN_ICR?.Fix ?? 1.25)
      : (activeMIN_ICR?.Tracker ?? 1.3);

    const flatAboveComm = criteria?.flatAboveComm || criteria?.flat_above_commercial || "No";
    const maxLTV = getMaxLTV(tier, flatAboveComm, propertyCategory, activeCFG);
    const grossLTV = pv ? pv * maxLTV : Infinity;

    const stressRate = isTracker ? base + activeSTRESS_BBR : displayRate;
    const termMonths = activeTERM_MONTHS[productType] ?? 24;
    const rolledMonths = Math.min(MAX_ROLLED_MONTHS, termMonths);
    const monthsLeft = Math.max(termMonths - rolledMonths, 1);
    const stressAdj = Math.max(stressRate - deferredCap, 1e-6);

    let grossRent = Infinity;
    if (mr && stressAdj) {
      const annualRent = mr * termMonths;
      grossRent = annualRent / (minICR * (stressAdj / 12) * monthsLeft);
    }

    const N_input = toNumber(specificNetLoan);
    let grossFromNet = null;
    if (N_input && useSpecificNet === "Yes") {
      const denominator =
        1 -
        (deferredCap / 12) * termMonths -
        feePct -
        (payRateAdj / 12) * rolledMonths;
      grossFromNet = N_input / denominator;
    }

    let eligibleGross = Math.min(grossLTV, grossRent, activeMAX_LOAN);
    if (useSpecificNet === "Yes" && grossFromNet != null) {
      eligibleGross = Math.min(eligibleGross, grossFromNet);
    }

    const belowMin = eligibleGross < activeMIN_LOAN - 1e-6;
    const hitMaxCap = Math.abs(eligibleGross - activeMAX_LOAN) < 1e-6;

    const feeAmt = eligibleGross * feePct;
    const rolled =
      ((eligibleGross * (displayRate - deferredCap)) / 12) * rolledMonths;
    const deferred = ((eligibleGross * deferredCap) / 12) * termMonths;
    const net = eligibleGross - feeAmt - rolled - deferred;
    const ltv = pv ? eligibleGross / pv : null;
    const ddAmount = eligibleGross * (payRateAdj / 12);

    return {
      productName: `${productType}, ${tier}`,
      fullRateText,
      payRateText,
      deferredCapPct: deferredCap,
      net,
      gross: eligibleGross,
      feeAmt,
      rolled,
      deferred,
      ltv,
      rolledMonths,
      directDebit: ddAmount,
      maxLtvRule: maxLTV,
      termMonths,
      belowMin,
      hitMaxCap,
    };
  }

  function computeBasicGrossForCol(colKey) {
    const base = selected?.[colKey];
    if (base == null) return null;

    const pv = toNumber(propertyValue);
    const mr = toNumber(monthlyRent);
    const sn = toNumber(specificNetLoan);
    const feePct = Number(colKey) / 100;
    const minICR = productType.includes("Fix")
      ? (activeMIN_ICR?.Fix ?? 1.25)
      : (activeMIN_ICR?.Tracker ?? 1.3);

    const flatAboveComm = criteria?.flatAboveComm || criteria?.flat_above_commercial || "No";
    const maxLTV = getMaxLTV(tier, flatAboveComm, propertyCategory, activeCFG);
    const grossLTV = pv ? pv * maxLTV : Infinity;

    const displayRate = isTracker ? base + activeSTANDARD_BBR : base;
    const stressRate = isTracker ? base + activeSTRESS_BBR : displayRate;
    const deferredCap = 0; // "Basic" calc = no roll/deferred
    const stressAdj = Math.max(stressRate - deferredCap, 1e-6);

    let grossRent = Infinity;
    if (mr && stressAdj) {
      const annualRent = mr * 12;
      grossRent = annualRent / (minICR * stressAdj);
    }

    let grossFromNet = Infinity;
    if (useSpecificNet === "Yes" && sn != null && feePct < 1) {
      grossFromNet = sn / (1 - feePct);
    }

    const eligibleGross = Math.min(grossLTV, grossRent, grossFromNet, activeMAX_LOAN);
    const ltvPct = pv ? Math.round((eligibleGross / pv) * 100) : null;

    return { grossBasic: eligibleGross, ltvPctBasic: ltvPct };
  }

  const bestSummary = useMemo(() => {
    if (!canShowMatrix) return null;
    const pv = toNumber(propertyValue) || 0;
    const items = activeFeeCols.map((k) => [k, computeForCol(k)]).filter(([, d]) => !!d);
    if (!items.length) return null;

    let best = null;
    for (const [colKey, d] of items) {
      if (!best || d.gross > best.gross) {
        best = {
          colKey,
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
  }, [
    productType,
    tier,
    propertyValue,
    monthlyRent,
    useSpecificNet,
    specificNetLoan,
    criteria.flatAboveComm,
    propertyCategory,
    canShowMatrix,
  ]);

  /* --------------------------- Send Quote via Email --------------------------- */
  const handleSendQuote = async () => {
    setValidationError("");
    setSendStatus(null);

    if (!canShowMatrix || !bestSummary) {
      setValidationError("Please complete the calculation fields before sending email.");
      return;
    }
    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim()) {
      setValidationError("Please complete all client fields before sending email.");
      return;
    }
    if (!isValidEmail(clientEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const zapierWebhookUrl = "https://hooks.zapier.com/hooks/catch/10082441/uhbzcvu/";

      const columnCalculations = activeFeeCols
        .map((k) => ({ feePercent: k, ...computeForCol(k) }))
        .filter((d) => !!d.gross);

      const basicGrossCalculations = activeFeeCols
        .map((k) => computeBasicGrossForCol(k))
        .filter(Boolean);

      const basePayload = {
        requestId: `MFS-UNIFIED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        propertyCategory,
        clientName,
        clientPhone,
        clientEmail,
        propertyValue,
        monthlyRent,
        productType,
        useSpecificNet,
        specificNetLoan,
        tier,
        submissionTimestamp: new Date().toISOString(),
        revertRate: formatRevertRate(tier, activeCFG),
        totalTerm: `${activeTOTAL_TERM} years`,
        erc: formatERC(productType, activeCFG),
        currentMvr: activeMVR,
        standardBbr: activeSTANDARD_BBR,
      };

      const flatPayload = { ...basePayload, ...criteria };

      for (const key in bestSummary) {
        flatPayload[`bestSummary${key.charAt(0).toUpperCase() + key.slice(1)}`] = bestSummary[key];
      }

      columnCalculations.forEach((col, index) => {
        for (const key in col) {
          flatPayload[`allColumnData${key.charAt(0).toUpperCase() + key.slice(1)}_${index}`] = col[key];
        }
      });

      basicGrossCalculations.forEach((col, index) => {
        for (const key in col) {
          flatPayload[`basicGrossColumnData${key.charAt(0).toUpperCase() + key.slice(1)}_${index}`] = col[key];
        }
      });

      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(flatPayload)) form.append(k, v);

      const res = await fetch(zapierWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: form.toString(),
      });

      setSendStatus(res.ok ? "success" : "error");
    } catch (e) {
      console.error("Error sending quote:", e);
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
    background: "#e2e8f0",
    borderRadius: 8,
    padding: "8px 10px",
  };

  /* ---------------------------------- Render ---------------------------------- */
  return (
    <div className="container">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        {/* Property Category (decides which configs to use) */}
        <div className="field">
          <label>Property Category</label>
          <select
            value={propertyCategory}
            onChange={(e) => setPropertyCategory(e.target.value)}
          >
            <option>Residential</option>
            <option>Commercial</option>
            <option>Semi-Commercial</option>
          </select>
        </div>

        <div className="note" style={{ marginBottom: 8 }}>
          Tier is calculated automatically from the inputs below. Current:{" "}
          <b>{tier}</b>
        </div>

        <div className="profile-grid">
          <SectionTitle>Property Type</SectionTitle>
          {(activeCriteria?.propertyQuestions || []).map((q) => (
            <div className="field" key={q.key}>
              <label>{q.label}</label>
              <select
                value={criteria[q.key]}
                onChange={(e) => handleCriteriaChange(q.key, e.target.value)}
              >
                {(q.options || []).map((o) => (
                  <option key={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}

          <SectionTitle>Applicant Details</SectionTitle>
          {(activeCriteria?.applicantQuestions || []).map((q) => (
            <div className="field" key={q.key}>
              <label>{q.label}</label>
              <select
                value={criteria[q.key]}
                onChange={(e) => handleCriteriaChange(q.key, e.target.value)}
              >
                {(q.options || []).map((o) => (
                  <option key={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}

          <SectionTitle>Adverse Credit</SectionTitle>
          {(activeCriteria?.adverseQuestions || []).map((q) => (
            <div className="field" key={q.key}>
              <label>{q.label}</label>
              <select
                value={criteria[q.key]}
                onChange={(e) => handleCriteriaChange(q.key, e.target.value)}
              >
                {(q.options || []).map((o) => (
                  <option key={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}

          <SectionTitle>Property & Product</SectionTitle>

          <div
            className="profile-grid property-product"
            style={{ gridColumn: "1 / -1" }}
          >
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

            <div className="field">
              <label>Use Specific Net Loan?</label>
              <select
                value={useSpecificNet}
                onChange={(e) => setUseSpecificNet(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            {useSpecificNet === "Yes" && (
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

            <div className="field">
              <label>Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              >
                {activeProducts.map((p) => (
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
              aria-invalid={validationError && !isValidPhone(clientPhone) ? "true" : "false"}
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
          <div style={{ marginTop: "16px", color: "#b91c1c", fontWeight: "50-0", textAlign: "center" }}>
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

      {/* ----------------------- Hero Result (best option) ----------------------- */}
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
            Based on the inputs, the maximum gross loan is:
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
              {bestSummary.grossStr} @ {bestSummary.grossLtvPct}% LTV,{" "}
              {productType}, {tier}, {Number(bestSummary.colKey)}% Fee
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
                (amount advanced day 1) is {fmtMoney0(bestSummary.net)} @{" "}
                {bestSummary.netLtvPct}% LTV, {productType}, {tier},{" "}
                {Number(bestSummary.colKey)}% Fee
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------- Matrix -------------------------------- */}
      {canShowMatrix && (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="matrix">
            {(() => {
              const colData = activeFeeCols.map((k) => [k, computeForCol(k)]).filter(([, d]) => !!d);
              const anyBelowMin = colData.some(([, d]) => d.belowMin);
              const anyAtMaxCap = colData.some(([, d]) => d.hitMaxCap);

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
                        `⚠️ One or more gross loans are below the £${activeMIN_LOAN.toLocaleString()} minimum threshold. `}
                      {anyAtMaxCap &&
                        `ⓘ One or more gross loans are capped at the £${activeMAX_LOAN.toLocaleString()} maximum.`}
                    </div>
                  )}

                  <div
                    className="matrixLabels"
                    style={{
                      display: "grid",
                      gridTemplateRows: `
                        55px
                        48px 48px 48px 48px 48px
                        48px 48px 48px 48px 48px 85px 48px
                      `,
                    }}
                  >
                    <div className="labelsHead"></div>
                    <div className="mRow"><b>Product Name</b></div>
                    <div className="mRow"><b>Full Rate</b></div>
                    <div className="mRow"><b>Pay Rate</b></div>
                    <div className="mRow">
                      <b>Net Loan <span style={{ fontSize: "11px", fontWeight: 400 }}>(advanced day 1)</span></b>
                    </div>
                    <div className="mRow">
                      <b>Max Gross Loan <span style={{ fontSize: "11px", fontWeight: 400 }}>(paid at redemption)</span></b>
                    </div>
                    <div className="mRow"><b>Product Fee</b></div>
                    <div className="mRow"><b>Rolled Months Interest</b></div>
                    <div className="mRow"><b>Deferred Interest</b></div>
                    <div className="mRow"><b>Direct Debit</b></div>
                    <div className="mRow"><b>Revert Rate</b></div>
                    <div className="mRow"><b>Total Term | ERC</b></div>
                    <div className="mRow"><b>Max Product LTV</b></div>
                  </div>

                  {colData.map(([colKey, data], idx) => {
                    const headClass =
                      idx === 0 ? "headGreen" : idx === 1 ? "headOrange" : "headBlue";

                    return (
                      <div
                        key={colKey}
                        className="matrixCol"
                        style={{
                          display: "grid",
                          gridTemplateRows: `
                            55px
                            48px 48px 48px 48px 48px
                            48px 48px 48px 48px 48px 85px 48px
                          `,
                        }}
                      >
                        <div className={`matrixHead ${headClass}`}>
                          BTL, {Number(colKey)}% Product Fee
                        </div>

                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{data.productName}</div></div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{data.fullRateText}</div></div>
                        <div className="mRow">
                          <div className="mValue" style={valueBoxStyle}>
                            {data.payRateText}
                            <span style={{fontWeight: 500, fontSize: 10, marginLeft: 6}}>
                              (using {(data.deferredCapPct * 100).toFixed(2)}% deferred)
                            </span>
                          </div>
                        </div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.net)}</div></div>
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
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.feeAmt)} ({Number(colKey).toFixed(2)}%)</div></div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.rolled)} ({data.rolledMonths} months)</div></div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.deferred)} ({(data.deferredCapPct * 100).toFixed(2)}%)</div></div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{fmtMoney0(data.directDebit)} from month {MAX_ROLLED_MONTHS + 1}</div></div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{formatRevertRate(tier, activeCFG)}</div></div>
                        <div className="mRow"><div className="mValue" style={valueBoxStyle}>{activeTOTAL_TERM} years | {formatERC(productType, activeCFG)}</div></div>
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

      {/* ---------------------------- Basic Gross Row ---------------------------- */}
      {canShowMatrix && (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
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
            Results currently use maximum rolled months & deferred interest.
            Speak with an underwriter for a customised loan illustration which
            can utilise less rolled and deferred interest (which can increase
            the net loan on day 1).
          </div>

          <div className="matrix" style={{ rowGap: 0 }}>
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

            {activeFeeCols.map((k) => {
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

            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                marginTop: 12,
                fontSize: 12,
                color: "#334155",
              }}
            >
              <span style={{ marginRight: 16 }}>
                <b>MVR (Market Financial Solutions Variable Rate)</b> is
                currently {(activeMVR * 100).toFixed(2)}%
              </span>
              <span>
                <b>BBR</b> is currently {(activeSTANDARD_BBR * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
