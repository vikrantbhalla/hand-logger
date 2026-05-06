// Hand Logger — single-file vanilla-JS app
// Build SHA injected at deploy time. Dev (un-replaced) value shows as "__BUILD" prefix.
const BUILD_SHA = "__BUILD_SHA__";
console.log("[hand-logger] build:", BUILD_SHA.startsWith("__BUILD") ? "dev" : BUILD_SHA);
// Sections:
//   1. Constants & strategy data
//   2. State (localStorage-backed)
//   3. Render — topbar, table SVG, hand list
//   4. Modals — card grid, seat assign, action picker, settings
//   5. Hand flow — pre-flop / streets / showdown
//   6. Strategy hint + equity
//   7. Markdown export
//   8. OCR (gated)
//   9. Bootstrap
"use strict";

// ============================================================
// 1. Constants
// ============================================================

const PLAYER_CODES = [
  { code: "T",  name: "Tushar"   },
  { code: "P",  name: "Peuesh"   },
  { code: "V",  name: "Vivek"    },
  { code: "Sa", name: "Saurabh"  },
  { code: "A",  name: "Anshul"   },
  { code: "N",  name: "Nitin"    },
  { code: "Vk", name: "Vikas"    },
  { code: "Ad", name: "Aditi"    },
  { code: "G",  name: "Gaurav"   },
  { code: "Ns", name: "Nishant"  },
  { code: "S",  name: "Sagar"    },
  { code: "Nk", name: "Nikita"   },
  { code: "Am", name: "Anmol"    },
  { code: "R",  name: "Rishi"    },
  { code: "Sh", name: "Shravan"  },
];

const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUITS = ["s","h","d","c"];
const SUIT_GLYPH = { s: "♠", h: "♥", d: "♦", c: "♣" };

// 9-handed clockwise positions starting from BTN
const POSITIONS_BY_COUNT = {
  2: ["BTN/SB", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["BTN", "SB", "BB", "UTG"],
  5: ["BTN", "SB", "BB", "UTG", "CO"],
  6: ["BTN", "SB", "BB", "UTG", "MP", "CO"],
  7: ["BTN", "SB", "BB", "UTG", "MP", "HJ", "CO"],
  8: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "HJ", "CO"],
  9: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO"],
};

// Heads-up equity vs random hand (approx, %). Used for the pre-flop equity hint.
// Source: standard PokerStove-like values rounded to 0.1.
const EQUITY_HU = {
  AA:85.2, KK:82.4, QQ:79.9, JJ:77.5, TT:75.1, 99:71.7, 88:69.1, 77:66.3, 66:63.3, 55:60.3, 44:57.1, 33:53.7, 22:50.3,
  AKs:67.0, AQs:66.2, AJs:65.4, ATs:64.7, A9s:63.0, A8s:62.0, A7s:60.9, A6s:59.6, A5s:59.8, A4s:58.9, A3s:58.1, A2s:57.2,
  AKo:65.4, AQo:64.5, AJo:63.6, ATo:62.9, A9o:60.7, A8o:59.7, A7o:58.5, A6o:57.0, A5o:57.4, A4o:56.4, A3o:55.5, A2o:54.6,
  KQs:63.4, KJs:62.6, KTs:61.8, K9s:60.0, K8s:58.4, K7s:57.4, K6s:56.4, K5s:55.4, K4s:54.6, K3s:53.7, K2s:52.9,
  KQo:61.5, KJo:60.5, KTo:59.7, K9o:57.7, K8o:55.8, K7o:54.5, K6o:53.4, K5o:52.3, K4o:51.4, K3o:50.4, K2o:49.5,
  QJs:60.3, QTs:59.5, Q9s:57.7, Q8s:56.0, Q7s:54.4, Q6s:53.5, Q5s:52.6, Q4s:51.7, Q3s:51.0, Q2s:50.2,
  QJo:58.2, QTo:57.4, Q9o:55.4, Q8o:53.4, Q7o:51.5, Q6o:50.4, Q5o:49.4, Q4o:48.4, Q3o:47.5, Q2o:46.7,
  JTs:57.5, J9s:55.7, J8s:54.0, J7s:52.0, J6s:50.0, J5s:49.2, J4s:48.2, J3s:47.5, J2s:46.7,
  JTo:55.4, J9o:53.5, J8o:51.6, J7o:49.4, J6o:47.2, J5o:46.4, J4o:45.3, J3o:44.6, J2o:43.7,
  T9s:53.4, T8s:51.7, T7s:49.7, T6s:47.6, T5s:45.8, T4s:45.0, T3s:44.3, T2s:43.5,
  T9o:51.0, T8o:49.3, T7o:47.1, T6o:44.8, T5o:42.9, T4o:41.9, T3o:41.2, T2o:40.4,
  "98s":50.4, "97s":48.4, "96s":46.4, "95s":44.5, "94s":42.7, "93s":42.0, "92s":41.2,
  "98o":47.7, "97o":45.5, "96o":43.3, "95o":41.2, "94o":39.4, "93o":38.6, "92o":37.7,
  "87s":47.5, "86s":45.4, "85s":43.4, "84s":41.5, "83s":39.7, "82s":38.9,
  "87o":44.7, "86o":42.3, "85o":40.1, "84o":38.0, "83o":36.1, "82o":35.2,
  "76s":44.7, "75s":42.7, "74s":40.6, "73s":38.6, "72s":36.6,
  "76o":41.7, "75o":39.5, "74o":37.3, "73o":35.1, "72o":33.0,
  "65s":42.2, "64s":40.1, "63s":38.0, "62s":36.0,
  "65o":39.0, "64o":36.7, "63o":34.6, "62o":32.4,
  "54s":40.0, "53s":37.9, "52s":35.9,
  "54o":36.5, "53o":34.2, "52o":32.1,
  "43s":36.7, "42s":34.7,
  "43o":32.8, "42o":30.6,
  "32s":33.5,
  "32o":29.4,
};

// Open ranges from "Poker Strategy — Home Game". Encoded as Sets of 169-hand labels.
const OPEN_RANGES = {
  UTG: new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s",
    "KQs","KJs","KTs","QJs","QTs","JTs","T9s",
    "AKo","AQo","AJo","KQo",
  ]),
  "UTG+1": new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s","87s",
    "AKo","AQo","AJo","KQo",
  ]),
  MP: new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s",
    "AKo","AQo","AJo","ATo","KQo","KJo",
  ]),
  HJ: new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","76s","65s",
    "AKo","AQo","AJo","ATo","KQo","KJo","QJo",
  ]),
  CO: new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s",
    "QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","86s","76s","75s","65s",
    "AKo","AQo","AJo","ATo","KQo","KJo","KTo","QJo","QTo","JTo",
  ]),
  BTN: new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","K3s","K2s",
    "QJs","QTs","Q9s","Q8s","Q7s","Q6s",
    "JTs","J9s","J8s",
    "T9s","T8s","T7s",
    "98s","97s","96s","87s","86s","85s","76s","75s","65s","64s","54s",
    "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o",
    "KQo","KJo","KTo","K9o","K8o",
    "QJo","QTo","Q9o",
    "JTo","J9o","T9o",
  ]),
  SB: new Set([
    "AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
    "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
    "KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s",
    "QJs","QTs","Q9s","Q8s",
    "JTs","J9s","J8s",
    "T9s","T8s",
    "98s","97s","87s","86s","76s","75s","65s",
    "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o",
    "KQo","KJo","KTo","K9o","K8o",
    "QJo","QTo","Q9o",
    "JTo","J9o",
  ]),
};

