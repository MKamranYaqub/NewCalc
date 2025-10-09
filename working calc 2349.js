/* calc.js — BTL + Core (+Retention) — full app (React 18, Babel-in-browser)
   Assumes:
   - criteria.js defines window.CRITERIA_CONFIG and window.CORE_CRITERIA_CONFIG
   - rates.js defines window.RATES, window.RATES_Commercial, window.RATES_Retention_65/_75,
     window.RATES_Core, window.RATES_Core_Retention_65/_75, FEE_COLUMN_KEYS, LOAN_LIMITS, etc.
   - index.html loads React, ReactDOM, Babel, then criteria.js, rates.js, then this file as type="text/babel"
*/

(function () {
  const { useState, useMemo, useEffect, useCallback } = React;

  /* ============ small utils ============ */
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
  const parsePct = (str) => {
    if (str === "" || str == null) return null;
    const cleaned = String(str).replace("%", "").trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num / 100 : null;
  };

  /* ============ UI pieces ============ */
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

  function Collapsible({ title, isOpen, onToggle, children }) {
    return (
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div
          onClick={onToggle}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            backgroundColor: "#f8fafc",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background .2s",
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span style={{ fontSize: 20 }}>{isOpen ? "▾" : "▸"}</span>
        </div>
        <div
          style={{
            maxHeight: isOpen ? "2000px" : "0px",
            overflow: "hidden",
            transition: "max-height .3s",
          }}
        >
          <div style={{ marginTop: isOpen ? "16px" : "0px" }}>{children}</div>
        </div>
      </div>
    );
  }

  function SliderInput({
    label,
    min,
    max,
    step,
    value,
    onChange,
    formatValue,
    style,
  }) {
    return (
      <div style={style}>
        {label && <div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ fontSize: 12, textAlign: "center", marginTop: 4 }}>
          {formatValue ? formatValue(value) : value}
        </div>
      </div>
    );
  }

  /* ============ constants ============ */
  const CORE_FLOOR_RATE = 0.055; // 5.5%

  function App() {
    /* ---------- top-level selections ---------- */
    const [mainProductType, setMainProductType] = useState("BTL");
    const [propertyType, setPropertyType] = useState("Residential");

    const [isRetention, setIsRetention] = useState("No");
    const [retentionLtv, setRetentionLtv] = useState("65"); // "65" or "75"

    const [productType, setProductType] = useState("2yr Fix"); // "2yr Fix", "3yr Fix", "2yr Tracker"
    const [productGroup, setProductGroup] = useState("Specialist"); // "Specialist" | "Core"

    /* ---------- criteria state ---------- */
    const getCurrentCriteria = () => {
      if (propertyType === "Commercial" || propertyType === "Semi-Commercial") {
        return (
          window.CRITERIA_CONFIG?.Commercial ||
          window.CRITERIA_CONFIG?.Residential
        );
      }
      return window.CRITERIA_CONFIG?.Residential;
    };

    const initializeCriteriaState = (cfg) => {
      const s = {};
      cfg?.propertyQuestions?.forEach((q) => {
        s[q.key] = q.options[0].label;
      });
      cfg?.applicantQuestions?.forEach((q) => {
        s[q.key] = q.options[0].label;
      });
      return s;
    };

    const [criteria, setCriteria] = useState(() =>
      initializeCriteriaState(getCurrentCriteria())
    );

    useEffect(() => {
      setCriteria(initializeCriteriaState(getCurrentCriteria()));
      // if leaving Residential and Core is selected, revert to Specialist
      if (!window.isCoreEligible?.(propertyType) && productGroup === "Core") {
        setProductGroup("Specialist");
      }
    }, [propertyType]); // eslint-disable-line

    const currentCriteria = getCurrentCriteria();

    // determine Tier from criteria (max tier across selected answers)
    const tier = useMemo(() => {
      const cfg = getCurrentCriteria();
      let maxTier = 1;
      cfg?.propertyQuestions?.forEach((q) => {
        const a = criteria[q.key];
        const o = q.options.find((opt) => opt.label === a);
        if (o && o.tier > maxTier) maxTier = o.tier;
      });
      cfg?.applicantQuestions?.forEach((q) => {
        const a = criteria[q.key];
        const o = q.options.find((opt) => opt.label === a);
        if (o && o.tier > maxTier) maxTier = o.tier;
      });
      return `Tier ${maxTier}`;
    }, [criteria, propertyType]);

    /* ---------- Core eligibility: respect CORE_CRITERIA_CONFIG ---------- */
    const isWithinCoreCriteria = useMemo(() => {
      if (propertyType !== "Residential") return false;
      const coreCfg = window.CORE_CRITERIA_CONFIG?.Residential;
      if (!coreCfg) return false;

      const checkGroup = (groupKey, fullCfg) => {
        const coreGroup = coreCfg?.[groupKey] || [];
        for (const q of fullCfg?.[groupKey] || []) {
          const selectedAnswer = criteria[q.key];
          const coreQ = coreGroup.find((c) => c.key === q.key);
          if (!coreQ) continue; // if not constrained by Core, ignore
          const allowedLabels = coreQ.options.map((o) => o.label);
          if (!allowedLabels.includes(selectedAnswer)) {
            return false;
          }
        }
        return true;
      };

      const okProp = checkGroup(
        "propertyQuestions",
        window.CRITERIA_CONFIG?.Residential
      );
      const okApp = checkGroup(
        "applicantQuestions",
        window.CRITERIA_CONFIG?.Residential
      );
      return okProp && okApp;
    }, [criteria, propertyType]);

    // if Core selected but newly ineligible → revert to Specialist
    useEffect(() => {
      if (productGroup === "Core" && !isWithinCoreCriteria) {
        setProductGroup("Specialist");
      }
    }, [isWithinCoreCriteria, productGroup]);

    /* ---------- input fields ---------- */
    const [procFeePctInput, setProcFeePctInput] = useState(1); // base 1%
    // Automatically update Proc Fee input when retention changes
    useEffect(() => {
      if (isRetention === "Yes") {
        setProcFeePctInput(0.5);
      } else {
        setProcFeePctInput(1.0);
      }
    }, [isRetention]);

    const [brokerFeePct, setBrokerFeePct] = useState("");
    const [brokerFeeFlat, setBrokerFeeFlat] = useState("");

    const [specificNetLoan, setSpecificNetLoan] = useState("");
    const [specificGrossLoan, setSpecificGrossLoan] = useState("");
    const [loanTypeRequired, setLoanTypeRequired] = useState(
      "Max Optimum Gross Loan"
    );
    const [specificLTV, setSpecificLTV] = useState(0.75);
    const [propertyValue, setPropertyValue] = useState("1000000");
    const [monthlyRent, setMonthlyRent] = useState("3000");

    // sliders/overrides
    const [rateOverrides, setRateOverrides] = useState({});
    const [feeOverrides, setFeeOverrides] = useState({});
    const [manualSettings, setManualSettings] = useState({}); // { [feeKey]: { rolledMonths, deferredPct } }
    const [tempRateInput, setTempRateInput] = useState({});
    const [tempFeeInput, setTempFeeInput] = useState({});

    // collapsibles
    const [openSections, setOpenSections] = useState({
      criteria: false,
      property: true,
      fees: false,
    });

    /* ---------- constants from rates.js ---------- */
    const {
      MAX_ROLLED_MONTHS,
      MAX_DEFERRED_FIX,
      MAX_DEFERRED_TRACKER,
      MIN_ICR_FIX,
      MIN_ICR_TRK,
      TOTAL_TERM,
    } = useMemo(() => {
      return (
        window.LOAN_LIMITS?.[propertyType] || window.LOAN_LIMITS?.Residential
      );
    }, [propertyType]);

    const PRODUCT_TYPES =
      propertyType === "Residential"
        ? window.PRODUCT_TYPES || ["2yr Fix", "3yr Fix", "2yr Tracker"]
        : window.PRODUCT_TYPES_Commercial || [
            "2yr Fix",
            "3yr Fix",
            "2yr Tracker",
          ];

    // Proc Fee auto-adjustment for Core Retention: base 1% → minus 0.5% = 0.5%
    const effectiveProcFeePct = useMemo(() => {
      const base = Number(procFeePctInput || 0) || 1;
      if (productGroup === "Core" && isRetention === "Yes") {
        const adjusted = base - 0.5;
        return adjusted < 0 ? 0 : adjusted;
      }
      return base;
    }, [procFeePctInput, productGroup, isRetention]);

    // fee column keys (headers)
    const SHOW_FEE_COLS = useMemo(() => {
      // Core path
      if (productGroup === "Core") {
        if (isRetention === "Yes") {
          return retentionLtv === "65"
            ? window.FEE_COLUMN_KEYS?.Core_Retention_65 || [5.5, 3.5, 2.5, 1.5]
            : window.FEE_COLUMN_KEYS?.Core_Retention_75 || [5.5, 3.5, 2.5, 1.5];
        }
        return [6, 4, 3, 2];
      }
      // Specialist Retention
      if (isRetention === "Yes") {
        return propertyType === "Residential"
          ? window.FEE_COLUMN_KEYS?.RetentionResidential || [5.5, 3.5, 2.5, 1.5]
          : window.FEE_COLUMN_KEYS?.RetentionCommercial || [5.5, 3.5, 1.5];
      }
      // Normal
      return window.FEE_COLUMN_KEYS?.[propertyType] || [6, 4, 3, 2];
    }, [productGroup, isRetention, retentionLtv, propertyType]);

    // availability check to render outputs
    const canShowMatrix = useMemo(() => {
      const mr = toNumber(monthlyRent);
      const pv = toNumber(propertyValue);
      const sn = toNumber(specificNetLoan);
      const sg = toNumber(specificGrossLoan);
      if (!mr) return false;
      if (loanTypeRequired === "Specific Net Loan") return !!sn && !!pv;
      if (loanTypeRequired === "Maximum LTV Loan") return !!pv;
      if (loanTypeRequired === "Specific Gross Loan") return !!pv && !!sg;
      return !!pv;
    }, [
      monthlyRent,
      propertyValue,
      specificNetLoan,
      specificGrossLoan,
      loanTypeRequired,
    ]);

    /* ---------- LTV rules from criteria.js ---------- */
    function getMaxLTV({
      propertyType,
      isRetention,
      retentionLtv,
      propertyAnswers = {},
      tier,
      productType,
    }) {
      const rules = window.CRITERIA_CONFIG?.maxLTVRules || {};
      const def = rules.default?.[propertyType] ?? 75;
      const numericLtv = Number(String(retentionLtv || "").match(/\d+/)?.[0]);
      // example of optional override — flat above commercial
      const isFlat =
        propertyAnswers.flatAboveComm === "Yes" ||
        propertyAnswers?.criteria?.flatAboveComm === "Yes";
      let retOv = null;
      if (isRetention === "Yes" && numericLtv) {
        retOv = rules.retention?.[propertyType]?.[numericLtv];
      }
      let flatOv = null;
      if (
        propertyType === "Residential" &&
        isFlat &&
        rules.flatAboveCommOverrides?.[tier] != null
      ) {
        flatOv = rules.flatAboveCommOverrides[tier];
      }
      const applicable = [def];
      if (retOv != null) applicable.push(retOv);
      if (flatOv != null) applicable.push(flatOv);
      return Math.min(...applicable) / 100;
    }

    /* ---------- rate source selection (Core + Core Retention supported) ---------- */
    const selected = useMemo(() => {
      const isCommercial =
        propertyType === "Commercial" || propertyType === "Semi-Commercial";

      // Core range (Residential only)
      if (productGroup === "Core" && window.isCoreEligible?.(propertyType)) {
        if (isRetention === "Yes") {
          const coreRetRates =
            retentionLtv === "65"
              ? window.RATES_Core_Retention_65
              : window.RATES_Core_Retention_75;
          return coreRetRates?.[tier]?.products?.[productType];
        }
        return window.RATES_Core?.[tier]?.products?.[productType];
      }

      // Specialist Retention
      if (isRetention === "Yes") {
        const retentionRates =
          retentionLtv === "65"
            ? window.RATES_Retention_65
            : window.RATES_Retention_75;
        return propertyType === "Residential"
          ? retentionRates?.Residential?.[tier]?.products?.[productType]
          : retentionRates?.Commercial?.[tier]?.products?.[productType];
      }

      // Specialist base (Residential/Commercial)
      return isCommercial
        ? window.RATES_Commercial?.[tier]?.products?.[productType]
        : window.RATES?.[tier]?.products?.[productType];
    }, [
      propertyType,
      productGroup,
      isRetention,
      retentionLtv,
      tier,
      productType,
    ]);

    const isTracker = !!selected?.isMargin;

    /* ---------- environment constants ---------- */
    const MIN_LOAN =
      propertyType === "Residential"
        ? window.MIN_LOAN ?? 150000
        : window.MIN_LOAN_Commercial ?? 150000;
    const MAX_LOAN =
      propertyType === "Residential"
        ? window.MAX_LOAN ?? 3000000
        : window.MAX_LOAN_Commercial ?? 2000000;
    const STANDARD_BBR =
      propertyType === "Residential"
        ? window.STANDARD_BBR ?? 0.04
        : window.STANDARD_BBR_Commercial ?? 0.04;
    const STRESS_BBR =
      propertyType === "Residential"
        ? window.STRESS_BBR ?? 0.0425
        : window.STRESS_BBR_Commercial ?? 0.0425;
    const CURRENT_MVR =
      propertyType === "Residential"
        ? window.CURRENT_MVR ?? 0.0859
        : window.CURRENT_MVR_Commercial ?? 0.0859;
    const TERM_MONTHS =
      propertyType === "Residential"
        ? window.TERM_MONTHS
        : window.TERM_MONTHS_Commercial;

    /* ---------- compute engine for a fee column ---------- */
    const applyCoreFloor = (r) => Math.max(r, CORE_FLOOR_RATE);

    const computeForCol = useCallback(
      (colKey, manualRolled, manualDeferred, overriddenRate) => {
        const base = selected?.[colKey];
        if (base == null && overriddenRate == null) return null;

        const pv = toNumber(propertyValue);
        const mr = toNumber(monthlyRent);
        const sn = toNumber(specificNetLoan);
        const sg = toNumber(specificGrossLoan);

        // fee%: allow override per column, else header percentage
        const feePct =
          (feeOverrides[colKey] != null
            ? Number(feeOverrides[colKey])
            : Number(colKey)) / 100;

        const minICR = productType.includes("Fix") ? MIN_ICR_FIX : MIN_ICR_TRK;

        // LTV caps
        const maxLTVPercent = getMaxLTV({
          propertyType,
          isRetention,
          retentionLtv,
          propertyAnswers: criteria,
          tier,
          productType,
        });
        const rulesLTVCap = pv ? Math.round(maxLTVPercent * pv) : Infinity;
        const specificLTVCap =
          loanTypeRequired === "Maximum LTV Loan" && specificLTV != null
            ? pv * specificLTV
            : Infinity;

        let ltvCap =
          loanTypeRequired === "Maximum LTV Loan"
            ? Math.min(specificLTVCap, rulesLTVCap)
            : rulesLTVCap;

        if (
          loanTypeRequired === "Specific Gross Loan" &&
          sg != null &&
          sg > 0
        ) {
          ltvCap = Math.min(ltvCap, sg);
        }

        const termMonths = TERM_MONTHS?.[productType] ?? 24;
        const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;

        const actualBaseRate = overriddenRate != null ? overriddenRate : base;

        let displayRate = isTracker
          ? actualBaseRate + STANDARD_BBR
          : actualBaseRate;
        let stressRate = isTracker ? actualBaseRate + STRESS_BBR : displayRate;

        // Core floor applies after BBR (for trackers)
        if (productGroup === "Core" && window.isCoreEligible?.(propertyType)) {
          displayRate = applyCoreFloor(displayRate);
          stressRate = applyCoreFloor(stressRate);
        }

        const evalCombo = (rolledMonths, d) => {
          const monthsLeft = Math.max(termMonths - rolledMonths, 1);
          const stressAdj = Math.max(stressRate - d, 1e-6);

          // Rent-based cap (ICR)
          let grossRent = Infinity;
          if (mr && stressAdj > 0) {
            const annualRent = mr * termMonths;
            grossRent = annualRent / (minICR * (stressAdj / 12) * monthsLeft);
          }

          // Net-back calculation
          let grossFromNet = Infinity;
          if (
            loanTypeRequired === "Specific Net Loan" &&
            sn != null &&
            feePct < 1
          ) {
            const payRateAdj = Math.max(displayRate - d, 0);
            const denom =
              1 -
              feePct -
              (payRateAdj / 12) * rolledMonths -
              (d / 12) * termMonths;
            if (denom > 1e-7) grossFromNet = sn / denom;
          }

          let eligibleGross = Math.min(ltvCap, grossRent, MAX_LOAN);
          if (loanTypeRequired === "Specific Net Loan")
            eligibleGross = Math.min(eligibleGross, grossFromNet);

          if (eligibleGross < MIN_LOAN - 1e-6) eligibleGross = 0;

          const payRateAdj = Math.max(displayRate - d, 0);
          const feeAmt = eligibleGross * feePct;
          const rolledAmt = eligibleGross * (payRateAdj / 12) * rolledMonths;
          const deferredAmt = eligibleGross * (d / 12) * termMonths;

          const net = eligibleGross - feeAmt - rolledAmt - deferredAmt;
          const ltv = pv ? eligibleGross / pv : null;

          // day-1 fees
          const procFeeDec = Number(effectiveProcFeePct || 0) / 100; // auto –0.5% for Core Retention
          const brokerFeeDec = brokerFeePct ? Number(brokerFeePct) / 100 : 0;
          const procFeeValue = eligibleGross * procFeeDec;
          const brokerFeeValue = brokerFeeFlat
            ? Number(brokerFeeFlat)
            : eligibleGross * brokerFeeDec;

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
            procFeeValue,
            brokerFeeValue,
          };
        };

        let best = null;

        // Core: no roll/defer at all
        if (productGroup === "Core" && window.isCoreEligible?.(propertyType)) {
          best = evalCombo(0, 0);
        } else if (manualRolled != null || manualDeferred != null) {
          // Manual path
          const rolled = Number.isFinite(manualRolled) ? manualRolled : 0;
          const deferred = Number.isFinite(manualDeferred) ? manualDeferred : 0;
          const safeRolled = Math.max(0, Math.min(rolled, MAX_ROLLED_MONTHS));
          const safeDeferred = Math.max(0, Math.min(deferred, deferredCap));
          try {
            best = evalCombo(safeRolled, safeDeferred);
            if (!best || !isFinite(best.gross)) best = evalCombo(0, 0);
          } catch {
            best = evalCombo(0, 0);
          }
        } else {
          // Specialist optimisation — scan for best net
          const maxRolled = Math.min(MAX_ROLLED_MONTHS, termMonths);
          const step = 0.0001;
          const steps = Math.max(1, Math.round(deferredCap / step));
          for (let r = 0; r <= maxRolled; r += 1) {
            for (let j = 0; j <= steps; j += 1) {
              const d = j * step;
              const out = evalCombo(r, d);
              if (!best || out.net > best.net) best = out;
            }
          }
        }

        if (!best) return null;

        const belowMin = best.gross > 0 && best.gross < MIN_LOAN - 1e-6;
        const hitMaxCap = Math.abs(best.gross - MAX_LOAN) < 1e-6;

        const fullRateText = isTracker
          ? `${((actualBaseRate + STANDARD_BBR) * 100).toFixed(2)}%`
          : `${(displayRate * 100).toFixed(2)}%`;

        const payRateText = isTracker
          ? `${(best.payRateAdj * 100).toFixed(2)}% + BBR adj`
          : `${(best.payRateAdj * 100).toFixed(2)}%`;

        const ddAmount = best.gross * (best.payRateAdj / 12);

        return {
          productName: `${productType}, ${tier}`,
          fullRateText,
          actualRateUsed: isTracker ? actualBaseRate : displayRate, // tracker shows margin; displayRate already floor applied for Core
          isRateOverridden: overriddenRate != null,
          payRateText,
          deferredCapPct: best.d,
          net: best.net,
          gross: best.gross,
          feeAmt: best.feeAmt,
          rolled: best.rolledAmt,
          deferred: best.deferredAmt,
          ltv: best.ltv,
          rolledMonths: best.rolledMonths,
          directDebit: ddAmount,
          maxLtvRule: maxLTVPercent,
          termMonths,
          belowMin,
          hitMaxCap,
          ddStartMonth: best.rolledMonths + 1,
          isManual: manualRolled != null && manualDeferred != null,
          procFeeValue: best.procFeeValue,
          brokerFeeValue: best.brokerFeeValue,
        };
      },
      [
        selected,
        propertyValue,
        monthlyRent,
        specificNetLoan,
        specificGrossLoan,
        specificLTV,
        loanTypeRequired,
        productType,
        tier,
        criteria,
        MIN_ICR_FIX,
        MIN_ICR_TRK,
        MIN_LOAN,
        MAX_LOAN,
        STANDARD_BBR,
        STRESS_BBR,
        TERM_MONTHS,
        isTracker,
        feeOverrides,
        effectiveProcFeePct,
        brokerFeePct,
        brokerFeeFlat,
        propertyType,
        productGroup,
        isRetention,
        retentionLtv,
      ]
    );

    function computeBasicGrossForCol(colKey) {
      const base = selected?.[colKey];
      if (base == null) return null;

      const pv = toNumber(propertyValue),
        mr = toNumber(monthlyRent),
        sn = toNumber(specificNetLoan),
        sg = toNumber(specificGrossLoan);

      const feePct =
        feeOverrides[colKey] != null
          ? Number(feeOverrides[colKey]) / 100
          : Number(colKey) / 100;

      const minICR = productType.includes("Fix") ? MIN_ICR_FIX : MIN_ICR_TRK;

      const maxLTVPercent = getMaxLTV({
        propertyType,
        isRetention,
        retentionLtv,
        propertyAnswers: criteria,
        tier,
        productType,
      });

      let ltvCap = pv ? Math.round(maxLTVPercent * pv) : Infinity;
      if (loanTypeRequired === "Maximum LTV Loan" && specificLTV != null)
        ltvCap = Math.min(ltvCap, pv * specificLTV);
      if (loanTypeRequired === "Specific Gross Loan" && sg != null && sg > 0)
        ltvCap = Math.min(ltvCap, sg);

      const termMonths = TERM_MONTHS?.[productType] ?? 24;

      let displayRate = isTracker ? base + STANDARD_BBR : base;
      let stressRate = isTracker ? base + STRESS_BBR : displayRate;
      if (productGroup === "Core" && window.isCoreEligible?.(propertyType)) {
        displayRate = applyCoreFloor(displayRate);
        stressRate = applyCoreFloor(stressRate);
      }

      const deferred = 0;
      const rolled = 0;
      const monthsLeft = termMonths - rolled;
      const stressAdj = Math.max(stressRate - deferred, 1e-6);

      let grossRent = Infinity;
      if (mr && stressAdj) {
        const annualRent = mr * termMonths;
        grossRent =
          annualRent / (minICR * (stressAdj / 12) * Math.max(monthsLeft, 1));
      }

      let grossFromNet = Infinity;
      if (
        loanTypeRequired === "Specific Net Loan" &&
        sn != null &&
        feePct < 1
      ) {
        const denom = 1 - feePct;
        if (denom > 0) grossFromNet = sn / denom;
      }

      let eligibleGross = Math.min(ltvCap, grossRent, MAX_LOAN);
      if (loanTypeRequired === "Specific Net Loan")
        eligibleGross = Math.min(eligibleGross, grossFromNet);

      const ltvPct = pv ? Math.round((eligibleGross / pv) * 100) : null;

      // day-1 fees
      const procFeeDec = Number(effectiveProcFeePct || 0) / 100;
      const brokerFeeDec = brokerFeePct ? Number(brokerFeePct) / 100 : 0;
      const procFeeValue = eligibleGross * procFeeDec;
      const brokerFeeValue = brokerFeeFlat
        ? Number(brokerFeeFlat)
        : eligibleGross * brokerFeeDec;

      return {
        grossBasic: eligibleGross,
        ltvPctBasic: ltvPct,
        procFeeValue,
        brokerFeeValue,
      };
    }

    const allColumnData = useMemo(() => {
      if (!canShowMatrix) return [];
      const pv = toNumber(propertyValue);
      return SHOW_FEE_COLS.map((colKey) => {
        const manual = manualSettings[colKey];
        const overriddenRate = rateOverrides[colKey];
        const data = computeForCol(
          colKey,
          manual?.rolledMonths,
          manual?.deferredPct,
          overriddenRate
        );
        if (!data) return null;
        const netLtv = pv ? data.net / pv : null;
        return { colKey, netLtv, ...data };
      }).filter(Boolean);
    }, [
      canShowMatrix,
      computeForCol,
      manualSettings,
      rateOverrides,
      propertyValue,
      SHOW_FEE_COLS,
    ]);

    const maxLTV = useMemo(
      () =>
        getMaxLTV({
          propertyType,
          isRetention,
          retentionLtv,
          propertyAnswers: criteria,
          tier,
          productType,
        }),
      [propertyType, isRetention, retentionLtv, criteria, tier, productType]
    );

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

    /* ---------- handlers ---------- */
    const handleRateInputChange = (colKey, val) =>
      setTempRateInput((p) => ({ ...p, [colKey]: val }));
    const handleRateInputBlur = (colKey, val, originalRate) => {
      setTempRateInput((p) => ({ ...p, [colKey]: undefined }));
      const parsed = parsePct(val);
      if (parsed != null && Math.abs(parsed - originalRate) > 1e-5) {
        setRateOverrides((p) => ({ ...p, [colKey]: parsed }));
      } else {
        setRateOverrides((p) => {
          const s = { ...p };
          delete s[colKey];
          return s;
        });
      }
    };

    const handleFeeInputChange = (colKey, val) =>
      setTempFeeInput((p) => ({ ...p, [colKey]: val }));
    const handleFeeInputBlur = (colKey, val, origPctDec) => {
      setTempFeeInput((p) => ({ ...p, [colKey]: undefined }));
      const parsed = parsePct(val);
      if (parsed != null && Math.abs(parsed - origPctDec) > 1e-8) {
        setFeeOverrides((p) => ({ ...p, [colKey]: parsed * 100 }));
      } else {
        setFeeOverrides((p) => {
          const s = { ...p };
          delete s[colKey];
          return s;
        });
      }
    };
    const handleResetFeeOverride = (colKey) =>
      setFeeOverrides((p) => {
        const s = { ...p };
        delete s[colKey];
        return s;
      });
    const handleRolledChange = (colKey, v) =>
      setManualSettings((p) => ({
        ...p,
        [colKey]: { ...p[colKey], rolledMonths: v },
      }));
    const handleDeferredChange = (colKey, v) =>
      setManualSettings((p) => ({
        ...p,
        [colKey]: { ...p[colKey], deferredPct: v },
      }));
    const handleResetManual = (colKey) =>
      setManualSettings((p) => {
        const s = { ...p };
        delete s[colKey];
        return s;
      });
    const handleResetRateOverride = (colKey) =>
      setRateOverrides((p) => {
        const s = { ...p };
        delete s[colKey];
        return s;
      });

    /* ---------- render ---------- */
    const valueBoxStyle = {
      width: "100%",
      textAlign: "center",
      fontWeight: 400,
      background: "#fff",
      borderRadius: 8,
      padding: "8px 10px",
    };
    const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;

    return (
      <div className="container">
        {/* Product Setup */}
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <SectionTitle>Product Setup</SectionTitle>
          <div
            style={{
              background: "#f1f5f9",
              color: "#334155",
              fontSize: 14,
              padding: "8px 12px",
              borderRadius: 8,
              marginTop: 4,
              marginBottom: 12,
              border: "1px solid #e2e8f0",
            }}
          >
            Based on the criteria, the current Tier is <strong>{tier}</strong>.
          </div>

          <div className="profile-grid">
            <div className="field">
              <label>Product Type</label>
              <select
                value={mainProductType}
                onChange={(e) => setMainProductType(e.target.value)}
              >
                <option>BTL</option>
                <option>Bridge</option>
                <option>Fusion</option>
              </select>
            </div>

            <div className="field">
              <label>Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option>Residential</option>
                <option>Commercial</option>
                <option>Semi-Commercial</option>
              </select>
            </div>

            <div className="field">
              <label>Is This a Retention loan?</label>
              <select
                value={isRetention}
                onChange={(e) => setIsRetention(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            {isRetention === "Yes" && (
              <div className="field">
                <label>Retention LTV Range</label>
                <select
                  value={retentionLtv}
                  onChange={(e) => setRetentionLtv(e.target.value)}
                >
                  <option>65</option>
                  <option>75</option>
                </select>
              </div>
            )}

            {/* Core toggle — show ONLY if inside Core criteria */}
            {window.isCoreEligible?.(propertyType) && (
              <div className="field">
                <label>BTL Product Group</label>
                <div
                  className="segToggle"
                  role="tablist"
                  aria-label="BTL Product Group"
                >
                  <button
                    type="button"
                    className={productGroup === "Specialist" ? "active" : ""}
                    onClick={() => setProductGroup("Specialist")}
                    aria-selected={productGroup === "Specialist"}
                  >
                    BTL Specialist
                  </button>

                  {isWithinCoreCriteria && (
                    <button
                      type="button"
                      className={productGroup === "Core" ? "active" : ""}
                      onClick={() => setProductGroup("Core")}
                      aria-selected={productGroup === "Core"}
                    >
                      BTL Core
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Criteria */}
        <Collapsible
          title="🏠 Criteria"
          isOpen={openSections.criteria}
          onToggle={() =>
            setOpenSections((s) => ({ ...s, criteria: !s.criteria }))
          }
        >
          <div className="profile-grid">
            {currentCriteria?.propertyQuestions?.map((q) => (
              <div className="field" key={q.key}>
                <label htmlFor={q.key}>{q.label}</label>
                <select
                  id={q.key}
                  value={criteria[q.key]}
                  onChange={(e) =>
                    setCriteria((prev) => ({
                      ...prev,
                      [q.key]: e.target.value,
                    }))
                  }
                >
                  {q.options.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {q.helper && (
                  <div
                    style={{
                      marginTop: 8,
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: 12,
                      padding: "8px 10px",
                      borderRadius: 8,
                      textAlign: "center",
                    }}
                  >
                    {q.helper}
                  </div>
                )}
              </div>
            ))}

            {currentCriteria?.applicantQuestions?.map((q) => (
              <div className="field" key={q.key}>
                <label htmlFor={q.key}>{q.label}</label>
                <select
                  id={q.key}
                  value={criteria[q.key]}
                  onChange={(e) =>
                    setCriteria((prev) => ({
                      ...prev,
                      [q.key]: e.target.value,
                    }))
                  }
                >
                  {q.options.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Property & Product */}
        <Collapsible
          title="🏦 Property & Product"
          isOpen={openSections.property}
          onToggle={() =>
            setOpenSections((s) => ({ ...s, property: !s.property }))
          }
        >
          <div className="profile-grid property-product">
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
              <label>Loan type required?</label>
              <select
                value={loanTypeRequired}
                onChange={(e) => setLoanTypeRequired(e.target.value)}
              >
                <option>Max Optimum Gross Loan</option>
                <option>Specific Net Loan</option>
                <option>Maximum LTV Loan</option>
                <option>Specific Gross Loan</option>
              </select>
            </div>

            {loanTypeRequired === "Specific Gross Loan" && (
              <div className="field">
                <label>Specific Gross Loan (£)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 250,000"
                  value={specificGrossLoan}
                  onChange={(e) => setSpecificGrossLoan(e.target.value)}
                />
              </div>
            )}

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

            {loanTypeRequired === "Maximum LTV Loan" && (
              <div className="field">
                <label>Specific LTV Cap</label>
                <div
                  style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}
                >
                  LTV: <b>{(specificLTV * 100).toFixed(2)}%</b>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={maxLTV}
                  step={0.005}
                  value={specificLTV}
                  onChange={(e) => setSpecificLTV(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div
                  style={{
                    marginTop: 8,
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: 12,
                    padding: "8px 10px",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  Max LTV for {tier} is {(maxLTV * 100).toFixed(2)}%
                </div>
              </div>
            )}

            <div className="field">
              <label>Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              >
                {PRODUCT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Collapsible>

        {/* Fees */}
        <Collapsible
          title="💰 Fees"
          isOpen={openSections.fees}
          onToggle={() => setOpenSections((s) => ({ ...s, fees: !s.fees }))}
        >
          <div className="profile-grid">
            <div className="field">
              <label>
                Proc Fee (%){" "}
                {isRetention === "Yes" && (
                  <span style={{ color: "#0ea5e9", fontWeight: 700 }}>
                    (auto-set to 0.50% for Retention)
                  </span>
                )}
              </label>

              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="e.g. 1.00"
                value={procFeePctInput}
                onChange={(e) => setProcFeePctInput(e.target.value)}
              />
              <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                Effective proc fee in calculations:{" "}
                <b>{effectiveProcFeePct.toFixed(2)}%</b>
              </div>
            </div>

            <div className="field">
              <label>Client Broker Fee (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="e.g. 1.50"
                value={brokerFeePct}
                onChange={(e) => {
                  setBrokerFeePct(e.target.value);
                  if (e.target.value) setBrokerFeeFlat("");
                }}
              />
            </div>

            {!brokerFeePct && (
              <div className="field">
                <label>Broker Fee (£)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  placeholder="e.g. 995"
                  value={brokerFeeFlat}
                  onChange={(e) => {
                    setBrokerFeeFlat(e.target.value);
                    if (e.target.value) setBrokerFeePct("");
                  }}
                />
              </div>
            )}
          </div>
        </Collapsible>

        {/* SUMMARY */}
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
                : `${loanTypeRequired} is:`}
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div
                style={{
                  background: "#fff",
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
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 800, textDecoration: "underline" }}>
                  Max net loan
                </span>
                <span style={{ opacity: 0.95 }}>
                  {" "}
                  (amount advanced day 1) is {bestSummary.netStr} @{" "}
                  {bestSummary.netLtvPct}% LTV, {productType}, {tier},{" "}
                  {Number(bestSummary.colKey)}% Fee
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MATRIX */}
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
                          margin: "8px 0 12px",
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
                          "One or more gross loans are capped at the maximum loan limit."}
                      </div>
                    )}

                    <div
                      className="matrixLabels"
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <div className="labelsHead"></div>
                      <div className="mRow">
                        <b></b>
                      </div>
                      <div className="mRow">
                        <b>Product Name</b>
                      </div>
                      <div className="mRow">
                        <b>Full Rate (Editable)</b>
                      </div>
                      <div className="mRow">
                        <b>Product Fee %</b>
                      </div>
                      <div className="mRow">
                        <b>Pay Rate</b>
                      </div>
                      <div className="mRow">
                        <b>
                          Net Loan{" "}
                          <span style={{ fontSize: 11, fontWeight: 400 }}>
                            (advanced day 1)
                          </span>
                        </b>
                      </div>
                      <div className="mRow">
                        <b>
                          Max Gross Loan{" "}
                          <span style={{ fontSize: 11, fontWeight: 400 }}>
                            (paid at redemption)
                          </span>
                        </b>
                      </div>
                      <div className="mRow">
                        <b>Rolled Months</b>
                      </div>
                      <div className="mRow">
                        <b>Deferred Adjustment</b>
                      </div>
                      <div className="mRow">
                        <b>Product Fee</b>
                      </div>
                      <div className="mRow">
                        <b>Rolled Months Interest</b>
                      </div>
                      <div className="mRow">
                        <b>Deferred Interest</b>
                      </div>
                      <div className="mRow">
                        <b>Direct Debit</b>
                      </div>
                      <div className="mRow">
                        <b>Proc Fee (£)</b>
                      </div>
                      <div className="mRow">
                        <b>Broker Fee (£)</b>
                      </div>
                      <div className="mRow">
                        <b>Revert Rate</b>
                      </div>
                      <div className="mRow">
                        <b>Total Term | ERC</b>
                      </div>
                      <div className="mRow">
                        <b>Max Product LTV</b>
                      </div>
                    </div>

                    {colData.map((data, idx) => {
                      const colKey = data.colKey;
                      const headClass =
                        idx === 0
                          ? "headGreen"
                          : idx === 1
                          ? "headOrange"
                          : idx === 2
                          ? "headTeal"
                          : "headBlue";
                      const manual = manualSettings[colKey];

                      const rateDisplayValue =
                        tempRateInput[colKey] !== undefined
                          ? tempRateInput[colKey]
                          : `${(data.actualRateUsed * 100).toFixed(2)}%`;
                      const isOverridden = data.isRateOverridden;

                      const defaultFeePctDec = Number(colKey) / 100;
                      const currentFeePctDec =
                        feeOverrides[colKey] != null
                          ? Number(feeOverrides[colKey]) / 100
                          : defaultFeePctDec;
                      const feeDisplayValue =
                        tempFeeInput[colKey] !== undefined
                          ? tempFeeInput[colKey]
                          : `${(currentFeePctDec * 100).toFixed(2)}%`;
                      const isFeeOverridden = feeOverrides[colKey] != null;

                      const showCoreNA =
                        productGroup === "Core" &&
                        window.isCoreEligible?.(propertyType);

                      return (
                        <div
                          key={colKey}
                          className="matrixCol"
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <div className={`matrixHead ${headClass}`}>
                            BTL {productGroup}
                            {isRetention === "Yes" ? " Retention" : ""},{" "}
                            {Number(colKey)}% Product Fee
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {data.productName}
                            </div>
                          </div>

                          <div className="mRow">
                            <div
                              className="mValue"
                              style={{
                                ...valueBoxStyle,
                                background: "#fefce8",
                                padding: "4px 10px",
                                border: isOverridden
                                  ? "1px solid #fde047"
                                  : "1px solid #e2e8f0",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <input
                                type="text"
                                value={rateDisplayValue}
                                onChange={(e) =>
                                  handleRateInputChange(colKey, e.target.value)
                                }
                                onBlur={(e) =>
                                  handleRateInputBlur(
                                    colKey,
                                    e.target.value,
                                    data.actualRateUsed
                                  )
                                }
                                placeholder={data.fullRateText}
                                style={{
                                  width: "100%",
                                  border: "none",
                                  textAlign: "center",
                                  fontWeight: 700,
                                  background: "transparent",
                                  color: isOverridden ? "#ca8a04" : "#1e293b",
                                }}
                              />
                              {isOverridden && (
                                <button
                                  onClick={() =>
                                    handleResetRateOverride(colKey)
                                  }
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

                          <div className="mRow">
                            <div
                              className="mValue"
                              style={{
                                ...valueBoxStyle,
                                background: "#fefce8",
                                padding: "4px 10px",
                                border: isFeeOverridden
                                  ? "1px solid #fde047"
                                  : "1px solid #e2e8f0",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <input
                                type="text"
                                value={feeDisplayValue}
                                onChange={(e) =>
                                  handleFeeInputChange(colKey, e.target.value)
                                }
                                onBlur={(e) =>
                                  handleFeeInputBlur(
                                    colKey,
                                    e.target.value,
                                    defaultFeePctDec
                                  )
                                }
                                placeholder={`${(
                                  defaultFeePctDec * 100
                                ).toFixed(2)}%`}
                                style={{
                                  width: "100%",
                                  border: "none",
                                  textAlign: "center",
                                  fontWeight: 700,
                                  background: "transparent",
                                  color: isFeeOverridden
                                    ? "#ca8a04"
                                    : "#1e293b",
                                }}
                              />
                              {isFeeOverridden && (
                                <button
                                  onClick={() => handleResetFeeOverride(colKey)}
                                  style={{
                                    fontSize: 10,
                                    color: "#ca8a04",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    marginTop: 4,
                                  }}
                                >
                                  (Reset Fee)
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {data.payRateText}
                            </div>
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              <span style={{ fontWeight: 700 }}>
                                {fmtMoney0(data.net)}
                              </span>
                              {data.netLtv != null && (
                                <span style={{ fontWeight: 400 }}>
                                  {" "}
                                  @ {Math.round(data.netLtv * 100)}% LTV
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              <span style={{ fontWeight: 700 }}>
                                {fmtMoney0(data.gross)}
                              </span>
                              {data.ltv != null && (
                                <span style={{ fontWeight: 400 }}>
                                  {" "}
                                  @ {Math.round(data.ltv * 100)}% LTV
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Rolled Months (hide for Core) */}
                          <div
                            className="mRow"
                            style={{ alignItems: "center" }}
                          >
                            {showCoreNA ? (
                              <div className="mValue" style={valueBoxStyle}>
                                —
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  background:
                                    manual?.rolledMonths != null
                                      ? "#fefce8"
                                      : "#fff",
                                  borderRadius: 8,
                                  padding: "1px 1px",
                                  marginTop: 4,
                                  marginBottom: 4,
                                }}
                              >
                                <SliderInput
                                  label=""
                                  min={0}
                                  max={Math.min(
                                    MAX_ROLLED_MONTHS,
                                    data.termMonths
                                  )}
                                  step={1}
                                  value={
                                    manual?.rolledMonths ?? data.rolledMonths
                                  }
                                  onChange={(val) =>
                                    handleRolledChange(colKey, val)
                                  }
                                  formatValue={(v) => `${v} months`}
                                  style={{ margin: "4px 0" }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Deferred (hide for Core) */}
                          <div
                            className="mRow"
                            style={{ alignItems: "center" }}
                          >
                            {showCoreNA ? (
                              <div className="mValue" style={valueBoxStyle}>
                                —
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  background:
                                    manual?.deferredPct != null
                                      ? "#fefce8"
                                      : "#fff",
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
                                  step={0.0001}
                                  value={
                                    manual?.deferredPct ?? data.deferredCapPct
                                  }
                                  onChange={(val) =>
                                    handleDeferredChange(colKey, val)
                                  }
                                  formatValue={(v) => fmtPct(v, 2)}
                                  style={{ margin: "4px 0" }}
                                />
                                {(manual?.rolledMonths != null ||
                                  manual?.deferredPct != null) && (
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
                                      display: "block",
                                      width: "100%",
                                      textAlign: "right",
                                    }}
                                  >
                                    (Reset to Optimum)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {fmtMoney0(data.feeAmt)} (
                              {(feeOverrides[colKey] != null
                                ? Number(feeOverrides[colKey])
                                : Number(colKey)
                              ).toFixed(2)}
                              %)
                            </div>
                          </div>
                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {showCoreNA
                                ? "—"
                                : `${fmtMoney0(data.rolled)} (${
                                    data.rolledMonths
                                  } months)`}
                            </div>
                          </div>
                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {showCoreNA
                                ? "—"
                                : `${fmtMoney0(data.deferred)} (${(
                                    data.deferredCapPct * 100
                                  ).toFixed(2)}%)`}
                            </div>
                          </div>
                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {fmtMoney0(data.procFeeValue)}
                            </div>
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {fmtMoney0(data.brokerFeeValue)}
                            </div>
                          </div>

                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {fmtMoney0(data.directDebit)} from month{" "}
                              {data.ddStartMonth}
                            </div>
                          </div>
                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              MVR
                            </div>
                          </div>
                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {TOTAL_TERM} years |{" "}
                              {productType.includes("2yr")
                                ? "3% in year 1, 2% in year 2"
                                : productType.includes("3yr")
                                ? "3% in year 1, 2% in year 2, 1% in year 3"
                                : "Refer to product terms"}
                            </div>
                          </div>
                          <div className="mRow">
                            <div className="mValue" style={valueBoxStyle}>
                              {(data.maxLtvRule * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Basic Gross (no roll/defer) */}
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
              Results use optimum rolled & deferred interest for maximum net
              loan, unless manually overridden.
            </div>

            <div className="matrix" style={{ rowGap: 0 }}>
              <div
                className="matrixLabels"
                style={{
                  display: "grid",
                  gridTemplateRows: "48px",
                  border: "1px solid transparent",
                  background: "transparent",
                }}
              >
                <div
                  className="mRow"
                  style={{ justifyContent: "center", color: "#475569" }}
                >
                  <b>Basic Gross (no roll/deferred)</b>
                </div>
              </div>

              {SHOW_FEE_COLS.map((k) => {
                const d = computeBasicGrossForCol(k);
                if (!d) return null;
                return (
                  <div
                    key={`basic-${k}`}
                    className="matrixCol"
                    style={{
                      display: "grid",
                      gridTemplateRows: "48px",
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
                          {" "}
                          @{" "}
                          {d.ltvPctBasic != null
                            ? `${d.ltvPctBasic}% LTV`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
                currently {(CURRENT_MVR * 100).toFixed(2)}%
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
})();
