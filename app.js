const CONFIG = {
  name: "Your FavoriteST PERSON EVER",
  final: {
    date: "2026-02-14",
    time: "6:00pm",
    timeZone: "Australia/Sydney",
    durationHours: 2,
    location: "Elements Bar and Grill Walsh Bay",
    venueQuery: "Elements Bar and Grill Walsh Bay",
  },
  copy: {
    introQuestion: "Will you be my Valentine?",
    level2Prompt: "Quick calibration check.",
    level3Prompt: "Final confirmation checkpoint.",
    level4Prompt: "Please hold. Decision window loading...",
    level5Prompt: "Memory check:",
    level6Prompt: "Do NOT click YES.",
    finalLead: "You already finished the hard part.",
    finalReveal: "You are my Valentine.",
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
      "Valentine Quest complete. {reveal} {when} at {where}. {summary}",
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
  startTime: null,
  countdownResult: "unknown",
  memoryAttempts: 0,
  memoryGaveUp: false,
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
  mapFrame: document.getElementById("mapFrame"),
  openMapsLink: document.getElementById("openMapsLink"),
  directionsLink: document.getElementById("directionsLink"),
  weatherHeading: document.getElementById("weatherHeading"),
  weatherWhen: document.getElementById("weatherWhen"),
  weatherStatus: document.getElementById("weatherStatus"),
  weatherTemp: document.getElementById("weatherTemp"),
  weatherRain: document.getElementById("weatherRain"),
  weatherLink: document.getElementById("weatherLink"),
  runSummaryList: document.getElementById("runSummaryList"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
  shareBtn: document.getElementById("shareBtn"),
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
  state.startTime = null;
  state.countdownResult = "unknown";
  state.memoryAttempts = 0;
  state.memoryGaveUp = false;
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
  const timeFormatter = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CONFIG.final.timeZone,
  });

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
  return `${CONFIG.copy.finalReveal} ${event.whenLine} - ${CONFIG.final.location}.`;
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

function getRunSummaryText() {
  const elapsed = state.startTime ? formatDuration(Date.now() - state.startTime) : "0m 00s";
  return [
    `Dodges: ${state.dodgeCount}`,
    `Countdown: ${countdownSummaryLabel()}`,
    `Memory attempts: ${state.memoryAttempts}`,
    `Used I give up: ${state.memoryGaveUp ? "Yes" : "No"}`,
    `Total time: ${elapsed}`,
  ].join("\n");
}

function populateRunSummary() {
  els.runSummaryList.innerHTML = "";
  const lines = getRunSummaryText().split("\n");
  lines.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    els.runSummaryList.appendChild(li);
  });
}

function setupMapWidget() {
  if (!els.mapFrame) return;
  const event = getEventContext();
  els.mapFrame.src = event.mapEmbedUrl;
  els.openMapsLink.href = event.mapsOpenUrl;
  els.directionsLink.href = event.mapsDirectionsUrl;
}

function setWeatherText(status, temp, rain) {
  els.weatherStatus.textContent = status;
  els.weatherTemp.textContent = temp || "";
  els.weatherRain.textContent = rain || "";
}

async function loadWeatherWidget() {
  const requestId = ++state.finalRequestId;
  const event = getEventContext();
  els.weatherHeading.textContent = `Weather at ${CONFIG.final.time}`;
  els.weatherWhen.textContent = event.whenLine;
  els.weatherLink.href = event.weatherSearchUrl;

  const daysUntil = Math.ceil((event.start.getTime() - Date.now()) / 86400000);

  if (daysUntil > 16) {
    setWeatherText(
      `Forecast becomes available closer to the date. Check again in ${daysUntil} days.`,
      "",
      ""
    );
    return;
  }

  if (daysUntil < -1) {
    setWeatherText("This date has already passed. Open live weather for current conditions.", "", "");
    return;
  }

  setWeatherText("Loading forecast...", "", "");

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

    setWeatherText(
      status,
      Number.isFinite(temp) ? `Temperature: ${Math.round(temp)} C` : "Temperature: unavailable",
      Number.isFinite(rain) ? `Rain probability: ${Math.round(rain)}%` : "Rain probability: unavailable"
    );
  } catch (err) {
    if (requestId !== state.finalRequestId || levels[state.levelIndex].id !== "final") {
      return;
    }
    setWeatherText(
      "Unable to load forecast right now.",
      "Use the live forecast link for current weather.",
      ""
    );
  }
}

function shareSummaryText() {
  const event = getEventContext();
  return CONFIG.share.template
    .replace("{reveal}", CONFIG.copy.finalReveal)
    .replace("{when}", event.whenLine)
    .replace("{where}", CONFIG.final.location)
    .replace("{summary}", getRunSummaryText().replace(/\n/g, " | "));
}

async function shareRunSummary() {
  const text = shareSummaryText();
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Valentine Quest",
        text,
      });
      setHint("Shared.", true);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  await copyText(text, "Share is unavailable here. Summary copied instead.");
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
      if (!state.startTime) {
        state.startTime = Date.now();
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
    id: "final",
    render() {
      els.body.classList.add("final-mode");
      els.eyebrow.textContent = "Final";
      els.buttonRow.classList.add("hidden");
      els.finalActions.classList.remove("hidden");
      els.finalExtras.classList.remove("hidden");
      setHint("No gimmicks left.");

      els.prompt.innerHTML = `
        <p id="lineOne" class="type-line"></p>
        <p id="lineTwo" class="type-line" style="margin-top:10px;"></p>
        <p id="lineDetails" class="type-line" style="margin-top:14px; color: var(--muted);"></p>
      `;

      populateRunSummary();
      setupMapWidget();
      loadWeatherWidget();

      const event = getEventContext();
      const lineOne = document.getElementById("lineOne");
      const lineTwo = document.getElementById("lineTwo");
      const lineDetails = document.getElementById("lineDetails");

      const run = async () => {
        await typeLine(lineOne, CONFIG.copy.finalLead);
        await new Promise((resolve) => queueTimeout(resolve, CONFIG.levelSettings.revealPauseMs));
        await typeLine(lineTwo, CONFIG.copy.finalReveal);
        await new Promise((resolve) => queueTimeout(resolve, 220));
        lineDetails.classList.add("show");
        lineDetails.innerHTML = `
          <div class="invite-details" aria-label="Invitation details">
            <span class="invite-chip" aria-label="Date">
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.2" y="3.3" width="11.6" height="10.2" rx="1.8"></rect><line x1="5" y1="1.8" x2="5" y2="4.6"></line><line x1="11" y1="1.8" x2="11" y2="4.6"></line><line x1="2.2" y1="6.3" x2="13.8" y2="6.3"></line></svg>
              ${CONFIG.final.date}
            </span>
            <span class="invite-chip" aria-label="Time">
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.8"></circle><line x1="8" y1="8" x2="8" y2="5"></line><line x1="8" y1="8" x2="10.8" y2="9.5"></line></svg>
              ${CONFIG.final.time}
            </span>
            <span class="invite-chip" aria-label="Location">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.2s-4-4.1-4-7a4 4 0 1 1 8 0c0 2.9-4 7-4 7z"></path><circle cx="8" cy="7.2" r="1.4"></circle></svg>
              ${CONFIG.final.location}
            </span>
          </div>
        `;
        announceLive(`${CONFIG.copy.finalReveal} ${event.whenLine}`);
      };

      run();
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