// Hands that 4-bet/shove vs a 3-bet (per all positions in the strategy doc)
const FOUR_BET_RANGE = new Set(["AA","KK","QQ","JJ","AKs","AKo"]);
// Hands that 3-bet vs an open (per strategy: any tier-1 we'd 4-bet, plus value 3-bets where the position permits)
const THREE_BET_VALUE = new Set(["AA","KK","QQ","JJ","AKs","AKo"]);
// Call-3-bet bands (set-mine + Band 1) — varies by position; simplified to common set
const CALL_3BET = new Set(["TT","99","88","AQs","AJs","KQs","AQo"]);
// AK locked rule from CLAUDE.md memory
const AK_HANDS = new Set(["AKs","AKo"]);

// ============================================================
// 2. State
// ============================================================

const STORAGE_KEY = "hand-logger:v1";

const DEFAULT_STATE = () => ({
  session: {
    date: ymd(new Date()),
    stakes: "25/50",
    format: "9-max Hold'em",
    seats: Array.from({ length: 9 }, (_, i) => ({ idx: i, player: null, sittingOut: false })),
    buttonSeatIdx: 0,
    mySeatIdx: null,
    tally: { vpip: 0, sd: 0 },
    stateTags: [],
    notes: "",
  },
  hands: [],
  settings: {
    ocrEnabled: false,
    anthropicKey: null,
    myCode: "V",
  },
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    // Merge OCR settings from optional config.local.js
    if (window.HAND_LOGGER_CONFIG && window.HAND_LOGGER_CONFIG.anthropicKey) {
      parsed.settings = parsed.settings || {};
      if (!parsed.settings.anthropicKey) parsed.settings.anthropicKey = window.HAND_LOGGER_CONFIG.anthropicKey;
    }
    return parsed;
  } catch (e) {
    console.warn("loadState failed, using defaults", e);
    return DEFAULT_STATE();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("saveState failed", e);
  }
  // Refresh derived UI on every save: VPIP/SD counts in topbar, plus the
  // inline next-hand panel (its position label tracks the dealer button).
  if (document.getElementById("session-date")) {
    renderTopbar();
    renderNextHandPanel();
  }
}

async function newSession() {
  const ok = await askYesNo("Start a new session?", "The current session will be copied to your clipboard first so you can paste it for scoring.", "New session", "Cancel");
  if (!ok) return;
  await exportToClipboard();
  state = DEFAULT_STATE();
  saveState();
  renderAll();
}

// ============================================================
// 3. Render
// ============================================================

function renderAll() {
  renderTopbar();
  renderTable();
  renderNextHandPanel();
  renderHandList();
}

// ---------- Inline next-hand panel ----------
// Lives between the table viz and the hand list. Tapping a card kicks off
// the chained flow with that card pre-selected as card 1, so the user never
// has to tap "+ New Hand" first to start logging — turning empty real estate
// into the primary action surface.
function renderNextHandPanel() {
  const root = document.getElementById("next-hand-section");
  if (!root) return;
  if (state.session.mySeatIdx == null) {
    root.innerHTML = `<div class="next-prompt setup"><strong>Set up the table.</strong> Tap your seat on the felt above, then choose <em>This is my seat</em>. Set the dealer button. Then come back here.</div>`;
    return;
  }
  const pos = myPosition() || "?";
  // Cards already in play this session can't be picked again — but we don't
  // grey out across hands (cards reset per hand). For now: no greying on this
  // inline grid; the full picker handles per-hand exclusion.
  const cells = SUITS.map(suit => {
    const row = RANKS.map(rank => `<button class="inline-card-cell suit-${suit}" data-rank="${rank}" data-suit="${suit}" aria-label="${rank}${suit}">${rank}<span class="sg">${SUIT_GLYPH[suit]}</span></button>`).join("");
    return `<div class="inline-card-row">${row}</div>`;
  }).join("");
  root.innerHTML = `
    <div class="next-prompt">
      <div class="next-head">Next hand · <strong>${pos}</strong> · pick first card</div>
      <div class="inline-card-grid">${cells}</div>
    </div>
  `;
  root.querySelectorAll(".inline-card-cell").forEach(b => {
    b.addEventListener("click", () => {
      newQuickStub({ rank: b.dataset.rank, suit: b.dataset.suit });
    });
  });
}

// Derived counters — VPIP and SD are computed from logged hands so the user
// never has to tally manually. Pure folds (no Hand entry, no Stub) are by
// definition not VPIP, and showdowns are recorded inside their hand.
const VPIP_RE = /\b(Limp|Call|Raise|3-bet|4-bet|Jam|Squeeze)\b/i;
function derivedVpipCount() {
  return state.hands.filter(h => VPIP_RE.test(h.preflopSummary || "")).length;
}
function derivedShowdownCount() {
  return state.hands.filter(h => h.showdown && h.showdown.length > 0).length;
}

function vpipPercent() {
  const total = state.hands.length;
  if (total === 0) return null;
  return Math.round((derivedVpipCount() / total) * 100);
}

function renderTopbar() {
  document.getElementById("session-date").textContent = formatDateForUI(state.session.date);
  document.getElementById("session-stakes").textContent = state.session.stakes;
  const vp = derivedVpipCount();
  const total = state.hands.length;
  const pct = vpipPercent();
  document.querySelector("#btn-tally-vpip .num").textContent = total === 0 ? "—" : `${vp} · ${pct}%`;
  document.querySelector("#btn-tally-sd .num").textContent = derivedShowdownCount();
}

// ---------- Table SVG ----------
function renderTable() {
  const svg = document.getElementById("table-svg");
  svg.innerHTML = "";
  const W = 600, H = 360;
  const cx = W/2, cy = H/2;
  const rx = W/2 - 50, ry = H/2 - 50;

  // Felt
  const felt = el("ellipse", { cx, cy, rx, ry, class: "felt" });
  svg.appendChild(felt);

  // 9 seats around the oval. Seat 0 = bottom (closest to user), going clockwise.
  for (let i = 0; i < 9; i++) {
    const angle = (Math.PI / 2) + (i * (2*Math.PI/9)); // start at bottom, clockwise
    const sx = cx + Math.cos(angle) * (rx + 18);
    const sy = cy + Math.sin(angle) * (ry + 18);
    const seat = state.session.seats[i];
    const g = el("g", {
      class: "seat" + (seat.player ? " seat-occupied" : "") + (i === state.session.mySeatIdx ? " seat-me" : ""),
      "data-seat": i,
      style: "cursor: pointer",
    });
    g.addEventListener("click", () => onSeatTap(i));

    const r = 26;
    const shape = el("circle", { cx: sx, cy: sy, r, class: "seat-shape" });
    g.appendChild(shape);

    const label = el("text", { x: sx, y: sy + 4, class: "seat-label" });
    label.textContent = seat.player || (i === state.session.mySeatIdx ? (state.settings.myCode || "ME") : "");
    g.appendChild(label);

    // Position label (BTN / SB / BB / etc)
    const pos = positionForSeat(i);
    if (pos) {
      const plx = sx;
      const ply = sy + r + 16;
      const posText = el("text", { x: plx, y: ply, class: "seat-pos" });
      posText.textContent = pos;
      g.appendChild(posText);
    }

    svg.appendChild(g);

    // Dealer button — placed toward table center so it doesn't overlap the player letter on the seat.
    if (i === state.session.buttonSeatIdx) {
      const bx = sx + Math.cos(angle + Math.PI) * 36;
      const by = sy + Math.sin(angle + Math.PI) * 36;
      const btn = el("g", { class: "btn-disc" });
      btn.appendChild(el("circle", { cx: bx, cy: by, r: 11, class: "button-disc" }));
      const t = el("text", { x: bx, y: by, class: "button-letter" });
      t.textContent = "D";
      btn.appendChild(t);
      svg.appendChild(btn);
    }
  }
}

