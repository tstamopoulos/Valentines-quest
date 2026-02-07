const CONFIG = {
  name: "Your FavoriteST PERSON EVER",
  final: {
    date: "2026-02-14",
    time: "6:00pm",
    timeZone: "Australia/Sydney",
    durationHours: 2,
    location: "Elements Bar and Grill Walsh Bay",
    venueQuery: "Elements Bar and Grill Walsh Bay",
    personName: "Tianna",
    nickname: "Titi",
  },
  copy: {
    introQuestion: "Will you be my Valentine?",
    level2Prompt: "Quick calibration check.",
    level3Prompt: "Final confirmation checkpoint.",
    level4Prompt: "Please hold. Decision window loading...",
    level5Prompt: "Memory check:",
    level6Prompt: "Do NOT click YES.",
    finalLead: "Titi... you made it.",
    finalReveal: "You're my Valentine.",
    finalPlanLead: "I planned a little night for us.",
    revealPlanCta: "Reveal the plan",
  },
  memory: {
    question: "What is the name of the first movie we ever watched in the cinema together?",
    answers: ["John Wick", "john wick", "John Wick 4", "john wick 4"],
    wrongFeedback: [
      "Not quite. Try again.",
      "Close in spirit. One more guess.",
      "Memory is hard under pressure.",
    ],
  },
  share: {
    template:
      "Valentine Quest ✅\n{nickname} completed it in {duration}\nDodges: {dodges}\nCaptcha attempts: {captcha}\nResult: She's my Valentine 💌\nDetails: {when} - {where}",
  },
  levelSettings: {
    dodgeLimit: 3,
    countdownSeconds: 5,
    revealPauseMs: 520,
    fakeErrorMs: 1500,
  },
};

const state = {
  levelIndex: 0,
  soundOn: false,
  cleanupFns: [],
  timeoutIds: [],
  rafIds: [],
  dodgeCount: 0,
  canClickNoInLevel1: false,
  modalStep: 0,
  startTimeMs: null,
  endTimeMs: null,
  runId: String(Math.floor(1000 + Math.random() * 9000)),
  countdownResult: "unknown",
  memoryAttempts: 0,
  memoryGaveUp: false,
  captchaAttempts: 0,
  finalRequestId: 0,
};

const media = {
  hover: window.matchMedia("(hover: hover)"),
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
};

const els = {
  body: document.body,
  card: document.getElementById("levelCard"),
  eyebrow: document.getElementById("levelEyebrow"),
  title: document.getElementById("levelTitle"),
  prompt: document.getElementById("levelPrompt"),
  hint: document.getElementById("hintText"),
  buttonRow: document.getElementById("buttonRow"),
  yesBtn: document.getElementById("yesBtn"),
  noBtn: document.getElementById("noBtn"),
  countdownWrap: document.getElementById("countdownWrap"),
  countdownValue: document.getElementById("countdownValue"),
  memoryForm: document.getElementById("memoryForm"),
  memoryInput: document.getElementById("memoryInput"),
  memoryLabel: document.getElementById("memoryLabel"),
  giveUpBtn: document.getElementById("giveUpBtn"),
  finalActions: document.getElementById("finalActions"),
  finalExtras: document.getElementById("finalExtras"),
  googleCalendarBtn: document.getElementById("googleCalendarBtn"),
  calendarBtn: document.getElementById("calendarBtn"),
  copyBtn: document.getElementById("copyBtn"),
  shareBtn: document.getElementById("shareBtn"),
  runSummaryList: document.getElementById("runSummaryList"),
  certificatePlayer: document.getElementById("certificatePlayer"),
  certificateResult: document.getElementById("certificateResult"),
  certificateTime: document.getElementById("certificateTime"),
  certificateDodges: document.getElementById("certificateDodges"),
  certificateCaptcha: document.getElementById("certificateCaptcha"),
  certificateRunId: document.getElementById("certificateRunId"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
  soundToggle: document.getElementById("soundToggle"),
  resetBtn: document.getElementById("resetBtn"),
  modalLayer: document.getElementById("modalLayer"),
  liveRegion: document.getElementById("liveRegion"),
  errorOverlay: document.getElementById("errorOverlay"),
};

const WEATHER_CODES = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm and hail",
  99: "Severe thunderstorm and hail",
};

let audioCtx;

function setPrompt(text) {
  els.prompt.textContent = text;
}

function setHint(text, announce = false) {
  els.hint.textContent = text || "";
  if (announce && text) {
    announceLive(text);
  }
}

function announceLive(text) {
  els.liveRegion.textContent = "";
  const id = window.setTimeout(() => {
    els.liveRegion.textContent = text;
  }, 16);
  state.timeoutIds.push(id);
}

function queueTimeout(fn, ms) {
  const id = window.setTimeout(fn, ms);
  state.timeoutIds.push(id);
  return id;
}

function queueRaf(fn) {
  const id = window.requestAnimationFrame(fn);
  state.rafIds.push(id);
  return id;
}

function cleanupTimers() {
  state.timeoutIds.forEach((id) => window.clearTimeout(id));
  state.timeoutIds = [];
  state.rafIds.forEach((id) => window.cancelAnimationFrame(id));
  state.rafIds = [];
}

function addCleanup(fn) {
  state.cleanupFns.push(fn);
}

function runCleanup() {
  cleanupTimers();
  while (state.cleanupFns.length) {
    const fn = state.cleanupFns.pop();
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  }
}

function resetSharedUI() {
  els.body.classList.remove("final-mode");
  els.buttonRow.classList.remove("hidden");
  els.finalActions.classList.add("hidden");
  els.finalActions.classList.remove("final-secondary-actions");
  els.finalExtras.classList.add("hidden");
  els.memoryForm.classList.add("hidden");
  els.countdownWrap.classList.add("hidden");
  els.noBtn.classList.remove("is-floating", "no-fade", "shake");
  els.noBtn.style.left = "";
  els.noBtn.style.top = "";
  els.noBtn.style.opacity = "";
  els.noBtn.style.pointerEvents = "";
  els.noBtn.style.cursor = "";
  els.noBtn.hidden = false;
  els.noBtn.disabled = false;
  els.yesBtn.hidden = false;
  els.yesBtn.disabled = false;
  els.prompt.innerHTML = "";
  els.prompt.classList.remove("final-soft");
  setHint("");
  closeModal();
  els.errorOverlay.classList.add("hidden");
}

