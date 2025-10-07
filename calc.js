/* =====================================================================
   calc.js (FULL VERSION)
   Integrated BTL + Bridge + Fusion + Retention Logic
   Author: Kamran | Date: Oct 2025
   ===================================================================== */

   (function () {
    /* eslint-disable no-unused-vars */
    const { useState, useMemo, useCallback } = React;
  
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
  
    function Collapsible({ title, isOpen, onToggle, children }) {
      return (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={onToggle}
          >
            <h3 style={{ margin: 0 }}>{title}</h3>
            <span style={{ fontSize: "18px", fontWeight: "bold" }}>
              {isOpen ? "−" : "+"}
            </span>
          </div>
          {isOpen && <div style={{ marginTop: "16px" }}>{children}</div>}
        </div>
      );
    }
  
    function SliderInput({ label, min, max, step, value, onChange, formatValue, style }) {
      return (
        <div style={style}>
          {label && <div style={{ fontSize: "12px", marginBottom: "4px" }}>{label}</div>}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", textAlign: "center", marginTop: "4px" }}>
            {formatValue ? formatValue(value) : value}
          </div>
        </div>
      );
    }
  
    /* ------------------------------ Utility Helpers ------------------------------ */
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
      if (!str) return null;
      const cleaned = String(str).replace("%", "").trim();
      const num = Number(cleaned);
      return Number.isFinite(num) ? num / 100 : null;
    };
  
    const formatRevertRate = (tier) => {
      return tier === "Tier 1" ? "MVR - 1.00%" : "MVR - 0.50%";
    };
  
    const formatERC = (productType) => {
      if (productType.includes("2yr")) return "3% in year 1, 2% in year 2";
      if (productType.includes("3yr")) return "3% in year 1, 2% in year 2, 1% in year 3";
      return "Refer to product terms";
    };
  
    /* ------------------------------ Retention Logic ------------------------------ */
    function applyRetentionAdjustments(baseRate, feePct, procFee, propertyType, isRetention, retentionLtv) {
      if (isRetention !== "Yes") return { adjRate: baseRate, adjFee: feePct, adjProc: procFee };
  
      let rateAdj = 0;
      if (retentionLtv === "65% LTV") rateAdj = -0.004;
      else if (retentionLtv === "75% LTV") rateAdj = -0.003;
  
      const adjRate = baseRate + rateAdj;
      const adjFee = Math.max(feePct - 0.005, 0);
      const adjProc = Math.max(procFee - 0.005, 0);
      return { adjRate, adjFee, adjProc };
    }
  
    /* ----------------------------------- App ----------------------------------- */
    function App() {
      /* --------------------------- NEW TOP-LEVEL STATES -------------------------- */
      const [mainProductType, setMainProductType] = useState("BTL");
      const [propertyType, setPropertyType] = useState("Residential");
      const [isRetention, setIsRetention] = useState("No");
      const [retentionLtv, setRetentionLtv] = useState("65% LTV");
  
      /* --------------------------- EXISTING STATES -------------------------- */
      const [productType, setProductType] = useState("2yr Fix");
      const [specificNetLoan, setSpecificNetLoan] = useState("");
      const [clientName, setClientName] = useState("");
      const [clientPhone, setClientPhone] = useState("");
      const [clientEmail, setClientEmail] = useState("");
      const [sending, setSending] = useState(false);
      const [sendStatus, setSendStatus] = useState(null);
      const [propertyValue, setPropertyValue] = useState("");
      const [monthlyRent, setMonthlyRent] = useState("");
      const [validationError, setValidationError] = useState("");
      const [loanTypeRequired, setLoanTypeRequired] = useState("Max Optimum Gross Loan");
      const [specificLTV, setSpecificLTV] = useState(0.75);
      const [specificGrossLoan, setSpecificGrossLoan] = useState("");
  
      /* --------------------------- PROPERTY & APPLICANT STATES -------------------------- */
      const [hmo, setHmo] = useState("No (Tier 1)");
      const [mufb, setMufb] = useState("No (Tier 1)");
      const [holiday, setHoliday] = useState("No");
      const [flatAboveComm, setFlatAboveComm] = useState("No");
      const [ownerocc, setOwnerocc] = useState("No");
      const [devexit, setDevexit] = useState("No");
      const [expat, setExpat] = useState("No (Tier 1)");
      const [ftl, setFtl] = useState("No");
      const [offshore, setOffshore] = useState("No");
      const [adverse, setAdverse] = useState("No");
      const [mortArrears, setMortArrears] = useState("0 in 24");
      const [unsArrears, setUnsArrears] = useState("0 in 24");
      const [ccjDefault, setCcjDefault] = useState("0 in 24");
      const [bankruptcy, setBankruptcy] = useState("Never");
  
      /* --------------------------- Collapsibles & Fees state -------------------------------- */
      const [showProperty, setShowProperty] = useState(true);
      const [showApplicant, setShowApplicant] = useState(true);
      const [showProduct, setShowProduct] = useState(true);
      const [showFees, setShowFees] = useState(true);
      const [procFeePct, setProcFeePct] = useState(1);
      const [brokerFeePct, setBrokerFeePct] = useState("");
      const [brokerFeeFlat, setBrokerFeeFlat] = useState("");
  
      /* --------------------------- Matrix Override States --------------------------- */
      const [rateOverrides, setRateOverrides] = useState({});
      const [feeOverrides, setFeeOverrides] = useState({});
      const [manualSettings, setManualSettings] = useState({});
      const [tempRateInput, setTempRateInput] = useState({});
      const [tempFeeInput, setTempFeeInput] = useState({});
  
      /* --------------------------- Constants --------------------------- */
      const SHOW_FEE_COLS = [6, 4, 3, 2];
      const MAX_ROLLED_MONTHS = 6;
      const MAX_DEFERRED_FIX = 0.03;
      const MAX_DEFERRED_TRACKER = 0.02;
      const MIN_ICR_FIX = 1.45;
      const MIN_ICR_TRK = 1.55;
      const TOTAL_TERM = 10;
  
      const getMaxLTV = (tier, flatAboveComm) => {
        if (flatAboveComm === "Yes") return 0.65;
        if (tier === "Tier 1") return 0.75;
        if (tier === "Tier 2") return 0.70;
        return 0.65;
      };
  
      const cleanDigits = (v) => String(v).replace(/[^\d]/g, "");
      const isValidPhone = (v) => {
        const d = cleanDigits(v);
        return d.length >= 10 && d.length <= 15;
      };
  
      const handleCriteriaChange = (key, value) => {
        switch (key) {
          case "hmo": setHmo(value); break;
          case "mufb": setMufb(value); break;
          case "holiday": setHoliday(value); break;
          case "flatAboveComm": setFlatAboveComm(value); break;
          case "ownerocc": setOwnerocc(value); break;
          case "devexit": setDevexit(value); break;
          case "expat": setExpat(value); break;
          case "ftl": setFtl(value); break;
          case "offshore": setOffshore(value); break;
          case "adverse": setAdverse(value); break;
          case "mortArrears": setMortArrears(value); break;
          case "unsArrears": setUnsArrears(value); break;
          case "ccjDefault": setCcjDefault(value); break;
          case "bankruptcy": setBankruptcy(value); break;
          default: break;
        }
      };
  
      const criteria = {
        hmo, mufb, holiday, flatAboveComm, ownerocc, devexit, expat, ftl, offshore, 
        adverse, mortArrears, unsArrears, ccjDefault, bankruptcy
      };
  
      const flatAboveCommVal = flatAboveComm === "Yes";
  
      /* --------------------------- TIER CALCULATION --------------------------- */
      const tier = useMemo(() => {
        const mapHmo = {
          "No (Tier 1)": 1,
          "Up to 12 beds (Tier 1)": 1,
          "More than 12 beds (Tier 2)": 2,
        };
        const mapMufb = {
          "No (Tier 1)": 1,
          "Up to 12 units (Tier 1)": 1,
          "More than 12 units (Tier 2)": 2,
        };
        const mapExp = { "No (Tier 1)": 1, "Yes (Tier 2)": 2 };
        let t = 1;
        t = Math.max(t, mapHmo[hmo] || 1);
        t = Math.max(t, mapMufb[mufb] || 1);
        t = Math.max(t, mapExp[expat] || 1);
        if (ownerocc === "Yes") t = Math.max(t, 2);
        if (devexit === "Yes") t = Math.max(t, 2);
        if (flatAboveComm === "Yes") t = Math.max(t, 2);
        if (ftl === "Yes") t = Math.max(t, 2);
        if (offshore === "Yes") t = Math.max(t, 2);
        if (adverse === "Yes") {
          const advMapMA = { No: 1, "2 in 18, 0 in 6": 1, "Other, more recent": 2 };
          const advMapUA = { No: 1, "2 in last 18": 1, "Other, more recent": 2 };
          const advMapCD = { No: 1, "2 in 18, 0 in 6": 1, "Other, more recent": 2 };
          const advMapBank = { Never: 1, "Discharged >3yrs": 1, "Other, more recent": 2 };
          const adverseTier = Math.max(
            advMapMA[mortArrears] || 1,
            advMapUA[unsArrears] || 1,
            advMapCD[ccjDefault] || 1,
            advMapBank[bankruptcy] || 1
          );
          t = Math.max(t, adverseTier);
        }
        return t === 1 ? "Tier 1" : "Tier 2";
      }, [hmo, mufb, expat, ownerocc, devexit, flatAboveComm, ftl, offshore, adverse, mortArrears, unsArrears, ccjDefault, bankruptcy]);
  
      /* --------------------------- DYNAMIC RATE SOURCE --------------------------- */
      const selected = useMemo(() => {
        const isCommercial = propertyType === "Commercial" || propertyType === "Semi-Commercial";
        let baseRates = isCommercial
          ? window.RATES_Commercial?.[tier]?.products?.[productType]
          : window.RATES?.[tier]?.products?.[productType];
  
        if (isRetention === "Yes") {
          const retentionRates =
            retentionLtv === "65% LTV"
              ? window.RATES_Retention_65
              : window.RATES_Retention_75;
  
          if (propertyType === "Residential") {
            baseRates = retentionRates?.Residential?.[tier]?.products?.[productType] || baseRates;
          } else {
            baseRates = retentionRates?.Commercial?.[tier]?.products?.[productType] || baseRates;
          }
        }
  
        return baseRates;
      }, [propertyType, tier, productType, isRetention, retentionLtv]);
  
      const isTracker = !!selected?.isMargin;
  
      /* --------------------------- MIN/MAX & CONSTANTS --------------------------- */
      const MIN_LOAN = propertyType === "Residential" ? window.MIN_LOAN ?? 150000 : window.MIN_LOAN_Commercial ?? 150000;
      const MAX_LOAN = propertyType === "Residential" ? window.MAX_LOAN ?? 3000000 : window.MAX_LOAN_Commercial ?? 2000000;
      const STANDARD_BBR = propertyType === "Residential" ? window.STANDARD_BBR ?? 0.04 : window.STANDARD_BBR_Commercial ?? 0.04;
      const STRESS_BBR = propertyType === "Residential" ? window.STRESS_BBR ?? 0.0425 : window.STRESS_BBR_Commercial ?? 0.0425;
      const CURRENT_MVR = propertyType === "Residential" ? window.CURRENT_MVR ?? 0.0859 : window.CURRENT_MVR_Commercial ?? 0.0859;
      const TERM_MONTHS = propertyType === "Residential" ? window.TERM_MONTHS : window.TERM_MONTHS_Commercial;
  
      /* --------------------------- Calculations ----------------------------- */
      const canShowMatrix = useMemo(() => {
        const mr = toNumber(monthlyRent);
        const pv = toNumber(propertyValue);
        const sn = toNumber(specificNetLoan);
        if (!mr) return false;
        if (loanTypeRequired === "Specific Net Loan") return !!sn && !!pv;
        if (loanTypeRequired === "Maximum LTV Loan") return !!pv;
        if (loanTypeRequired === "Specific Gross Loan") return !!pv;
        return !!pv;
      }, [monthlyRent, propertyValue, specificNetLoan, loanTypeRequired]);
  
      const computeForCol = useCallback(
        (colKey, manualRolled, manualDeferred, overriddenRate) => {
          const base = selected?.[colKey];
          if (base == null && !overriddenRate) return null;
  
          const pv = toNumber(propertyValue);
          const mr = toNumber(monthlyRent);
          const sn = toNumber(specificNetLoan);
          const sg = toNumber(specificGrossLoan);
  
          const feePct =
            feeOverrides[colKey] != null
              ? Number(feeOverrides[colKey])
              : Number(colKey);
          const feePctDec = feePct / 100;
  
          const minICR = productType.includes("Fix") ? MIN_ICR_FIX : MIN_ICR_TRK;
          const maxLTVRule = getMaxLTV(tier, flatAboveCommVal);
  
          const grossLTVRuleCap = pv ? pv * maxLTVRule : Infinity;
  
          const specificLTVCap =
            loanTypeRequired === "Maximum LTV Loan" && specificLTV != null
              ? pv * specificLTV
              : Infinity;
  
          const ltvCap =
            loanTypeRequired === "Maximum LTV Loan"
              ? Math.min(specificLTVCap, grossLTVRuleCap)
              : grossLTVRuleCap;
  
          const termMonths = TERM_MONTHS[productType] ?? 24;
  
          const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;
  
          const actualBaseRate = overriddenRate != null ? overriddenRate : base;
  
          const displayRate = isTracker
            ? actualBaseRate + STANDARD_BBR
            : actualBaseRate;
          const stressRate = isTracker ? actualBaseRate + STRESS_BBR : displayRate;
  
          const isRateOverridden = overriddenRate != null;
  
          const evalCombo = (rolledMonths, d) => {
            const monthsLeft = Math.max(termMonths - rolledMonths, 1);
            const stressAdj = Math.max(stressRate - d, 1e-6);
  
            let grossRent = Infinity;
            if (mr && stressAdj > 0) {
              const annualRent = mr * termMonths;
              grossRent = annualRent / (minICR * (stressAdj / 12) * monthsLeft);
            }
  
            let grossFromNet = Infinity;
            if (
              loanTypeRequired === "Specific Net Loan" &&
              sn != null &&
              feePctDec < 1
            ) {
              const denom =
                1 -
                feePctDec -
                (Math.max(displayRate - d, 0) / 12) * rolledMonths -
                (d / 12) * termMonths;
              if (denom > 0.0000001) {
                grossFromNet = sn / denom;
              }
            }
  
            let eligibleGross = Math.min(ltvCap, grossRent, MAX_LOAN);
  
            if (loanTypeRequired === "Specific Net Loan") {
              eligibleGross = Math.min(eligibleGross, grossFromNet);
            } else if (loanTypeRequired === "Specific Gross Loan" && sg != null && sg > 0) {
              eligibleGross = Math.min(eligibleGross, sg);
            }
  
            if (eligibleGross < MIN_LOAN - 1e-6) eligibleGross = 0;
  
            const payRateAdj = Math.max(displayRate - d, 0);
            const feeAmt = eligibleGross * feePctDec;
            const rolledAmt = eligibleGross * (payRateAdj / 12) * rolledMonths;
            const deferredAmt = eligibleGross * (d / 12) * termMonths;
            const net = eligibleGross - feeAmt - rolledAmt - deferredAmt;
            const ltv = pv ? eligibleGross / pv : null;
  
            const procFeeDec = Number(procFeePct || 0) / 100;
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
  
          if (manualRolled != null || manualDeferred != null) {
            const rolled = Number.isFinite(manualRolled) ? manualRolled : 0;
            const deferred = Number.isFinite(manualDeferred) ? manualDeferred : 0;
  
            const safeRolled = Math.max(0, Math.min(rolled, MAX_ROLLED_MONTHS));
            const safeDeferred = Math.max(0, Math.min(deferred, deferredCap));
  
            let safeBest;
            try {
              safeBest = evalCombo(safeRolled, safeDeferred);
              if (!safeBest || !isFinite(safeBest.gross)) {
                safeBest = evalCombo(0, 0);
              }
            } catch (err) {
              safeBest = evalCombo(0, 0);
            }
            best = safeBest;
          } else {
            const maxRolled = Math.min(MAX_ROLLED_MONTHS, termMonths);
            const step = 0.0001;
            const steps = Math.max(1, Math.round((deferredCap) / step));
  
            for (let r = 0; r <= maxRolled; r += 1) {
              for (let j = 0; j <= steps; j += 1) {
                const d = j * step;
                const out = evalCombo(r, d);
                if (!best || out.net > best.net) best = out;
              }
            }
          }
  
          if (!best) return null;
  
          const fullRateText = isTracker
            ? `${(actualBaseRate * 100).toFixed(2)}% + BBR`
            : `${(displayRate * 100).toFixed(2)}%`;
          const payRateText = isTracker
            ? `${(best.payRateAdj * 100).toFixed(2)}% + BBR`
            : `${(best.payRateAdj * 100).toFixed(2)}%`;
  
          const belowMin = best.gross > 0 && best.gross < MIN_LOAN - 1e-6;
          const hitMaxCap = Math.abs(best.gross - MAX_LOAN) < 1e-6;
  
          const ddAmount = best.gross * (best.payRateAdj / 12);
  
          return {
            productName: `${productType}, ${tier}`,
            fullRateText,
            actualRateUsed: actualBaseRate,
            isRateOverridden,
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
            maxLtvRule: getMaxLTV(tier, flatAboveCommVal),
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
          selected, propertyValue, monthlyRent, specificNetLoan, specificGrossLoan, specificLTV,
          loanTypeRequired, productType, tier, flatAboveCommVal, MIN_ICR_FIX, MIN_ICR_TRK,
          MIN_LOAN, MAX_LOAN, STANDARD_BBR, STRESS_BBR, TERM_MONTHS, isTracker,
          feeOverrides, procFeePct, brokerFeePct, brokerFeeFlat
        ]
      );
  
      function computeBasicGrossForCol(colKey) {
        const base = selected?.[colKey];
        if (base == null) return null;
  
        const pv = toNumber(propertyValue);
        const mr = toNumber(monthlyRent);
        const sn = toNumber(specificNetLoan);
        const sg = toNumber(specificGrossLoan);
  
        const feePct =
          feeOverrides[colKey] != null
            ? Number(feeOverrides[colKey]) / 100
            : Number(colKey) / 100;
  
        const minICR = productType.includes("Fix") ? MIN_ICR_FIX : MIN_ICR_TRK;
        const maxLTVRule = getMaxLTV(tier, flatAboveCommVal);
  
        const grossLTVRuleCap = pv ? pv * maxLTVRule : Infinity;
  
        const specificLTVCap =
          loanTypeRequired === "Maximum LTV Loan" && specificLTV != null
            ? pv * specificLTV
            : Infinity;
  
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
          const denom = 1 - feePct;
          if (denom > 0) grossFromNet = sn / denom;
        }
  
        let eligibleGross = Math.min(ltvCap, grossRent, MAX_LOAN);
  
        if (loanTypeRequired === "Specific Net Loan") {
          eligibleGross = Math.min(eligibleGross, grossFromNet);
        } else if (loanTypeRequired === "Specific Gross Loan" && sg != null && sg > 0) {
          eligibleGross = Math.min(eligibleGross, sg);
        }
  
        const procFeeDec = Number(procFeePct || 0) / 100;
        const brokerFeeDec = brokerFeePct ? Number(brokerFeePct) / 100 : 0;
        const procFeeValue = eligibleGross * procFeeDec;
        const brokerFeeValue = brokerFeeFlat
          ? Number(brokerFeeFlat)
          : eligibleGross * brokerFeeDec;
  
        const ltvPct = pv ? Math.round((eligibleGross / pv) * 100) : null;
  
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
      }, [canShowMatrix, computeForCol, manualSettings, rateOverrides, propertyValue]);
  
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
  
      /* ------------------- Rate override + manual settings handlers ------------------- */
      const handleRateInputChange = (colKey, value) => {
        setTempRateInput((prev) => ({ ...prev, [colKey]: value }));
      };
  
      const handleRateInputBlur = (colKey, value, originalRate) => {
        setTempRateInput((prev) => ({ ...prev, [colKey]: undefined }));
        const parsedRate = parsePct(value);
        if (parsedRate != null && Math.abs(parsedRate - originalRate) > 0.00001) {
          setRateOverrides((prev) => ({ ...prev, [colKey]: parsedRate }));
        } else {
          setRateOverrides((prev) => {
            const newState = { ...prev };
            delete newState[colKey];
            return newState;
          });
        }
      };
  
      const handleFeeInputChange = (colKey, value) => {
        setTempFeeInput((prev) => ({ ...prev, [colKey]: value }));
      };
  
      const handleFeeInputBlur = (colKey, value, originalFeePctDecimal) => {
        setTempFeeInput((prev) => ({ ...prev, [colKey]: undefined }));
        const parsed = parsePct(value);
        if (parsed != null && Math.abs(parsed - originalFeePctDecimal) > 1e-8) {
          setFeeOverrides((prev) => ({ ...prev, [colKey]: parsed * 100 }));
        } else {
          setFeeOverrides((prev) => {
            const s = { ...prev };
            delete s[colKey];
            return s;
          });
        }
      };
  
      const handleResetFeeOverride = (colKey) => {
        setFeeOverrides((prev) => {
          const s = { ...prev };
          delete s[colKey];
          return s;
        });
      };
  
      const handleRolledChange = (colKey, value) => {
        setManualSettings((prev) => ({
          ...prev,
          [colKey]: { ...prev[colKey], rolledMonths: value },
        }));
      };
      
      const handleDeferredChange = (colKey, value) => {
        setManualSettings((prev) => ({
          ...prev,
          [colKey]: { ...prev[colKey], deferredPct: value },
        }));
      };
      
      const handleResetManual = (colKey) => {
        setManualSettings((prev) => {
          const s = { ...prev };
          delete s[colKey];
          return s;
        });
      };
      
      const handleResetRateOverride = (colKey) => {
        setRateOverrides((prev) => {
          const s = { ...prev };
          delete s[colKey];
          return s;
        });
      };
  
      /* --------------------------- Send Quote via Email --------------------------- */
      const handleSendQuote = async () => {
        setValidationError("");
        setSendStatus(null);
  
        if (!canShowMatrix || !bestSummary) {
          setValidationError(
            "Please complete the calculation fields before sending email."
          );
          return;
        }
        if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim()) {
          setValidationError(
            "Please complete all client fields before sending email."
          );
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
          const zapierWebhookUrl =
            "https://hooks.zapier.com/hooks/catch/10082441/uhocm7m/";
  
          const columnCalculations = allColumnData.map((d) => ({
            feePercent: d.colKey,
            ...d,
          }));
  
          const basicGrossCalculations = SHOW_FEE_COLS.map((k) => {
            const d = computeBasicGrossForCol(k);
            return d ? { feePercent: k, ...d } : null;
          }).filter(Boolean);
  
          const payload = {
            requestId: `MFS-RESI-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            clientName,
            clientPhone,
            clientEmail,
            propertyValue,
            monthlyRent,
            productType,
            loanTypeRequired,
            specificNetLoan,
            specificLTV,
            ...criteria,
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
            procFeePct,
            brokerFeePct,
            brokerFeeFlat,
          };
  
          let success = false;
  
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
  
          if (!success) {
            try {
              const form = new URLSearchParams();
              for (const [k, v] of Object.entries(payload)) {
                form.append(
                  k,
                  typeof v === "object" ? JSON.stringify(v) : String(v ?? "")
                );
              }
              const res2 = await fetch(zapierWebhookUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
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
        background: "#ffffff",
        borderRadius: 8,
        padding: "8px 10px",
      };
  
      const deferredCap = isTracker ? MAX_DEFERRED_TRACKER : MAX_DEFERRED_FIX;
      const maxLTVForTier = getMaxLTV(tier, flatAboveCommVal);
  
      /* ----------------------------------- UI ----------------------------------- */
      return (
        <div className="container">
          {/* ---------------- NEW TOP SECTION ---------------- */}
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <SectionTitle>Product Setup</SectionTitle>
  
            <div className="profile-grid">
              {/* Product Type */}
              <div className="field">
                <label>Product Type</label>
                <select value={mainProductType} onChange={(e) => setMainProductType(e.target.value)}>
                  <option>BTL</option>
                  <option>Bridge</option>
                  <option>Fusion</option>
                </select>
              </div>
  
              {/* Property Type */}
              <div className="field">
                <label>Property Type</label>
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Semi-Commercial</option>
                </select>
              </div>
  
              {/* Retention */}
              <div className="field">
                <label>Is this a retention loan?</label>
                <select value={isRetention} onChange={(e) => setIsRetention(e.target.value)}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>
  
              {/* Retention LTV (conditional) */}
              {isRetention === "Yes" && (
                <div className="field">
                  <label>Retention LTV Range</label>
                  <select value={retentionLtv} onChange={(e) => setRetentionLtv(e.target.value)}>
                    <option>65% LTV</option>
                    <option>75% LTV</option>
                  </select>
                </div>
              )}
            </div>
          </div>
  
          {/* --------------------- Property Type (collapsible) -------------------- */}
          <Collapsible
            title="🏠 Criteria"
            isOpen={showProperty}
            onToggle={() => setShowProperty((s) => !s)}
          >
            <div className="profile-grid">
              {(window.CRITERIA_CONFIG?.propertyQuestions || []).map((q) => (
                <div
                  className={`field ${
                    q.key === "flatAboveComm" ? "flat-above-comm-field" : ""
                  }`}
                  key={q.key}
                >
                  <label htmlFor={q.key}>{q.label}</label>
                  <select
                    id={q.key}
                    value={criteria[q.key]}
                    onChange={(e) => handleCriteriaChange(q.key, e.target.value)}
                  >
                    {q.options.map((o) => (
                      <option key={typeof o === "string" ? o : o.label}>
                        {typeof o === "string" ? o : o.label}
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
            
              {(window.CRITERIA_CONFIG?.applicantQuestions || []).map((q) => (
                <div className="field" key={q.key}>
                  <label htmlFor={q.key}>{q.label}</label>
                  <select
                    id={q.key}
                    value={criteria[q.key]}
                    onChange={(e) => handleCriteriaChange(q.key, e.target.value)}
                  >
                    {q.options.map((o) => (
                      <option key={typeof o === "string" ? o : o.label}>
                        {typeof o === "string" ? o : o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Collapsible>
  
          {/* --------------------- Property & Product (collapsible) -------------------- */}
          <Collapsible
            title="🏦 Property & Product"
            isOpen={showProduct}
            onToggle={() => setShowProduct((s) => !s)}
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
  
              {/* Specific Gross Loan */}
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
  
              {/* Specific Net Loan */}
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
  
              {/* Specific LTV Slider */}
              {loanTypeRequired === "Maximum LTV Loan" && (
                <div className="field">
                  <label>Specific LTV Cap</label>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                    LTV: <b>{(specificLTV * 100).toFixed(2)}%</b>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={maxLTVForTier}
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
                    Max LTV for {tier} is {(maxLTVForTier * 100).toFixed(2)}%
                  </div>
                </div>
              )}
  
              <div className="field">
                <label>Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                >
                  {window.PRODUCT_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Collapsible>
  
          {/* --------------------- Fees (collapsible) -------------------- */}
          <Collapsible
            title="💰 Fees"
            isOpen={showFees}
            onToggle={() => setShowFees((s) => !s)}
          >
            <div className="profile-grid">
              <div className="field">
                <label>Proc Fee override(%)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="e.g. 1.00"
                  value={procFeePct}
                  onChange={(e) => setProcFeePct(e.target.value)}
                />
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
  
          {/* ---------------------- Client Details & Lead --------------------- */}
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h3>Email this Quote</h3>
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
              </div>
            </div>
  
            {validationError && (
              <div
                style={{
                  marginTop: "16px",
                  color: "#b91c1c",
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                {validationError}
              </div>
            )}
            {sendStatus === "success" && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  background: "#f0fdf4",
                  border: "1px solid #4ade80",
                  color: "#166534",
                  borderRadius: "8px",
                }}
              >
                Email sent successfully!
              </div>
            )}
            {sendStatus === "error" && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  background: "#fff1f2",
                  border: "1px solid #f87171",
                  color: "#b91c1c",
                  borderRadius: "8px",
                }}
              >
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
                  : `${loanTypeRequired} is:`}
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
                        style={{ display: "flex", flexDirection: "column" }}
                      >
                        <div className="labelsHead"></div>
                        <div className="mRow"><b></b></div>
                        <div className="mRow"><b>Product Name</b></div>
                        <div className="mRow"><b>Full Rate (Editable)</b></div>
                        <div className="mRow"><b>Product Fee %</b></div>
                        <div className="mRow"><b>Pay Rate</b></div>
                        <div className="mRow">
                          <b>
                            Net Loan{" "}
                            <span style={{ fontSize: "11px", fontWeight: 400 }}>
                              (advanced day 1)
                            </span>
                          </b>
                        </div>
                        <div className="mRow">
                          <b>
                            {" "}
                            Max Gross Loan
                            <span style={{ fontSize: "11px", fontWeight: 400 }}>
                              (paid at redemption){" "}
                            </span>
                          </b>{" "}
                        </div>
                        <div className="mRow"><b>Rolled Months</b></div>
                        <div className="mRow"><b>Deferred Adjustment</b></div>
                        <div className="mRow"><b>Product Fee</b></div>
                        <div className="mRow"><b>Rolled Months Interest</b></div>
                        <div className="mRow"><b>Deferred Interest</b></div>
                        <div className="mRow"><b>Direct Debit</b></div>
                        <div className="mRow"><b>Proc Fee (£)</b></div>
                        <div className="mRow"><b>Broker Fee (£)</b></div>
                        <div className="mRow"><b>Revert Rate</b></div>
                        <div className="mRow"><b>Total Term | ERC</b></div>
                        <div className="mRow"><b>Max Product LTV</b></div>
                      </div>
  
                      {/* Columns */}
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
                        const deferredCap = isTracker
                          ? MAX_DEFERRED_TRACKER
                          : MAX_DEFERRED_FIX;
  
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
  
                        return (
                          <div
                            key={colKey}
                            className="matrixCol"
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <div className={`matrixHead ${headClass}`}>
                              BTL, {Number(colKey)}% Product Fee
                            </div>
  
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {data.productName}
                              </div>
                            </div>
  
                            {/* Full Rate Input */}
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
  
                            {/* Product Fee % (Editable) */}
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
                                  placeholder={`${(defaultFeePctDec * 100).toFixed(2)}%`}
                                  style={{
                                    width: "100%",
                                    border: "none",
                                    textAlign: "center",
                                    fontWeight: 700,
                                    background: "transparent",
                                    color: isFeeOverridden ? "#ca8a04" : "#1e293b",
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
                                <span
                                  style={{
                                    fontWeight: 500,
                                    fontSize: 10,
                                    marginLeft: 6,
                                  }}
                                >
                                  (using {(data.deferredCapPct * 100).toFixed(2)}%
                                  deferred)
                                </span>
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
  
                            {/* Gross & sliders */}
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
  
                            <div className="mRow" style={{ alignItems: "center" }}>
                              <div
                                style={{
                                  width: "100%",
                                  background:
                                    manual?.rolledMonths != null ? "#fefce8" : "#fff",
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
                                  style={{ margin: "4px 0" }}
                                />
                              </div>
                            </div>
  
                            <div className="mRow" style={{ alignItems: "center" }}>
                              <div
                                style={{
                                  width: "100%",
                                  background:
                                    manual?.deferredPct != null ? "#fefce8" : "#fff",
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
                                  value={manual?.deferredPct ?? data.deferredCapPct}
                                  onChange={(val) => handleDeferredChange(colKey, val)}
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
                            </div>
  
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {fmtMoney0(data.feeAmt)} (
                                {(
                                  (feeOverrides[colKey] != null
                                    ? Number(feeOverrides[colKey])
                                    : Number(colKey)
                                  ).toFixed(2)
                                )}
                                %)
                              </div>
                            </div>
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {fmtMoney0(data.rolled)} ({data.rolledMonths} months)
                              </div>
                            </div>
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {fmtMoney0(data.deferred)} (
                                {(data.deferredCapPct * 100).toFixed(2)}%)
                              </div>
                            </div>
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {fmtMoney0(data.directDebit)} from month{" "}
                                {data.ddStartMonth}
                              </div>
                            </div>
  
                            {/* New per-column fees */}
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {fmtMoney0(data.procFeeValue)} ({Number(procFeePct || 0).toFixed(2)}%)
                              </div>
                            </div>
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {fmtMoney0(data.brokerFeeValue)} (
                                {brokerFeePct
                                  ? `${Number(brokerFeePct).toFixed(2)}%`
                                  : brokerFeeFlat
                                  ? "Fixed £"
                                  : "—"}
                                )
                              </div>
                            </div>
  
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {formatRevertRate(tier)}
                              </div>
                            </div>
                            <div className="mRow">
                              <div className="mValue" style={valueBoxStyle}>
                                {TOTAL_TERM} years | {formatERC(productType)}
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
  
          {/* ------------- EXTRA: Basic Gross (aligned under columns) + MVR/BBR ---- */}
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
                Results currently use optimum rolled and deferred interest for
                maximum net loan, *unless manually overridden by the sliders or the
                rate field.*
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
  
    /* --------------------------- RENDER REACT APP --------------------------- */
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  })();