function el(tag, attrs) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function positionForSeat(seatIdx) {
  // Build clockwise list of *occupied* seats starting from BTN.
  // The user's own seat counts as occupied even when no player code is set on it.
  const isOccupied = (idx) => !!state.session.seats[idx].player || idx === state.session.mySeatIdx;
  const occupied = [];
  let i = state.session.buttonSeatIdx;
  for (let n = 0; n < 9; n++) {
    const idx = (i + n) % 9;
    if (isOccupied(idx)) occupied.push(idx);
  }
  if (occupied.length === 0) return null;
  if (!isOccupied(seatIdx)) return null;
  const order = occupied.indexOf(seatIdx);
  if (order < 0) return null;
  const labels = POSITIONS_BY_COUNT[occupied.length] || POSITIONS_BY_COUNT[9];
  return labels[order];
}

function myPosition() {
  if (state.session.mySeatIdx == null) return null;
  // Auto-occupy my seat with "ME" so position math sees it
  return positionForSeat(state.session.mySeatIdx);
}

// ---------- Hand list ----------
function renderHandList() {
  const list = document.getElementById("hand-list");
  const empty = document.getElementById("hand-list-empty");
  list.innerHTML = "";
  empty.classList.add("hidden");
  // Empty state is now handled by the inline next-hand panel above the list.
  // Render most-recent first so the latest action is always visible above the
  // fold; the list shrinks below the inline grid in available real estate.
  for (const h of [...state.hands].reverse()) {
    const li = document.createElement("li");
    li.className = "hand-row";
    li.dataset.tier = handTier(h);
    li.innerHTML = `
      <div class="hand-head">
        <span class="hand-num">H${h.n} · ${h.position || "?"} · ${cardsLabel(h.myCards)}</span>
        <span class="hand-time">${h.timestamp || ""}</span>
      </div>
      <div class="hand-summary">${summariseHand(h)}</div>
    `;
    li.addEventListener("click", () => editHand(h.n));
    list.appendChild(li);
  }
}

function handTier(h) {
  if (h.flop || h.turn || h.river || h.showdown) return "full";
  if (h.position && h.myCards) return "stub";
  return "tally";
}

function cardsLabel(cards) {
  if (!cards || cards.length === 0) return "—";
  const filled = cards.filter(Boolean);
  if (filled.length === 0) return "—";
  return filled.map(c => c.rank + SUIT_GLYPH[c.suit]).join("");
}

function summariseHand(h) {
  const parts = [];
  if (h.preflopSummary) parts.push(h.preflopSummary);
  if (h.flop?.summary) parts.push("F: " + h.flop.summary);
  if (h.turn?.summary) parts.push("T: " + h.turn.summary);
  if (h.river?.summary) parts.push("R: " + h.river.summary);
  if (h.showdown?.length) parts.push("SD: " + h.showdown.map(s => `${seatCode(s.seatIdx)} ${cardsLabel(s.cards)}`).join(", "));
  if (h.notes) parts.push(`(${h.notes})`);
  return parts.length ? parts.join(" / ") : "(stub)";
}

function seatCode(idx) {
  const s = state.session.seats[idx];
  if (!s) return "?";
  if (idx === state.session.mySeatIdx) return state.settings.myCode || "V";
  return s.player || `S${idx+1}`;
}

// ============================================================
// 4. Modals
// ============================================================

function openModal(html, opts={}) {
  const root = document.getElementById("modal-root");
  root.hidden = false;
  root.innerHTML = `<div class="modal">${html}</div>`;
  if (opts.onOpen) opts.onOpen(root);
  // Click outside modal closes
  root.addEventListener("click", e => {
    if (e.target === root) closeModal();
  }, { once: true });
}
function closeModal() {
  const root = document.getElementById("modal-root");
  root.hidden = true;
  root.innerHTML = "";
}

// Friendly info / onboarding modal — replaces alert()
function showOnboarding(title, body, opts = {}) {
  const html = `
    <h2>${escapeHtml(title)}</h2>
    <p style="color: var(--ink-2); font-size: 14px; line-height: 1.5">${escapeHtml(body)}</p>
    <div class="actions">
      ${opts.primary ? `<button class="primary-btn" data-act="primary">${escapeHtml(opts.primary)}</button>` : `<button class="primary-btn" data-act="close">Got it</button>`}
    </div>
  `;
  openModal(html, {
    onOpen(root) {
      root.querySelector("button[data-act='primary']")?.addEventListener("click", () => { closeModal(); opts.onPrimary?.(); });
      root.querySelector("button[data-act='close']")?.addEventListener("click", closeModal);
    }
  });
}

// Numeric chip-row for amounts — replaces prompt() for bet sizing
function pickAmount(title, presets, defaultVal) {
  return new Promise(resolve => {
    const html = `
      <h2>${escapeHtml(title)}</h2>
      <div class="row">
        ${presets.map(v => `<button class="chip" data-val="${v}">₹${v}</button>`).join("")}
      </div>
      <div class="field">
        <label>Custom (₹)</label>
        <input id="amt-custom" type="number" inputmode="numeric" pattern="[0-9]*" placeholder="${defaultVal || ""}" />
      </div>
      <div class="actions">
        <button class="ghost-btn" data-act="cancel">Cancel</button>
        <button class="primary-btn" data-act="ok">OK</button>
      </div>
    `;
    openModal(html, {
      onOpen(root) {
        root.querySelectorAll("button[data-val]").forEach(b => {
          b.addEventListener("click", () => { closeModal(); resolve(b.dataset.val); });
        });
        root.querySelector("button[data-act='ok']").addEventListener("click", () => {
          const v = root.querySelector("#amt-custom").value.trim() || defaultVal || "";
          closeModal();
          resolve(v || null);
        });
        root.querySelector("button[data-act='cancel']").addEventListener("click", () => { closeModal(); resolve(null); });
        // Auto-focus the custom field for keyboards that show on focus
        setTimeout(() => root.querySelector("#amt-custom")?.focus(), 50);
      }
    });
  });
}

// Custom yes/no — replaces confirm()
function askYesNo(title, body, yesLabel = "Yes", noLabel = "No") {
  return new Promise(resolve => {
    const html = `
      <h2>${escapeHtml(title)}</h2>
      ${body ? `<p style="color: var(--ink-2)">${escapeHtml(body)}</p>` : ""}
      <div class="actions">
        <button class="ghost-btn" data-act="no">${escapeHtml(noLabel)}</button>
        <button class="primary-btn" data-act="yes">${escapeHtml(yesLabel)}</button>
      </div>
    `;
    openModal(html, {
      onOpen(root) {
        root.querySelector("button[data-act='yes']").addEventListener("click", () => { closeModal(); resolve(true); });
        root.querySelector("button[data-act='no']").addEventListener("click", () => { closeModal(); resolve(false); });
      }
    });
  });
}

// ---------- Seat assign modal ----------
function onSeatTap(seatIdx) {
  const seat = state.session.seats[seatIdx];
  const isMine = seatIdx === state.session.mySeatIdx;
  const isOccupied = !!seat.player || isMine;
  const html = `
    <h2>Seat ${seatIdx + 1}${isMine ? " (you)" : ""}${seat.player ? " — " + seat.player : ""}</h2>
    ${isOccupied ? `
      <div class="row">
        <button class="ghost-btn" data-act="set-button">Set as dealer (BTN)</button>
        ${!isMine ? `<button class="ghost-btn" data-act="set-mine">This is my seat</button>` : ""}
        <button class="ghost-btn" data-act="clear">Empty seat</button>
      </div>
    ` : ""}
    ${!isOccupied ? `
      <div class="field"><label>Assign player</label>
        <div class="row" id="player-chips">
          ${PLAYER_CODES.map(p => `<button class="chip" data-code="${p.code}">${p.code} <span class="muted">${p.name}</span></button>`).join("")}
          <button class="chip" data-act="new-player">+ New</button>
          <button class="chip" data-act="set-mine">${state.settings.myCode || "ME"} (my seat)</button>
        </div>
      </div>
    ` : ""}
    <div class="actions"><button class="ghost-btn" data-act="close">Close</button></div>
  `;
  openModal(html, {
    onOpen(root) {
      root.querySelectorAll("button[data-code]").forEach(b => {
        b.addEventListener("click", () => {
          state.session.seats[seatIdx].player = b.dataset.code;
          saveState(); renderTable(); closeModal();
        });
      });
      root.querySelectorAll("button[data-act]").forEach(b => {
        b.addEventListener("click", () => {
          const act = b.dataset.act;
          if (act === "set-button") state.session.buttonSeatIdx = seatIdx;
          else if (act === "set-mine") state.session.mySeatIdx = seatIdx;
          else if (act === "clear") {
            state.session.seats[seatIdx].player = null;
            if (state.session.mySeatIdx === seatIdx) state.session.mySeatIdx = null;
          } else if (act === "new-player") {
            const code = prompt("New player code (1-3 letters):");
            if (code) state.session.seats[seatIdx].player = code.trim();
          }
          saveState(); renderTable(); closeModal();
        });
      });
    }
  });
}