function normalize(input) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function nextLevel(message, delay = 720) {
  if (message) {
    setHint(message, true);
  }
  const nextIndex = state.levelIndex + 1;
  if (nextIndex >= levels.length) return;
  queueTimeout(() => gotoLevel(nextIndex), delay);
}

function gotoLevel(index) {
  runCleanup();
  resetSharedUI();
  state.levelIndex = index;
  const level = levels[index];
  const isFinal = level.id === "final";
  const levelNumber = index + 1;
  els.eyebrow.textContent = "Valentine Quest";
  els.title.textContent = isFinal ? "Final" : `Level ${levelNumber}`;
  level.render();
  if (typeof level.init === "function") {
    level.init();
  }
}

function resetExperience() {
  state.dodgeCount = 0;
  state.canClickNoInLevel1 = false;
  state.startTimeMs = null;
  state.endTimeMs = null;
  state.runId = String(Math.floor(1000 + Math.random() * 9000));
  state.countdownResult = "unknown";
  state.memoryAttempts = 0;
  state.memoryGaveUp = false;
  state.captchaAttempts = 0;
  state.finalRequestId += 1;
  gotoLevel(0);
  setHint("Reset complete.");
}

function supportsHover() {
  return media.hover.matches;
}

function isReducedMotion() {
  return media.reducedMotion.matches;
}

function bind(el, eventName, handler, options) {
  el.addEventListener(eventName, handler, options);
  addCleanup(() => el.removeEventListener(eventName, handler, options));
}

function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function overlapRatio(a, b) {
  const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const intersection = xOverlap * yOverlap;
  const minArea = Math.min(a.width * a.height, b.width * b.height);
  if (!minArea) return 0;
  return intersection / minArea;
}

function ensureNoFloating() {
  if (els.noBtn.classList.contains("is-floating")) return;
  const rect = els.noBtn.getBoundingClientRect();
  els.noBtn.classList.add("is-floating");
  els.noBtn.style.left = `${rect.left}px`;
  els.noBtn.style.top = `${rect.top}px`;
}

function moveNoButtonWithinBounds(pointerX = null, pointerY = null) {
  ensureNoFloating();

  const noRect = els.noBtn.getBoundingClientRect();
  const yesRect = els.yesBtn.getBoundingClientRect();
  const margin = 10;
  const topLimit = 64;
  const maxX = window.innerWidth - noRect.width - margin;
  const maxY = window.innerHeight - noRect.height - margin;

  let targetX = noRect.left;
  let targetY = noRect.top;

  for (let i = 0; i < 30; i += 1) {
    const candidateX = randomInRange(margin, Math.max(margin, maxX));
    const candidateY = randomInRange(topLimit, Math.max(topLimit, maxY));
    const candidateRect = {
      left: candidateX,
      top: candidateY,
      right: candidateX + noRect.width,
      bottom: candidateY + noRect.height,
      width: noRect.width,
      height: noRect.height,
    };

    const yesCenterX = yesRect.left + yesRect.width / 2;
    const yesCenterY = yesRect.top + yesRect.height / 2;
    const noCenterX = candidateX + noRect.width / 2;
    const noCenterY = candidateY + noRect.height / 2;

    const farEnoughFromYes =
      distance(noCenterX, noCenterY, yesCenterX, yesCenterY) > Math.max(noRect.width, noRect.height) * 1.2;
    const overlapSafe = overlapRatio(candidateRect, yesRect) < 0.35;
    const pointerFarEnough =
      pointerX === null || pointerY === null
        ? true
        : distance(noCenterX, noCenterY, pointerX, pointerY) > 85;

    if (farEnoughFromYes && overlapSafe && pointerFarEnough) {
      targetX = candidateX;
      targetY = candidateY;
      break;
    }
  }

  animateNoTo(targetX, targetY);
}

function animateNoTo(targetX, targetY) {
  if (isReducedMotion()) {
    els.noBtn.style.left = `${targetX}px`;
    els.noBtn.style.top = `${targetY}px`;
    return;
  }

  const startRect = els.noBtn.getBoundingClientRect();
  const startX = startRect.left;
  const startY = startRect.top;
  const duration = 280;
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const x = startX + (targetX - startX) * eased;
    const y = startY + (targetY - startY) * eased;
    els.noBtn.style.left = `${x}px`;
    els.noBtn.style.top = `${y}px`;
    if (t < 1) {
      queueRaf(step);
    }
  };

  queueRaf(step);
}

function withAudioContext() {
  if (!audioCtx) {
    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextImpl) return null;
    audioCtx = new AudioContextImpl();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, durationMs, type = "sine", volume = 0.045) {
  if (!state.soundOn) return;
  const ctx = withAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.03);
}

const sfx = {
  dodge: () => playTone(420, 90, "triangle", 0.04),
  confirm: () => {
    playTone(540, 80, "sine", 0.04);
    queueTimeout(() => playTone(720, 120, "sine", 0.04), 60);
  },
  tick: () => playTone(320, 40, "square", 0.018),
  error: () => {
    playTone(190, 160, "sawtooth", 0.05);
    queueTimeout(() => playTone(160, 180, "sawtooth", 0.05), 70);
  },
};

function updateSoundButton() {
  els.soundToggle.textContent = `Sound: ${state.soundOn ? "On" : "Off"}`;
  els.soundToggle.setAttribute("aria-pressed", String(state.soundOn));
}

