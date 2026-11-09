/* Offline instant search: keyword + synonym + fuzzy matching across all data. */
const Search = (() => {
  // Common NBFC short forms. Each group = words that mean the same thing.
  const SYN_GROUPS = [
    ['pl', 'personal', 'personalloan'],
    ['bl', 'business', 'businessloan', 'msme', 'sme'],
    ['lap', 'property', 'mortgage', 'mortgageloan'],
    ['hl', 'home', 'housing'],
    ['gl', 'gold'],
    ['al', 'auto', 'car', 'vehicle', 'fourwheeler', '4w'],
    ['tw', '2w', 'twowheeler', 'wheeler', 'bike', 'scooter', 'motorcycle'],
    ['cv', 'commercial', 'truck', 'tipper', 'lcv', 'hcv'],
    ['ce', 'construction', 'equipment', 'machinery'],
    ['cd', 'consumer', 'durable', 'tv', 'mobile', 'fridge'],
    ['tractor', 'farm', 'agri'],
    ['ucv', 'used', 'refinance', 'refi', 'secondhand'],
    ['roi', 'interest', 'rate', 'irr'],
    ['pf', 'processing', 'fee', 'fees'],
    ['doc', 'docs', 'documentation', 'document', 'documents', 'kyc'],
    ['cibil', 'bureau', 'score', 'credit', 'experian', 'crif'],
    ['ltv', 'funding', 'margin', 'ltv%'],
    ['tenure', 'tenor', 'months', 'period', 'years'],
    ['foreclosure', 'preclosure', 'prepayment', 'foreclose', 'part', 'partpayment'],
    ['salaried', 'salary', 'employee', 'job'],
    ['seb', 'self', 'selfemployed', 'sep', 'senp', 'professional'],
    ['emi', 'instalment', 'installment'],
    ['bounce', 'dishonour', 'nach', 'ecs', 'cheque'],
    ['age', 'old', 'minimum', 'maximum'],
    ['income', 'itr', 'banking', 'abb'],
    ['ntc', 'new', 'nocredit', 'firsttime'],
  ];
  SYN_GROUPS.push(
    ['rc', 'registration', 'rcbook'],
    ['proof', 'profe', 'prof', 'proff', 'prooff', 'evidence'],
    ['property', 'house', 'residence', 'ownership', 'owned', 'own', 'prop', 'propery', 'proprty'],
    ['rented', 'rent', 'tenant', 'rental'],
    ['address', 'residence', 'resi', 'addr'],
    ['guarantor', 'guarantee', 'coapplicant', 'co', 'surety'],
    ['licence', 'license', 'dl', 'driving'],
    ['permit', 'fitness', 'route'],
    ['ftu', 'firsttime', 'fresh'],
    ['allowed', 'permitted', 'possible', 'eligible', 'allow', 'acceptable'],
  );
  // a word may belong to several groups -> merge them
  const SYN = new Map();
  SYN_GROUPS.forEach(g => g.forEach(w => { const cur = SYN.get(w) || new Set(); g.forEach(x => cur.add(x)); SYN.set(w, cur); }));

  const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'for', 'of', 'to', 'in', 'on', 'and', 'or', 'with', 'what', 'which', 'how', 'my', 'me', 'i', 'it', 'be', 'can', 'has', 'have', 'at', 'by', 'from', 'customer', 'case', 'loan', 'want', 'need', 'give', 'show', 'find', 'than', 'below', 'above', 'less', 'more']);

  function norm(s) { return (s || '').toString().toLowerCase(); }
  function tokens(s) {
    return norm(s).replace(/[^a-z0-9%.]+/g, ' ').split(' ').map(t => t.replace(/^\.+|\.+$/g, '')).filter(Boolean);
  }
  function queryTerms(q) {
    const raw = tokens(q);
    const terms = raw.filter(t => !STOP.has(t) || raw.length === 1);
    return terms.length ? terms : raw;
  }

  function lev1(a, b) { // true if edit distance <= 1
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, e = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++e > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return e + (a.length - i) + (b.length - j) <= 1;
  }

  // score of a term against a token list: exact 1, prefix .8, synonym .7, fuzzy .5
  function termScore(term, toks, tokSet) {
    if (tokSet.has(term)) return 1;
    let best = 0;
    const syns = SYN.get(term);
    if (syns) for (const s of syns) if (tokSet.has(s)) { best = 0.75; break; }
    if (best < 0.8 && term.length >= 2) {
      for (const t of toks) { if (t.startsWith(term)) { best = Math.max(best, term.length >= 3 ? 0.85 : 0.6); break; } }
    }
    if (best < 0.5 && term.length >= 5) {
      for (const t of toks) { if (t.length >= 4 && lev1(term, t)) { best = 0.5; break; } }
    }
    // numbers inside a range like 650-700 or <700 : treat as weak match if digits appear
    return best;
  }

  /** fields: [{text, w}] — returns {score, matched} */
  function scoreItem(terms, fields) {
    let total = 0, matched = 0;
    for (const term of terms) {
      let best = 0;
      for (const f of fields) {
        if (!f.text) continue;
        if (!f._t) { f._t = tokens(f.text); f._s = new Set(f._t); }
        const s = termScore(term, f._t, f._s) * f.w;
        if (s > best) best = s;
      }
      if (best > 0) matched++;
      total += best;
    }
    if (!terms.length) return { score: 0, matched: 0 };
    // reward items that match most of the terms
    const coverage = matched / terms.length;
    return { score: total * (0.4 + coverage * coverage), matched, coverage };
  }

  function escapeHtml(s) {
    return (s == null ? '' : s).toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function expand(terms) {
    const out = new Set();
    terms.forEach(t => { out.add(t); (SYN.get(t) || []).forEach(s => out.add(s)); });
    return [...out].filter(t => t.length >= 2);
  }

  function highlight(text, terms) {
    const safe = escapeHtml(text);
    const words = expand(terms).sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&'));
    if (!words.length) return safe;
    // short words (pl, al, tw…) must match whole words; longer ones may match as prefix
    const re = new RegExp('\\b(' + words.map(w => w.replace(/\\/g, '').length <= 3 ? w + '\\b' : w).join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  /** Best snippet (~220 chars) of long text around the densest match. */
  function snippet(text, terms, len = 220) {
    if (!text) return '';
    const lower = norm(text);
    const words = expand(terms);
    let bestPos = -1, bestScore = 0;
    const positions = [];
    words.forEach(w => {
      let i = lower.indexOf(w);
      let n = 0;
      while (i !== -1 && n < 200) { positions.push(i); i = lower.indexOf(w, i + w.length); n++; }
    });
    if (!positions.length) return text.slice(0, len) + (text.length > len ? '…' : '');
    positions.sort((a, b) => a - b);
    for (const p of positions) {
      const sc = positions.filter(x => x >= p && x < p + len).length;
      if (sc > bestScore) { bestScore = sc; bestPos = p; }
    }
    const start = Math.max(0, bestPos - 60);
    return (start > 0 ? '…' : '') + text.slice(start, start + len).replace(/\s+/g, ' ') + (start + len < text.length ? '…' : '');
  }

  return { tokens, queryTerms, scoreItem, highlight, snippet, escapeHtml, expand, STOP };
})();