// ---------- Card grid picker ----------
// usedCards: array of {rank, suit} already taken in this hand context (greyed).
// onPick: callback({rank, suit}).
function openCardPicker(opts) {
  const used = new Set((opts.usedCards || []).map(c => c.rank + c.suit));
  const rows = RANKS.map(rank => {
    const cells = SUITS.map(suit => {
      const k = rank + suit;
      const taken = used.has(k);
      return `<button class="chip card-cell suit-${suit}" data-rank="${rank}" data-suit="${suit}" ${taken ? "data-disabled='true'" : ""}>${rank}${SUIT_GLYPH[suit]}</button>`;
    }).join("");
    return `<div class="card-row">${cells}</div>`;
  }).join("");
  const html = `
    <h2>${opts.title || "Pick card"}</h2>
    <div class="card-grid">${rows}</div>
    ${opts.allowCamera ? `<div class="actions"><button class="ghost-btn" data-act="ocr">📷 OCR (camera)</button><button class="ghost-btn" data-act="close">Cancel</button></div>` : `<div class="actions"><button class="ghost-btn" data-act="close">Cancel</button></div>`}
  `;
  openModal(html, {
    onOpen(root) {
      root.querySelectorAll("button[data-rank]").forEach(b => {
        if (b.dataset.disabled) return;
        b.addEventListener("click", () => {
          // Close FIRST — onPick may open the next modal in a chained flow,
          // and a trailing closeModal() would clobber its innerHTML.
          const card = { rank: b.dataset.rank, suit: b.dataset.suit };
          closeModal();
          opts.onPick(card);
        });
      });
      root.querySelector("button[data-act='close']")?.addEventListener("click", closeModal);
      root.querySelector("button[data-act='ocr']")?.addEventListener("click", () => {
        closeModal();
        triggerOCR(opts);
      });
    }
  });
}

// ============================================================
// 5. Hand flow
// ============================================================

// 1-tap pure-fold: records a fold against the user's current position with no
// hole cards, so the VPIP% denominator stays honest without forcing the user
// to pick cards for every dealt-and-dropped UTG hand.
function quickFold() {
  if (state.session.mySeatIdx == null) {
    showOnboarding("Set your seat first", "Tap your seat on the table, then choose This is my seat.");
    return;
  }
  pruneEmptyHands();
  if (state.hands.length > 0) advanceButton();
  const n = state.hands.length + 1;
  const hand = {
    n,
    timestamp: hhmm(new Date()),
    position: myPosition(),
    seatingSnapshot: snapshotSeating(),
    myCards: null,
    preflopSummary: "Fold",
    preflop: [],
    flop: null, turn: null, river: null, showdown: null, notes: "",
  };
  state.hands.push(hand);
  saveState();
  renderHandList();
  navigator.vibrate?.(15);
}

function newQuickStub(startingCard = null) {
  if (state.session.mySeatIdx == null) {
    showOnboarding("Set your seat first", "Tap your seat on the table, then choose This is my seat. The dealer button can be set the same way on the dealer's seat.");
    return;
  }
  pruneEmptyHands();
  if (state.hands.length > 0) advanceButton();
  const n = state.hands.length + 1;
  const hand = {
    n,
    timestamp: hhmm(new Date()),
    position: myPosition(),
    seatingSnapshot: snapshotSeating(),
    myCards: startingCard ? [startingCard, null] : null,
    preflopSummary: "",
    preflop: [],
    flop: null, turn: null, river: null, showdown: null, notes: "",
  };
  state.hands.push(hand);
  saveState();
  openQuickStubFlow(hand);
}

function openQuickStubFlow(h) {
  // Resumable: dispatches based on what's already filled on the hand.
  // pickCard1 → pickCard2 → showActionChips. Inline-grid taps preset card 1.
  const usedBoard = collectBoard(h);
  const pickCard1 = () => {
    openCardPicker({
      title: `H${h.n} ${h.position || "?"} — first card`,
      usedCards: usedBoard,
      allowCamera: false,
      onPick(c1) {
        h.myCards = [c1, null];
        saveState();
        pickCard2(c1);
      }
    });
  };
  const pickCard2 = (c1) => {
    openCardPicker({
      title: `H${h.n} ${h.position || "?"} ${c1.rank}${SUIT_GLYPH[c1.suit]} — second card`,
      usedCards: [...usedBoard, c1],
      allowCamera: false,
      onPick(c2) {
        h.myCards = [c1, c2];
        saveState();
        showActionChips();
      }
    });
  };
  const showActionChips = async () => {
    const lbl = handLabel(h.myCards[0], h.myCards[1]);
    const eq = EQUITY_HU[lbl];
    const hint = strategyHint(lbl, h.position);
    const html = `
      <h2>H${h.n} · ${h.position || "?"} · ${lbl} ${cardsLabel(h.myCards)}</h2>
      <p style="color: var(--ink-2); font-size: 14px; margin: 0 0 10px">
        Equity vs random HU: <strong>${eq != null ? eq.toFixed(1) + "%" : "?"}</strong>
        <br/><span style="color: var(--accent)">Strategy: ${hint}</span>
      </p>
      <div class="field">
        <label>Pre-flop action</label>
        <div class="action-row">
          <button class="chip" data-pre="fold">Fold</button>
          <button class="chip" data-pre="limp">Limp</button>
          <button class="chip" data-pre="call">Call</button>
          <button class="chip" data-pre="raise">Raise…</button>
          <button class="chip" data-pre="3bet">3-bet…</button>
          <button class="chip" data-pre="4bet">4-bet…</button>
          <button class="chip" data-pre="jam">Jam</button>
        </div>
      </div>
      <p class="muted" style="font-size: 12px; margin: 4px 0 0">After tapping an action, you can add streets if the hand went past pre-flop.</p>
      <div class="actions">
        <button class="ghost-btn" data-act="full">+ Add streets →</button>
        <button class="ghost-btn" data-act="cancel">Cancel</button>
      </div>
    `;
    openModal(html, {
      onOpen(root) {
        root.querySelectorAll(".chip[data-pre]").forEach(b => {
          b.addEventListener("click", async () => {
            const k = b.dataset.pre;
            let action = null;
            if (k === "fold") action = "Fold";
            else if (k === "limp") action = "Limp";
            else if (k === "call") action = "Call";
            else if (k === "jam") action = "Jam";
            else if (k === "raise") {
              const v = await pickAmount("Raise to ₹?", [250, 300, 350, 400, 500, 750, 1000], "250");
              if (!v) return;
              action = "Raise ₹" + v;
            } else if (k === "3bet") {
              const v = await pickAmount("3-bet to ₹?", [600, 750, 900, 1200, 1500, 2000], "750");
              if (!v) return;
              action = "3-bet ₹" + v;
            } else if (k === "4bet") {
              const v = await pickAmount("4-bet to ₹?", [1500, 1800, 2000, 2500, 3000], "2000");
              if (!v) return;
              action = "4-bet ₹" + v;
            }
            if (!action) return;
            h.preflopSummary = action;
            saveState();
            closeModal();
            renderHandList();
          });
        });
        root.querySelector("button[data-act='full']").addEventListener("click", () => {
          closeModal();
          editHand(h.n);
        });
        root.querySelector("button[data-act='cancel']").addEventListener("click", () => {
          // Cancel discards the hand we just appended
          state.hands = state.hands.filter(x => x.n !== h.n);
          state.hands.forEach((x, i) => x.n = i + 1);
          saveState();
          closeModal();
          renderHandList();
        });
      }
    });
  };
  // Resume at the right step
  if (h.myCards && h.myCards[0] && h.myCards[1]) showActionChips();
  else if (h.myCards && h.myCards[0]) pickCard2(h.myCards[0]);
  else pickCard1();
}