function showModal({ title, subtitle, onYes, onNo }) {
  const html = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalSubtitle">
      <h2 id="modalTitle">${title}</h2>
      <p id="modalSubtitle">${subtitle}</p>
      <button type="button" class="btn btn-primary modal-yes" id="modalYes">Yes</button>
      <button type="button" class="btn btn-secondary modal-no" id="modalNo">No</button>
    </div>
  `;

  els.modalLayer.innerHTML = html;
  els.modalLayer.classList.remove("hidden");
  els.modalLayer.setAttribute("aria-hidden", "false");

  const modal = els.modalLayer.querySelector(".modal");
  const yes = els.modalLayer.querySelector("#modalYes");
  const no = els.modalLayer.querySelector("#modalNo");

  yes.addEventListener("click", onYes);
  no.addEventListener("click", onNo);

  const keyHandler = (event) => {
    if (event.key !== "Tab") return;
    const focusable = [yes, no];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  modal.addEventListener("keydown", keyHandler);
  yes.focus();

  addCleanup(() => {
    yes.removeEventListener("click", onYes);
    no.removeEventListener("click", onNo);
    modal.removeEventListener("keydown", keyHandler);
  });
}

function closeModal() {
  els.modalLayer.classList.add("hidden");
  els.modalLayer.setAttribute("aria-hidden", "true");
  els.modalLayer.innerHTML = "";
}

function parseDateParts(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || "");
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeParts(timeString) {
  const clean = (timeString || "").trim().toLowerCase();
  const meridianMatch = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(clean);
  if (meridianMatch) {
    let hour = Number(meridianMatch[1]);
    const minute = Number(meridianMatch[2] || "0");
    const meridian = meridianMatch[3];
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
    return { hour, minute };
  }

  const twentyFourMatch = /^(\d{1,2}):(\d{2})$/.exec(clean);
  if (twentyFourMatch) {
    return {
      hour: Number(twentyFourMatch[1]),
      minute: Number(twentyFourMatch[2]),
    };
  }

  return { hour: 18, minute: 0 };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - date.getTime();
}

function zonedLocalToUtcDate(dateString, timeString, timeZone) {
  const date = parseDateParts(dateString);
  const time = parseTimeParts(timeString);
  if (!date) return new Date();

  const baseUtc = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, 0);
  let candidate = baseUtc;

  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(candidate), timeZone);
    const adjusted = baseUtc - offset;
    if (Math.abs(adjusted - candidate) < 1000) {
      candidate = adjusted;
      break;
    }
    candidate = adjusted;
  }

  return new Date(candidate);
}

function formatUtcIcs(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function getEventContext() {
  const start = zonedLocalToUtcDate(CONFIG.final.date, CONFIG.final.time, CONFIG.final.timeZone);
  const durationMs = Number(CONFIG.final.durationHours || 2) * 60 * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  const venueQuery = CONFIG.final.venueQuery || CONFIG.final.location;
  const venueParam = encodeURIComponent(venueQuery);
  const dateFormatter = new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CONFIG.final.timeZone,
  });
  const longDateFormatter = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: CONFIG.final.timeZone,
  });
  const shortNoYearFormatter = new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: CONFIG.final.timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CONFIG.final.timeZone,
  });
  const placeDisplay = CONFIG.final.location.replace(" Walsh Bay", ", Walsh Bay");
  const timeText = timeFormatter.format(start).replace(" pm", " pm").replace(" am", " am");
  const shortWhen = `${shortNoYearFormatter.format(start).replace(",", "")} • ${timeText}`;
  const longDate = longDateFormatter.format(start);

  const whenLine = `${dateFormatter.format(start)} \u2022 ${timeFormatter
    .format(start)
    .replace(" pm", "pm")
    .replace(" am", "am")}`;

  return {
    start,
    end,
    venueQuery,
    mapEmbedUrl: `https://www.google.com/maps?q=${venueParam}&output=embed`,
    mapsOpenUrl: `https://www.google.com/maps/search/?api=1&query=${venueParam}`,
    mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${venueParam}`,
    weatherSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(`${venueQuery} weather`)}`,
    whenLine,
    shortWhen,
    longDate,
    timeText,
    placeDisplay,
  };
}

function downloadIcs() {
  const event = getEventContext();
  const stamp = formatUtcIcs(new Date());
  const dtStart = formatUtcIcs(event.start);
  const dtEnd = formatUtcIcs(event.end);
  const summary = `${CONFIG.name} + Valentine`;
  const description = `You are my Valentine.\\nDate: ${CONFIG.final.date}\\nTime: ${CONFIG.final.time}\\nLocation: ${CONFIG.final.location}`;

  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Valentine Quest//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:valentine-quest-${Date.now()}@local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${CONFIG.final.location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "valentine-date.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  sfx.confirm();
  setHint("Calendar file downloaded.", true);
}

function openGoogleCalendar() {
  const event = getEventContext();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${CONFIG.name} + Valentine`,
    dates: `${formatUtcIcs(event.start)}/${formatUtcIcs(event.end)}`,
    location: CONFIG.final.location,
    details: `${CONFIG.copy.finalReveal} ${event.whenLine}.`,
  });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank", "noopener");
  sfx.confirm();
}

function formatDetailText() {
  const event = getEventContext();
  return [
    `${CONFIG.final.personName} (${CONFIG.final.nickname}) \u{1F48C}`,
    `${event.longDate} \u2014 ${event.timeText}`,
    event.placeDisplay,
    CONFIG.copy.finalPlanLead,
  ].join("\n");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setHint(successMessage, true);
    sfx.confirm();
    return true;
  } catch (err) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    setHint(`${successMessage} (fallback copy used)`, true);
    sfx.confirm();
    return false;
  }
}

function copyDetails() {
  return copyText(formatDetailText(), "Copied details.");
}

async function typeLine(el, text) {
  if (isReducedMotion()) {
    el.textContent = text;
    el.classList.add("show");
    return;
  }

  el.classList.add("show");
  el.textContent = "";
  let i = 0;

  await new Promise((resolve) => {
    const step = () => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        resolve();
        return;
      }
      queueTimeout(step, 28);
    };
    step();
  });
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function countdownSummaryLabel() {
  if (state.countdownResult === "clickedYes") return "Clicked Yes";
  if (state.countdownResult === "clickedNo") return "Clicked No";
  if (state.countdownResult === "timedOut") return "Timed out";
  return "Unknown";
}

function getElapsedText() {
  if (!state.startTimeMs) return "0m 00s";
  const end = state.endTimeMs || Date.now();
  return formatDuration(end - state.startTimeMs);
}

function getRunSummaryText() {
  const event = getEventContext();
  const elapsed = getElapsedText();
  return [
    `Valentine Quest ✅`,
    `${CONFIG.final.nickname} completed it in ${elapsed}`,
    `Dodges: ${state.dodgeCount}`,
    `Captcha attempts: ${state.captchaAttempts}`,
    `Result: She's my Valentine 💌`,
    `Details: ${event.whenLine} - ${CONFIG.final.location}`,
  ].join("\n");
}

function populateRunSummary() {
  els.runSummaryList.innerHTML = "";
  const lines = [
    `${CONFIG.final.nickname} completed it in ${getElapsedText()}`,
    `Dodges survived: ${state.dodgeCount}`,
    `Countdown: ${countdownSummaryLabel()}`,
    `Memory attempts: ${state.memoryAttempts}${state.memoryGaveUp ? " (used give up)" : ""}`,
    `Captcha attempts: ${state.captchaAttempts}`,
    `Run ID: ${state.runId}`,
  ];
  lines.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    els.runSummaryList.appendChild(li);
  });
}

