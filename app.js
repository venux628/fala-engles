(function(){
  "use strict";

  // Os dicionários (DICT, POS_GROUPS, POS, TRANSLATE, NAMES) e as listas
  // de números por extenso vêm de dados.js, carregado antes deste arquivo.


  // ---------------------------------------------------------------------
  // Conversor fonético para palavras que não estão no dicionário
  // ---------------------------------------------------------------------
  function hold(store, text){
    const token = "\u0000" + store.length + "\u0000";
    store.push(text);
    return token;
  }

  function cgFix(w){
    let out = "";
    for (let i = 0; i < w.length; i++){
      const ch = w[i];
      const next = w[i + 1] || "";
      if (ch === "c" && next === "h") out += "c"; // deixa o dígrafo "ch" ser tratado depois
      else if (ch === "c") out += /[eiy]/.test(next) ? "s" : "k";
      else if (ch === "g" && next === "h") out += "g"; // idem para "gh"
      else if (ch === "g") out += /[eiy]/.test(next) ? "dj" : "g";
      else if (ch === "j") out += "dj";
      else out += ch;
    }
    return out;
  }

  function heuristic(rawLower){
    const store = [];
    let w = cgFix(rawLower);

    w = w.replace(/^kn/, () => hold(store, "n"));
    w = w.replace(/^wr/, () => hold(store, "r"));
    w = w.replace(/^gn/, () => hold(store, "n"));
    w = w.replace(/mb$/, () => hold(store, "m"));

    w = w.replace(/^h/, () => hold(store, "r"));

    w = w.replace(/x/g, () => hold(store, "ks"));

    w = w.replace(/igh/g, () => hold(store, "ai"));
    w = w.replace(/own\b/g, () => hold(store, "oun"));

    w = w.replace(/tion/g, () => hold(store, "xon"));
    w = w.replace(/sion/g, () => hold(store, "jon"));
    w = w.replace(/th/g, () => hold(store, "d"));
    w = w.replace(/sh/g, () => hold(store, "x"));
    w = w.replace(/ch/g, () => hold(store, "tch"));
    w = w.replace(/ph/g, () => hold(store, "f"));
    w = w.replace(/wh/g, () => hold(store, "u"));
    w = w.replace(/ck/g, () => hold(store, "k"));
    w = w.replace(/qu/g, () => hold(store, "ku"));

    w = w.replace(/ee/g, () => hold(store, "i"));
    w = w.replace(/ea/g, () => hold(store, "i"));
    w = w.replace(/oo/g, () => hold(store, "u"));
    w = w.replace(/ay/g, () => hold(store, "ei"));
    w = w.replace(/ai/g, () => hold(store, "ei"));
    w = w.replace(/oa/g, () => hold(store, "ou"));
    w = w.replace(/oy/g, () => hold(store, "ói"));
    w = w.replace(/oi/g, () => hold(store, "ói"));
    w = w.replace(/aw/g, () => hold(store, "ó"));
    w = w.replace(/au/g, () => hold(store, "ó"));
    w = w.replace(/ew/g, () => hold(store, "iu"));
    w = w.replace(/ou/g, () => hold(store, "au"));
    w = w.replace(/ow/g, () => hold(store, "au"));

    w = w.replace(/(^|[^aeiou\u0000])([aeiou])([bcdfgklmnprstvz])e$/,
      (m, pre, v, c) => {
        const map = { a: "ei", e: "i", i: "ai", o: "ou", u: "iu" };
        return pre + hold(store, map[v]) + c;
      });

    w = w.replace(/ing$/, () => hold(store, "in"));
    w = w.replace(/([^aeiou\u0000])ed$/, (m, c) => {
      const voiceless = ["p", "k", "f", "s", "t"];
      return c + hold(store, voiceless.includes(c) ? "t" : "d");
    });
    w = w.replace(/le$/, () => hold(store, "ol"));
    w = w.replace(/y$/, () => hold(store, "i"));

    w = w.replace(/a/g, "é");
    w = w.replace(/e/g, "é");
    w = w.replace(/o/g, "ó");
    w = w.replace(/u/g, "ã");

    w = w.replace(/w/g, "u");
    w = w.replace(/gh/g, "");
    w = w.replace(/h/g, "");

    w = w.replace(/\u0000(\d+)\u0000/g, (m, idx) => store[Number(idx)]);

    return w;
  }

  function pronounceWord(word){
    const lower = word.toLowerCase().replace(/’/g, "'");
    if (DICT[lower]) return DICT[lower];

    if (/[a-z]'s$/.test(lower)) {
      const base = lower.slice(0, -2);
      const baseP = DICT[base] || heuristic(base);
      return baseP + "z";
    }

    return heuristic(lower.replace(/'/g, ""));
  }



  function guessPOS(lowerBase){
    if (/ing$/.test(lowerBase)) return "verbo (gerúndio)";
    if (/ed$/.test(lowerBase)) return "verbo (passado)";
    if (/ly$/.test(lowerBase)) return "advérbio";
    if (/(tion|sion|ment|ness|ity)$/.test(lowerBase)) return "substantivo";
    if (/(ful|less|ous|ive|ic)$/.test(lowerBase)) return "adjetivo";
    if (/s$/.test(lowerBase) && lowerBase.length > 3) return "substantivo (plural)";
    return "substantivo";
  }

  function getPOS(tok){
    const lower = tok.toLowerCase().replace(/’/g, "'");
    if (POS[lower]) return POS[lower];
    if (/[a-z]'s$/.test(lower)) {
      const base = lower.slice(0, -2);
      return POS[base] ? POS[base] + " (posse)" : "substantivo (posse)";
    }
    return guessPOS(lower.replace(/'/g, ""));
  }


  function getTranslation(tok){
    const lower = tok.toLowerCase().replace(/’/g, "'");
    if (TRANSLATE[lower]) return TRANSLATE[lower];
    if (/[a-z]'s$/.test(lower)) {
      const base = lower.slice(0, -2);
      if (TRANSLATE[base]) return "de " + TRANSLATE[base];
    }
    return null;
  }


  function enBelowThousand(n){
    const parts = [];
    if (n >= 100) {
      parts.push(EN_ONES[Math.floor(n / 100)], "hundred");
      n = n % 100;
    }
    if (n >= 20) {
      parts.push(EN_TENS[Math.floor(n / 10)]);
      if (n % 10 > 0) parts.push(EN_ONES[n % 10]);
    } else if (n >= 10) {
      parts.push(EN_TEENS[n - 10]);
    } else if (n > 0) {
      parts.push(EN_ONES[n]);
    }
    return parts;
  }

  function numberToEnglishWords(n){
    if (n === 0) return ["zero"];
    let parts = [];
    let neg = n < 0;
    n = Math.abs(n);
    if (n >= 1000000) {
      parts = parts.concat(enBelowThousand(Math.floor(n / 1000000)), ["million"]);
      n = n % 1000000;
    }
    if (n >= 1000) {
      parts = parts.concat(enBelowThousand(Math.floor(n / 1000)), ["thousand"]);
      n = n % 1000;
    }
    if (n > 0) parts = parts.concat(enBelowThousand(n));
    if (neg) parts.unshift("minus");
    return parts;
  }


  function ptBelowThousand(n){
    if (n === 0) return "";
    if (n === 100) return "cem";
    const parts = [];
    if (n >= 100) {
      parts.push(PT_HUNDREDS[Math.floor(n / 100)]);
      n = n % 100;
      if (n > 0) parts.push("e");
    }
    if (n >= 20) {
      parts.push(PT_TENS[Math.floor(n / 10)]);
      if (n % 10 > 0) { parts.push("e"); parts.push(PT_ONES[n % 10]); }
    } else if (n >= 10) {
      parts.push(PT_TEENS[n - 10]);
    } else if (n > 0) {
      parts.push(PT_ONES[n]);
    }
    return parts.join(" ");
  }

  function numberToPortuguese(n){
    if (n === 0) return "zero";
    const neg = n < 0;
    n = Math.abs(n);
    const parts = [];
    if (n >= 1000000) {
      const m = Math.floor(n / 1000000);
      parts.push(m === 1 ? "um milhão" : ptBelowThousand(m) + " milhões");
      n = n % 1000000;
    }
    if (n >= 1000) {
      const th = Math.floor(n / 1000);
      parts.push(th === 1 ? "mil" : ptBelowThousand(th) + " mil");
      n = n % 1000;
    }
    if (n > 0) parts.push(ptBelowThousand(n));
    return (neg ? "menos " : "") + parts.filter(Boolean).join(" e ");
  }

  function buildNumberToken(digits){
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n > 999999999) {
      return { word: false, display: digits };
    }
    const enWords = numberToEnglishWords(n);
    const pronPhrase = enWords.map(w => pronounceWord(w)).join(" ");
    return {
      word: true,
      original: enWords.join(" "),
      display: pronPhrase,
      pos: "numeral",
      pt: numberToPortuguese(n)
    };
  }


  function getNamePronunciation(lowerBase){
    return NAMES[lowerBase] || null;
  }

  // Palavras com inicial maiúscula que não estão no dicionário são tratadas
  // como nomes próprios. Se for um nome comum e reconhecido (lista acima),
  // mostramos a pronúncia certa; senão, mantemos como foi digitado, para
  // não arriscar estragar nomes que já soam bem em português (Pablo, Curitiba...).
  function isProperNoun(tok){
    if (!/^[A-Z]/.test(tok)) return false;
    const isAllUpper = tok.length > 1 && tok === tok.toUpperCase();
    if (isAllUpper) return false;
    let base = tok.toLowerCase().replace(/’/g, "'");
    if (/[a-z]'s$/.test(base)) base = base.slice(0, -2);
    return !DICT[base];
  }

  function properNounToken(tok){
    let base = tok.toLowerCase().replace(/’/g, "'");
    let suffix = "";
    if (/[a-z]'s$/.test(base)) {
      suffix = "z";
      base = base.slice(0, -2);
    }
    const namePron = getNamePronunciation(base);
    const display = namePron ? applyCase(tok, namePron + suffix) : tok;
    return { word: true, original: tok, display: display, pos: "substantivo próprio (nome)", pt: "(nome próprio)" };
  }

  function applyCase(original, pronounced){
    const isAllUpper = original.length > 1 && original === original.toUpperCase() && /[A-Z]/.test(original);
    if (isAllUpper) return pronounced.toUpperCase();
    if (/^[A-Z]/.test(original)) {
      return pronounced.charAt(0).toUpperCase() + pronounced.slice(1);
    }
    return pronounced;
  }

  function buildTokens(text){
    const raw = text.match(/[A-Za-zÀ-ÿ'’]+|\d+|[^A-Za-zÀ-ÿ'’\d]+/g) || [];
    return raw.map(tok => {
      if (/^\d+$/.test(tok)) {
        return buildNumberToken(tok);
      }
      if (/^[A-Za-zÀ-ÿ'’]+$/.test(tok)) {
        if (isProperNoun(tok)) {
          return properNounToken(tok);
        }
        const pron = pronounceWord(tok);
        const pt = getTranslation(tok);
        return {
          word: true,
          original: tok,
          display: applyCase(tok, pron),
          pos: getPOS(tok),
          pt: pt || "(não identificado)"
        };
      }
      return { word: false, display: tok };
    });
  }

  // ---------------------------------------------------------------------
  // Ligação com a interface
  // ---------------------------------------------------------------------
  const entrada = document.getElementById("entrada");
  const saida = document.getElementById("saida");
  const wave = document.getElementById("wave");
  const tooltip = document.getElementById("tooltip");
  const ttPt = document.getElementById("tt-pt");
  const ttPron = document.getElementById("tt-pron");
  const ttEn = document.getElementById("tt-en");
  const ttPos = document.getElementById("tt-pos");
  const ttSimple = document.getElementById("tt-simple");

  function renderOutput(text){
    saida.innerHTML = "";
    if (!text.trim()) return;
    let tokens;
    try {
      tokens = buildTokens(text);
    } catch (err) {
      // nunca deixa a tela travada com conteúdo antigo se algo inesperado
      // acontecer ao processar o texto
      saida.textContent = text;
      return;
    }
    const frag = document.createDocumentFragment();
    tokens.forEach(t => {
      if (t.word) {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = t.display;
        span.dataset.original = t.original;
        span.dataset.pos = t.pos;
        span.dataset.pt = t.pt;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(t.display));
      }
    });
    saida.appendChild(frag);
  }

  function update(){
    const value = entrada.value;
    renderOutput(value);
    wave.classList.toggle("idle", value.trim().length === 0);
  }

  entrada.addEventListener("input", update);
  entrada.addEventListener("change", update);
  update();

  // ---- botão "Limpar": esvazia a entrada e a saída de uma vez ----
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      entrada.value = "";
      update();
      entrada.focus();
    });
  }

  // ---- guia rápido de números, dentro do painel de entrada ----
  const numbersGrid = document.getElementById("numbersGrid");
  const numbersRule = document.getElementById("numbersRule");

  function buildNumbersGuide(){
    numbersGrid.innerHTML = ""; // evita duplicar células se a função rodar mais de uma vez
    const values = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
      30,40,50,60,70,80,90,100,1000];
    const frag = document.createDocumentFragment();
    values.forEach(n => {
      const words = numberToEnglishWords(n);
      const pron = words.map(w => pronounceWord(w)).join(" ");
      const cell = document.createElement("div");
      cell.className = "numbers-cell";
      cell.innerHTML =
        '<span class="n-digit">' + n + '</span>' +
        '<span>' + words.join(" ") + '</span>' +
        '<span class="n-pron">' + pron + '</span>';
      frag.appendChild(cell);
    });
    numbersGrid.appendChild(frag);

    const p45 = numberToEnglishWords(45).map(w => pronounceWord(w)).join(" ");
    numbersRule.innerHTML =
      "Números de 21 a 99 juntam a dezena + a unidade: <b>45 = forty-five = " + p45 +
      "</b>. De 100 a 999, é centena + <b>hundred</b> + o resto, sem 'e': " +
      "<b>230 = two hundred thirty</b>.";
  }

  buildNumbersGuide();

  // ---- guia rápido de cores, dentro do painel de entrada ----
  const colorsGrid = document.getElementById("colorsGrid");

  function buildColorsGuide(){
    colorsGrid.innerHTML = ""; // evita duplicar células se a função rodar mais de uma vez
    const frag = document.createDocumentFragment();
    COLORS.forEach(c => {
      const pron = pronounceWord(c.en);
      const pt = TRANSLATE[c.en] || "";
      const cell = document.createElement("div");
      cell.className = "numbers-cell";
      cell.innerHTML =
        '<span class="color-swatch" style="background:' + c.hex + '"></span>' +
        '<span>' + c.en + '</span>' +
        '<span class="n-pron">' + pron + '</span>';
      cell.title = pt;
      frag.appendChild(cell);
    });
    colorsGrid.appendChild(frag);
  }

  buildColorsGuide();

  // ---- pop-up com a palavra original e a classe gramatical ----
  let activeWordEl = null;

  function positionTooltip(x, y){
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  function showTooltip(el, x, y){
    const naoIdentificado = el.dataset.pt === "(não identificado)" && el.dataset.original.length > 10;
    tooltip.classList.toggle("simple", naoIdentificado);
    if (naoIdentificado) {
      ttSimple.textContent = "(não identificado)";
    } else {
      ttPt.textContent = el.dataset.pt;
      ttPron.textContent = el.textContent;
      ttEn.textContent = el.dataset.original;
      ttPos.textContent = el.dataset.pos;
    }
    positionTooltip(x, y);
    tooltip.classList.add("visible");
  }

  function hideTooltip(){
    tooltip.classList.remove("visible");
    if (activeWordEl) activeWordEl.classList.remove("active");
    activeWordEl = null;
  }

  saida.addEventListener("mouseover", (e) => {
    const el = e.target.closest(".word");
    if (!el) return;
    activeWordEl = el;
    el.classList.add("active");
    showTooltip(el, e.clientX, e.clientY);
  });

  saida.addEventListener("mousemove", (e) => {
    if (!activeWordEl) return;
    positionTooltip(e.clientX, e.clientY);
  });

  saida.addEventListener("mouseout", (e) => {
    const el = e.target.closest(".word");
    if (!el) return;
    if (!e.relatedTarget || !e.relatedTarget.closest(".word")) hideTooltip();
    else if (e.relatedTarget.closest(".word") !== el) { el.classList.remove("active"); }
  });

  // toque em telas sem mouse: tocar mostra, tocar de novo ou fora esconde
  saida.addEventListener("touchstart", (e) => {
    const el = e.target.closest(".word");
    if (!el) { hideTooltip(); return; }
    if (activeWordEl === el) { hideTooltip(); return; }
    if (activeWordEl) activeWordEl.classList.remove("active");
    activeWordEl = el;
    el.classList.add("active");
    const rect = el.getBoundingClientRect();
    showTooltip(el, rect.left + rect.width / 2, rect.top);
  }, { passive: true });

  document.addEventListener("touchstart", (e) => {
    if (activeWordEl && !e.target.closest(".word")) hideTooltip();
  }, { passive: true });
})();