function pruneEmptyHands() {
  // Drop hands that were created (e.g. via + New Hand) but abandoned without any data entered.
  // "Empty" = no hole cards AND no pre-flop summary AND no streets/showdown.
  const before = state.hands.length;
  state.hands = state.hands.filter(h => {
    const hasCards = h.myCards && h.myCards.some(Boolean);
    const hasPre = (h.preflopSummary || "").trim().length > 0;
    const hasStreets = h.flop || h.turn || h.river || (h.showdown && h.showdown.length);
    const hasNotes = (h.notes || "").trim().length > 0;
    return hasCards || hasPre || hasStreets || hasNotes;
  });
  if (state.hands.length !== before) {
    state.hands.forEach((h, i) => h.n = i + 1);
    saveState();
  }
}

function newHand() {
  if (state.session.mySeatIdx == null) {
    showOnboarding("Set your seat first", "Tap your seat on the table, then choose This is my seat. The dealer button can be set the same way on the dealer's seat.");
    return;
  }
  // Drop any abandoned shells from a prior cancel before pushing a fresh one.
  pruneEmptyHands();
  // Auto-advance dealer button to next occupied seat (clockwise) — only if there are existing hands
  if (state.hands.length > 0) {
    advanceButton();
  }
  const n = state.hands.length + 1;
  const hand = {
    n,
    timestamp: hhmm(new Date()),
    position: myPosition(),
    seatingSnapshot: snapshotSeating(),
    myCards: null,
    preflopSummary: "",
    preflop: [],
    flop: null,
    turn: null,
    river: null,
    showdown: null,
    notes: "",
  };
  state.hands.push(hand);
  saveState();
  renderHandList();
  editHand(n);
}

function advanceButton() {
  // Move BTN to next occupied seat clockwise. If only "ME" is set without explicit player, treat my seat as occupied too.
  let i = state.session.buttonSeatIdx;
  for (let n = 1; n <= 9; n++) {
    const idx = (i + n) % 9;
    const occupied = state.session.seats[idx].player || idx === state.session.mySeatIdx;
    if (occupied) {
      state.session.buttonSeatIdx = idx;
      return;
    }
  }
}

function snapshotSeating() {
  return {
    seats: state.session.seats.map(s => ({ ...s })),
    buttonSeatIdx: state.session.buttonSeatIdx,
    mySeatIdx: state.session.mySeatIdx,
  };
}

function editHand(n) {
  const h = state.hands.find(x => x.n === n);
  if (!h) return;
  renderHandEditor(h);
}

function renderHandEditor(h) {
  const html = `
    <h2>Hand ${h.n} <span class="muted">${h.timestamp}</span></h2>
    <div class="field">
      <label>Position</label>
      <div class="field-inline"><strong>${h.position || "?"}</strong>
        <button class="ghost-btn" data-act="repos">Reposition</button>
      </div>
    </div>

    <div class="field">
      <label>My hole cards</label>
      <div class="field-inline" id="my-cards-row">
        ${renderHoleCardSlots(h)}
      </div>
      <div id="hint-row" class="muted" style="margin-top:6px; font-size: 13px"></div>
    </div>

    <div class="field">
      <label>Pre-flop action</label>
      <div class="action-row">
        <button class="chip" data-pre="fold">Fold</button>
        <button class="chip" data-pre="limp">Limp</button>
        <button class="chip" data-pre="call">Call</button>
        <button class="chip" data-pre="raise">Raise…</button>
        <button class="chip" data-pre="3bet">3-bet…</button>
        <button class="chip" data-pre="4bet">4-bet…</button>
        <button class="chip" data-pre="jam">Jam</button>
      </div>
      <input id="pre-detail" placeholder="e.g. R400, 3 limps before, BB 3-bet to 1200" />
    </div>

    <div class="field">
      <label>Streets (only fill if hand went past pre-flop)</label>
      <div class="row">
        <button class="ghost-btn" data-act="add-flop">${h.flop ? "Edit flop" : "+ Flop"}</button>
        <button class="ghost-btn" data-act="add-turn">${h.turn ? "Edit turn" : "+ Turn"}</button>
        <button class="ghost-btn" data-act="add-river">${h.river ? "Edit river" : "+ River"}</button>
        <button class="ghost-btn" data-act="add-sd">${h.showdown ? "Edit showdown" : "+ Showdown"}</button>
      </div>
      <div id="streets-summary" class="muted" style="font-size: 13px; margin-top: 4px">${[h.flop?.summary && "F: "+h.flop.summary, h.turn?.summary && "T: "+h.turn.summary, h.river?.summary && "R: "+h.river.summary].filter(Boolean).join(" / ")}</div>
    </div>

    <div class="field">
      <label>Notes</label>
      <textarea id="notes" rows="2" placeholder="State tags ([rebuy], [tilted]), reads, anomalies">${escapeHtml(h.notes || "")}</textarea>
    </div>

    <div class="actions">
      <button class="ghost-btn" data-act="delete">Delete hand</button>
      <button class="primary-btn" data-act="save">Save</button>
    </div>
  `;
  openModal(html, {
    onOpen(root) {
      // Hole-card slots
      root.querySelectorAll(".card-slot[data-slot]").forEach(slot => {
        slot.addEventListener("click", () => {
          const slotIdx = parseInt(slot.dataset.slot, 10);
          const used = (h.myCards || []).filter((c, i) => c && i !== slotIdx);
          // Also exclude already-set board cards
          const boardUsed = collectBoard(h);
          openCardPicker({
            title: `Hole card ${slotIdx+1}`,
            usedCards: [...used, ...boardUsed],
            allowCamera: true,
            onPick(card) {
              h.myCards = h.myCards || [null, null];
              h.myCards[slotIdx] = card;
              saveState();
              renderHandEditor(h);
            }
          });
        });
      });
      // Pre-flop chips — append my action to the summary. Detail field is folded in on Save.
      root.querySelectorAll(".chip[data-pre]").forEach(b => {
        b.addEventListener("click", async () => {
          const k = b.dataset.pre;
          let action = null;
          if (k === "fold") action = "Fold";
          else if (k === "limp") action = "Limp";
          else if (k === "call") action = "Call";
          else if (k === "jam") action = "Jam";
          else if (k === "raise") {
            const v = await pickAmount("Raise to ₹?", [250, 300, 350, 400, 500, 750, 1000], "250");
            if (!v) return;
            action = "Raise ₹" + v;
          } else if (k === "3bet") {
            const v = await pickAmount("3-bet to ₹?", [600, 750, 900, 1200, 1500, 2000], "750");
            if (!v) return;
            action = "3-bet ₹" + v;
          } else if (k === "4bet") {
            const v = await pickAmount("4-bet to ₹?", [1500, 1750, 2000, 2500, 3000, 4000], "2000");
            if (!v) return;
            action = "4-bet ₹" + v;
          }
          if (!action) return;
          h.preflopSummary = (h.preflopSummary ? h.preflopSummary + "; " : "") + action;
          saveState();
          renderHandEditor(h);
        });
      });
      // Reposition — chip-picker over standard 9-max position labels
      root.querySelector("button[data-act='repos']")?.addEventListener("click", () => {
        const positions = ["BTN", "CO", "HJ", "MP", "UTG+1", "UTG", "SB", "BB"];
        const html = `
          <h2>Position</h2>
          <div class="row">
            ${positions.map(p => `<button class="chip" data-pos="${p}" ${p === h.position ? "data-selected='true'" : ""}>${p}</button>`).join("")}
          </div>
          <div class="actions"><button class="ghost-btn" data-act="cancel">Cancel</button></div>
        `;
        openModal(html, {
          onOpen(root2) {
            root2.querySelectorAll("button[data-pos]").forEach(b => {
              b.addEventListener("click", () => {
                h.position = b.dataset.pos;
                saveState();
                closeModal();
                renderHandEditor(h);
              });
            });
            root2.querySelector("button[data-act='cancel']").addEventListener("click", () => {
              closeModal();
              renderHandEditor(h);
            });
          }
        });
      });
      // Streets
      root.querySelector("button[data-act='add-flop']")?.addEventListener("click", () => editStreet(h, "flop"));
      root.querySelector("button[data-act='add-turn']")?.addEventListener("click", () => editStreet(h, "turn"));
      root.querySelector("button[data-act='add-river']")?.addEventListener("click", () => editStreet(h, "river"));
      root.querySelector("button[data-act='add-sd']")?.addEventListener("click", () => editShowdown(h));
      // Save / delete / notes
      root.querySelector("button[data-act='save']")?.addEventListener("click", () => {
        h.notes = root.querySelector("#notes").value;
        const detail = root.querySelector("#pre-detail").value.trim();
        if (detail && !h.preflopSummary.includes(detail)) {
          h.preflopSummary = (detail + " · " + (h.preflopSummary || "")).trim().replace(/ · $/, "");
        }
        saveState();
        closeModal();
        renderHandList();
      });
      root.querySelector("button[data-act='delete']")?.addEventListener("click", async () => {
        const ok = await askYesNo("Delete this hand?", `Hand ${h.n} will be removed and remaining hands renumbered.`, "Delete", "Cancel");
        if (!ok) { renderHandEditor(h); return; }
        state.hands = state.hands.filter(x => x.n !== h.n);
        state.hands.forEach((x, i) => x.n = i + 1);
        saveState();
        closeModal();
        renderHandList();
      });
      // Render hint
      renderEquityHint(h);
    }
  });
}