function populateCertificate() {
  if (!els.certificatePlayer) return;
  els.certificatePlayer.textContent = `Player: ${CONFIG.final.personName} (${CONFIG.final.nickname})`;
  els.certificateResult.textContent = `Result: Accepted`;
  els.certificateTime.textContent = `Total time: ${getElapsedText()}`;
  els.certificateDodges.textContent = `Dodges survived: ${state.dodgeCount}`;
  els.certificateCaptcha.textContent = `Captcha attempts: ${state.captchaAttempts}`;
  els.certificateRunId.textContent = `Run ID: ${state.runId}`;
}

function getNextWeatherCheckDateText(eventStart) {
  const byWindow = new Date(eventStart.getTime() - 14 * 86400000);
  const byWeek = new Date(Date.now() + 7 * 86400000);
  const nextCheck = byWindow > byWeek ? byWeek : byWindow;
  const formatter = new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CONFIG.final.timeZone,
  });
  return formatter.format(nextCheck);
}

async function loadWeatherInto(container) {
  const whenEl = container.querySelector("[data-weather-when]");
  const statusEl = container.querySelector("[data-weather-status]");
  const tempEl = container.querySelector("[data-weather-temp]");
  const rainEl = container.querySelector("[data-weather-rain]");
  const linkEl = container.querySelector("[data-weather-link]");

  const requestId = ++state.finalRequestId;
  const event = getEventContext();
  whenEl.textContent = `When: ${event.shortWhen}`;
  linkEl.href = event.weatherSearchUrl;

  const daysUntil = Math.ceil((event.start.getTime() - Date.now()) / 86400000);

  if (daysUntil > 16) {
    statusEl.textContent = "It's a bit too far ahead for a real forecast - we'll check again closer to the day.";
    tempEl.textContent = `Next good time to check: ${getNextWeatherCheckDateText(event.start)}`;
    rainEl.textContent = "";
    return;
  }

  if (daysUntil < -1) {
    statusEl.textContent = "This date has passed - use the live forecast for current weather.";
    tempEl.textContent = "";
    rainEl.textContent = "";
    return;
  }

  statusEl.textContent = "Loading forecast...";
  tempEl.textContent = "";
  rainEl.textContent = "";

  try {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      event.venueQuery
    )}&count=1&language=en&format=json`;
    const geocodeRes = await fetch(geocodeUrl);
    if (!geocodeRes.ok) throw new Error("Geocode unavailable");
    const geo = await geocodeRes.json();
    const first = geo && geo.results && geo.results[0];
    if (!first) throw new Error("Venue not found");

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code&timezone=${encodeURIComponent(
        CONFIG.final.timeZone
      )}`;

    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) throw new Error("Forecast unavailable");
    const forecast = await forecastRes.json();
    if (!forecast || !forecast.hourly || !forecast.hourly.time) {
      throw new Error("Forecast data missing");
    }

    if (requestId !== state.finalRequestId || levels[state.levelIndex].id !== "final") {
      return;
    }

    const eventDate = parseDateParts(CONFIG.final.date);
    const eventTime = parseTimeParts(CONFIG.final.time);
    const hourKey = `${eventDate.year}-${String(eventDate.month).padStart(2, "0")}-${String(
      eventDate.day
    ).padStart(2, "0")}T${String(eventTime.hour).padStart(2, "0")}:00`;

    const times = forecast.hourly.time;
    let idx = times.indexOf(hourKey);
    if (idx < 0) {
      idx = 0;
      for (let i = 1; i < times.length; i += 1) {
        const diffCurrent = Math.abs(new Date(times[i]).getTime() - new Date(hourKey).getTime());
        const diffBest = Math.abs(new Date(times[idx]).getTime() - new Date(hourKey).getTime());
        if (diffCurrent < diffBest) idx = i;
      }
    }

    const code = Number(forecast.hourly.weather_code[idx]);
    const temp = forecast.hourly.temperature_2m[idx];
    const rain = forecast.hourly.precipitation_probability[idx];
    const status = WEATHER_CODES[code] || "Conditions available";

    statusEl.textContent = status;
    tempEl.textContent = Number.isFinite(temp) ? `Temperature: ${Math.round(temp)} C` : "Temperature: unavailable";
    rainEl.textContent = Number.isFinite(rain) ? `Rain probability: ${Math.round(rain)}%` : "Rain probability: unavailable";
  } catch (err) {
    if (requestId !== state.finalRequestId || levels[state.levelIndex].id !== "final") {
      return;
    }
    statusEl.textContent = "Could not load forecast right now.";
    tempEl.textContent = "Use the live forecast link for latest weather.";
    rainEl.textContent = "";
  }
}

function shareSummaryText() {
  const event = getEventContext();
  const duration = getElapsedText();
  return CONFIG.share.template
    .replace("{nickname}", CONFIG.final.nickname)
    .replace("{duration}", duration)
    .replace("{dodges}", String(state.dodgeCount))
    .replace("{captcha}", String(state.captchaAttempts))
    .replace("{when}", event.whenLine)
    .replace("{where}", CONFIG.final.location)
    .replace("{summary}", getRunSummaryText().replace(/\n/g, " | "));
}

