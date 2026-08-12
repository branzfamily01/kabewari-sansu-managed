(async () => {
  "use strict";

  /* ---------------- Managed distribution gate ---------------- */
  const APP_VERSION = "1.3.0";
  const MANAGEMENT_CONFIG_URL = "./control.json";
  const stageRoot = document.getElementById("stage-root");
  const managementGate = document.getElementById("management-gate");
  const managementTitle = document.getElementById("management-title");
  const managementMessage = document.getElementById("management-message");
  const managementRetry = document.getElementById("management-retry");
  const managementUpdate = document.getElementById("management-update");
  const managementVersion = document.getElementById("management-version");
  let currentManagementConfig = null;
  let managementCheckTimer = null;
  let managementBlocked = false;

  managementVersion.textContent = `version ${APP_VERSION}`;

  function compareVersions(left, right) {
    const a = String(left || "0").split(".").map(part => parseInt(part, 10) || 0);
    const b = String(right || "0").split(".").map(part => parseInt(part, 10) || 0);
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      const av = a[index] || 0;
      const bv = b[index] || 0;
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }

  function showManagementGate(title, message, options = {}) {
    managementBlocked = true;
    stageRoot.hidden = true;
    managementGate.hidden = false;
    managementTitle.textContent = title;
    managementMessage.textContent = message;
    managementRetry.hidden = !options.retry;
    managementUpdate.hidden = !options.update;
  }

  function allowManagedApp(config) {
    managementBlocked = false;
    currentManagementConfig = config;
    managementGate.hidden = true;
    stageRoot.hidden = false;

    const statusLabel = document.getElementById("managed-status-label");
    const statusVersion = document.getElementById("managed-status-version");
    if (statusLabel) {
      const configuredLabel = typeof config.statusLabel === "string" ? config.statusLabel.trim() : "";
      statusLabel.textContent = configuredLabel || "管理配布版 · ONLINE";
    }
    if (statusVersion) statusVersion.textContent = `v${APP_VERSION}`;

    const notice = document.getElementById("managed-notice");
    if (notice) {
      const text = typeof config.notice === "string" ? config.notice.trim() : "";
      notice.textContent = text;
      notice.hidden = !text;
    }
  }

  async function fetchManagementConfig() {
    const separator = MANAGEMENT_CONFIG_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${MANAGEMENT_CONFIG_URL}${separator}_=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`control ${response.status}`);
    const config = await response.json();
    if (!config || typeof config !== "object" || typeof config.enabled !== "boolean") {
      throw new Error("invalid control.json");
    }
    return config;
  }

  async function verifyManagement() {
    try {
      const config = await fetchManagementConfig();
      currentManagementConfig = config;

      if (!config.enabled) {
        showManagementGate(
          config.disabledTitle || "現在は利用できません",
          config.disabledMessage || "このアプリは現在、管理者により利用を停止しています。",
          { retry: true }
        );
        return null;
      }

      const minimumVersion = String(config.minimumVersion || "0.0.0");
      if (compareVersions(APP_VERSION, minimumVersion) < 0) {
        showManagementGate(
          config.updateTitle || "更新が必要です",
          config.updateMessage || "新しいバージョンがあります。更新してから続けてください。",
          { update: true, retry: true }
        );
        return null;
      }

      allowManagedApp(config);
      return config;
    } catch (error) {
      showManagementGate(
        "接続を確認してください",
        "管理設定を確認できませんでした。インターネットに接続して、もう一度確認してください。",
        { retry: true }
      );
      return null;
    }
  }

  async function hardRefreshManagedApp() {
    managementUpdate.disabled = true;
    managementRetry.disabled = true;
    managementTitle.textContent = "更新しています";
    managementMessage.textContent = "最新版を確認しています。";
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.update().catch(() => null)));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith("kabewari-sansu-managed-")).map(key => caches.delete(key)));
      }
    } catch {
      // Reload still proceeds even if cache APIs are unavailable.
    }
    const url = new URL(location.href);
    url.searchParams.set("update", String(Date.now()));
    location.replace(url.toString());
  }

  managementRetry.addEventListener("click", async () => {
    managementRetry.disabled = true;
    managementTitle.textContent = "再確認しています";
    managementMessage.textContent = "管理設定を確認しています。";
    const config = await verifyManagement();
    managementRetry.disabled = false;
    if (config) location.reload();
  });
  managementUpdate.addEventListener("click", hardRefreshManagedApp);

  const initialManagementConfig = await verifyManagement();
  if (!initialManagementConfig) return;

  const recheckMinutes = Math.max(1, Math.min(60, Number(initialManagementConfig.checkIntervalMinutes) || 10));
  managementCheckTimer = window.setInterval(() => {
    verifyManagement();
  }, recheckMinutes * 60 * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !managementBlocked) verifyManagement();
  });

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = values => values[Math.floor(Math.random() * values.length)];
  const shuffle = values => {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const gcdValue = (a, b) => (b ? gcdValue(b, a % b) : Math.abs(a));
  const lcmValue = (a, b) => Math.abs(a * b) / gcdValue(a, b);
  const levelValue = (...values) => values[Math.min(level, values.length - 1)];
  const formatDecimal = value => String(Math.round(value * 100) / 100);
  const formatTime = ms => `${(ms / 1000).toFixed(1)}秒`;
  const fractionHTML = (numerator, denominator) =>
    `<span class="wall-fraction"><span>${numerator}</span><span>${denominator}</span></span>`;
  const problemHTML = (main, sub = "") =>
    `<div class="problem">${main}</div>${sub ? `<div class="subline">${sub}</div>` : ""}`;

  const STORAGE_KEY = "kabewari-sansu-v1";
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  })();

  const best = saved.best && typeof saved.best === "object" ? saved.best : {};
  let muted = Boolean(saved.muted);
  let totalXP = Number.isFinite(saved.totalXP) ? saved.totalXP : 0;
  let totalWalls = Number.isFinite(saved.totalWalls) ? saved.totalWalls : 0;
  let totalPlays = Number.isFinite(saved.totalPlays) ? saved.totalPlays : 0;
  const history = Array.isArray(saved.history) ? saved.history.slice(0, 30) : [];

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ best, muted, totalXP, totalWalls, totalPlays, history }));
    } catch {
      // The game still works if browser storage is unavailable.
    }
  };

  const STAGES = [
    { id: "hw1", number: "STAGE 1", name: "百わり①", description: "あまりのあるわり算", grade: "3年〜", gradeClass: "g3", section: "けいさんのきほん（補充A）" },
    { id: "hw2", number: "STAGE 2", name: "百わり②", description: "大きい数にちょうせん", grade: "3年〜", gradeClass: "g3" },
    { id: "rev", number: "STAGE 3", name: "反転百わり", description: "わられる数をさがせ", grade: "3年〜", gradeClass: "g3" },
    { id: "pf", number: "STAGE 4", name: "素因数分解", description: "素数パンチでカベを分解", grade: "5年〜", gradeClass: "g5" },
    { id: "gcd", number: "STAGE 5", name: "最大公約数", description: "2つの数の共通のカギ", grade: "5年〜", gradeClass: "g5" },
    { id: "lcm", number: "STAGE 6", name: "最小公倍数", description: "そろう数をみつけろ", grade: "5年〜", gradeClass: "g5" },
    { id: "iadd", number: "STAGE 7", name: "インド式たし算", description: "2けた＋2けたを暗算", grade: "3年〜", gradeClass: "g3" },
    { id: "i21", number: "STAGE 8", name: "インド式 2桁×1桁", description: "13×7を頭の中で", grade: "3年〜", gradeClass: "g3" },
    { id: "i22", number: "STAGE 9", name: "インド式かけ算", description: "十何×十何から発展", grade: "5年〜", gradeClass: "g5" },
    { id: "fr1", number: "STAGE 10", name: "分数たしひき", description: "同じ分母のたし算・ひき算", grade: "4年〜", gradeClass: "g3", section: "ぶんすう（補充B）" },
    { id: "fr2", number: "STAGE 11", name: "分数と整数", description: "分数の横棒はわり算！", grade: "4年〜", gradeClass: "g3" },
    { id: "fr3", number: "STAGE 12", name: "等しい分数と比", description: "2:3＝4:□をみつけろ", grade: "4年〜", gradeClass: "g3" },
    { id: "fr4", number: "STAGE 13", name: "帯分数マスター", description: "仮分数⇄帯分数・計算", grade: "5年〜", gradeClass: "g5" },
    { id: "dc1", number: "STAGE 14", name: "0.1がいくつ", description: "2.7は0.1が□こ", grade: "3年〜", gradeClass: "g3", section: "しょうすう（補充C）" },
    { id: "dc2", number: "STAGE 15", name: "小数たしひき", description: "3.4＋1.3、くり上がりも", grade: "3年〜", gradeClass: "g3" },
    { id: "dc3", number: "STAGE 16", name: "小数×整数", description: "2.4×3を暗算で", grade: "4年〜", gradeClass: "g3" },
    { id: "dc4", number: "STAGE 17", name: "小数÷整数", description: "7.2÷2をわり切ろう", grade: "4年〜", gradeClass: "g3" },
    { id: "dc5", number: "STAGE 18", name: "小数のあまり", description: "商とあまりをこたえよう", grade: "5年〜", gradeClass: "g5" },
    { id: "rot", number: "STAGE 19", name: "回転図形", description: "90°回すとどうなる？", grade: "3年〜", gradeClass: "g3", section: "ずけい" },
    { id: "net", number: "STAGE 20", name: "展開図", description: "サイコロの反対の面は？", grade: "3年〜", gradeClass: "g3" },
    { id: "cut", number: "STAGE 21", name: "立体切断", description: "切り口はどんな形？", grade: "5年〜", gradeClass: "g5" }
  ];

  let mode = "challenge";
  let stageId = "hw1";
  let level = 0;
  let game = null;
  let gameToken = 0;
  let helpSteps = [];
  let helpIndex = 0;
  let helpAutoPaused = false;
  let toastTimer = null;

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2100);
  }

  function renderHome() {
    const xp = $("#home-xp");
    const plays = $("#home-plays");
    const walls = $("#home-walls");
    if (xp) xp.textContent = String(totalXP);
    if (plays) plays.textContent = String(totalPlays);
    if (walls) walls.textContent = String(totalWalls);
    const grid = $("#stage-grid");
    grid.innerHTML = "";
    STAGES.forEach(stage => {
      if (stage.section) {
        const section = document.createElement("div");
        section.className = "stage-section";
        section.textContent = stage.section;
        grid.appendChild(section);
      }

      const card = document.createElement("button");
      card.type = "button";
      card.className = `stage-card${stage.id === stageId ? " selected" : ""}`;
      card.setAttribute("aria-pressed", String(stage.id === stageId));
      const record = best[`${mode}_${stage.id}`];
      card.innerHTML = `
        <span class="stage-number">${stage.number}</span>
        <span class="stage-name">${stage.name}</span>
        <span class="stage-description">${stage.description}</span>
        <span class="stage-tag ${stage.gradeClass}">${stage.grade}</span>
        ${record != null ? `<span class="best-mini">★${mode === "challenge" ? `${record}pt` : formatTime(record)}</span>` : ""}
      `;
      card.addEventListener("click", () => {
        stageId = stage.id;
        renderHome();
        soundEffect("tap");
      });
      grid.appendChild(card);
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    $("#mode-challenge").classList.toggle("selected", mode === "challenge");
    $("#mode-casual").classList.toggle("selected", mode === "casual");
    $("#mode-challenge").setAttribute("aria-pressed", String(mode === "challenge"));
    $("#mode-casual").setAttribute("aria-pressed", String(mode === "casual"));
    renderHome();
    soundEffect("tap");
  }

  /* ---------------- Problem generators ---------------- */
  const GENERATORS = {
    hw1() {
      const divisor = randomInt(2, 9);
      const quotient = randomInt(1, levelValue(3, 4, 5, 5));
      const remainder = randomInt(0, divisor - 1);
      const dividend = divisor * quotient + remainder;
      if (dividend < 4) return GENERATORS.hw1();
      return {
        html: problemHTML(`${dividend} ÷ ${divisor}`, "商とあまりをこたえよう"),
        qr: [quotient, remainder],
        raw: { dividend, divisor, quotient, remainder }
      };
    },

    hw2() {
      const divisor = randomInt(2, 9);
      const quotient = randomInt(2, levelValue(6, 7, 8, 9));
      const remainder = randomInt(0, divisor - 1);
      const dividend = divisor * quotient + remainder;
      if (dividend > 60) return GENERATORS.hw2();
      return {
        html: problemHTML(`${dividend} ÷ ${divisor}`, "商とあまりをこたえよう"),
        qr: [quotient, remainder],
        raw: { dividend, divisor, quotient, remainder }
      };
    },

    rev() {
      const divisor = randomInt(2, 9);
      const quotient = randomInt(1, levelValue(4, 5, 7, 9));
      const remainder = randomInt(1, divisor - 1);
      const dividend = divisor * quotient + remainder;
      return {
        html: problemHTML(`<span class="blank">?</span> ÷ ${divisor} = ${quotient} … ${remainder}`, `ヒント：${divisor} × ${quotient} ＋ ${remainder}`),
        answer: dividend,
        raw: { dividend, divisor, quotient, remainder }
      };
    },

    pf() {
      const primes = levelValue([2, 3, 5], [2, 3, 5, 7], [2, 3, 5, 7], [2, 3, 5, 7, 11, 13]);
      const count = levelValue(randomInt(2, 3), randomInt(2, 3), randomInt(3, 4), randomInt(3, 4));
      let value = 1;
      const factors = [];
      for (let i = 0; i < count; i += 1) {
        const prime = pick(primes);
        value *= prime;
        factors.push(prime);
      }
      if (value > 400 || value < 6) return GENERATORS.pf();
      return { prime: value, raw: { value, factors: factors.sort((a, b) => a - b) } };
    },

    gcd() {
      const coprimePairs = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [2, 7], [3, 7]];
      const common = randomInt(2, levelValue(6, 9, 12, 13));
      const [leftFactor, rightFactor] = pick(coprimePairs);
      const pair = Math.random() < .5
        ? [common * leftFactor, common * rightFactor]
        : [common * rightFactor, common * leftFactor];
      if (pair[0] > 99 || pair[1] > 99 || pair[0] === pair[1]) return GENERATORS.gcd();
      return {
        html: problemHTML(`${pair[0]} : ${pair[1]}`, "最大公約数は？"),
        answer: common,
        raw: { a: pair[0], b: pair[1], answer: common }
      };
    },

    lcm() {
      const a = randomInt(2, levelValue(9, 12, 13, 15));
      const b = randomInt(2, levelValue(9, 12, 13, 15));
      const answer = lcmValue(a, b);
      if (a === b || answer > levelValue(60, 90, 120, 150)) return GENERATORS.lcm();
      return { html: problemHTML(`${a} : ${b}`, "最小公倍数は？"), answer, raw: { a, b, answer } };
    },

    iadd() {
      const minimum = levelValue(23, 34, 46, 56);
      const a = randomInt(minimum, 98);
      const b = randomInt(minimum, 98);
      if ((a % 10) + (b % 10) < 10 && Math.random() < .7) return GENERATORS.iadd();
      return { html: problemHTML(`${a} ＋ ${b}`, "十の位からたすと速い！"), answer: a + b, raw: { a, b } };
    },

    i21() {
      const a = randomInt(levelValue(12, 12, 21, 32), levelValue(19, 29, 49, 89));
      const b = randomInt(levelValue(3, 3, 4, 6), 9);
      const tens = Math.floor(a / 10) * 10;
      return {
        html: problemHTML(`${a} × ${b}`, `${tens}×${b} と ${a % 10}×${b} に分けよう`),
        answer: a * b,
        raw: { a, b }
      };
    },

    i22() {
      let a;
      let b;
      if (level < 1) {
        a = 11;
        b = randomInt(11, 19);
      } else if (level < 2) {
        a = randomInt(11, 19);
        b = randomInt(11, 19);
      } else {
        a = randomInt(11, 19);
        b = randomInt(11, levelValue(19, 19, 25, 29));
      }
      const hint = b < 20
        ? `(${a}＋${b % 10})×10 ＋ ${a % 10}×${b % 10}`
        : `${a}×${Math.floor(b / 10) * 10} ＋ ${a}×${b % 10}`;
      return { html: problemHTML(`${a} × ${b}`, hint), answer: a * b, raw: { a, b } };
    },

    fr1() {
      const denominator = pick(levelValue([3, 4, 5, 6], [5, 6, 7, 8], [7, 8, 9, 12], [9, 12, 13, 18]));
      const addition = Math.random() < .6;
      let a;
      let b;
      if (addition) {
        a = randomInt(1, denominator + levelValue(0, 2, 4, 6));
        b = randomInt(1, denominator - 1);
      } else {
        a = randomInt(2, denominator + levelValue(1, 3, 6, 9));
        b = randomInt(1, a - 1);
      }
      const answer = addition ? a + b : a - b;
      return {
        html: problemHTML(`${fractionHTML(a, denominator)} ${addition ? "＋" : "−"} ${fractionHTML(b, denominator)}`, "分母はそのまま、分子だけ計算！"),
        fraction: answer,
        denominator,
        raw: { a, b, denominator, addition, answer }
      };
    },

    fr2() {
      const denominator = randomInt(2, levelValue(6, 8, 9, 13));
      const whole = randomInt(2, levelValue(5, 7, 9, 12));
      const numerator = denominator * whole;
      const variant = randomInt(0, 2);
      const raw = { numerator, denominator, whole, variant };
      if (variant === 0) return { html: problemHTML(`${fractionHTML(numerator, denominator)} = <span class="blank">?</span>`, "分数はわり算だよ"), answer: whole, raw };
      if (variant === 1) return { html: problemHTML(`${fractionHTML('<span class="blank">?</span>', denominator)} = ${whole}`, `ヒント：${denominator} × ${whole}`), answer: numerator, raw };
      return { html: problemHTML(`${fractionHTML(numerator, '<span class="blank">?</span>')} = ${whole}`, `ヒント：${numerator} ÷ ${whole}`), answer: denominator, raw };
    },

    fr3() {
      const bases = [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [2, 7], [3, 7], [5, 7], [3, 8], [5, 8]];
      const [a, b] = pick(bases);
      const multiplier = randomInt(2, levelValue(6, 8, 10, 13));
      const ratio = Math.random() < .5;
      const blankLeft = Math.random() < .5;
      const answer = blankLeft ? a * multiplier : b * multiplier;
      let display;
      if (ratio) {
        display = blankLeft
          ? `${a} : ${b} = <span class="blank">?</span> : ${b * multiplier}`
          : `${a} : ${b} = ${a * multiplier} : <span class="blank">?</span>`;
      } else {
        display = blankLeft
          ? `${fractionHTML(a, b)} = ${fractionHTML('<span class="blank">?</span>', b * multiplier)}`
          : `${fractionHTML(a, b)} = ${fractionHTML(a * multiplier, '<span class="blank">?</span>')}`;
      }
      return {
        html: problemHTML(display, "分母と分子（比の両方）に同じ数！"),
        answer,
        raw: { a, b, multiplier, ratio, blankLeft, answer }
      };
    },

    fr4() {
      const denominator = pick(levelValue([3, 4, 5], [4, 5, 6, 7], [5, 6, 7, 8, 9], [6, 8, 9, 12, 16]));
      if (level < 1 || Math.random() < .5) {
        const whole = randomInt(1, levelValue(3, 5, 9, 19));
        const remainder = randomInt(1, denominator - 1);
        const numerator = whole * denominator + remainder;
        return {
          html: problemHTML(`${fractionHTML(numerator, denominator)} = <span class="blank">?</span>`, "帯分数（整数と分数）になおそう"),
          mixed: [whole, remainder],
          denominator,
          raw: { kind: "convert", numerator, denominator, whole, remainder }
        };
      }
      const whole = randomInt(1, levelValue(2, 3, 5, 7));
      const remainder = randomInt(1, denominator - 1);
      const total = whole * denominator + remainder;
      const addition = Math.random() < .5;
      let a;
      let b;
      if (addition) {
        a = randomInt(1, total - 1);
        b = total - a;
      } else {
        b = randomInt(1, levelValue(9, 12, 15, 19));
        a = total + b;
      }
      return {
        html: problemHTML(`${fractionHTML(a, denominator)} ${addition ? "＋" : "−"} ${fractionHTML(b, denominator)}`, "計算してから帯分数に！"),
        mixed: [whole, remainder],
        denominator,
        raw: { kind: "calculate", a, b, addition, denominator, whole, remainder, total }
      };
    },

    dc1() {
      const tenths = randomInt(2, levelValue(19, 29, 59, 99));
      if (tenths % 10 === 0) return GENERATORS.dc1();
      if (Math.random() < .5) {
        return { html: problemHTML(`${formatDecimal(tenths / 10)} は`, "0.1 が なんこ？"), answer: tenths, raw: { tenths, asksCount: true } };
      }
      return { html: problemHTML(`0.1 が ${tenths}こ`, "あわせると いくつ？"), decimal: tenths / 10, raw: { tenths, asksCount: false } };
    },

    dc2() {
      const addition = Math.random() < .55;
      let a = randomInt(2, levelValue(59, 89, 120, 199));
      let b = randomInt(2, levelValue(49, 79, 99, 149));
      if (!addition && a < b) [a, b] = [b, a];
      if (!addition && a === b) return GENERATORS.dc2();
      const resultTenths = addition ? a + b : a - b;
      return {
        html: problemHTML(`${formatDecimal(a / 10)} ${addition ? "＋" : "−"} ${formatDecimal(b / 10)}`, "「0.1が何こ」で考えよう"),
        decimal: resultTenths / 10,
        raw: { a, b, addition, resultTenths }
      };
    },

    dc3() {
      const tenths = randomInt(2, levelValue(9, 19, 49, 99));
      const integer = randomInt(2, 9);
      if (tenths % 10 === 0) return GENERATORS.dc3();
      return {
        html: problemHTML(`${formatDecimal(tenths / 10)} × ${integer}`, "10倍して計算 → さいごに÷10"),
        decimal: tenths * integer / 10,
        raw: { tenths, integer }
      };
    },

    dc4() {
      const divisor = randomInt(2, 9);
      const answerTenths = randomInt(2, levelValue(9, 19, 39, 99));
      const dividendTenths = answerTenths * divisor;
      if (dividendTenths > 999 || answerTenths % 10 === 0) return GENERATORS.dc4();
      return {
        html: problemHTML(`${formatDecimal(dividendTenths / 10)} ÷ ${divisor}`, "10倍して計算 → さいごに÷10"),
        decimal: answerTenths / 10,
        raw: { dividendTenths, divisor, answerTenths }
      };
    },

    dc5() {
      const divisor = randomInt(2, 9);
      const quotient = randomInt(1, levelValue(3, 5, 9, 9));
      let remainderTenths = randomInt(1, divisor * 10 - 1);
      if (remainderTenths % 10 === 0) remainderTenths += 1;
      const dividendTenths = quotient * divisor * 10 + remainderTenths;
      return {
        html: problemHTML(`${formatDecimal(dividendTenths / 10)} ÷ ${divisor}`, "商は整数、あまりは小数！"),
        decimalQr: [quotient, remainderTenths / 10],
        raw: { dividendTenths, divisor, quotient, remainderTenths }
      };
    },

    rot() { return makeRotation(); },
    net() { return makeNet(); },
    cut() { return makeCut(); }
  };

  /* ---------------- Geometry ---------------- */
  const ARROWS = ["↑", "→", "↓", "←"];

  function rotateCellsClockwise(cells, size) {
    return cells.map(cell => ({ ...cell, row: cell.col, col: size - 1 - cell.row, direction: (cell.direction + 1) % 4 }));
  }

  function rotateCells180(cells, size) {
    return rotateCellsClockwise(rotateCellsClockwise(cells, size), size);
  }

  function rotateCellsCounterclockwise(cells, size) {
    return rotateCells180(rotateCellsClockwise(cells, size), size);
  }

  function rotationGridHTML(cells, size, cellSize) {
    const map = new Map(cells.map(cell => [`${cell.row}_${cell.col}`, cell]));
    let html = `<div class="rotation-grid" style="--cell-size:${cellSize}px;grid-template-columns:repeat(${size},var(--cell-size))">`;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cell = map.get(`${row}_${col}`);
        const symbol = cell ? (cell.symbol === "↑" ? ARROWS[cell.direction] : cell.symbol) : "";
        html += `<div class="rotation-cell">${symbol}</div>`;
      }
    }
    return `${html}</div>`;
  }

  function makeRotation() {
    const size = 4;
    const symbols = ["○", "×", "↑", "△"];
    const positions = shuffle([...Array(size * size).keys()]).slice(0, 3 + (level > 1 ? 1 : 0));
    const cells = positions.map((position, index) => ({
      row: Math.floor(position / size),
      col: position % size,
      symbol: symbols[index],
      direction: 0
    }));
    const direction = Math.random() < .5 ? "clockwise" : "counterclockwise";
    const correct = direction === "clockwise" ? rotateCellsClockwise(cells, size) : rotateCellsCounterclockwise(cells, size);
    const wrongDirection = direction === "clockwise" ? rotateCellsCounterclockwise(cells, size) : rotateCellsClockwise(cells, size);
    const choices = shuffle([
      { grid: correct, correct: true },
      { grid: wrongDirection, correct: false },
      { grid: rotateCells180(cells, size), correct: false }
    ]);
    const wallCell = Math.min(26, Math.floor(window.innerWidth / 16));
    return {
      html: `<div>${rotationGridHTML(cells, size, wallCell)}<div class="subline">${direction === "clockwise" ? "右（時計回り）" : "左（反時計回り）"}に90°回すと？</div></div>`,
      choices: choices.map((choice, index) => ({ label: rotationGridHTML(choice.grid, size, 15), key: "ABC"[index], correct: choice.correct })),
      raw: { cells, size, direction, correct }
    };
  }

  const vectorKey = vector => vector.join(",");
  const negateVector = vector => vector.map(value => -value);

  function makeNet() {
    // A mathematically valid cube net. Face opposites are computed by folding the net in 3D.
    const positions = [[1, 0], [1, 1], [1, 2], [1, 3], [0, 1], [2, 1]];
    const labels = shuffle([1, 2, 3, 4, 5, 6]);
    const faces = positions.map((position, index) => ({ row: position[0], col: position[1], number: labels[index] }));
    const faceAt = (row, col) => faces.find(face => face.row === row && face.col === col);
    const orientations = new Map();
    const start = faceAt(1, 1);
    orientations.set(`${start.row}_${start.col}`, { normal: [0, 0, 1], right: [1, 0, 0], down: [0, 1, 0] });
    const queue = [start];
    const directions = [[0, 1, "east"], [0, -1, "west"], [1, 0, "south"], [-1, 0, "north"]];

    while (queue.length) {
      const current = queue.shift();
      const orientation = orientations.get(`${current.row}_${current.col}`);
      directions.forEach(([dr, dc, direction]) => {
        const next = faceAt(current.row + dr, current.col + dc);
        if (!next || orientations.has(`${next.row}_${next.col}`)) return;
        const { normal, right, down } = orientation;
        let folded;
        if (direction === "east") folded = { normal: right, right: negateVector(normal), down };
        if (direction === "west") folded = { normal: negateVector(right), right: normal, down };
        if (direction === "south") folded = { normal: down, right, down: negateVector(normal) };
        if (direction === "north") folded = { normal: negateVector(down), right, down: normal };
        orientations.set(`${next.row}_${next.col}`, folded);
        queue.push(next);
      });
    }

    const byNormal = new Map();
    faces.forEach(face => {
      const orientation = orientations.get(`${face.row}_${face.col}`);
      byNormal.set(vectorKey(orientation.normal), face.number);
    });

    const opposite = {};
    faces.forEach(face => {
      const orientation = orientations.get(`${face.row}_${face.col}`);
      opposite[face.number] = byNormal.get(vectorKey(negateVector(orientation.normal)));
    });

    const target = pick(labels);
    const cellSize = Math.min(35, Math.floor(window.innerWidth / 11));
    let netHtml = `<div class="net-grid" style="--cell-size:${cellSize}px;grid-template-columns:repeat(4,var(--cell-size))">`;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const face = faceAt(row, col);
        netHtml += face
          ? `<div class="net-cell${face.number === target ? " target" : ""}">${face.number}</div>`
          : `<div class="net-void"></div>`;
      }
    }
    netHtml += "</div>";
    const pairs = [];
    Object.entries(opposite).forEach(([left, right]) => {
      if (Number(left) < right) pairs.push([Number(left), right]);
    });
    return {
      html: `<div>${netHtml}<div class="subline">組み立てたとき <b style="color:var(--orange)">${target}</b> の反対の面は？</div></div>`,
      netAnswer: opposite[target],
      raw: { target, answer: opposite[target], pairs, netHtml }
    };
  }

  function cubeSVG(polygon) {
    const front = [[50, 80], [150, 80], [150, 180], [50, 180]];
    const back = front.map(point => [point[0] + 40, point[1] - 40]);
    const line = (a, b, dashed = false) =>
      `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#fff" stroke-width="2.5" ${dashed ? 'stroke-dasharray="5 5" opacity=".55"' : ""}/>`;
    let svg = `<svg class="cut-svg" width="${Math.min(210, window.innerWidth * .5)}" viewBox="0 0 210 200" role="img" aria-label="立方体の切断図">`;
    svg += line(front[0], front[1]) + line(front[1], front[2]) + line(front[2], front[3]) + line(front[3], front[0]);
    svg += line(back[0], back[1]) + line(back[1], back[2], true) + line(back[2], back[3], true) + line(back[3], back[0]);
    svg += line(front[0], back[0]) + line(front[1], back[1]) + line(front[2], back[2]) + line(front[3], back[3], true);
    svg += `<polygon points="${polygon.map(point => point.join(",")).join(" ")}" fill="#f5a200" opacity=".82" stroke="#fff" stroke-width="2"/>`;
    polygon.forEach(point => { svg += `<circle cx="${point[0]}" cy="${point[1]}" r="4.5" fill="#fff"/>`; });
    return `${svg}</svg>`;
  }

  const CUT_QUESTIONS = [
    { polygon: [[100, 80], [50, 130], [70, 60]], answer: "正三角形", prompt: "1つの角のまわり、3つの辺のまん中を通る切り口" },
    { polygon: [[100, 80], [140, 40], [140, 140], [100, 180]], answer: "正方形", prompt: "1つの面に平行に、まっすぐ切った切り口" },
    { polygon: [[50, 80], [150, 80], [190, 140], [90, 140]], answer: "長方形", prompt: "向かい合う面を平行に通る切り口" },
    { polygon: [[140, 40], [190, 90], [100, 180], [50, 130]], answer: "ひし形", prompt: "向かい合う4辺のまん中を通るななめの切り口" },
    { polygon: [[70, 60], [140, 40], [190, 90], [170, 160], [100, 180], [50, 130]], answer: "正六角形", prompt: "6つの辺のまん中を通る切り口" },
    { polygon: [[85, 70], [140, 40], [190, 90], [130, 180], [50, 130]], answer: "五角形", prompt: "5つの面を通るように切った切り口" }
  ];
  const CUT_OPTIONS = ["正三角形", "正方形", "長方形", "ひし形", "五角形", "正六角形"];
  let previousCut = -1;

  function makeCut() {
    let index;
    do index = randomInt(0, CUT_QUESTIONS.length - 1); while (index === previousCut);
    previousCut = index;
    const question = CUT_QUESTIONS[index];
    const wrong = shuffle(CUT_OPTIONS.filter(option => option !== question.answer)).slice(0, 2);
    const choices = shuffle([{ label: question.answer, correct: true }, ...wrong.map(label => ({ label, correct: false }))]);
    return {
      html: `<div>${cubeSVG(question.polygon)}<div class="subline">${question.prompt}は？</div></div>`,
      choices: choices.map((choice, choiceIndex) => ({ label: `<span>${choice.label}</span>`, key: "ABC"[choiceIndex], correct: choice.correct })),
      raw: { index }
    };
  }

  /* ---------------- Game flow ---------------- */
  function startGame() {
    initializeAudio();
    const stage = STAGES.find(item => item.id === stageId);
    level = 0;
    gameToken += 1;
    game = {
      token: gameToken,
      stage,
      mode,
      score: 0,
      xpEarned: 0,
      combo: 0,
      maxCombo: 0,
      walls: 0,
      timeLeft: 60000,
      elapsed: 0,
      running: false,
      paused: false,
      finished: false,
      locked: false,
      current: null,
      input: "",
      input2: "",
      slot: 0,
      primeRemainder: 0,
      lastTick: 0
    };

    totalPlays += 1;
    persist();
    $("#home").classList.remove("show");
    $("#game").classList.add("show");
    $("#result-overlay").classList.remove("show");
    $("#pause-overlay").classList.remove("show");
    $("#stage-chip").textContent = stage.name;
    $("#score-display").innerHTML = "0<small>pt</small>";
    $("#time-label").textContent = mode === "challenge" ? "TIME" : "WALL";
    $("#timebar").style.width = "100%";
    $("#timebar").classList.remove("warning");
    updateCombo();
    runCountdown(3, game.token);
  }

  function runCountdown(number, token) {
    if (!game || game.token !== token) return;
    const overlay = $("#countdown");
    const label = $("#countdown-number");
    overlay.classList.add("show");
    if (number === 0) {
      label.textContent = "GO!";
      label.style.animation = "none";
      void label.offsetWidth;
      label.style.animation = "";
      soundEffect("go");
      setTimeout(() => {
        if (!game || game.token !== token) return;
        overlay.classList.remove("show");
        beginRun();
      }, 600);
      return;
    }
    label.textContent = String(number);
    label.style.animation = "none";
    void label.offsetWidth;
    label.style.animation = "";
    soundEffect("count");
    setTimeout(() => runCountdown(number - 1, token), 850);
  }

  function beginRun() {
    if (!game || game.finished) return;
    game.running = true;
    game.lastTick = performance.now();
    nextWall();
    if (document.hidden) {
      game.paused = true;
      $("#pause-overlay").classList.add("show");
    } else {
      startMusic();
    }
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!game || !game.running || game.finished) return;
    if (!game.paused) {
      const delta = Math.min(250, now - game.lastTick);
      if (game.mode === "challenge") {
        game.timeLeft -= delta;
        const percent = Math.max(0, game.timeLeft / 60000 * 100);
        $("#timebar").style.width = `${percent}%`;
        $("#timebar").classList.toggle("warning", game.timeLeft < 10000);
        $("#timebar-wrap").setAttribute("aria-valuenow", String(Math.round(percent)));
        if (game.timeLeft <= 0) {
          finishGame();
          return;
        }
      } else {
        game.elapsed += delta;
        const percent = game.walls / 20 * 100;
        $("#timebar").style.width = `${percent}%`;
        $("#timebar-wrap").setAttribute("aria-valuenow", String(Math.round(percent)));
      }
    }
    game.lastTick = now;
    requestAnimationFrame(tick);
  }

  function togglePause() {
    if (!game || !game.running || game.finished) return;
    game.paused = !game.paused;
    $("#pause-overlay").classList.toggle("show", game.paused);
    if (game.paused) stopMusic();
    else {
      game.lastTick = performance.now();
      startMusic();
    }
  }

  function goHome() {
    gameToken += 1;
    if (game) game.running = false;
    stopMusic();
    $("#countdown").classList.remove("show");
    $("#pause-overlay").classList.remove("show");
    $("#result-overlay").classList.remove("show");
    $("#help-overlay").classList.remove("show");
    $("#game").classList.remove("show");
    $("#home").classList.add("show");
    renderHome();
  }

  function nextWall() {
    if (!game || !game.running || game.finished) return;
    level = Math.floor(game.walls / 5);
    game.current = GENERATORS[game.stage.id]();
    game.input = "";
    game.input2 = "";
    game.slot = 0;
    game.locked = false;
    const wall = $("#wall");
    wall.classList.remove("breaking", "shake", "hit");
    wall.querySelectorAll(".shard").forEach(shard => shard.remove());
    const question = game.current;

    if (question.prime != null) {
      game.primeRemainder = question.prime;
      renderPrimeWall();
      renderPrimePad();
      $("#answer-row").innerHTML = '<span class="answer-hint">わり切れる素数をタップして、1まで分解しよう！</span>';
      return;
    }

    $("#wall-question").innerHTML = question.html;
    if (question.qr) {
      renderNumberPad(false, true);
      renderSlots(true, "商", "あまり");
    } else if (question.mixed) {
      renderNumberPad(false, true);
      renderMixedSlots(question.denominator);
    } else if (question.decimalQr) {
      renderNumberPad(true, true);
      renderSlots(true, "商", "あまり");
    } else if (question.decimal != null) {
      renderNumberPad(true, false);
      renderSlots(false);
    } else if (question.fraction != null) {
      renderNumberPad(false, false);
      renderFractionSlot(question.denominator);
    } else if (question.choices) {
      renderChoicePad(question.choices);
      $("#answer-row").innerHTML = '<span class="answer-hint">正しいものをタップ！</span>';
    } else if (question.netAnswer != null) {
      renderNetPad();
      $("#answer-row").innerHTML = '<span class="answer-hint">反対の面の数字をタップ！</span>';
    } else {
      renderNumberPad(false, false);
      renderSlots(false);
    }
  }

  function renderPrimeWall() {
    $("#wall-question").innerHTML = problemHTML(game.primeRemainder, game.primeRemainder === game.current.prime ? "素数のカベくずし！" : "のこり…もうすこし！");
  }

  function renderSlots(dual, firstLabel = "", secondLabel = "", suffix = "") {
    const row = $("#answer-row");
    if (dual) {
      row.innerHTML = `
        <span class="slot-label">${firstLabel}</span>
        <button class="answer-slot active" id="slot0" type="button" data-slot="0" aria-label="${firstLabel}を入力"></button>
        <span class="slot-label">${secondLabel}</span>
        <button class="answer-slot" id="slot1" type="button" data-slot="1" aria-label="${secondLabel}を入力"></button>
        ${suffix ? `<span class="slot-suffix">${suffix}</span>` : ""}`;
    } else {
      row.innerHTML = `<div class="answer-slot active" id="slot0" style="min-width:110px" aria-label="答え"></div>${suffix ? `<span class="slot-suffix">${suffix}</span>` : ""}`;
    }
    $$("[data-slot]").forEach(slot => slot.addEventListener("click", () => focusSlot(Number(slot.dataset.slot))));
    drawSlots();
  }

  function renderFractionSlot(denominator) {
    const row = $("#answer-row");
    row.innerHTML = `
      <div class="fraction-answer" aria-label="分数の答え">
        <div class="fraction-answer-top"><div class="answer-slot active" id="slot0" aria-label="分子"></div></div>
        <div class="fraction-answer-line"></div>
        <div class="fraction-answer-bottom">${denominator}</div>
      </div>`;
    drawSlots();
  }

  function renderMixedSlots(denominator) {
    const row = $("#answer-row");
    row.innerHTML = `
      <span class="slot-label">せいすう</span>
      <button class="answer-slot active" id="slot0" type="button" data-slot="0" aria-label="整数を入力"></button>
      <span class="slot-label">ぶんすう</span>
      <div class="fraction-answer compact" aria-label="分数部分">
        <div class="fraction-answer-top"><button class="answer-slot" id="slot1" type="button" data-slot="1" aria-label="分子を入力"></button></div>
        <div class="fraction-answer-line"></div>
        <div class="fraction-answer-bottom">${denominator}</div>
      </div>`;
    $$('[data-slot]').forEach(slot => slot.addEventListener('click', () => focusSlot(Number(slot.dataset.slot))));
    drawSlots();
  }

  function focusSlot(slot) {
    if (!game || game.locked) return;
    game.slot = slot;
    drawSlots();
    soundEffect("tap");
  }

  function drawSlots() {
    if (!game) return;
    const slot0 = $("#slot0");
    const slot1 = $("#slot1");
    if (slot0) {
      slot0.textContent = game.input;
      slot0.classList.toggle("empty", !game.input);
      slot0.classList.toggle("active", game.slot === 0);
    }
    if (slot1) {
      slot1.textContent = game.input2;
      slot1.classList.toggle("empty", !game.input2);
      slot1.classList.toggle("active", game.slot === 1);
    }
  }

  function keyButton(label, action, className = "") {
    return `<button class="key ${className}" type="button" data-action="${action}">${label}</button>`;
  }

  function renderNumberPad(decimal, dual) {
    const pad = $("#pad");
    let html = '<div class="number-pad">';
    [7, 8, 9].forEach(number => { html += keyButton(number, `digit:${number}`); });
    html += keyButton("⌫", "backspace", "utility");
    html += keyButton("🥊", "submit", "punch");
    [4, 5, 6, 1, 2, 3].forEach(number => { html += keyButton(number, `digit:${number}`); });
    html += keyButton(0, "digit:0");
    if (decimal) html += keyButton(".", "dot");
    else html += keyButton("", "none", "hidden");
    if (dual) html += keyButton("⇄", "switch", "utility");
    else html += keyButton("", "none", "hidden");
    html += "</div>";
    pad.innerHTML = html;
    pad.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => handlePadAction(button.dataset.action));
    });
  }

  function renderPrimePad() {
    const primes = level >= 3 ? [2, 3, 5, 7, 11, 13] : [2, 3, 5, 7];
    $("#pad").innerHTML = `<div class="prime-pad">${primes.map(prime => `<button class="key" type="button" data-prime="${prime}">${prime}</button>`).join("")}</div>`;
    $$("[data-prime]").forEach(button => button.addEventListener("click", () => hitPrime(Number(button.dataset.prime))));
  }

  function renderChoicePad(choices) {
    $("#pad").innerHTML = `<div class="choice-pad${choices.length === 2 ? " two" : ""}">${choices.map((choice, index) => `
      <button class="choice-card" type="button" data-choice="${index}">
        <span class="choice-key">${choice.key}</span>${choice.label}
      </button>`).join("")}</div>`;
    $$("[data-choice]").forEach(button => button.addEventListener("click", () => pickChoice(Number(button.dataset.choice))));
  }

  function renderNetPad() {
    $("#pad").innerHTML = `<div class="prime-pad">${[1, 2, 3, 4, 5, 6].map(number => `<button class="key" type="button" data-net="${number}">${number}</button>`).join("")}</div>`;
    $$("[data-net]").forEach(button => button.addEventListener("click", () => submitNet(Number(button.dataset.net))));
  }

  function handlePadAction(action) {
    if (!game || !game.running || game.paused || game.locked) return;
    if (action.startsWith("digit:")) typeDigit(Number(action.split(":")[1]));
    if (action === "dot") typeDot();
    if (action === "backspace") backspace();
    if (action === "switch") focusSlot(1 - game.slot);
    if (action === "submit") submitAnswer();
  }

  function typeDigit(digit) {
    if (!game || game.locked) return;
    soundEffect("tap");
    if (game.slot === 0) {
      if (game.input.length < 5) game.input += String(digit);
    } else {
      const limit = game.current.decimalQr ? 5 : 3;
      if (game.input2.length < limit) game.input2 += String(digit);
    }
    drawSlots();
  }

  function typeDot() {
    if (!game || game.locked) return;
    const current = game.slot === 0 ? game.input : game.input2;
    if (current.includes(".")) return;
    soundEffect("tap");
    const updated = `${current || "0"}.`;
    if (game.slot === 0) game.input = updated;
    else game.input2 = updated;
    drawSlots();
  }

  function backspace() {
    if (!game || game.locked) return;
    soundEffect("tap");
    if (game.slot === 0) game.input = game.input.slice(0, -1);
    else game.input2 = game.input2.slice(0, -1);
    drawSlots();
  }

  function submitAnswer() {
    if (!game || !game.running || game.paused || game.locked || !game.current) return;
    const question = game.current;
    if (question.qr) {
      if (!game.input) { focusSlot(0); return; }
      const quotient = Number.parseInt(game.input, 10);
      const remainder = game.input2 === "" ? 0 : Number.parseInt(game.input2, 10);
      if (quotient === question.qr[0] && remainder === question.qr[1]) correctAnswer(); else wrongAnswer();
      return;
    }
    if (question.mixed) {
      if (!game.input || !game.input2) { focusSlot(!game.input ? 0 : 1); return; }
      if (Number.parseInt(game.input, 10) === question.mixed[0] && Number.parseInt(game.input2, 10) === question.mixed[1]) correctAnswer(); else wrongAnswer();
      return;
    }
    if (question.decimalQr) {
      if (!game.input || !game.input2) { focusSlot(!game.input ? 0 : 1); return; }
      const correct = Number.parseInt(game.input, 10) === question.decimalQr[0]
        && Math.abs(Number.parseFloat(game.input2) - question.decimalQr[1]) < 1e-9;
      if (correct) correctAnswer(); else wrongAnswer();
      return;
    }
    if (!game.input) return;
    const entered = Number(game.input);
    if (question.decimal != null) {
      if (Math.abs(entered - question.decimal) < 1e-9) correctAnswer(); else wrongAnswer();
    } else if (question.fraction != null) {
      if (entered === question.fraction) correctAnswer(); else wrongAnswer();
    } else if (entered === question.answer) correctAnswer();
    else wrongAnswer();
  }

  function pickChoice(index) {
    if (!game || !game.running || game.paused || game.locked) return;
    if (game.current.choices[index].correct) correctAnswer(); else wrongAnswer();
  }

  function submitNet(number) {
    if (!game || !game.running || game.paused || game.locked) return;
    if (number === game.current.netAnswer) correctAnswer(); else wrongAnswer(true);
  }

  function hitPrime(prime) {
    if (!game || !game.running || game.paused || game.locked) return;
    if (game.primeRemainder % prime === 0) {
      game.primeRemainder /= prime;
      soundEffect("hit");
      addScore(2, false);
      const wall = $("#wall");
      wall.classList.remove("hit");
      void wall.offsetWidth;
      wall.classList.add("hit");
      if (game.primeRemainder === 1) correctAnswer();
      else renderPrimeWall();
    } else {
      wrongAnswer(true);
    }
  }

  function comboMultiplier(combo) {
    if (combo >= 8) return 3;
    if (combo >= 4) return 2;
    return 1;
  }

  function addScore(points, pop = true) {
    game.score += points;
    $("#score-display").innerHTML = `${game.score}<small>pt</small>`;
    if (pop) popText(`＋${points}`, false);
  }

  function updateCombo() {
    const display = $("#combo-display");
    display.classList.toggle("on", Boolean(game && game.combo >= 2));
    if (!game) return;
    $("#combo-mult").textContent = String(comboMultiplier(game.combo));
    $("#combo-count").textContent = String(game.combo);
  }

  function popText(text, bad) {
    const pop = document.createElement("div");
    pop.className = `pop${bad ? " bad" : ""}`;
    pop.textContent = text;
    pop.style.left = `${35 + Math.random() * 30}%`;
    pop.style.top = `${25 + Math.random() * 20}%`;
    $("#pop-layer").appendChild(pop);
    setTimeout(() => pop.remove(), 750);
  }

  function correctAnswer() {
    if (!game || game.locked || game.finished) return;
    game.locked = true;
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    const multiplier = comboMultiplier(game.combo);
    addScore(10 * multiplier);
    const gainedXP = 5 * multiplier;
    game.xpEarned += gainedXP;
    totalXP += gainedXP;
    totalWalls += 1;
    persist();
    updateCombo();
    soundEffect("break");
    breakWall();
    game.walls += 1;
    if (game.mode === "casual" && game.walls >= 20) {
      setTimeout(finishGame, 450);
      return;
    }
    const token = game.token;
    setTimeout(() => {
      if (game && game.running && game.token === token && !game.finished) nextWall();
    }, 430);
  }

  function wrongAnswer(keepInput = false) {
    if (!game || game.finished || game.locked) return;
    game.combo = 0;
    updateCombo();
    soundEffect("miss");
    const wall = $("#wall");
    wall.classList.remove("shake");
    void wall.offsetWidth;
    wall.classList.add("shake");
    if (game.mode === "challenge") {
      game.timeLeft -= 3000;
      popText("−3秒", true);
    } else {
      game.elapsed += 3000;
      popText("＋3秒", true);
    }
    if (!keepInput && !game.current.choices) {
      game.input = "";
      game.input2 = "";
      game.slot = 0;
      drawSlots();
    }
  }

  function breakWall() {
    const wall = $("#wall");
    const rectangle = wall.getBoundingClientRect();
    for (let index = 0; index < 9; index += 1) {
      const shard = document.createElement("div");
      shard.className = "shard";
      const width = rectangle.width / 3;
      const height = rectangle.height / 3;
      shard.style.width = `${width * .82}px`;
      shard.style.height = `${height * .82}px`;
      shard.style.left = `${(index % 3) * width}px`;
      shard.style.top = `${Math.floor(index / 3) * height}px`;
      shard.style.setProperty("--dx", `${Math.random() * 260 - 130}px`);
      shard.style.setProperty("--dy", `${Math.random() * 160 + 40}px`);
      shard.style.setProperty("--rot", `${Math.random() * 180 - 90}deg`);
      wall.appendChild(shard);
    }
    wall.classList.add("breaking");
  }

  function finishGame() {
    if (!game || game.finished) return;
    game.finished = true;
    game.running = false;
    game.locked = true;
    stopMusic();
    soundEffect("finish");
    const key = `${game.mode}_${game.stage.id}`;
    let newRecord = false;
    let value;
    if (game.mode === "challenge") {
      value = game.score;
      if (best[key] == null || value > best[key]) {
        best[key] = value;
        newRecord = true;
      }
      $("#result-main").innerHTML = `${value}<small>pt</small>`;
      $("#result-sub").textContent = `こわしたカベ ${game.walls}枚 ／ 最大コンボ ${game.maxCombo}`;
      $("#result-best").innerHTML = `ベストスコア：${best[key]}pt${newRecord ? '<span class="new-record">NEW RECORD!</span>' : ""}`;
      $("#result-title").textContent = "TIME UP!";
    } else {
      value = Math.round(game.elapsed);
      if (best[key] == null || value < best[key]) {
        best[key] = value;
        newRecord = true;
      }
      $("#result-main").textContent = formatTime(value);
      $("#result-sub").textContent = `カベ20枚クリア！ スコア ${game.score}pt ／ 最大コンボ ${game.maxCombo}`;
      $("#result-best").innerHTML = `ベストタイム：${formatTime(best[key])}${newRecord ? '<span class="new-record">NEW RECORD!</span>' : ""}`;
      $("#result-title").textContent = "CLEAR!";
    }
    history.unshift({
      date: new Date().toISOString(),
      stageId: game.stage.id,
      mode: game.mode,
      value,
      walls: game.walls,
      xp: game.xpEarned,
      newRecord
    });
    if (history.length > 30) history.length = 30;
    $("#result-xp").textContent = `今回 ＋${game.xpEarned} XP ／ 累計 ${totalXP} XP`;
    persist();
    $("#result-overlay").classList.add("show");
  }

  function renderRecords() {
    $("#records-xp").textContent = String(totalXP);
    $("#records-plays").textContent = `${totalPlays}回`;
    $("#records-walls").textContent = `${totalWalls}枚`;
    const list = $("#records-list");
    const rows = STAGES.map(stage => {
      const challenge = best[`challenge_${stage.id}`];
      const casual = best[`casual_${stage.id}`];
      if (challenge == null && casual == null) return "";
      return `<div class="record-row"><span><b>${stage.number}</b>${stage.name}</span><span>${challenge != null ? `★ ${challenge}pt` : "—"}<br>${casual != null ? `⏱ ${formatTime(casual)}` : "—"}</span></div>`;
    }).join("");
    list.innerHTML = rows || '<p class="records-empty">まだ記録がありません。最初のカベをこわそう！</p>';
  }

  function openRecords() {
    renderRecords();
    $("#records-overlay").classList.add("show");
    soundEffect("tap");
  }

  /* ---------------- Explanations ---------------- */
  const helpStep = (title, html) => ({ title, html });

  function dotGroups(total, groupSize) {
    const groups = Math.floor(total / groupSize);
    const remainder = total % groupSize;
    let html = '<div class="help-groups">';
    for (let index = 0; index < groups; index += 1) {
      html += `<div class="help-group">${'<span class="help-dot"></span>'.repeat(groupSize)}</div>`;
    }
    if (remainder) html += `<div class="help-group remainder">${'<span class="help-dot"></span>'.repeat(remainder)}</div>`;
    return `${html}</div>`;
  }

  function fractionBar(denominator, filled, caption = "") {
    let html = '<div class="fraction-bars"><div class="fraction-bar">';
    for (let index = 0; index < denominator; index += 1) {
      html += `<span class="fraction-segment${index < filled ? " filled" : ""}"></span>`;
    }
    html += `</div>${caption ? `<div class="bar-caption">${caption}</div>` : ""}</div>`;
    return html;
  }

  function fractionWholes(numerator, denominator) {
    const whole = Math.floor(numerator / denominator);
    const remainder = numerator % denominator;
    let html = "";
    for (let index = 0; index < whole; index += 1) html += fractionBar(denominator, denominator, index === 0 ? `${denominator}/${denominator}＝1` : "");
    if (remainder) html += fractionBar(denominator, remainder, `のこり ${remainder}/${denominator}`);
    return html;
  }

  function splitBoxes(items) {
    return `<div class="split-boxes">${items.map(item => `<div class="split-box">${item.value}${item.caption ? `<small>${item.caption}</small>` : ""}</div>`).join("")}</div>`;
  }

  function ladderHTML(a, b) {
    let left = a;
    let right = b;
    const rows = [[left, right, ""]];
    const primes = [2, 3, 5, 7, 11, 13];
    let prime = primes.find(value => left % value === 0 && right % value === 0);
    while (prime) {
      left /= prime;
      right /= prime;
      rows[rows.length - 1][2] = prime;
      rows.push([left, right, ""]);
      prime = primes.find(value => left % value === 0 && right % value === 0);
    }
    const html = `<div class="ladder">${rows.map(row => `<div class="ladder-row"><span class="ladder-prime">${row[2] ? `${row[2]}）` : ""}</span><span class="ladder-values"><b>${row[0]}</b><b>${row[1]}</b></span></div>`).join("")}</div>`;
    return { html, shared: rows.slice(0, -1).map(row => row[2]), remaining: [left, right] };
  }

  function divisionExplanation(raw) {
    const { dividend, divisor, quotient, remainder } = raw;
    return [
      helpStep("わり算のいみ", `<div class="help-big">${dividend} ÷ ${divisor}</div><p>${dividend}こを、<b>${divisor}こずつ</b>のグループに分けると、何グループできるかな？</p>`),
      helpStep("分けてみよう", `${dotGroups(dividend, divisor)}<p>${divisor}こ入りが <b class="highlight">${quotient}グループ</b>${remainder ? `、はんぱが <b style="color:var(--red)">${remainder}こ</b>` : "。ぴったり分けられた！"}</p>`),
      helpStep("こたえとたしかめ", `<div class="help-big">${dividend} ÷ ${divisor} = <span class="highlight">${quotient}</span>${remainder ? ` あまり <span class="highlight">${remainder}</span>` : ""}</div><p>${divisor} × ${quotient}${remainder ? ` ＋ ${remainder}` : ""} ＝ ${dividend} ✓</p><div class="help-note">九九の「${divisor}のだん」で、${dividend}をこえない一番大きいところをさがそう。</div>`)
    ];
  }

  function buildHelp(question, id) {
    const raw = question.raw;
    if (id === "hw1" || id === "hw2") return divisionExplanation(raw);
    if (id === "rev") {
      return [
        helpStep("もとの数をさがす", `<div class="help-big">? ÷ ${raw.divisor} = ${raw.quotient} あまり ${raw.remainder}</div><p>${raw.divisor}こ入りのグループが${raw.quotient}こ、さらに${raw.remainder}こ余ったという意味。</p>`),
        helpStep("かけて、あまりをたす", `${dotGroups(raw.dividend, raw.divisor)}<div class="help-big">${raw.divisor} × ${raw.quotient} ＋ ${raw.remainder} = <span class="highlight">${raw.dividend}</span></div><div class="help-note">わり算のぎゃくは「かけて、あまりをたす」。</div>`)
      ];
    }
    if (id === "pf") {
      const factors = raw.factors;
      let value = raw.value;
      const rows = [];
      factors.forEach(factor => { rows.push([value, factor]); value /= factor; });
      rows.push([1, ""]);
      return [
        helpStep("素数だけに分ける", `<div class="help-big">${raw.value}</div><p><b>素数</b>は、1とその数自身でしかわり切れない数。2、3、5、7…を小さい順に試そう。</p>`),
        helpStep("1になるまでわる", `<div class="ladder">${rows.map(row => `<div class="ladder-row"><span class="ladder-prime">${row[1] ? `${row[1]}）` : ""}</span><span class="ladder-values"><b>${row[0]}</b></span></div>`).join("")}</div><div class="help-big">${raw.value} = <span class="highlight">${factors.join(" × ")}</span></div><div class="help-note">ゲームでは、わり切れる素数を順にパンチ！</div>`)
      ];
    }
    if (id === "gcd" || id === "lcm") {
      const ladder = ladderHTML(raw.a, raw.b);
      const commonProduct = ladder.shared.reduce((product, value) => product * value, 1);
      if (id === "gcd") {
        return [
          helpStep("2つともわり切れる数", `<div class="help-big">${raw.a} と ${raw.b}</div><p>両方を同時にわり切れる素数で、われなくなるまでわる。</p>${ladder.html}`),
          helpStep("左をかける", `<div class="help-big">${ladder.shared.length ? `${ladder.shared.join(" × ")} = ` : ""}<span class="highlight">${commonProduct}</span></div><p>左に並んだ数の積が最大公約数。</p>`)
        ];
      }
      return [
        helpStep("共通の倍数", `<div class="help-big">${raw.a} と ${raw.b}</div><p>どちらの段にも出てくる一番小さい数を探す。はしご算なら速いよ。</p>${ladder.html}`),
        helpStep("L字にぜんぶかける", `<div class="help-big">${ladder.shared.length ? `${ladder.shared.join(" × ")} × ` : ""}${ladder.remaining[0]} × ${ladder.remaining[1]} = <span class="highlight">${raw.answer}</span></div><p>左の数と、下に残った2つをぜんぶかける。</p>`)
      ];
    }
    if (id === "iadd") {
      const aTens = Math.floor(raw.a / 10) * 10;
      const bTens = Math.floor(raw.b / 10) * 10;
      const ones = raw.a % 10 + raw.b % 10;
      return [
        helpStep("十と一に分ける", `<div class="help-big">${raw.a} ＋ ${raw.b}</div>${splitBoxes([{ value: aTens, caption: `${raw.a}の十` }, { value: raw.a % 10, caption: `${raw.a}の一` }, { value: bTens, caption: `${raw.b}の十` }, { value: raw.b % 10, caption: `${raw.b}の一` }])}`),
        helpStep("大きい位からたす", `<div class="help-big">${aTens}＋${bTens}＝${aTens + bTens}</div><div class="help-big">${raw.a % 10}＋${raw.b % 10}＝${ones}</div><div class="help-big">${aTens + bTens}＋${ones}＝<span class="highlight">${raw.a + raw.b}</span></div>`)
      ];
    }
    if (id === "i21") {
      const tens = Math.floor(raw.a / 10) * 10;
      const ones = raw.a % 10;
      return [
        helpStep("2けたを分ける", `<div class="help-big">${raw.a} × ${raw.b}</div><p>${raw.a}を${tens}と${ones}に分けて、それぞれに×${raw.b}。</p>${splitBoxes([{ value: `${tens}×${raw.b}`, caption: `＝${tens * raw.b}` }, { value: `${ones}×${raw.b}`, caption: `＝${ones * raw.b}` }])}`),
        helpStep("最後にたす", `<div class="help-big">${tens * raw.b} ＋ ${ones * raw.b} ＝ <span class="highlight">${raw.a * raw.b}</span></div><div class="help-note">分けて、かけて、たす！</div>`)
      ];
    }
    if (id === "i22") {
      const aOnes = raw.a % 10;
      const bOnes = raw.b % 10;
      if (raw.b < 20) {
        return [
          helpStep("十何×十何のワザ", `<div class="help-big">${raw.a} × ${raw.b}</div><p>${raw.a}に、もう片方の一の位${bOnes}をたす。<br>${raw.a}＋${bOnes}＝<b>${raw.a + bOnes}</b></p>`),
          helpStep("×10と一の位どうし", `${splitBoxes([{ value: `${raw.a + bOnes}×10`, caption: `＝${(raw.a + bOnes) * 10}` }, { value: `${aOnes}×${bOnes}`, caption: `＝${aOnes * bOnes}` }])}<div class="help-big">${(raw.a + bOnes) * 10}＋${aOnes * bOnes}＝<span class="highlight">${raw.a * raw.b}</span></div>`)
        ];
      }
      const bTens = Math.floor(raw.b / 10) * 10;
      return [
        helpStep("大きい数を分ける", `<div class="help-big">${raw.a} × ${raw.b}</div><p>${raw.b}を${bTens}と${bOnes}に分ける。</p>${splitBoxes([{ value: `${raw.a}×${bTens}`, caption: `＝${raw.a * bTens}` }, { value: `${raw.a}×${bOnes}`, caption: `＝${raw.a * bOnes}` }])}`),
        helpStep("最後にたす", `<div class="help-big">${raw.a * bTens}＋${raw.a * bOnes}＝<span class="highlight">${raw.a * raw.b}</span></div>`)
      ];
    }
    if (id === "fr1") {
      return [
        helpStep("分母はピースの大きさ", `${fractionBar(raw.denominator, 1, `1こ分のピース（分母${raw.denominator}）`)}<p>分母は「何こに分けたか」。同じ分母ならピースの大きさは同じ。</p>`),
        helpStep("分子だけ計算", `${fractionWholes(raw.a, raw.denominator)}${fractionWholes(raw.b, raw.denominator)}<div class="help-big">${raw.a} ${raw.addition ? "＋" : "−"} ${raw.b} ＝ <span class="highlight">${raw.answer}</span></div><p>分母はそのまま。こたえは ${fractionHTML(`<b>${raw.answer}</b>`, raw.denominator)}。</p>`)
      ];
    }
    if (id === "fr2") {
      return [
        helpStep("分数の横棒は÷", `<div class="help-big">${fractionHTML(raw.numerator, raw.denominator)} ＝ ${raw.numerator} ÷ ${raw.denominator}</div><p>上の数を下の数でわる。</p>`),
        helpStep("かけ算にもどせる", `${dotGroups(raw.numerator, raw.denominator)}<div class="help-big">${raw.denominator} × ${raw.whole} ＝ ${raw.numerator}</div><div class="help-note">□を探すときは、かけ算にもどすと一発。</div>`)
      ];
    }
    if (id === "fr3") {
      return [
        helpStep("両方に同じ数", `<div class="help-big">${raw.ratio ? `${raw.a} : ${raw.b}` : `${fractionHTML(raw.a, raw.b)}`}</div><p>分数も比も、両方に同じ数をかけても大きさは変わらない。</p>`),
        helpStep("×いくつを見つける", `${splitBoxes([{ value: `${raw.a} → ×${raw.multiplier} → ${raw.a * raw.multiplier}` }, { value: `${raw.b} → ×${raw.multiplier} → ${raw.b * raw.multiplier}` }])}<p>わかっている組から×${raw.multiplier}を見つけ、もう片方にも同じ数をかける。</p>`)
      ];
    }
    if (id === "fr4") {
      if (raw.kind === "convert") {
        return [
          helpStep("1のかたまりを作る", `${fractionWholes(raw.numerator, raw.denominator)}<p>${raw.denominator}こ集まるごとに1になる。</p>`),
          helpStep("わり算で変身", `<div class="help-big">${raw.numerator} ÷ ${raw.denominator} ＝ ${raw.whole} あまり ${raw.remainder}</div><p>商が整数、あまりが分子。分母はそのまま。</p><div class="help-big"><span class="highlight">${raw.whole} と ${fractionHTML(raw.remainder, raw.denominator)}</span></div>`)
        ];
      }
      return [
        helpStep("まず分子を計算", `<div class="help-big">${raw.a} ${raw.addition ? "＋" : "−"} ${raw.b} ＝ ${raw.total}</div><p>まず${fractionHTML(raw.total, raw.denominator)}になる。</p>`),
        helpStep("帯分数にする", `${fractionWholes(raw.total, raw.denominator)}<div class="help-big">${raw.total} ÷ ${raw.denominator} ＝ ${raw.whole} あまり ${raw.remainder}</div><div class="help-big"><span class="highlight">${raw.whole} と ${fractionHTML(raw.remainder, raw.denominator)}</span></div>`)
      ];
    }
    if (id === "dc1") {
      return [
        helpStep("0.1が10こで1", `<div class="help-big">0.1 × 10 ＝ 1</div><p>${formatDecimal(raw.tenths / 10)}は、0.1のブロックが${raw.tenths}こ集まった数。</p>`),
        helpStep("10倍・10分の1", `<div class="help-big">${formatDecimal(raw.tenths / 10)} × 10 ＝ <span class="highlight">${raw.tenths}</span></div><p>小数から個数にするときは10倍。個数から小数にするときは10でわる。</p>`)
      ];
    }
    if (id === "dc2") {
      return [
        helpStep("0.1の個数にする", `${splitBoxes([{ value: formatDecimal(raw.a / 10), caption: `0.1が${raw.a}こ` }, { value: formatDecimal(raw.b / 10), caption: `0.1が${raw.b}こ` }])}`),
        helpStep("整数で計算してもどす", `<div class="help-big">${raw.a} ${raw.addition ? "＋" : "−"} ${raw.b} ＝ ${raw.resultTenths}</div><div class="help-big">0.1が${raw.resultTenths}こ → <span class="highlight">${formatDecimal(raw.resultTenths / 10)}</span></div><div class="help-note">筆算では、小数点をたてにそろえる。</div>`)
      ];
    }
    if (id === "dc3") {
      const product = raw.tenths * raw.integer;
      return [
        helpStep("10倍して整数に", `<div class="help-big">${formatDecimal(raw.tenths / 10)} × ${raw.integer}</div><p>${formatDecimal(raw.tenths / 10)}を10倍して${raw.tenths}にする。</p>`),
        helpStep("計算して÷10", `<div class="help-big">${raw.tenths} × ${raw.integer} ＝ ${product}</div><div class="help-big">${product} ÷ 10 ＝ <span class="highlight">${formatDecimal(product / 10)}</span></div>`)
      ];
    }
    if (id === "dc4") {
      return [
        helpStep("10倍して整数に", `<div class="help-big">${formatDecimal(raw.dividendTenths / 10)} ÷ ${raw.divisor}</div><p>わられる数を10倍して${raw.dividendTenths}にする。</p>`),
        helpStep("計算して÷10", `<div class="help-big">${raw.dividendTenths} ÷ ${raw.divisor} ＝ ${raw.answerTenths}</div><div class="help-big">${raw.answerTenths} ÷ 10 ＝ <span class="highlight">${formatDecimal(raw.answerTenths / 10)}</span></div>`)
      ];
    }
    if (id === "dc5") {
      return [
        helpStep("商は整数のところまで", `<div class="help-big">${formatDecimal(raw.dividendTenths / 10)} ÷ ${raw.divisor}</div><p>${raw.divisor} × ${raw.quotient} ＝ ${raw.divisor * raw.quotient}。これが取れる分。</p>`),
        helpStep("あまりは引き算", `<div class="help-big">${formatDecimal(raw.dividendTenths / 10)} − ${raw.divisor * raw.quotient} ＝ <span class="highlight">${formatDecimal(raw.remainderTenths / 10)}</span></div><div class="help-note">あまりの小数点は、もとの数と同じ位置。</div>`),
        helpStep("たしかめ", `<div class="help-big">${raw.divisor} × ${raw.quotient} ＋ ${formatDecimal(raw.remainderTenths / 10)} ＝ ${formatDecimal(raw.dividendTenths / 10)} ✓</div>`)
      ];
    }
    if (id === "rot") {
      const clockwise = raw.direction === "clockwise";
      return [
        helpStep("回る様子を見る", `<p>${clockwise ? "右（時計回り）" : "左（反時計回り）"}に90°。マークの<b>場所と向き</b>が両方変わる。</p><div class="help-rotate${clockwise ? "" : " ccw"}">${rotationGridHTML(raw.cells, raw.size, 22)}</div>`),
        helpStep("1つだけ追いかける", `<p>角にあるマークを1つ選び、「回したらどこへ行く？」と追うと答えがしぼれる。</p><div class="help-note">${clockwise ? "右90°：↑は→、→は↓。" : "左90°：↑は←、←は↓。"}</div>`)
      ];
    }
    if (id === "net") {
      return [
        helpStep("組み立てるイメージ", `<div style="display:flex;justify-content:center">${raw.netHtml}</div><p>横4面をぐるりと巻き、上と下の面を閉じる。</p>`),
        helpStep("反対のペア", `${splitBoxes(raw.pairs.map(pair => ({ value: `${pair[0]} ⇔ ${pair[1]}` })))}<p><b>${raw.target}</b>の反対は <b class="highlight" style="font-size:22px">${raw.answer}</b>。</p><div class="help-note">辺でとなり合う面は、反対にはならない。</div>`)
      ];
    }
    if (id === "cut") {
      const item = CUT_QUESTIONS[raw.index];
      return [
        helpStep("通る面の数を見る", `<div style="text-align:center">${cubeSVG(item.polygon)}</div><p><b>通る面の数＝切り口の辺の数</b>。まず三角形・四角形・五角形・六角形のどれかをしぼる。</p>`),
        helpStep("形を決める", `<p>${item.prompt}。</p><div class="help-big">こたえ：<span class="highlight">${item.answer}</span></div><div class="help-note">同じ辺の長さか、向かい合う辺が平行かにも注目しよう。</div>`)
      ];
    }
    return [helpStep("ヒント", "<p>問題の数字をゆっくり読み、分かっていることを1つずつ整理しよう。</p>")];
  }

  function openHelp() {
    if (!game || !game.running || !game.current || game.locked) return;
    soundEffect("tap");
    if (!game.paused) {
      game.paused = true;
      helpAutoPaused = true;
      stopMusic();
    } else helpAutoPaused = false;
    helpSteps = buildHelp(game.current, game.stage.id);
    helpIndex = 0;
    renderHelp();
    $("#help-overlay").classList.add("show");
  }

  function moveHelp(direction) {
    helpIndex = Math.max(0, Math.min(helpSteps.length - 1, helpIndex + direction));
    renderHelp();
    soundEffect("tap");
  }

  function renderHelp() {
    const step = helpSteps[helpIndex];
    $("#help-body").innerHTML = `<div class="help-animate"><div class="help-step-title">STEP ${helpIndex + 1}　${step.title}</div>${step.html}</div>`;
    $("#help-step-indicator").textContent = `${helpIndex + 1} / ${helpSteps.length}`;
    $("#help-prev").disabled = helpIndex === 0;
    $("#help-next").disabled = helpIndex === helpSteps.length - 1;
    $("#help-body").scrollTop = 0;
  }

  function closeHelp() {
    $("#help-overlay").classList.remove("show");
    soundEffect("tap");
    if (helpAutoPaused && game && game.running) {
      game.paused = false;
      game.lastTick = performance.now();
      startMusic();
    }
    helpAutoPaused = false;
  }

  /* ---------------- Audio ---------------- */
  let audioContext = null;
  let musicTimer = null;
  let beatIndex = 0;

  function initializeAudio() {
    if (!audioContext) {
      try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    }
    if (audioContext.state === "suspended") audioContext.resume();
  }

  function oscillator(frequency, time, duration, type = "square", volume = .13, slide = 0) {
    if (!audioContext || muted) return;
    const source = audioContext.createOscillator();
    const gain = audioContext.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, time);
    if (slide) source.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start(time);
    source.stop(time + duration + .02);
  }

  function noise(time, duration, volume = .16, highPass = 3000) {
    if (!audioContext || muted) return;
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highPass;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(time);
  }

  function soundEffect(name) {
    if (!audioContext || muted) return;
    const time = audioContext.currentTime;
    if (name === "tap") oscillator(700, time, .045, "square", .05);
    if (name === "hit") { oscillator(500, time, .08, "square", .13, 400); noise(time, .05, .08, 5000); }
    if (name === "break") { noise(time, .24, .25, 800); oscillator(300, time, .24, "sawtooth", .12, -220); oscillator(900, time + .05, .18, "square", .08, 500); }
    if (name === "miss") oscillator(160, time, .25, "sawtooth", .16, -60);
    if (name === "count") oscillator(660, time, .12, "square", .13);
    if (name === "go") { oscillator(660, time, .1, "square", .14); oscillator(880, time + .11, .2, "square", .14); }
    if (name === "finish") [523, 659, 784, 1046].forEach((frequency, index) => oscillator(frequency, time + index * .13, .16, "square", .13));
  }

  const bassLine = [110, 110, 0, 110, 131, 0, 110, 110, 98, 98, 0, 98, 147, 131, 110, 98];

  function startMusic() {
    if (!audioContext || muted || musicTimer) return;
    const step = 60 / 138 / 2;
    beatIndex = 0;
    let nextTime = audioContext.currentTime + .05;
    musicTimer = setInterval(() => {
      while (nextTime < audioContext.currentTime + .25) {
        const index = beatIndex % 16;
        if (index % 4 === 0) oscillator(150, nextTime, .12, "sine", .24, -110);
        if (index % 4 === 2) noise(nextTime, .07, .08, 4000);
        noise(nextTime, .025, .025, 8000);
        if (bassLine[index]) oscillator(bassLine[index], nextTime, step * .9, "square", .045);
        nextTime += step;
        beatIndex += 1;
      }
    }, 100);
  }

  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  }

  function toggleSound() {
    initializeAudio();
    muted = !muted;
    persist();
    updateSoundButtons();
    if (muted) stopMusic();
    else if (game && game.running && !game.paused) startMusic();
    showToast(muted ? "音をオフにしました" : "音をオンにしました");
  }

  function updateSoundButtons() {
    $("#sound-home").textContent = muted ? "🔇" : "🔊";
    $("#sound-home").setAttribute("aria-label", muted ? "音をオンにする" : "音をオフにする");
  }

  /* ---------------- Install & offline ---------------- */
  let installPrompt = null;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function openInstall() {
    const copy = $("#install-copy");
    const action = $("#install-action");
    if (standalone) {
      copy.innerHTML = "<p>このアプリは、すでにホーム画面から使える状態です。</p>";
      action.textContent = "閉じる";
      action.dataset.mode = "close";
    } else if (installPrompt) {
      copy.innerHTML = "<p>ホーム画面から、いつでもすぐに起動できます。管理設定の確認のため、起動時はインターネット接続が必要です。</p>";
      action.textContent = "アプリをインストール";
      action.dataset.mode = "prompt";
    } else if (isIos) {
      copy.innerHTML = "<ol><li>Safari下部の共有ボタン（□に↑）をタップ</li><li>「ホーム画面に追加」を選ぶ</li><li>右上の「追加」をタップ</li></ol><p>※Safariで開いているときに設定できます。</p>";
      action.textContent = "わかった";
      action.dataset.mode = "close";
    } else {
      copy.innerHTML = "<p>ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。</p>";
      action.textContent = "わかった";
      action.dataset.mode = "close";
    }
    $("#install-overlay").classList.add("show");
  }

  async function installAction() {
    const action = $("#install-action");
    if (action.dataset.mode !== "prompt" || !installPrompt) {
      $("#install-overlay").classList.remove("show");
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    $("#install-overlay").classList.remove("show");
    if (choice.outcome === "accepted") showToast("ホーム画面に追加しました");
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    $("#install-btn").hidden = true;
    showToast("インストールが完了しました");
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // Hosted managed distribution uses the service worker when available.
      });
    });
  }

  /* ---------------- Events ---------------- */
  $("#mode-challenge").addEventListener("click", () => setMode("challenge"));
  $("#mode-casual").addEventListener("click", () => setMode("casual"));
  $("#start-btn").addEventListener("click", startGame);
  $("#pause-btn").addEventListener("click", togglePause);
  $("#exit-btn").addEventListener("click", () => {
    if (game && game.running && !game.paused) togglePause();
  });
  $("#resume-btn").addEventListener("click", togglePause);
  $("#retry-btn").addEventListener("click", startGame);
  $$("[data-home]").forEach(button => button.addEventListener("click", goHome));
  $("#help-btn").addEventListener("click", openHelp);
  $("#help-prev").addEventListener("click", () => moveHelp(-1));
  $("#help-next").addEventListener("click", () => moveHelp(1));
  $("#help-close").addEventListener("click", closeHelp);
  $("#sound-home").addEventListener("click", toggleSound);
  $("#install-btn").addEventListener("click", openInstall);
  $("#records-btn").addEventListener("click", openRecords);
  $("#records-close").addEventListener("click", () => $("#records-overlay").classList.remove("show"));
  $("#install-close").addEventListener("click", () => $("#install-overlay").classList.remove("show"));
  $("#install-action").addEventListener("click", installAction);

  document.addEventListener("keydown", event => {
    if (!game || !game.running || game.paused || game.finished || game.locked) return;
    if (/^[0-9]$/.test(event.key)) { event.preventDefault(); typeDigit(Number(event.key)); }
    if (event.key === ".") { event.preventDefault(); typeDot(); }
    if (event.key === "Backspace") { event.preventDefault(); backspace(); }
    if (event.key === "Enter") { event.preventDefault(); submitAnswer(); }
    if (event.key === "Escape") { event.preventDefault(); togglePause(); }
    if (game.current && game.current.choices && /^[abc]$/i.test(event.key)) {
      const index = event.key.toUpperCase().charCodeAt(0) - 65;
      if (game.current.choices[index]) pickChoice(index);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game && game.running && !game.paused && !game.finished) togglePause();
  });

  updateSoundButtons();
  if (standalone) $("#install-btn").hidden = true;
  renderHome();
})();