function renderHoleCardSlots(h) {
  const slots = [0, 1].map(i => {
    const c = h.myCards && h.myCards[i];
    if (c) {
      return `<button class="card-slot suit-${c.suit}" data-slot="${i}">${c.rank}${SUIT_GLYPH[c.suit]}</button>`;
    }
    return `<button class="card-slot" data-slot="${i}" data-empty="true">+</button>`;
  }).join("");
  return slots;
}

function collectBoard(h) {
  const out = [];
  if (h.flop?.cards) out.push(...h.flop.cards);
  if (h.turn?.card) out.push(h.turn.card);
  if (h.river?.card) out.push(h.river.card);
  return out.filter(Boolean);
}

function renderEquityHint(h) {
  const row = document.querySelector("#hint-row");
  if (!row) return;
  if (!h.myCards || !h.myCards[0] || !h.myCards[1]) {
    row.textContent = "";
    return;
  }
  const lbl = handLabel(h.myCards[0], h.myCards[1]);
  const eq = EQUITY_HU[lbl];
  const hint = strategyHint(lbl, h.position);
  row.innerHTML = `<strong>${lbl}</strong> · vs random HU: <strong>${eq != null ? eq.toFixed(1) + "%" : "?"}</strong> · <span style="color: var(--accent)">${hint}</span>`;
}

// ---------- Streets ----------
function editStreet(h, street) {
  const board = h[street]?.cards || (street === "flop" ? [null, null, null] : null);
  const cardCount = street === "flop" ? 3 : 1;
  const existingCards = (street === "flop" ? (h.flop?.cards || []) : (h[street]?.card ? [h[street].card] : []));
  const usedExceptThis = collectBoard(h).filter(c => !existingCards.includes(c)).concat(h.myCards || []);
  const slotsHtml = Array.from({length: cardCount}).map((_, i) => {
    const c = (street === "flop" ? h.flop?.cards?.[i] : h[street]?.card);
    if (c) return `<button class="card-slot suit-${c.suit}" data-bslot="${i}">${c.rank}${SUIT_GLYPH[c.suit]}</button>`;
    return `<button class="card-slot" data-bslot="${i}" data-empty="true">+</button>`;
  }).join("");
  const html = `
    <h2>${street.charAt(0).toUpperCase()+street.slice(1)} board</h2>
    <div class="field-inline">${slotsHtml}</div>
    <div class="field">
      <label>Action / sizing on this street</label>
      <textarea id="street-summary" rows="2" placeholder="e.g. ${street === 'flop' ? 'I cb 400, P calls' : 'P bets 1000, I call'}">${(h[street]?.summary || "").replace(/"/g, "&quot;")}</textarea>
    </div>
    <div class="actions">
      ${h[street] ? `<button class="ghost-btn" data-act="clear">Clear ${street}</button>` : ""}
      <button class="ghost-btn" data-act="cancel">Cancel</button>
      <button class="primary-btn" data-act="save">Save</button>
    </div>
  `;
  openModal(html, {
    onOpen(root) {
      root.querySelectorAll(".card-slot[data-bslot]").forEach(slot => {
        slot.addEventListener("click", () => {
          const i = parseInt(slot.dataset.bslot, 10);
          openCardPicker({
            title: `${street.charAt(0).toUpperCase()+street.slice(1)} card ${i+1}`,
            usedCards: [...(h.myCards || []), ...collectBoard(h).filter(c => !(street === "flop" ? h.flop?.cards?.[i] === c : h[street]?.card === c))],
            allowCamera: true,
            onPick(card) {
              if (street === "flop") {
                h.flop = h.flop || { cards: [null, null, null], summary: "" };
                h.flop.cards[i] = card;
              } else {
                h[street] = h[street] || { card: null, summary: "" };
                h[street].card = card;
              }
              saveState();
              editStreet(h, street);
            }
          });
        });
      });
      root.querySelector("button[data-act='save']")?.addEventListener("click", () => {
        const summ = root.querySelector("#street-summary").value;
        if (street === "flop") {
          h.flop = h.flop || { cards: [null,null,null], summary: "" };
          h.flop.summary = summ;
        } else {
          h[street] = h[street] || { card: null, summary: "" };
          h[street].summary = summ;
        }
        saveState();
        closeModal();
        renderHandEditor(h);
      });
      root.querySelector("button[data-act='clear']")?.addEventListener("click", () => {
        h[street] = null;
        saveState();
        closeModal();
        renderHandEditor(h);
      });
      root.querySelector("button[data-act='cancel']")?.addEventListener("click", () => {
        closeModal();
        renderHandEditor(h);
      });
    }
  });
}