async function shareRunSummary() {
  const text = formatDetailText();
  if (navigator.share) {
    try {
      await navigator.share({
        title: "The plan, for us.",
        text,
      });
      setHint("Shared.", true);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  await copyText(text, "Share is unavailable here. Invite copied instead.");
}

function closeCustomModal(returnFocusEl) {
  closeModal();
  if (returnFocusEl) {
    queueTimeout(() => returnFocusEl.focus(), 16);
  }
}

function openPlanModal(triggerEl) {
  const event = getEventContext();
  const html = `
    <div class="modal plan-modal" role="dialog" aria-modal="true" aria-labelledby="planModalTitle">
      <button type="button" class="btn btn-subtle plan-modal-close" data-plan-close>Close</button>
      <h2 id="planModalTitle">The plan, for us.</h2>
      <p class="plan-modal-sub">Saturday night. You and me. Everything else can wait.</p>

      <div class="plan-details-grid">
        <section class="final-block modal-section" aria-label="Invitation details">
          <h3 class="section-title">Invitation</h3>
          <div class="invite-details">
            <span class="invite-chip">Date: ${event.longDate}</span>
            <span class="invite-chip">Time: ${event.timeText}</span>
            <span class="invite-chip">Place: ${event.placeDisplay}</span>
          </div>
          <p class="invite-note">I'm excited to take you out, ${CONFIG.final.nickname}.</p>
        </section>

        <section class="final-block modal-section" aria-label="Where">
          <h3 class="section-title">Where</h3>
          <div style="position:relative;">
            <iframe class="map-frame" title="Map preview for venue" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen data-map-frame></iframe>
          </div>
          <div class="button-row compact-row">
            <a class="btn btn-secondary btn-link" target="_blank" rel="noopener noreferrer" data-maps-open>Open in Google Maps</a>
            <a class="btn btn-primary btn-link" target="_blank" rel="noopener noreferrer" data-maps-directions>Directions</a>
          </div>
          <p class="sub-note">If the map preview doesn't load, those buttons will work every time.</p>
          <p class="map-fallback hidden" data-map-fallback>Map preview blocked on this browser. The buttons above still work.</p>
        </section>

        <section class="final-block modal-section" aria-label="Weather at 6:00pm">
          <h3 class="section-title">Weather (around ${event.timeText})</h3>
          <p class="weather-when" data-weather-when></p>
          <p class="weather-status" data-weather-status>Loading forecast...</p>
          <p class="weather-line" data-weather-temp></p>
          <p class="weather-line" data-weather-rain></p>
          <a class="btn btn-secondary btn-link weather-link-btn" target="_blank" rel="noopener noreferrer" data-weather-link>Check live forecast</a>
        </section>

        <section class="final-block modal-section" aria-label="Actions">
          <h3 class="section-title">Save it</h3>
          <div class="button-row compact-row">
            <button type="button" class="btn btn-secondary" data-action-google>Add to Google Calendar</button>
            <button type="button" class="btn btn-primary" data-action-ics>Add to Calendar (.ics)</button>
            <button type="button" class="btn btn-secondary" data-action-copy>Copy details</button>
            <button type="button" class="btn btn-subtle" data-action-share>Share</button>
          </div>
          <p class="sub-note">If you want, save it now so it's locked in.</p>
        </section>
      </div>
      <p class="modal-footer-note">P.S. I hope you smiled at least once getting here.</p>
    </div>
  `;

  els.modalLayer.innerHTML = html;
  els.modalLayer.classList.remove("hidden");
  els.modalLayer.setAttribute("aria-hidden", "false");

  const modal = els.modalLayer.querySelector(".plan-modal");
  const closeBtn = modal.querySelector("[data-plan-close]");
  const frame = modal.querySelector("[data-map-frame]");
  const openLink = modal.querySelector("[data-maps-open]");
  const directionsLink = modal.querySelector("[data-maps-directions]");
  const mapFallback = modal.querySelector("[data-map-fallback]");

  frame.src = event.mapEmbedUrl;
  openLink.href = event.mapsOpenUrl;
  directionsLink.href = event.mapsDirectionsUrl;

  frame.addEventListener("error", () => mapFallback.classList.remove("hidden"));
  frame.addEventListener("load", () => mapFallback.classList.add("hidden"));

  modal.querySelector("[data-action-ics]").addEventListener("click", downloadIcs);
  modal.querySelector("[data-action-google]").addEventListener("click", openGoogleCalendar);
  modal.querySelector("[data-action-copy]").addEventListener("click", copyDetails);
  modal.querySelector("[data-action-share]").addEventListener("click", shareRunSummary);

  loadWeatherInto(modal);

  const focusables = Array.from(
    modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  );
  const keyHandler = (eventKey) => {
    if (eventKey.key === "Escape") {
      eventKey.preventDefault();
      closeWithCleanup();
      return;
    }
    if (eventKey.key !== "Tab" || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (eventKey.shiftKey && document.activeElement === first) {
      eventKey.preventDefault();
      last.focus();
    } else if (!eventKey.shiftKey && document.activeElement === last) {
      eventKey.preventDefault();
      first.focus();
    }
  };

  const overlayClickHandler = (eventClick) => {
    if (eventClick.target === els.modalLayer) {
      closeWithCleanup();
    }
  };

  const closeWithCleanup = () => {
    modal.removeEventListener("keydown", keyHandler);
    els.modalLayer.removeEventListener("click", overlayClickHandler);
    closeCustomModal(triggerEl);
  };

  closeBtn.addEventListener("click", closeWithCleanup);
  modal.addEventListener("keydown", keyHandler);
  els.modalLayer.addEventListener("click", overlayClickHandler);
  closeBtn.focus();
}

const levels = [
  {
    id: "l1",
    render() {
      state.dodgeCount = 0;
      state.canClickNoInLevel1 = false;
      setPrompt(CONFIG.copy.introQuestion);
      els.yesBtn.textContent = "Yes";
      els.noBtn.textContent = "No";
      setHint("You can totally choose either option.");
    },
    init() {
      if (!state.startTimeMs) {
        state.startTimeMs = Date.now();
      }
      const nearThreshold = 78;

      const yesClick = () => {
        sfx.confirm();
        nextLevel("Knew it.");
      };

      const dodge = (x, y) => {
        if (state.canClickNoInLevel1) return;
        moveNoButtonWithinBounds(x, y);
        state.dodgeCount += 1;
        sfx.dodge();

        if (state.dodgeCount >= CONFIG.levelSettings.dodgeLimit) {
          state.canClickNoInLevel1 = true;
          setHint('"No" unlocked. You earned it.', true);
          els.noBtn.style.pointerEvents = "auto";
        } else {
          setHint(`Nope escaped (${state.dodgeCount}/${CONFIG.levelSettings.dodgeLimit}).`);
        }
      };

      const noClick = (event) => {
        if (!state.canClickNoInLevel1) {
          dodge(event.clientX, event.clientY);
          return;
        }
        sfx.confirm();
        nextLevel("Interesting choice. Proceeding.");
      };

      const pointerMove = (event) => {
        if (state.canClickNoInLevel1 || !supportsHover()) return;
        const rect = els.noBtn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (distance(centerX, centerY, event.clientX, event.clientY) <= nearThreshold) {
          dodge(event.clientX, event.clientY);
        }
      };

      const pointerDownFallback = (event) => {
        if (supportsHover() || state.canClickNoInLevel1) return;
        event.preventDefault();
        dodge(event.clientX, event.clientY);
      };

      const focusFallback = () => {
        if (!state.canClickNoInLevel1) {
          dodge(null, null);
        }
      };

      bind(els.yesBtn, "click", yesClick);
      bind(els.noBtn, "click", noClick);
      bind(window, "pointermove", pointerMove, { passive: true });
      bind(els.noBtn, "pointerdown", pointerDownFallback);
      bind(els.noBtn, "focus", focusFallback);

      addCleanup(() => {
        els.noBtn.classList.remove("is-floating");
        els.noBtn.style.left = "";
        els.noBtn.style.top = "";
      });
    },
  },
  {
    id: "l2",
    render() {
      setPrompt(CONFIG.copy.level2Prompt);
      els.yesBtn.textContent = "Yes";
      els.noBtn.textContent = "No";
      els.noBtn.style.cursor = "help";
      els.noBtn.setAttribute("title", "Are labels ever truly real?");
      setHint("Tiny hint: outcomes and labels are not close friends.");
    },
    init() {
      const clickNo = () => {
        sfx.confirm();
        nextLevel("You clicked Yes.");
      };

      const clickYes = () => {
        sfx.confirm();
        nextLevel("Good choice.");
      };

      bind(els.noBtn, "click", clickNo);
      bind(els.yesBtn, "click", clickYes);
    },
  },
  {
    id: "l3",
    render() {
      setPrompt(CONFIG.copy.level3Prompt);
      els.yesBtn.textContent = "Yes";
      els.noBtn.textContent = "No";
      setHint("This seems reasonable.");
    },
    init() {
      const modalCopy = [
        {
          title: "Are you absolutely certain?",
          subtitle: "This choice may be reviewed by the romance committee.",
        },
        {
          title: "Really certain?",
          subtitle: "We can schedule another certainty check if needed.",
        },
        {
          title: "Final certainty check",
          subtitle: "Selecting tiny No will still be interpreted as Yes.",
        },
      ];

      const openStep = (step) => {
        state.modalStep = step;
        const current = modalCopy[Math.min(step - 1, modalCopy.length - 1)];
        showModal({
          title: current.title,
          subtitle: current.subtitle,
          onYes: () => {
            closeModal();
            sfx.confirm();
            nextLevel("Great, glad we clarified.");
          },
          onNo: () => {
            if (state.modalStep < 3) {
              openStep(state.modalStep + 1);
            } else {
              closeModal();
              sfx.confirm();
              nextLevel("Noted. Proceeding anyway.");
            }
          },
        });
      };

      const yesClick = () => {
        sfx.confirm();
        nextLevel("Excellent confidence.");
      };

      const noClick = () => {
        openStep(1);
      };

      bind(els.yesBtn, "click", yesClick);
      bind(els.noBtn, "click", noClick);
    },
  },
  {
    id: "l4",
    render() {
      setPrompt(CONFIG.copy.level4Prompt);
      els.countdownWrap.classList.remove("hidden");
      els.yesBtn.textContent = "Yes";
      els.noBtn.textContent = "No";
      els.buttonRow.classList.add("hidden");
      setHint("Buttons unlock at the last moment.");
    },
    init() {
      const totalMs = CONFIG.levelSettings.countdownSeconds * 1000;
      const startedAt = performance.now();
      let shownButtons = false;
      let ended = false;
      let lastTickSecond = CONFIG.levelSettings.countdownSeconds;

      const endIfNeeded = (message, resultKey) => {
        if (ended) return;
        ended = true;
        state.countdownResult = resultKey;
        sfx.confirm();
        nextLevel(message);
      };

      const clickYes = () => endIfNeeded("Quick reflexes.", "clickedYes");
      const clickNo = () => endIfNeeded("No faded into Yes.", "clickedNo");

      const tick = (now) => {
        if (ended) return;
        const elapsed = now - startedAt;
        const left = Math.max(0, totalMs - elapsed);
        els.countdownValue.textContent = (left / 1000).toFixed(1);

        const whole = Math.ceil(left / 1000);
        if (whole !== lastTickSecond && whole > 0 && whole <= 3) {
          lastTickSecond = whole;
          sfx.tick();
        }

        if (!shownButtons && left <= 1000) {
          shownButtons = true;
          els.buttonRow.classList.remove("hidden");
          els.noBtn.classList.add("no-fade");
          queueTimeout(() => {
            els.noBtn.style.pointerEvents = "none";
          }, 840);
        }

        if (left <= 0) {
          endIfNeeded("Time's up. That's a Yes.", "timedOut");
          return;
        }

        queueRaf(tick);
      };

      bind(els.yesBtn, "click", clickYes);
      bind(els.noBtn, "click", clickNo);
      queueRaf(tick);
    },
  },
  {
    id: "l5",
    render() {
      state.memoryAttempts = 0;
      state.memoryGaveUp = false;
      setPrompt(CONFIG.copy.level5Prompt);
      els.memoryForm.classList.remove("hidden");
      els.buttonRow.classList.add("hidden");
      els.memoryLabel.textContent = CONFIG.memory.question;
      els.memoryInput.value = "";
      els.giveUpBtn.classList.add("hidden");
      setHint("Two misses are allowed before mercy appears.");
    },
    init() {
      const validAnswers = CONFIG.memory.answers.map(normalize);
      let wrongAttempts = 0;

      const submit = (event) => {
        event.preventDefault();
        const value = normalize(els.memoryInput.value);
        if (!value) {
          setHint("Type something first.", true);
          return;
        }

        state.memoryAttempts += 1;

        if (validAnswers.includes(value)) {
          sfx.confirm();
          nextLevel("Correct. Well remembered.");
          return;
        }

        wrongAttempts += 1;
        const feedback = CONFIG.memory.wrongFeedback[Math.min(wrongAttempts - 1, CONFIG.memory.wrongFeedback.length - 1)];
        setHint(feedback, true);
        sfx.dodge();

        if (wrongAttempts >= 3) {
          els.giveUpBtn.classList.remove("hidden");
        }
      };

      const giveUp = () => {
        state.memoryGaveUp = true;
        sfx.confirm();
        nextLevel("Fair. We continue.");
      };

      bind(els.memoryForm, "submit", submit);
      bind(els.giveUpBtn, "click", giveUp);
      queueTimeout(() => els.memoryInput.focus(), 50);
    },
  },
  {
    id: "l6",
    render() {
      setPrompt(CONFIG.copy.level6Prompt);
      els.yesBtn.textContent = "YES";
      els.noBtn.hidden = true;
      setHint("Compliance is discouraged.");
    },
    init() {
      const hover = () => {
        els.yesBtn.classList.remove("shake");
        void els.yesBtn.offsetWidth;
        els.yesBtn.classList.add("shake");
        setPrompt("I said don't.");
      };

      const clickYes = () => {
        sfx.error();
        els.errorOverlay.classList.remove("hidden");
        queueTimeout(() => {
          els.errorOverlay.classList.add("hidden");
          nextLevel();
        }, CONFIG.levelSettings.fakeErrorMs);
      };

      bind(els.yesBtn, "pointerenter", hover);
      bind(els.yesBtn, "focus", hover);
      bind(els.yesBtn, "click", clickYes);

      addCleanup(() => {
        els.yesBtn.classList.remove("shake");
      });
    },
  },
  {
    id: "l7",
    render() {
      setPrompt("Try to say no. I dare you.");
      els.yesBtn.textContent = "Yes";
      els.noBtn.textContent = "No";
      setHint("This button has... momentum.");
    },
    init() {
      ensureNoFloating();

      // Disable the CSS transition for continuous motion.
      const previousTransition = els.noBtn.style.transition;
      els.noBtn.style.transition = "none";

      const reduced = isReducedMotion();
      const padding = 14;
      const baseVx = reduced ? 130 : 260;
      const baseVy = reduced ? 105 : 210;

      let vx = baseVx * (Math.random() < 0.5 ? -1 : 1);
      let vy = baseVy * (Math.random() < 0.5 ? -1 : 1);

      const rect = els.noBtn.getBoundingClientRect();
      let x = rect.left;
      let y = rect.top;
      let lastNow = performance.now();
      let rafId = 0;

      const step = (now) => {
        const dtRaw = (now - lastNow) / 1000;
        const dt = Math.max(0, Math.min(0.05, dtRaw));
        lastNow = now;

        const cardRect = els.card.getBoundingClientRect();
        const noRect = els.noBtn.getBoundingClientRect();

        const minX = cardRect.left + padding;
        const maxX = cardRect.right - noRect.width - padding;
        const minY = cardRect.top + padding;
        const maxY = cardRect.bottom - noRect.height - padding;

        x += vx * dt;
        y += vy * dt;

        if (x <= minX) {
          x = minX;
          vx = Math.abs(vx);
        } else if (x >= maxX) {
          x = maxX;
          vx = -Math.abs(vx);
        }

        if (y <= minY) {
          y = minY;
          vy = Math.abs(vy);
        } else if (y >= maxY) {
          y = maxY;
          vy = -Math.abs(vy);
        }

        els.noBtn.style.left = `${x}px`;
        els.noBtn.style.top = `${y}px`;

        rafId = window.requestAnimationFrame(step);
      };

      rafId = window.requestAnimationFrame(step);

      const yesClick = () => {
        sfx.confirm();
        nextLevel("Good choice.");
      };

      const noClick = () => {
        sfx.confirm();
        nextLevel("Nice try. Proceeding.");
      };

      bind(els.yesBtn, "click", yesClick);
      bind(els.noBtn, "click", noClick);

      addCleanup(() => {
        if (rafId) window.cancelAnimationFrame(rafId);
        els.noBtn.style.transition = previousTransition;
        els.noBtn.classList.remove("is-floating");
        els.noBtn.style.left = "";
        els.noBtn.style.top = "";
      });
    },
  },
  {
    id: "l8",
    render() {
      setPrompt("");
      els.buttonRow.classList.add("hidden");
      els.prompt.innerHTML = `
        <section class="captcha-shell" aria-labelledby="captchaTitle">
          <h2 id="captchaTitle" class="captcha-title">Quick verification for ${CONFIG.final.nickname}</h2>
          <p class="captcha-sub">One last thing - promise this isn't a robot.</p>
          <button id="captchaCheck" class="captcha-row btn btn-subtle" type="button" aria-pressed="false">
            <span class="captcha-check" aria-hidden="true"></span>
            <span>I am not a robot</span>
            <span id="captchaSpinner" class="captcha-spinner hidden" aria-hidden="true"></span>
          </button>
          <div id="captchaChallenge" class="captcha-challenge hidden">
            <p class="captcha-sub">Select all squares with green flags.</p>
            <p class="captcha-legend">Green flag = healthy choice.</p>
            <div id="captchaGrid" class="captcha-grid" role="group" aria-label="Captcha tiles"></div>
            <div class="captcha-actions">
              <button id="captchaVerify" class="btn btn-primary" type="button">Verify</button>
            </div>
          </div>
        </section>
      `;
      setHint(`Almost there, ${CONFIG.final.nickname}.`);
    },
    init() {
      const checkBtn = document.getElementById("captchaCheck");
      const spinner = document.getElementById("captchaSpinner");
      const challenge = document.getElementById("captchaChallenge");
      const grid = document.getElementById("captchaGrid");
      const verifyBtn = document.getElementById("captchaVerify");
      const iconSvg = {
        greenFlag: `
          <svg class="captcha-icon captcha-icon-green" viewBox="0 0 36 36" role="img" aria-label="Green flag">
            <path d="M10 6v24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M11 7.5h14.5c1.1 0 1.7 1.4 0.9 2.2l-2.8 3.1 2.8 3.1c0.8 0.8 0.2 2.2-0.9 2.2H11z" fill="currentColor" opacity="0.95"/>
          </svg>
        `,
        grayFlag: `
          <svg class="captcha-icon captcha-icon-gray" viewBox="0 0 36 36" role="img" aria-label="Grey flag">
            <path d="M10 6v24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M11 7.5h14.5c1.1 0 1.7 1.4 0.9 2.2l-2.8 3.1 2.8 3.1c0.8 0.8 0.2 2.2-0.9 2.2H11z" fill="currentColor" opacity="0.95"/>
          </svg>
        `,
        heart: `
          <svg class="captcha-icon captcha-icon-heart" viewBox="0 0 36 36" role="img" aria-label="Heart outline">
            <path d="M18 29s-9.5-5.6-9.5-12.2c0-3.2 2.4-5.6 5.5-5.6 1.9 0 3.5 1 4.4 2.5 0.9-1.5 2.6-2.5 4.5-2.5 3.1 0 5.6 2.4 5.6 5.6C28.5 23.4 18 29 18 29z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/>
          </svg>
        `,
        sparkle: `
          <svg class="captcha-icon captcha-icon-sparkle" viewBox="0 0 36 36" role="img" aria-label="Sparkle cluster">
            <path d="M18 8l1.8 4.2L24 14l-4.2 1.8L18 20l-1.8-4.2L12 14l4.2-1.8z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/>
            <circle cx="27.5" cy="10.5" r="1.6" fill="currentColor"/>
            <circle cx="10.5" cy="24.5" r="1.4" fill="currentColor"/>
          </svg>
        `,
        question: `
          <svg class="captcha-icon captcha-icon-question" viewBox="0 0 36 36" role="img" aria-label="Question mark">
            <path d="M14.3 13.7a4.2 4.2 0 1 1 7.8 2.1c-1.4 2-3.7 2.2-3.7 4.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="18" cy="25.9" r="1.5" fill="currentColor"/>
          </svg>
        `,
      };

      const tiles = [
        { id: 1, kind: "green", svg: iconSvg.greenFlag, selected: false },
        { id: 2, kind: "decoy", svg: iconSvg.grayFlag, selected: false },
        { id: 3, kind: "green", svg: iconSvg.greenFlag, selected: false },
        { id: 4, kind: "decoy", svg: iconSvg.heart, selected: false },
        { id: 5, kind: "decoy", svg: iconSvg.sparkle, selected: false },
        { id: 6, kind: "green", svg: iconSvg.greenFlag, selected: false },
        { id: 7, kind: "decoy", svg: iconSvg.question, selected: false },
        { id: 8, kind: "green", svg: iconSvg.greenFlag, selected: false },
        { id: 9, kind: "decoy", svg: iconSvg.grayFlag, selected: false },
      ];
      const correct = new Set(tiles.filter((tile) => tile.kind === "green").map((tile) => tile.id));
      let sabotagedOnce = false;

      const tileMarkup = tiles
        .map(
          (tile) => `
          <button
            class="captcha-tile"
            type="button"
            data-tile="${tile.id}"
            data-kind="${tile.kind}"
            aria-label="Tile ${tile.id} ${tile.kind === "green" ? "green flag" : "decoy"}"
            aria-pressed="false"
          >
            ${tile.svg}
            <span class="sr-only">tile ${tile.id}</span>
          </button>
        `
        )
        .join("");
      grid.innerHTML = tileMarkup;

      const updateTile = (btn, on) => {
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-pressed", String(on));
      };

      const toggleTile = (btn) => {
        const tile = Number(btn.dataset.tile);
        const tileState = tiles.find((item) => item.id === tile);
        if (!tileState) return;
        const on = !tileState.selected;
        if (on) {
          tileState.selected = true;
          announceLive("Tile selected");
        } else {
          tileState.selected = false;
          announceLive("Tile unselected");
        }
        updateTile(btn, on);
      };

      bind(checkBtn, "click", () => {
        spinner.classList.remove("hidden");
        checkBtn.disabled = true;
        setHint("Verifying...");
        queueTimeout(() => {
          spinner.classList.add("hidden");
          challenge.classList.remove("hidden");
          setHint("Pick the squares with green flags.");
          announceLive("Captcha challenge shown");
        }, 900);
      });

      Array.from(grid.querySelectorAll(".captcha-tile")).forEach((btn) => {
        bind(btn, "click", () => toggleTile(btn));
        bind(btn, "keydown", (event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            toggleTile(btn);
          }
        });
      });

      bind(verifyBtn, "click", () => {
        state.captchaAttempts += 1;
        const selectedIds = tiles.filter((tile) => tile.selected).map((tile) => tile.id);
        const onlyGreensSelected = selectedIds.every((id) => correct.has(id));
        const allGreensSelected = Array.from(correct).every((id) =>
          selectedIds.includes(id)
        );
        const matches = selectedIds.length === correct.size && onlyGreensSelected && allGreensSelected;

        if (matches && !sabotagedOnce) {
          sabotagedOnce = true;
          const sabotageTile = 6;
          const sabotageState = tiles.find((tile) => tile.id === sabotageTile);
          if (sabotageState) sabotageState.selected = false;
          const sabotageBtn = grid.querySelector(`[data-tile="${sabotageTile}"]`);
          if (sabotageBtn) updateTile(sabotageBtn, false);
          setHint("Almost. Try again.");
          announceLive("Verification failed");
          return;
        }

        if (!matches) {
          setHint(`You're close, ${CONFIG.final.nickname}.`);
          announceLive("Verification failed");
          return;
        }

        setHint("Verified. Definitely not a robot. Definitely my Valentine.", true);
        announceLive("Verification complete");
        sfx.confirm();
        nextLevel(null, 800);
      });
    },
  },
  {
    id: "final",
    render() {
      els.body.classList.add("final-mode");
      els.buttonRow.classList.add("hidden");
      els.finalActions.classList.remove("hidden");
      els.finalActions.classList.add("final-secondary-actions");
      els.finalExtras.classList.remove("hidden");
      state.endTimeMs = Date.now();
      setHint(`Last step, ${CONFIG.final.nickname}.`);
      els.prompt.classList.add("final-soft");

      els.prompt.innerHTML = `
        <p id="lineOne" class="type-line soft-line"></p>
        <p id="lineTwo" class="type-line soft-line"></p>
        <p id="lineThree" class="type-line soft-line soft-line-muted"></p>
        <button id="revealPlanBtn" class="btn btn-primary final-main-cta" type="button">${CONFIG.copy.revealPlanCta}</button>
      `;

      populateRunSummary();
      populateCertificate();

      const lineOne = document.getElementById("lineOne");
      const lineTwo = document.getElementById("lineTwo");
      const lineThree = document.getElementById("lineThree");
      const revealPlanBtn = document.getElementById("revealPlanBtn");

      const run = async () => {
        await typeLine(lineOne, CONFIG.copy.finalLead);
        await new Promise((resolve) => queueTimeout(resolve, CONFIG.levelSettings.revealPauseMs));
        await typeLine(lineTwo, CONFIG.copy.finalReveal);
        await new Promise((resolve) => queueTimeout(resolve, 220));
        await typeLine(lineThree, CONFIG.copy.finalPlanLead);
        revealPlanBtn.focus();
        announceLive(`${CONFIG.copy.finalReveal} Ready to reveal the plan.`);
      };

      run();

      bind(revealPlanBtn, "click", () => openPlanModal(revealPlanBtn));
    },
    init() {
      bind(els.googleCalendarBtn, "click", openGoogleCalendar);
      bind(els.calendarBtn, "click", downloadIcs);
      bind(els.copyBtn, "click", copyDetails);
      bind(els.copySummaryBtn, "click", () => copyText(getRunSummaryText(), "Run summary copied."));
      bind(els.shareBtn, "click", shareRunSummary);
    },
  },
];

els.soundToggle.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  updateSoundButton();
  if (state.soundOn) {
    sfx.confirm();
  }
});

els.resetBtn.addEventListener("click", resetExperience);

updateSoundButton();
gotoLevel(0);
