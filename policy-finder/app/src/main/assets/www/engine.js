/*
 * Policy decision engine (offline).
 * 1. understand(): reads a question and pulls out the facts
 *    (vehicle type, year, new/used, tenure, co-applicant, CIBIL, age …)
 * 2. decide(): checks those facts against the policy the app remembers
 *    (vehicle schemes + eligibility conditions) and returns
 *    - exact checks (pass / fail) with reasons and references
 *    - questions to ask when information is missing
 *    - what IS possible (max tenure, LTV, ROI)
 */
const Engine = (() => {
  const NOW = new Date().getFullYear();

  // ---------- facts the app understands ----------
  const FACTS = {
    vehicleType: { label: 'Vehicle', type: 'choice', options: ['Car', 'Commercial Vehicle'], q: 'Is it a car or a commercial vehicle?' },
    isNew: { label: 'New / used', type: 'choice', options: ['New', 'Used'], q: 'Is the vehicle new or used?' },
    mfgYear: { label: 'Mfg. year', type: 'number', q: 'What is the manufacturing year of the vehicle?', chips: () => [NOW, NOW - 1, NOW - 3, NOW - 5, NOW - 7, NOW - 9] },
    vehicleAge: { label: 'Vehicle age (yrs)', type: 'number', derived: true },
    tenure: { label: 'Tenure (months)', type: 'number', q: 'How many months of tenure does the customer want?', chips: () => [12, 24, 36, 48, 60, 72, 84] },
    vehicleAgeAtEnd: { label: 'Vehicle age at loan end (yrs)', type: 'number', derived: true },
    coApplicant: { label: 'Co-applicant', type: 'yesno', q: 'Is a co-applicant available?' },
    guarantor: { label: 'Guarantor', type: 'yesno', q: 'Is a guarantor available?' },
    propertyProof: { label: 'Property proof (applicant / guarantor)', type: 'yesno', q: 'Does the applicant or guarantor have property proof (own house)?' },
    cibil: { label: 'CIBIL', type: 'number', q: 'What is the applicant’s CIBIL score? (-1 = NTC / no score)', chips: () => [-1, 620, 675, 725, 775] },
    applicantAge: { label: 'Applicant age', type: 'number', q: 'What is the applicant’s age?', chips: () => [25, 35, 45, 55, 60] },
    applicantAgeAtEnd: { label: 'Applicant age at loan end', type: 'number', derived: true },
    customerType: { label: 'Customer type', type: 'choice', options: ['Fleet owner', 'Small fleet', 'Captive user', 'FTU'], q: 'What type of customer is it?' },
    incomeProof: { label: 'Income proof (ITR / salary slip)', type: 'yesno', q: 'Is income proof (ITR / salary slips) available?' },
    rc: { label: 'Original RC', type: 'yesno', q: 'Is the original RC available?' },
    permitFitness: { label: 'Permit & fitness', type: 'yesno', q: 'Are a valid permit and fitness certificate available?' },
    amount: { label: 'Loan amount (₹)', type: 'number', q: 'What loan amount is needed (₹)?' },
  };
  const ASK_ORDER = ['vehicleType', 'isNew', 'mfgYear', 'tenure', 'coApplicant', 'cibil', 'propertyProof', 'customerType', 'guarantor', 'applicantAge', 'incomeProof', 'rc', 'permitFitness', 'amount'];

  // ---------- understanding ----------
  function normalize(q) {
    return ' ' + q.toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\bco[\s\-_.]*(?:applicant|aplicant|applicnt|appl\w*|borrower|borower|app)s?\b/g, 'coapplicant')
      .replace(/\b(?:gaurantor|guaranter|garantor|gurantor|guarranter|guarantee)s?\b/g, 'guarantor')
      .replace(/\b(?:posib\w*|possib\w*|posible|pasible|possable)\b/g, 'possible')
      .replace(/\b(?:prof|profe|proff|prooff)\b/g, 'proof')
      .replace(/\b(?:yrs?|years?|saal|sal|varsh)\b/g, 'year')
      .replace(/\b(?:months?|mths?|mnths?|mos?)\b/g, 'month')
      .replace(/\bcommercial\s+vehicle\b/g, 'cv')
      .replace(/\bsecond[\s-]*hand\b|\bpre[\s-]*owned\b/g, 'used')
      .replace(/\s+/g, ' ') + ' ';
  }

  const NEG_WORDS = '(?:without|no|not|nahi|nahin|na|absent|dont|don\'t|doesnt|doesn\'t|missing|lacks?|lacking|zero)';
  const POS_WORDS = '(?:with|has|have|having|got|available|hai|plus|along\\s+with)';
  function yesNo(t, term) {
    const neg1 = new RegExp(`\\b${NEG_WORDS}\\s+(?:any\\s+|a\\s+|an\\s+|the\\s+|valid\\s+|original\\s+|own\\s+|\\w+\\s+)?${term}`);
    const neg2 = new RegExp(`${term}\\s+(?:is\\s+|are\\s+|also\\s+)?(?:not\\s+available|not\\s+there|nahi|nahin|na\\b|missing|absent|expired|lapsed|invalid|not\\s+valid|none|nil)`);
    const pos1 = new RegExp(`\\b${POS_WORDS}\\s+(?:a\\s+|an\\s+|the\\s+|valid\\s+|original\\s+|own\\s+|\\w+\\s+)?${term}`);
    const pos2 = new RegExp(`${term}\\s+(?:is\\s+|are\\s+)?(?:available|present|ready|hai|valid|ok|yes)\\b`);
    if (neg1.test(t) || neg2.test(t)) return 'no';
    if (pos1.test(t) || pos2.test(t)) return 'yes';
    return undefined;
  }

  const BRANDS = new Set(['maruti', 'suzuki', 'tata', 'mahindra', 'hyundai', 'toyota', 'honda', 'kia', 'ashok', 'leyland', 'eicher', 'bharatbenz', 'force', 'renault', 'nissan', 'skoda', 'volkswagen', 'mg', 'ford', 'jeep', 'plus', 'gold', 'pro']);

  function findModel(t, S) {
    const toks = new Set(Search.tokens(t));
    let best = null;
    (S.vehicles || []).forEach(v => {
      const words = Search.tokens(v.name + ' ' + (v.keywords || '')).filter(w => !BRANDS.has(w) && (w.length >= 3 || /\d/.test(w)) && !/^(19|20)\d\d$/.test(w));
      const hit = [...new Set(words)].filter(w => toks.has(w)).length;
      if (hit && (!best || hit > best.hit)) best = { v, hit };
    });
    return best ? best.v : null;
  }

  /** Read the question and return the facts found in it. */
  function understand(query, S) {
    const t = normalize(query);
    const f = {};
    // vehicle model from the vehicle list
    const model = findModel(t, S);
    if (model) {
      f.model = model;
      f.vehicleType = /car/i.test(model.scheme || '') ? 'Car' : 'Commercial Vehicle';
    }
    if (!f.vehicleType) {
      if (/\b(cv|ncv|ucv|truck|tipper|lcv|icv|hcv|scv|pickup|pick-up|bus|trailer|tanker|goods|transport\w*|lorry|dumper|tractor)\b/.test(t)) f.vehicleType = 'Commercial Vehicle';
      else if (/\b(car|cars|nc|uc|suv|sedan|hatchback|muv|mpv|jeep|taxi)\b/.test(t)) f.vehicleType = 'Car';
    }
    // manufacturing year / vehicle age
    let rest = t;
    const ym = t.match(/\b(199\d|20[0-4]\d)\b/);
    if (ym && +ym[1] <= NOW) { f.mfgYear = +ym[1]; rest = rest.replace(ym[0], ' '); }
    const va = rest.match(/\b(\d{1,2})\s*year\s*old\s*(?:car|cv|vehicle|truck|tipper|gaadi|gadi)/) || rest.match(/\b(?:car|cv|vehicle|truck|tipper)\s*(?:is\s*|of\s*)?(\d{1,2})\s*year\s*old/) || rest.match(/vehicle\s*age\s*(?:is\s*|of\s*)?(\d{1,2})/);
    if (va && f.mfgYear == null) { f.mfgYear = NOW - +va[1]; rest = rest.replace(va[0], ' '); }
    // applicant age
    const aa = rest.match(/\b(?:age|aged|umar|umr)\s*(?:is\s*|of\s*|=\s*)?(\d{2})\b/) || rest.match(/\b(\d{2})\s*year\s*old\b/);
    if (aa && +aa[1] >= 18 && +aa[1] <= 90) { f.applicantAge = +aa[1]; rest = rest.replace(aa[0], ' '); }
    // CIBIL
    if (/\b(ntc|new\s+to\s+credit|no\s+cibil|without\s+cibil|cibil\s*-1|no\s+credit\s+history)\b/.test(rest)) f.cibil = -1;
    else {
      const cb = rest.match(/\b(?:cibil|score|bureau|credit\s+score)\D{0,12}(\d{3})\b/) || rest.match(/\b(\d{3})\s*(?:cibil|score)\b/);
      if (cb && +cb[1] >= 300 && +cb[1] <= 900) { f.cibil = +cb[1]; rest = rest.replace(cb[0], ' '); }
    }
    // amount
    const am = rest.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs|l|cr|crore|crores)\b/);
    if (am) { f.amount = Math.round(+am[1] * (/^c/.test(am[2]) ? 1e7 : 1e5)); rest = rest.replace(am[0], ' '); }
    // tenure
    const tm = rest.match(/\b(\d{1,3})\s*month/);
    const ty = rest.match(/\b(\d{1,2}(?:\.\d)?)\s*year\b(?!\s*old)/);
    const tt = rest.match(/\b(?:tenure|tenor|period|emi)\s*(?:of\s*|is\s*|=\s*)?(\d{1,3})\b/);
    if (tm) f.tenure = +tm[1];
    else if (ty) f.tenure = Math.round(+ty[1] * 12);
    else if (tt) f.tenure = +tt[1];
    // new / used
    if (/\b(new|brand\s*new|ncv|nc|showroom)\b/.test(t)) f.isNew = 'New';
    if (/\b(used|ucv|uc|refinance|refi|resale)\b/.test(t) || /\bold\s+(?:car|cv|vehicle|truck|tipper)\b/.test(t)) f.isNew = 'Used';
    // yes / no facts
    const yn = (k, term) => { const v = yesNo(t, term); if (v) f[k] = v; };
    yn('coApplicant', 'coapplicant');
    yn('guarantor', '(?:guarantor|surety)');
    yn('propertyProof', '(?:property(?:\\s+proof|\\s+papers|\\s+documents?)?|house\\s+proof|own\\s+house|own\\s+property|ghar)');
    if (f.propertyProof === undefined && /\b(rented|rent\s+house|on\s+rent|kiraye?)\b/.test(t) && !/guarantor/.test(t)) f.propertyProof = 'no';
    if (f.propertyProof === undefined && /\b(own\s+house|own\s+property|apna\s+ghar)\b/.test(t)) f.propertyProof = 'yes';
    yn('incomeProof', '(?:income\\s+proof|itr|salary\\s+slips?|income\\s+documents?)');
    yn('rc', '(?:rc|rc\\s+book|registration(?:\\s+certificate)?)');
    yn('permitFitness', '(?:permit|fitness)');
    // customer type
    if (/\b(ftu|first\s+time\s+(?:user|buyer|transporter|owner)|new\s+transporter|no\s+(?:driving\s+)?experience)\b/.test(t)) f.customerType = 'FTU';
    else if (/\bcaptive\b/.test(t)) f.customerType = 'Captive user';
    else if (/\bfleet\b/.test(t)) {
      const fl = t.match(/(\d{1,3})\s*(?:trucks|vehicles|gaadi)/);
      f.customerType = fl && +fl[1] < 5 ? 'Small fleet' : 'Fleet owner';
    }
    return f;
  }

  // ---------- helpers ----------
  const isCar = vt => vt === 'Car';
  function schemeFor(vt, S) {
    return (S.schemes || []).find(sc => isCar(vt) ? /car/i.test(sc.name) : /commercial|\bcv\b|truck/i.test(sc.name));
  }
  function productFor(vt, isNew, band, S) {
    if (band && band.productId) return S.products.find(p => p.id === band.productId);
    const list = S.products.filter(p => isCar(vt) ? /car/i.test(p.category + ' ' + p.name) : /commercial|\bcv\b/i.test(p.category + ' ' + p.name));
    return list.find(p => new RegExp(isNew === 'New' ? '\\bnew\\b' : '\\bused\\b', 'i').test(p.name)) || list[0];
  }
  const fmtVal = (k, v) => {
    const F = FACTS[k];
    if (v === undefined || v === null) return '—';
    if (k === 'cibil' && v === -1) return 'NTC (-1)';
    if (F && F.type === 'yesno') return v === 'yes' ? 'Yes' : 'No';
    if (k === 'tenure') return `${v} m${v % 12 === 0 ? ` (${v / 12} yr)` : ''}`;
    if (k === 'amount') return '₹ ' + Math.round(v).toLocaleString('en-IN');
    return String(v);
  };

  function cmp(a, op, b, type) {
    if (a === undefined || a === null || a === '') return null; // unknown
    if (type === 'number') {
      const na = +a, nb = +b;
      if (!isFinite(na) || !isFinite(nb)) return null;
      return op === '<' ? na < nb : op === '<=' ? na <= nb : op === '>' ? na > nb : op === '>=' ? na >= nb : op === '!=' ? na !== nb : na === nb;
    }
    const eq = String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    return op === '!=' ? !eq : eq;
  }
  const OP_TEXT = { '<': 'below', '<=': 'at most', '>': 'more than', '>=': 'at least', '=': 'is', '!=': 'is not' };
  function condText(c) {
    const F = FACTS[c.fact] || { label: c.fact };
    const v = F.type === 'yesno' ? (String(c.value).toLowerCase() === 'yes' ? 'Yes' : 'No') : c.value;
    return `${F.label} ${OP_TEXT[c.op] || c.op} ${v}`;
  }

  // ---------- decision ----------
  /**
   * facts: merged facts (understood + answered). skipped: Set of facts the user skipped.
   * returns { facts, product, scheme, band, checks[], ask[], verdict, possible, topics[] }
   */
  function decide(facts, S, skipped = new Set()) {
    const f = { ...facts };
    const checks = [];
    const topics = [];
    const ask = new Set();
    // derived facts
    if (f.mfgYear != null) f.vehicleAge = Math.max(0, NOW - f.mfgYear);
    if (f.isNew === undefined && f.vehicleAge !== undefined) f.isNew = f.vehicleAge === 0 ? 'New' : 'Used';
    if (f.isNew === 'New' && f.vehicleAge === undefined) f.vehicleAge = 0;
    if (f.tenure != null && f.vehicleAge != null) f.vehicleAgeAtEnd = +(f.vehicleAge + f.tenure / 12).toFixed(1);
    if (f.tenure != null && f.applicantAge != null) f.applicantAgeAtEnd = +(f.applicantAge + f.tenure / 12).toFixed(1);

    if (!f.vehicleType) ask.add('vehicleType');
    if (f.vehicleType && f.isNew === undefined) ask.add('isNew');
    if (f.vehicleType && f.isNew === 'Used' && f.mfgYear == null) ask.add('mfgYear');

    // scheme (age band) checks
    let scheme = null, band = null, maxTenure = null;
    if (f.vehicleType) {
      scheme = schemeFor(f.vehicleType, S);
      if (scheme && f.vehicleAge != null) {
        band = (scheme.bands || []).find(b => f.vehicleAge >= +b.from && f.vehicleAge <= +b.to);
        const ref = `${scheme.name} scheme`;
        if (!band) {
          const maxBand = Math.max(...(scheme.bands || []).map(b => +b.to).filter(isFinite));
          checks.push({ ok: false, text: `Vehicle age ${f.vehicleAge} yrs is beyond the policy limit (max ${maxBand} yrs at the time of loan).`, ref, topic: 'vehicle age' });
        } else {
          checks.push({ ok: true, info: true, text: `Vehicle age ${f.vehicleAge} yr${f.vehicleAge === 1 ? '' : 's'} → band ${band.from}–${band.to} yrs: LTV ${band.ltv}%, ROI ${band.roi}%, max tenure ${band.tenure} months.`, ref });
          const byAge = scheme.maxAge ? (+scheme.maxAge - f.vehicleAge) * 12 : Infinity;
          maxTenure = Math.max(0, Math.min(+band.tenure || Infinity, byAge));
          if (f.tenure != null) {
            if (+band.tenure && f.tenure > +band.tenure) checks.push({ ok: false, text: `Tenure ${fmtVal('tenure', f.tenure)} is more than the maximum ${band.tenure} months allowed for a ${band.from}–${band.to} year old ${f.vehicleType.toLowerCase()}.`, ref, topic: 'tenure vehicle age' });
            else if (+band.tenure) checks.push({ ok: true, text: `Tenure ${fmtVal('tenure', f.tenure)} is within the band maximum of ${band.tenure} months.`, ref });
            if (scheme.maxAge) {
              if (f.vehicleAgeAtEnd > +scheme.maxAge) checks.push({ ok: false, text: `Vehicle will be ${f.vehicleAgeAtEnd} yrs old at loan end – policy maximum is ${scheme.maxAge} yrs (so max ${Math.max(0, byAge)} months for a ${f.mfgYear || ''} model).`, ref, topic: 'vehicle age maturity tenure' });
              else checks.push({ ok: true, text: `Vehicle age at loan end ${f.vehicleAgeAtEnd} yrs is within the ${scheme.maxAge} yrs limit.`, ref });
            }
          } else if (!skipped.has('tenure')) ask.add('tenure');
          if (maxTenure === 0) checks.push({ ok: false, text: `The vehicle already reaches the maximum age of ${scheme.maxAge} yrs – no tenure possible.`, ref, topic: 'vehicle age' });
        }
      }
    }
    const product = f.vehicleType && f.isNew ? productFor(f.vehicleType, f.isNew, band, S) : null;

    // eligibility conditions (structured policy rules)
    let capLtv = null, capTenure = null;
    // products the question could be about (if new/used is not known yet, rules that cover
    // BOTH new and used of this vehicle type can already be checked)
    const candidates = product ? [product] : f.vehicleType ? S.products.filter(p => isCar(f.vehicleType) ? /car/i.test(p.category + ' ' + p.name) : /commercial|\bcv\b/i.test(p.category + ' ' + p.name)) : [];
    if (candidates.length) {
      (S.conds || []).forEach(rule => {
        if (rule.products && rule.products.length && !candidates.every(p => rule.products.includes(p.id))) return;
        let state = true; const unknown = [];
        for (const c of rule.conds || []) {
          const r = cmp(f[c.fact], c.op, c.value, (FACTS[c.fact] || {}).type);
          if (r === null) { state = null; unknown.push(c.fact); continue; }
          if (!r) { state = false; break; }
        }
        if (state === false) return;
        const ref = rule.ref || 'Eligibility condition';
        const when = (rule.conds || []).map(condText).join(' and ');
        if (state === null) {
          unknown.forEach(k => { if (!skipped.has(k) && !FACTS[k]?.derived) ask.add(k); });
          if (unknown.some(k => skipped.has(k))) checks.push({ ok: null, text: `Not checked (information skipped): ${rule.title}`, ref, topic: rule.title });
          return;
        }
        if (rule.outcome === 'NO') checks.push({ ok: false, text: `${rule.reason || rule.title}`, why: when, ref, rule, topic: rule.title });
        else if (rule.outcome === 'COND') {
          checks.push({ ok: 'cond', text: `${rule.reason || rule.title}`, why: when, ref, rule, topic: rule.title });
          if (rule.maxLtv) capLtv = Math.min(capLtv ?? Infinity, +rule.maxLtv);
          if (rule.maxTenure) {
            capTenure = Math.min(capTenure ?? Infinity, +rule.maxTenure);
            if (f.tenure != null && f.tenure > +rule.maxTenure) checks.push({ ok: false, text: `Tenure ${fmtVal('tenure', f.tenure)} is more than ${rule.maxTenure} months allowed under “${rule.title}”.`, ref, rule, topic: rule.title });
          }
        } else checks.push({ ok: true, info: true, text: rule.reason || rule.title, why: when, ref, rule });
      });
    }

    const failed = checks.filter(c => c.ok === false);
    const conds = checks.filter(c => c.ok === 'cond');
    const askList = ASK_ORDER.filter(k => ask.has(k) && !skipped.has(k));
    let verdict;
    if (failed.length) verdict = 'NO';
    else if (askList.length) verdict = 'NEED_INFO';
    else if (!product) verdict = 'NEED_INFO';
    else if (conds.length || checks.some(c => c.ok === null)) verdict = 'COND';
    else verdict = 'YES';

    // what is possible
    let possible = null;
    if (band && maxTenure != null) {
      const ten = Math.min(maxTenure, capTenure ?? Infinity);
      possible = { product, maxTenure: ten, ltv: Math.min(+band.ltv, capLtv ?? Infinity), roi: band.roi };
      const fixes = failed.filter(c => c.rule).map(c => c.rule.fix).filter(Boolean);
      possible.fixes = [...new Set(fixes)];
    }
    failed.concat(conds).forEach(c => c.topic && topics.push(c.topic));
    return { facts: f, product, scheme, band, checks, ask: askList, verdict, possible, topics };
  }

  return { FACTS, understand, decide, fmtVal, condText, normalize, NOW };
})();