function editShowdown(h) {
  const sd = h.showdown || [];
  const html = `
    <h2>Showdown</h2>
    <p class="muted" style="font-size: 13px">Add seats that showed their cards. P&amp;L is intentionally not tracked.</p>
    <div id="sd-list">
      ${sd.map((s, i) => `
        <div class="row" data-sdi="${i}">
          <span class="chip">${seatCode(s.seatIdx)}</span>
          <span class="chip">${cardsLabel(s.cards)}</span>
          <button class="ghost-btn" data-act="remove" data-sdi="${i}">×</button>
        </div>
      `).join("") || "<p class='muted'>(none)</p>"}
    </div>
    <div class="row"><button class="ghost-btn" data-act="add">+ Add showdown</button></div>
    <div class="actions">
      <button class="ghost-btn" data-act="cancel">Done</button>
    </div>
  `;
  openModal(html, {
    onOpen(root) {
      root.querySelector("button[data-act='add']")?.addEventListener("click", async () => {
        const seatIdx = await pickSeatAsync("Whose cards?");
        if (seatIdx == null) { editShowdown(h); return; }
        const code = seatIdx === state.session.mySeatIdx ? (state.settings.myCode || "ME") : (state.session.seats[seatIdx].player || "?");
        const taken = [...(h.myCards||[]), ...collectBoard(h), ...((h.showdown||[]).flatMap(s=>s.cards||[]))];
        const c1 = await pickCardAsync(`Showdown ${code} card 1`, taken);
        if (!c1) { editShowdown(h); return; }
        const c2 = await pickCardAsync(`Showdown ${code} card 2`, [...taken, c1]);
        if (!c2) { editShowdown(h); return; }
        h.showdown = h.showdown || [];
        h.showdown.push({ seatIdx, cards: [c1, c2] });
        saveState(); // SD counter auto-updates via derivedShowdownCount()
        editShowdown(h);
      });
      root.querySelectorAll("button[data-act='remove']").forEach(b => {
        b.addEventListener("click", () => {
          const i = parseInt(b.dataset.sdi, 10);
          h.showdown.splice(i, 1);
          if (h.showdown.length === 0) h.showdown = null;
          saveState();
          editShowdown(h);
        });
      });
      root.querySelector("button[data-act='cancel']")?.addEventListener("click", () => {
        closeModal();
        renderHandEditor(h);
      });
    }
  });
}

function pickCardAsync(title, usedCards) {
  return new Promise(resolve => {
    let picked = false;
    openCardPicker({
      title, usedCards, allowCamera: false,
      onPick: card => { picked = true; resolve(card); },
    });
    // openCardPicker's click handler runs `closeModal()` then `onPick(card)` synchronously.
    // MutationObserver callbacks are microtasks, so they fire AFTER onPick — we just gate on `picked`.
    const root = document.getElementById("modal-root");
    const obs = new MutationObserver(() => {
      if (root.hidden) { obs.disconnect(); if (!picked) resolve(null); }
    });
    obs.observe(root, { attributes: true });
  });
}

function pickSeatAsync(title) {
  return new Promise(resolve => {
    let picked = false;
    const chips = state.session.seats
      .map((s, i) => ({ idx: i, code: i === state.session.mySeatIdx ? (state.settings.myCode || "ME") : s.player }))
      .filter(s => s.code);
    if (chips.length === 0) { resolve(null); return; }
    const html = `
      <h2>${title}</h2>
      <div class="row">
        ${chips.map(c => `<button class="chip" data-idx="${c.idx}">${c.code}</button>`).join("")}
      </div>
      <div class="actions">
        <button class="ghost-btn" data-act="cancel">Cancel</button>
      </div>
    `;
    openModal(html, {
      onOpen(root) {
        root.querySelectorAll("button[data-idx]").forEach(b => {
          b.addEventListener("click", () => {
            picked = true;
            const idx = parseInt(b.dataset.idx, 10);
            closeModal();
            resolve(idx);
          });
        });
        root.querySelector("button[data-act='cancel']").addEventListener("click", () => {
          closeModal();
        });
      }
    });
    const root = document.getElementById("modal-root");
    const obs = new MutationObserver(() => {
      if (root.hidden) { obs.disconnect(); if (!picked) resolve(null); }
    });
    obs.observe(root, { attributes: true });
  });
}

// ============================================================
// 6. Strategy hint + equity
// ============================================================

function handLabel(c1, c2) {
  if (!c1 || !c2) return "";
  const r1 = c1.rank, r2 = c2.rank;
  if (r1 === r2) return r1 + r2;
  // higher rank first
  const order = "AKQJT98765432";
  const hi = order.indexOf(r1) < order.indexOf(r2) ? r1 : r2;
  const lo = hi === r1 ? r2 : r1;
  const suited = c1.suit === c2.suit;
  return hi + lo + (suited ? "s" : "o");
}

function strategyHint(label, position) {
  if (!label) return "";
  const pos = (position || "").replace(/^BTN\/SB$/, "BTN");
  // AK locked rule
  if (AK_HANDS.has(label)) return "Always-jam pre-flop (locked)";
  // 4-bet/shove tier
  if (FOUR_BET_RANGE.has(label)) return `Open / 4-bet vs 3-bet (${label})`;
  // 3-bet value
  if (THREE_BET_VALUE.has(label)) return `Open / 3-bet candidate`;
  // Position-specific open
  const inOpen = OPEN_RANGES[pos]?.has(label);
  if (inOpen) {
    // Set-mine pairs from late position
    if (/^[2-9]\1$/.test(label) && (pos === "BTN" || pos === "CO" || pos === "HJ")) {
      return "Open 5x · set-mine vs 3-bet";
    }
    return "Open 5x";
  }
  // BB special: defending range
  if (pos === "BB") return "BB defend (call vs single raise if in range; 3-bet/fold premiums)";
  // SB never limp
  if (pos === "SB") return "SB: 3-bet or fold (never limp)";
  return "Fold";
}

// ============================================================
// 7. Markdown export
// ============================================================

function exportToMarkdown() {
  pruneEmptyHands();
  const lines = [];
  const dt = state.session.date;
  lines.push(`# Session Notes — ${formatDateForUI(dt)}`);
  lines.push("");
  lines.push(`**Date:** ${formatDateForUI(dt)}`);
  lines.push(`**Stakes:** ${state.session.stakes}`);
  lines.push(`**Format:** ${state.session.format}`);
  const myCode = state.settings.myCode || "V";
  const seated = state.session.seats.map((s, i) => {
    if (i === state.session.mySeatIdx) return `${myCode} (me)`;
    return s.player;
  }).filter(Boolean);
  lines.push(`**Table:** ${seated.join(", ")}`);
  lines.push("");
  {
    const vp = derivedVpipCount();
    const total = state.hands.length;
    const pct = vpipPercent();
    const pctStr = pct == null ? "—" : `${pct}%`;
    lines.push(`Counts — VPIP: ${vp}/${total} (${pctStr}) · Showdowns: ${derivedShowdownCount()}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Raw Notes (Hand Logger PWA)");
  lines.push("");
  lines.push("```");
  for (const h of state.hands) {
    lines.push(handToLine(h));
  }
  lines.push("```");
  if (state.session.notes) {
    lines.push("");
    lines.push("## Session notes");
    lines.push(state.session.notes);
  }
  return lines.join("\n");
}

function handToLine(h) {
  const head = `H${h.n} — ${h.position || "?"} ${cardsLabel(h.myCards)}`;
  const parts = [];
  if (h.preflopSummary) parts.push(h.preflopSummary);
  if (h.flop?.cards?.some(Boolean)) {
    const board = h.flop.cards.filter(Boolean).map(c => c.rank + c.suit).join("-");
    parts.push(`Flop ${board}${h.flop.summary ? ". " + h.flop.summary : ""}`);
  }
  if (h.turn?.card) {
    parts.push(`Turn ${h.turn.card.rank}${h.turn.card.suit}${h.turn.summary ? ". " + h.turn.summary : ""}`);
  }
  if (h.river?.card) {
    parts.push(`River ${h.river.card.rank}${h.river.card.suit}${h.river.summary ? ". " + h.river.summary : ""}`);
  }
  if (h.showdown?.length) {
    parts.push("SD: " + h.showdown.map(s => `${seatCode(s.seatIdx)} ${cardsLabel(s.cards)}`).join(", "));
  }
  if (h.notes) parts.push(`Note: ${h.notes}`);
  return head + ". " + parts.join(". ") + ".";
}

async function exportToClipboard() {
  const md = exportToMarkdown();
  try {
    await navigator.clipboard.writeText(md);
    alert("Session copied to clipboard. Paste into chat with: score this session");
  } catch {
    // Fallback: open a textarea modal
    const html = `<h2>Session export</h2><textarea rows="20" style="width:100%">${escapeHtml(md)}</textarea><div class="actions"><button class="ghost-btn" data-act="close">Close</button></div>`;
    openModal(html, { onOpen(root) { root.querySelector("button[data-act='close']").addEventListener("click", closeModal); } });
  }
}

// ============================================================
// 8. OCR (gated, optional)
// ============================================================

async function triggerOCR(opts) {
  if (!state.settings.ocrEnabled || !state.settings.anthropicKey) {
    alert("OCR is disabled. Enable it in Settings (⚙︎) and add an Anthropic API key first.");
    return;
  }
  const file = await capturePhoto();
  if (!file) return;
  try {
    const cards = await ocrCards(file);
    if (!cards || cards.length === 0) {
      alert("Could not read a card. Tap manually.");
      return;
    }
    // Confirm before commit
    const confirmation = confirm(`Read: ${cards.map(c => c.rank + SUIT_GLYPH[c.suit]).join(" ")}. Use this?`);
    if (confirmation && opts.onPick) opts.onPick(cards[0]);
  } catch (e) {
    console.error(e);
    alert("OCR failed: " + e.message);
  }
}

function capturePhoto() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files[0] || null);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

async function ocrCards(file) {
  const dataUrl = await fileToDataURL(file);
  const base64 = dataUrl.split(",")[1];
  const mediaType = file.type || "image/jpeg";
  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: 'Extract the rank and suit of the visible playing card(s). Return strict JSON only: {"cards":[{"rank":"A|K|Q|J|T|9|8|7|6|5|4|3|2","suit":"s|h|d|c"}]}. Omit unclear cards. No prose.' }
      ]
    }]
  };
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": state.settings.anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const text = data.content?.[0]?.text || "{}";
  const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
  return json.cards || [];
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---------- Settings ----------
function openSettings() {
  const html = `
    <h2>Settings</h2>
    <div class="field">
      <label>Date</label>
      <input id="set-date" value="${state.session.date}" />
    </div>
    <div class="field">
      <label>Stakes (SB / BB, ₹)</label>
      <div class="field-inline">
        <input id="set-sb" type="number" inputmode="numeric" min="1" step="1" value="${parseStakes(state.session.stakes).sb}" style="width: 80px" />
        <span class="muted">/</span>
        <input id="set-bb" type="number" inputmode="numeric" min="1" step="1" value="${parseStakes(state.session.stakes).bb}" style="width: 80px" />
      </div>
    </div>
    <div class="field">
      <label>Format</label>
      <input id="set-format" value="${state.session.format}" />
    </div>
    <div class="field">
      <label>Your player code</label>
      <input id="set-mycode" maxlength="3" style="width: 80px" placeholder="V" value="${state.settings.myCode || 'V'}" />
      <p class="muted" style="font-size: 12px">Used in the export so the scorer attributes hands to your profile (e.g. "V (me)").</p>
    </div>
    <hr style="border-color: var(--line)" />
    <div class="field">
      <label>OCR (camera card recognition)</label>
      <div class="field-inline">
        <input type="checkbox" id="set-ocr" ${state.settings.ocrEnabled ? "checked" : ""} />
        <label for="set-ocr">Enable</label>
      </div>
    </div>
    <div class="field">
      <label>Anthropic API key (for OCR)</label>
      <input id="set-key" type="password" placeholder="sk-ant-..." value="${state.settings.anthropicKey || ""}" />
      <p class="muted" style="font-size: 12px">Stored locally on this device. Get one at console.anthropic.com.</p>
    </div>
    <div class="actions">
      <button class="ghost-btn" data-act="newsession">Start new session</button>
      <button class="primary-btn" data-act="save">Save</button>
    </div>
  `;
  openModal(html, {
    onOpen(root) {
      root.querySelector("button[data-act='save']").addEventListener("click", () => {
        state.session.date = root.querySelector("#set-date").value;
        const sb = parseInt(root.querySelector("#set-sb").value, 10) || 25;
        const bb = parseInt(root.querySelector("#set-bb").value, 10) || 50;
        state.session.stakes = `${sb}/${bb}`;
        state.session.format = root.querySelector("#set-format").value;
        state.settings.myCode = (root.querySelector("#set-mycode").value || "V").trim().toUpperCase().slice(0, 3);
        state.settings.ocrEnabled = root.querySelector("#set-ocr").checked;
        state.settings.anthropicKey = root.querySelector("#set-key").value || null;
        saveState();
        renderTopbar();
        closeModal();
      });
      root.querySelector("button[data-act='newsession']").addEventListener("click", () => {
        closeModal();
        newSession();
      });
    }
  });
}

// ============================================================
// 9. Bootstrap
// ============================================================

function ymd(d) {
  const z = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}
function hhmm(d) {
  const z = n => String(n).padStart(2, "0");
  return `${z(d.getHours())}:${z(d.getMinutes())}`;
}
function formatDateForUI(s) {
  // Render as DD MMM YY per user preference
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [y, mo, d] = s.split("-").map(Number);
  return `${String(d).padStart(2,"0")} ${m[mo-1]} ${String(y).slice(-2)}`;
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function parseStakes(s) {
  // "25/50" → { sb: 25, bb: 50 }. Robust to extra whitespace and stray chars.
  const m = String(s || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (m) return { sb: parseInt(m[1], 10), bb: parseInt(m[2], 10) };
  return { sb: 25, bb: 50 };
}

window.addEventListener("DOMContentLoaded", () => {
  // The inline 52-card grid (between table and hand list) is the primary
  // hand-entry surface — tap a card to start the chained flow.
  // + Fold (bottom bar): 1-tap fold record, keeps VPIP% denominator honest.
  document.getElementById("btn-quick-fold").addEventListener("click", quickFold);
  document.getElementById("btn-export").addEventListener("click", exportToClipboard);
  document.getElementById("btn-settings").addEventListener("click", openSettings);
  // VPIP / SD chips are now read-only displays; their value is derived from
  // logged hands by derivedVpipCount() / derivedShowdownCount(). Tap shows a
  // brief explainer popover so the auto-behaviour isn't a black box.
  const explainTally = (which) => {
    const vp = derivedVpipCount();
    const sd = derivedShowdownCount();
    const total = state.hands.length;
    const pct = vpipPercent();
    const body = which === "vpip"
      ? `${total === 0 ? "No hands logged yet." : `${vp} of ${total} logged hand${total === 1 ? "" : "s"} = ${pct}% VPIP.`}\n\nNumerator: any hand with non-fold pre-flop action (Limp / Call / Raise / 3-bet / 4-bet / Jam).\nDenominator: total logged hands.\n\nFor an honest %, tap + Fold (bottom bar, 1 tap) on every hand you fold pre-flop without picking cards. Healthy range at this table: 18–25%.`
      : `${total === 0 ? "No hands logged yet." : `${sd} showdown${sd === 1 ? "" : "s"} across ${total} logged hand${total === 1 ? "" : "s"}.`}\n\nA hand counts when it has at least one showdown entry (added via the Showdown step in the editor).`;
    showOnboarding(which === "vpip" ? "VPIP — auto" : "Showdowns — auto", body);
  };
  document.getElementById("btn-tally-vpip").addEventListener("click", () => explainTally("vpip"));
  document.getElementById("btn-tally-sd").addEventListener("click", () => explainTally("sd"));
  document.getElementById("btn-add-player").addEventListener("click", () => alert("Tap an empty seat on the table to assign a player."));
  document.getElementById("btn-set-my-seat").addEventListener("click", () => alert("Tap your seat on the table → 'This is my seat'."));
  document.getElementById("btn-move-button").addEventListener("click", () => { advanceButton(); saveState(); renderTable(); });
  renderAll();
});
