(function (root) {
  "use strict";

  const U = root.PTUtil;
  const Store = root.PTStore;
  const PRIMARY = "btn btn-primary";
  const GHOST = "btn btn-ghost";
  const SMALL = "btn btn-small btn-ghost";
  const DANGER = "btn btn-small btn-danger-ghost";

  let state = null;
  const stack = [];
  const session = { logLimit: {}, exercise: {}, saveWarned: false };

  function topOverlay() {
    return stack.length ? stack[stack.length - 1] : null;
  }

  function findMod(id) {
    return state.modules.find((m) => m.id === id) || null;
  }

  function activeMod() {
    return findMod(state.settings.activeModuleId) || state.modules[0] || null;
  }

  function ensureActive() {
    if (!state.modules.some((m) => m.id === state.settings.activeModuleId)) {
      state.settings.activeModuleId = state.modules[0] ? state.modules[0].id : null;
      persist();
    }
  }

  function displayTitle() {
    return (state.settings.appTitle || "").trim() || "Personal Tracker";
  }

  function L(mod, key) {
    const value = mod.labels && Object.prototype.hasOwnProperty.call(mod.labels, key) ? String(mod.labels[key]).trim() : "";
    if (value) return value;
    const meta = Store.TYPES[mod.type];
    return meta && meta.labels && meta.labels[key] ? meta.labels[key] : "";
  }

  function persist() {
    state.version = 1;
    const ok = Store.save(state);
    if (!ok && !session.saveWarned) {
      session.saveWarned = true;
      toast("Couldn't save on this device. Export a backup before you leave.");
    }
    return ok;
  }

  function commit() {
    persist();
    render();
  }

  function toast(message) {
    const host = document.getElementById("toasts");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => { el.remove(); }, 4200);
  }

  function effectiveTheme() {
    if (state.settings.theme === "dark") return "dark";
    if (state.settings.theme === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme() {
    const choice = state.settings.theme;
    if (choice === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", choice);
    const meta = document.getElementById("theme-color");
    if (meta) meta.setAttribute("content", effectiveTheme() === "dark" ? "#101210" : "#0c5f59");
  }

  function themeName() {
    if (state.settings.theme === "light") return "Light";
    if (state.settings.theme === "dark") return "Dark";
    return "Auto";
  }

  function btn(label, action, extra, cls) {
    const data = Object.assign({}, extra || {});
    const attrs = ['type="button"', 'class="' + (cls || SMALL) + '"', 'data-action="' + U.esc(action) + '"'];
    if (data.disabled) attrs.push("disabled");
    delete data.disabled;
    if (data.ariaLabel) attrs.push('aria-label="' + U.esc(data.ariaLabel) + '"');
    delete data.ariaLabel;
    Object.keys(data).forEach((key) => {
      if (data[key] == null || data[key] === false) return;
      attrs.push("data-" + key + '="' + U.esc(data[key]) + '"');
    });
    return "<button " + attrs.join(" ") + ">" + U.esc(label) + "</button>";
  }

  function brand() {
    return '<div class="brand">' +
      '<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0c5f59"></rect>' +
      '<path d="M32 14.5a17.5 17.5 0 1 1-12.2 30" fill="none" stroke="#f4f0e6" stroke-width="5" stroke-linecap="round"></path>' +
      '<circle cx="44.2" cy="22.2" r="3.4" fill="#e2a86a"></circle></svg>' +
      '<div><div class="brand-name">' + U.esc(displayTitle()) + '</div><div class="brand-sub">On this device</div></div></div>';
  }

  function navButtons(kind) {
    const active = activeMod();
    return state.modules.map((m) => {
      const on = active && active.id === m.id;
      const cls = kind === "chip" ? "chip" : "nav-btn";
      return '<button type="button" class="' + cls + '" data-action="open-module" data-id="' + U.esc(m.id) + '" data-nav-id="' + U.esc(m.id) + '" aria-current="' + (on ? "page" : "false") + '"><span class="nav-label">' + U.esc(m.title) + "</span></button>";
    }).join("");
  }

  function welcome() {
    if (state.settings.welcomeDismissed) return "";
    return '<div class="welcome"><p>This stays on this device. Nothing is uploaded. Export a backup when you want a copy you can move to your phone.</p>' +
      btn("OK", "dismiss-welcome", {}, SMALL) + "</div>";
  }

  function shell() {
    const mod = activeMod();
    return '<a class="skip" href="#main">Skip to tracker</a><div class="app"><aside class="sidebar">' + brand() +
      '<nav class="side-nav" aria-label="Modules">' + navButtons("side") + "</nav>" +
      '<div class="side-foot">' +
      btn(themeName(), "theme-toggle", { ariaLabel: "Color theme, currently " + themeName() }, GHOST) +
      btn("Add a module", "add-module", {}, GHOST) +
      btn("Settings & data", "settings", {}, GHOST) +
      "</div></aside><div class=\"content\"><div class=\"mobile-head\"><header class=\"topbar\">" + brand() +
      '<div class="top-actions">' +
      btn(themeName(), "theme-toggle", { ariaLabel: "Color theme, currently " + themeName() }, SMALL) +
      btn("Settings", "settings", {}, SMALL) +
      "</div></header><nav class=\"chips\" aria-label=\"Modules\">" + navButtons("chip") +
      btn("+", "add-module", { ariaLabel: "Add a module" }, "chip chip-add") +
      '</nav></div><main class="main" id="main">' + welcome() +
      (mod ? safeModule(mod) : emptyAll()) +
      '<p class="privacy-foot">Stored only in this browser on this device.</p></main></div></div>';
  }

  function emptyAll() {
    return '<div class="empty"><h1>No modules</h1><p>Add a tracker to get started.</p><div class="actions">' +
      btn("Add a module", "add-module", {}, PRIMARY) + "</div></div>";
  }

  function render() {
    ensureActive();
    let html;
    try {
      html = shell();
    } catch (err) {
      console.error(err);
      toast("Something on the page couldn't be shown.");
      return;
    }
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    const before = desktop ? document.querySelector(".main") : document.scrollingElement;
    const y = before ? before.scrollTop : 0;
    document.getElementById("app").innerHTML = html;
    document.title = displayTitle();
    const after = desktop ? document.querySelector(".main") : document.scrollingElement;
    if (after) after.scrollTop = y;
    const chips = document.querySelector(".chips");
    const chip = document.querySelector(".chip[aria-current='page']");
    if (chips && chip) chips.scrollLeft = Math.max(0, chip.offsetLeft - 16);
  }

  function moduleHead(mod, lede) {
    return '<div class="module-head"><div><h1 id="module-title">' + U.esc(mod.title) + "</h1>" +
      (lede ? '<p class="lede">' + U.esc(lede) + "</p>" : "") +
      '</div>' + btn("Customize", "module-settings", { id: mod.id }, SMALL) + "</div>";
  }

  function sectionHead(title, buttonHtml) {
    return '<div class="section-head"><h2>' + U.esc(title) + "</h2>" + (buttonHtml || "") + "</div>";
  }

  function bar(pct) {
    const width = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="bar" role="presentation"><span style="width:' + width.toFixed(2) + '%"></span></div>';
  }

  function ringSVG(pct) {
    const r = 42;
    const c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1, Number(pct) || 0));
    return '<svg class="ring" viewBox="0 0 108 108" aria-hidden="true"><circle class="ring-track" cx="54" cy="54" r="' + r + '"></circle>' +
      '<circle class="ring-value" cx="54" cy="54" r="' + r + '" stroke-dasharray="' + (c * p).toFixed(2) + " " + (c - c * p).toFixed(2) + '" transform="rotate(-90 54 54)"></circle></svg>';
  }

  function lineChart(points, opts) {
    if (!points.length) return "";
    const w = 640;
    const h = 260;
    const pad = { l: opts.padLeft || 58, r: 14, t: 16, b: 34 };
    const ys = points.map((p) => p.y);
    let min = Math.min.apply(null, ys);
    let max = Math.max.apply(null, ys);
    if (min === max) {
      const padY = Math.abs(min) > 1 ? Math.abs(min) * 0.08 : 1;
      min -= padY;
      max += padY;
    } else {
      const span = max - min;
      min -= span * 0.16;
      max += span * 0.16;
    }
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const xAt = (i) => (points.length === 1 ? pad.l + innerW / 2 : pad.l + (innerW * i) / (points.length - 1));
    const yAt = (v) => pad.t + innerH - ((v - min) / (max - min)) * innerH;
    const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(p.y), label: p.label }));
    let grid = "";
    [max, (max + min) / 2, min].forEach((v) => {
      const y = yAt(v);
      grid += '<line class="grid" x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + y.toFixed(1) + '"></line>';
      grid += '<text x="4" y="' + (y + 4).toFixed(1) + '">' + U.esc(opts.yFormat(v)) + "</text>";
    });
    let line = "";
    let area = "";
    if (coords.length >= 2) {
      const d = coords.map((c, i) => (i === 0 ? "M" : "L") + c.x.toFixed(1) + " " + c.y.toFixed(1)).join(" ");
      line = '<path class="line" d="' + d + '"></path>';
      const base = (pad.t + innerH).toFixed(1);
      area = '<path class="area" d="' + d + " L " + coords[coords.length - 1].x.toFixed(1) + " " + base + " L " + coords[0].x.toFixed(1) + " " + base + ' Z"></path>';
    }
    let dots = coords.map((c, i) => '<circle class="dot" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="' + (i === coords.length - 1 ? 4.5 : 3) + '"></circle>').join("");
    const indexes = coords.length <= 4 ? coords.map((_, i) => i) : [0, Math.floor((coords.length - 1) / 2), coords.length - 1];
    const labels = indexes.map((i) => {
      const anchor = coords.length === 1 ? "middle" : (i === 0 ? "start" : (i === coords.length - 1 ? "end" : "middle"));
      return '<text x="' + coords[i].x.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="' + anchor + '">' + U.esc(coords[i].label) + "</text>";
    }).join("");
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + U.esc(opts.aria) + '">' + grid + area + line + dots + labels + "</svg>";
  }

  function byDateDesc(a, b) {
    const d = String(b.date || "").localeCompare(String(a.date || ""));
    if (d) return d;
    return String(b.at || "").localeCompare(String(a.at || ""));
  }

  function streakInfo(mod) {
    const start = mod.data.startDate;
    if (!start) return { days: 0, state: "unset", start: null };
    const t = U.today();
    if (start > t) return { days: 0, state: "future", start };
    return { days: U.daysInclusive(start, t), state: "active", start };
  }

  function milestoneProgress(mod, days) {
    const ms = (mod.options.milestones || []).slice().sort((a, b) => a - b);
    const next = ms.filter((n) => n > days)[0] || null;
    if (!next) return { pct: days > 0 ? 1 : 0, next: null };
    const prevList = ms.filter((n) => n <= days);
    const prev = prevList.length ? prevList[prevList.length - 1] : 0;
    return { pct: (days - prev) / (next - prev), next };
  }

  function pendingMilestone(mod) {
    const info = streakInfo(mod);
    if (info.state !== "active") return null;
    const seen = {};
    (mod.data.celebrated || []).forEach((n) => { seen[Number(n)] = true; });
    let best = null;
    (mod.options.milestones || []).forEach((n) => {
      if (n <= info.days && !seen[n]) best = best == null ? n : Math.max(best, n);
    });
    return best;
  }

  function ackMilestones(mod) {
    const info = streakInfo(mod);
    const have = {};
    (mod.data.celebrated || []).forEach((n) => { have[Number(n)] = true; });
    (mod.options.milestones || []).forEach((n) => { if (n <= info.days) have[n] = true; });
    mod.data.celebrated = Object.keys(have).map(Number).sort((a, b) => a - b);
  }

  function milestoneCopy(n) {
    const known = { 1: "The first day counts.", 7: "A full week.", 30: "Thirty days.", 60: "Sixty days.", 90: "Ninety days.", 180: "Half a year.", 365: "A full year." };
    return known[n] || "You reached a milestone you set.";
  }

  function maybeCelebrate() {
    if (stack.length) return;
    const mod = activeMod();
    if (!mod || mod.type !== "sober") return;
    const hit = pendingMilestone(mod);
    if (hit == null) return;
    pushOverlay({
      kind: "celebrate",
      moduleId: mod.id,
      milestone: hit,
      onClose() {
        const currentMod = findMod(mod.id);
        if (!currentMod) return;
        ackMilestones(currentMod);
        commit();
      }
    });
  }

  function recentDates(start, end, limit) {
    const dates = [];
    let d = end;
    while (d >= start && dates.length < limit) {
      dates.push(d);
      d = U.addDays(d, -1);
    }
    return { dates, more: d >= start };
  }

  function renderSober(mod) {
    const info = streakInfo(mod);
    const unit = L(mod, "unit");
    const progress = milestoneProgress(mod, info.days);
    let sub = "Set a start date when the next streak begins.";
    if (info.state === "future") sub = "Starts " + U.formatDate(info.start) + ".";
    if (info.state === "active") {
      sub = L(mod, "since") + " " + U.formatDate(info.start) + ". Day 1 is the start date.";
      if (progress.next) sub += " Next milestone is " + progress.next + " " + U.unitWord(progress.next, unit) + ".";
      else sub += " Every milestone on your list is reached.";
    }
    const actions = [];
    if (info.state === "unset") actions.push(btn(L(mod, "setStart"), "set-start", { id: mod.id }, PRIMARY));
    else actions.push(btn(L(mod, "editStart"), "set-start", { id: mod.id }, GHOST));
    if (info.state === "active") actions.push(btn(L(mod, "reset"), "reset-streak", { id: mod.id }, "btn btn-danger-ghost"));
    const miles = (mod.options.milestones || []).slice().sort((a, b) => a - b).map((n) => {
      const done = info.state === "active" && info.days >= n;
      const isNext = info.state === "active" && progress.next === n;
      const when = info.start && info.state !== "unset" ? U.formatDate(U.addDays(info.start, n - 1)) : "";
      const cls = "mile" + (done ? " is-done" : "") + (isNext ? " is-next" : "");
      return '<article class="' + cls + '"><p class="mile-num">' + n + "</p><p>" + U.esc(U.unitWord(n, unit)) + "</p><p class=\"mile-date\">" +
        U.esc(done ? "Reached" : (when || "Upcoming")) + "</p></article>";
    }).join("");
    let journal = '<p class="empty">Set a start date to build the day log.</p>';
    if (info.state === "active") {
      const limit = session.logLimit[mod.id] || 45;
      const page = recentDates(info.start, U.today(), limit);
      const rows = page.dates.map((date) => {
        const note = mod.data.notes && mod.data.notes[date] ? mod.data.notes[date] : "";
        const dayN = U.daysInclusive(info.start, date);
        return '<article class="item"><div class="item-main"><p class="item-title">' + U.esc(U.formatDate(date)) + '</p><p class="meta">Day ' + dayN +
          "</p>" + (note ? '<p class="note">' + U.esc(note) + "</p>" : "") + "</div><div class=\"item-actions\">" +
          btn(note ? "Edit note" : L(mod, "note"), "add-note", { id: mod.id, date: date }, SMALL) + "</div></article>";
      }).join("");
      journal = '<div class="list">' + rows + "</div>";
      if (page.more) journal += '<div class="actions">' + btn("Show earlier days", "show-more-log", { id: mod.id }, GHOST) + "</div>";
    } else if (info.state === "future") journal = '<p class="empty">The day log starts when this date arrives.</p>';
    const past = (mod.data.past || []).slice().sort((a, b) => String(b.resetAt).localeCompare(String(a.resetAt)));
    const pastHtml = past.length ? '<div class="list">' + past.map((row) => {
      const noteDates = Object.keys(row.notes || {}).sort().reverse();
      const notes = noteDates.length ? '<details class="fold"><summary>' + noteDates.length + " note" + (noteDates.length === 1 ? "" : "s") + "</summary><ul class=\"note-list\">" +
        noteDates.map((date) => "<li><span>" + U.esc(U.formatDate(date)) + "</span> " + U.esc(row.notes[date]) + "</li>").join("") + "</ul></details>" : "";
      return '<article class="item block"><div class="item-top"><div class="item-main"><p class="item-title">' + row.days + " " + U.esc(U.unitWord(row.days, unit)) +
        '</p><p class="meta">' + U.esc(U.formatDate(row.startDate) + " – " + U.formatDate(row.endDate)) + "</p>" + notes +
        '</div><div class="item-actions">' + btn("Delete", "delete-past", { id: mod.id, entry: row.id }, DANGER) + "</div></div></article>";
    }).join("") + "</div>" : '<p class="empty">Ended streaks will be kept here.</p>';
    return moduleHead(mod, "Day 1 is the start date. Reset keeps the streak in your history.") +
      '<section class="hero">' + ringSVG(info.state === "active" ? progress.pct : 0) +
      '<div><p class="eyebrow">' + U.esc(L(mod, "hero")) + '</p><p class="hero-num">' + (info.state === "active" ? info.days : "—") +
      '</p><p class="hero-unit">' + U.esc(info.state === "active" ? U.unitWord(info.days, unit) : "") + '</p><p class="meta">' + U.esc(sub) + "</p></div></section>" +
      '<div class="actions">' + actions.join("") + "</div>" +
      sectionHead(L(mod, "milestones")) + '<div class="miles">' + miles + "</div>" +
      sectionHead(L(mod, "journal")) + journal +
      sectionHead(L(mod, "history")) + pastHtml;
  }

  function fastRange(entry) {
    const end = U.sameLocalDay(entry.startedAt, entry.endedAt) ? U.formatTime(entry.endedAt) : U.formatDateTime(entry.endedAt);
    let text = U.formatDateTime(entry.startedAt) + " – " + end + " · " + U.formatDuration(new Date(entry.endedAt) - new Date(entry.startedAt));
    if (entry.targetHours) {
      const met = new Date(entry.endedAt) - new Date(entry.startedAt) >= entry.targetHours * 3600000;
      text += met ? " · Target met" : " · Short of " + U.trimNum(entry.targetHours) + "h";
    }
    return text;
  }

  function renderFasting(mod) {
    const active = mod.data.active;
    let hero = '<section class="hero"><div><p class="eyebrow">' + U.esc(L(mod, "hero")) + '</p><p class="timer">Not fasting</p><p class="meta">Start one when you are ready. The start time stays on this device.</p></div></section>' +
      '<div class="actions">' + btn(L(mod, "start"), "start-fast", { id: mod.id }, PRIMARY) + btn(L(mod, "addPast"), "add-past-fast", { id: mod.id }, GHOST) + "</div>";
    if (active) {
      const elapsed = Date.now() - new Date(active.startedAt).getTime();
      const target = active.targetHours || 0;
      const pct = target ? Math.max(0, Math.min(100, (elapsed / (target * 3600000)) * 100)) : 0;
      const reached = target && elapsed >= target * 3600000;
      hero = '<section class="hero">' + (target ? ringSVG(pct / 100) : "") + '<div><p class="eyebrow">' + U.esc(L(mod, "hero")) + "</p>" +
        '<p class="timer" data-live="fast" data-fastid="' + U.esc(active.id) + '" data-start="' + U.esc(active.startedAt) + '" data-target="' + U.esc(target || "") + '">' + U.esc(U.formatLive(elapsed)) + "</p>" +
        '<p class="meta">Started ' + U.esc(U.formatDateTime(active.startedAt)) + (target ? " · " + U.esc(U.trimNum(target)) + "h target" : "") + "</p>" +
        (active.note ? '<p class="note">' + U.esc(active.note) + "</p>" : "") +
        (target ? bar(pct).replace("<span", '<span data-fast-bar="' + U.esc(active.id) + '"') : "") +
        '<p class="meta timer-state" data-fast-state="' + U.esc(active.id) + '"' + (reached ? "" : " hidden") + ">Target reached. The timer keeps going until you end the fast.</p></div></section>" +
        '<div class="actions">' + btn(L(mod, "end"), "end-fast", { id: mod.id }, PRIMARY) + btn(L(mod, "edit"), "edit-active-fast", { id: mod.id }, GHOST) +
        btn(L(mod, "discard"), "discard-fast", { id: mod.id }, "btn btn-danger-ghost") + "</div>";
    }
    const history = (mod.data.history || []).slice().sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const list = history.length ? '<div class="list">' + history.map((row) => '<article class="item"><div class="item-main"><p class="item-title">' +
      U.esc(U.formatDuration(new Date(row.endedAt) - new Date(row.startedAt))) + '</p><p class="meta">' + U.esc(fastRange(row)) + "</p>" +
      (row.note ? '<p class="note">' + U.esc(row.note) + "</p>" : "") + '</div><div class="item-actions">' +
      btn("Edit", "edit-fast", { id: mod.id, entry: row.id }, SMALL) + btn("Delete", "delete-fast", { id: mod.id, entry: row.id }, DANGER) +
      "</div></article>").join("") + "</div>" : '<p class="empty">No fasts logged yet.</p>';
    const addPast = active ? '<div class="actions">' + btn(L(mod, "addPast"), "add-past-fast", { id: mod.id }, GHOST) + "</div>" : "";
    return moduleHead(mod, "The timer keeps the start time on this device until you end it.") + hero +
      sectionHead(L(mod, "history")) + addPast + list;
  }

  function goalProgressText(goal) {
    const unit = goal.unit ? " " + goal.unit : "";
    if (goal.target) {
      const pct = Math.round((Number(goal.progress) / Number(goal.target)) * 100);
      return U.trimNum(goal.progress) + unit + " of " + U.trimNum(goal.target) + unit + " · " + pct + "%";
    }
    if (goal.progress) return U.trimNum(goal.progress) + unit;
    return "";
  }

  function renderGoals(mod) {
    const goals = (mod.data.goals || []).slice().sort((a, b) => {
      const ad = a.status === "done" ? 1 : 0;
      const bd = b.status === "done" ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    const list = goals.length ? '<div class="list">' + goals.map((goal) => {
      const due = goal.deadline ? U.formatDate(goal.deadline) : "";
      const pastDue = goal.deadline && goal.status !== "done" && goal.deadline < U.today();
      const progress = goalProgressText(goal);
      const pct = goal.target ? (Number(goal.progress) / Number(goal.target)) * 100 : 0;
      const checkins = (goal.checkins || []).slice().sort(byDateDesc).map((c) => '<div class="checkin"><div><p class="meta">' + U.esc(U.formatDate(c.date)) +
        (c.value != null ? " · " + U.esc(U.trimNum(c.value)) : "") + "</p>" + (c.note ? '<p class="note">' + U.esc(c.note) + "</p>" : "") +
        '</div><div class="item-actions">' + btn("Edit", "edit-checkin", { id: mod.id, entry: goal.id, checkin: c.id }, SMALL) +
        btn("Delete", "delete-checkin", { id: mod.id, entry: goal.id, checkin: c.id }, DANGER) + "</div></div>").join("");
      return '<article class="item block"><div class="item-top"><div class="item-main"><p class="item-title">' + U.esc(goal.title) +
        (goal.status === "done" ? ' <span class="badge">Done</span>' : "") + (pastDue ? ' <span class="badge warm">Past due</span>' : "") +
        "</p>" + (due ? '<p class="meta">Due ' + U.esc(due) + "</p>" : "") + (goal.detail ? '<p class="note">' + U.esc(goal.detail) + "</p>" : "") +
        (progress ? '<p class="meta">' + U.esc(progress) + "</p>" : "") + (goal.target ? bar(pct) : "") +
        '</div><div class="item-actions">' + btn(L(mod, "checkin"), "add-checkin", { id: mod.id, entry: goal.id }, SMALL) +
        btn(goal.status === "done" ? L(mod, "reopen") : L(mod, "done"), "toggle-goal", { id: mod.id, entry: goal.id }, SMALL) +
        btn("Edit", "edit-goal", { id: mod.id, entry: goal.id }, SMALL) + btn("Delete", "delete-goal", { id: mod.id, entry: goal.id }, DANGER) +
        "</div></div>" + (checkins ? '<div class="checkins">' + checkins + "</div>" : "") + "</article>";
    }).join("") + "</div>" : '<p class="empty">' + U.esc(L(mod, "empty")) + "</p>";
    return moduleHead(mod, "Set a target, update progress, and leave dated notes.") +
      '<div class="actions">' + btn(L(mod, "add"), "add-goal", { id: mod.id }, PRIMARY) + "</div>" + list;
  }

  function signedNum(n) {
    if (n > 0) return "+" + U.trimNum(n);
    if (n < 0) return "-" + U.trimNum(Math.abs(n));
    return "0";
  }

  function renderWeight(mod) {
    const unit = mod.options.unit || "lb";
    const desc = (mod.data.entries || []).slice().sort(byDateDesc);
    const asc = desc.slice().reverse();
    let stats = "";
    let chart = "";
    if (desc.length) {
      const latest = desc[0].weight;
      const change = desc.length >= 2 ? latest - asc[0].weight : null;
      stats = '<div class="stats"><div><span class="eyebrow">' + U.esc(L(mod, "latest")) + "</span><strong>" + U.esc(U.trimNum(latest) + " " + unit) +
        "</strong></div><div><span class=\"eyebrow\">" + U.esc(L(mod, "change")) + "</span><strong>" +
        (change == null ? "—" : U.esc(signedNum(change) + " " + unit)) + "</strong></div><div><span class=\"eyebrow\">" +
        U.esc(L(mod, "entries")) + "</span><strong>" + desc.length + "</strong></div></div>";
      const points = asc.map((row) => ({ y: row.weight, label: U.formatDate(row.date) }));
      const aria = "Weight trend, " + points.length + " entries, from " + U.trimNum(asc[0].weight) + " " + unit + " to " + U.trimNum(desc[0].weight) + " " + unit + ".";
      chart = sectionHead(L(mod, "chart")) + '<div class="chart-card">' + lineChart(points, {
        aria,
        yFormat: (v) => U.trimNum(v)
      }) + "</div>";
    }
    const list = desc.length ? '<div class="list">' + desc.map((row) => '<article class="item"><div class="item-main"><p class="item-title">' +
      U.esc(U.trimNum(row.weight) + " " + unit) + '</p><p class="meta">' + U.esc(U.formatDate(row.date)) + "</p>" +
      (row.note ? '<p class="note">' + U.esc(row.note) + "</p>" : "") + '</div><div class="item-actions">' +
      btn("Edit", "edit-weight", { id: mod.id, entry: row.id }, SMALL) + btn("Delete", "delete-weight", { id: mod.id, entry: row.id }, DANGER) +
      "</div></article>").join("") + "</div>" : '<p class="empty">' + U.esc(L(mod, "empty")) + "</p>";
    return moduleHead(mod, "A log and a simple trend. The unit is a label on the numbers.") +
      '<div class="actions">' + btn(L(mod, "add"), "add-weight", { id: mod.id }, PRIMARY) + "</div>" + stats + chart + list;
  }

  function formatSet(set, unit) {
    if (set.weight == null) return set.reps + " reps";
    return U.trimNum(set.weight) + " " + unit + " × " + set.reps;
  }

  function workoutVolume(workout) {
    let total = 0;
    let any = false;
    (workout.exercises || []).forEach((ex) => {
      (ex.sets || []).forEach((set) => {
        if (set.weight == null) return;
        total += Number(set.weight) * Number(set.reps);
        any = true;
      });
    });
    return any ? total : null;
  }

  function exerciseNames(mod) {
    const map = new Map();
    (mod.data.workouts || []).forEach((w) => {
      (w.exercises || []).forEach((ex) => {
        const label = (ex.name || "").trim();
        if (!label) return;
        const key = label.toLowerCase();
        if (!map.has(key)) map.set(key, label);
      });
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }

  function renderGym(mod) {
    const unit = mod.options.unit || "lb";
    const workouts = (mod.data.workouts || []).slice().sort(byDateDesc);
    const list = workouts.length ? '<div class="list">' + workouts.map((w) => {
      const volume = workoutVolume(w);
      const lines = (w.exercises || []).map((ex) => '<div class="ex-line"><strong>' + U.esc(ex.name) + "</strong><span>" +
        U.esc((ex.sets || []).map((set) => formatSet(set, unit)).join(", ")) + "</span></div>").join("");
      const meta = U.formatDate(w.date) + (volume == null ? "" : " · " + L(mod, "volume") + " " + Math.round(volume).toLocaleString() + " " + unit);
      return '<article class="item block"><div class="item-top"><div class="item-main"><p class="item-title">' + U.esc(w.name) +
        '</p><p class="meta">' + U.esc(meta) +
        "</p>" + (w.note ? '<p class="note">' + U.esc(w.note) + "</p>" : "") + '</div><div class="item-actions">' +
        btn("Edit", "edit-workout", { id: mod.id, entry: w.id }, SMALL) + btn("Delete", "delete-workout", { id: mod.id, entry: w.id }, DANGER) +
        "</div></div>" + lines + "</article>";
    }).join("") + "</div>" : '<p class="empty">' + U.esc(L(mod, "empty")) + "</p>";
    const names = exerciseNames(mod);
    let history = "";
    if (names.length) {
      const selected = names.find((n) => n.key === session.exercise[mod.id]) || names[0];
      const options = names.map((n) => '<option value="' + U.esc(n.key) + '"' + (n.key === selected.key ? " selected" : "") + ">" + U.esc(n.label) + "</option>").join("");
      const rows = [];
      workouts.forEach((w) => {
        (w.exercises || []).forEach((ex) => {
          if ((ex.name || "").trim().toLowerCase() !== selected.key) return;
          rows.push({ date: w.date, name: w.name, sets: ex.sets || [] });
        });
      });
      let best = null;
      rows.forEach((row) => {
        row.sets.forEach((set) => {
          if (!best) { best = { set, date: row.date }; return; }
          const w1 = set.weight == null ? null : Number(set.weight);
          const w2 = best.set.weight == null ? null : Number(best.set.weight);
          if (w1 != null && (w2 == null || w1 > w2 || (w1 === w2 && set.reps > best.set.reps))) best = { set, date: row.date };
          else if (w1 == null && w2 == null && set.reps > best.set.reps) best = { set, date: row.date };
        });
      });
      const bestText = best ? "Best " + formatSet(best.set, unit) + " · " + U.formatDate(best.date) : "";
      const body = rows.map((row) => '<article class="item"><div class="item-main"><p class="item-title">' + U.esc(U.formatDate(row.date)) +
        '</p><p class="meta">' + U.esc(row.name) + "</p><p class=\"meta\">" + U.esc(row.sets.map((set) => formatSet(set, unit)).join(", ")) +
        "</p></div></article>").join("");
      history = sectionHead(L(mod, "history")) + '<label class="field"><span>Exercise</span><select data-action="exercise-pick" data-id="' +
        U.esc(mod.id) + '">' + options + "</select></label>" + (bestText ? '<p class="meta best">' + U.esc(bestText) + "</p>" : "") +
        '<div class="list">' + body + "</div>";
    }
    return moduleHead(mod, "Workouts, sets, and history for each exercise.") +
      '<div class="actions">' + btn(L(mod, "add"), "add-workout", { id: mod.id }, PRIMARY) + "</div>" + list + history;
  }

  function savingsStats(mod) {
    const byGoal = {};
    (mod.data.goals || []).forEach((g) => { byGoal[g.id] = 0; });
    let total = 0;
    let unassigned = 0;
    (mod.data.txns || []).forEach((t) => {
      const amt = (t.type === "withdrawal" ? -1 : 1) * Number(t.amount || 0);
      total += amt;
      if (t.goalId && Object.prototype.hasOwnProperty.call(byGoal, t.goalId)) byGoal[t.goalId] += amt;
      else unassigned += amt;
    });
    return { total, byGoal, unassigned };
  }

  function renderSavings(mod) {
    const symbol = mod.options.symbol || "$";
    const stats = savingsStats(mod);
    const goals = (mod.data.goals || []).map((goal) => {
      const net = stats.byGoal[goal.id] || 0;
      const pct = (net / Number(goal.target)) * 100;
      return '<article class="item block"><div class="item-top"><div class="item-main"><p class="item-title">' + U.esc(goal.name) +
        '</p><p class="meta' + (net < 0 ? " neg" : "") + '">' + U.esc(U.money(net, symbol) + " of " + U.money(goal.target, symbol)) +
        "</p>" + bar(pct) + '</div><div class="item-actions">' + btn("Edit", "edit-savings-goal", { id: mod.id, entry: goal.id }, SMALL) +
        btn("Delete", "delete-savings-goal", { id: mod.id, entry: goal.id }, DANGER) + "</div></div></article>";
    }).join("");
    const txns = (mod.data.txns || []).slice().sort(byDateDesc);
    const txnList = txns.length ? '<div class="list">' + txns.map((t) => {
      const goal = (mod.data.goals || []).find((g) => g.id === t.goalId);
      const sign = t.type === "withdrawal" ? "-" : "+";
      return '<article class="item"><div class="item-main"><p class="item-title ' + (t.type === "withdrawal" ? "neg" : "") + '">' + sign +
        U.esc(U.money(t.amount, symbol)) + '</p><p class="meta">' + U.esc(U.formatDate(t.date)) +
        (goal ? " · " + U.esc(goal.name) : " · Unassigned") + "</p>" + (t.note ? '<p class="note">' + U.esc(t.note) + "</p>" : "") +
        '</div><div class="item-actions">' + btn("Edit", "edit-txn", { id: mod.id, entry: t.id }, SMALL) +
        btn("Delete", "delete-txn", { id: mod.id, entry: t.id }, DANGER) + "</div></article>";
    }).join("") + "</div>" : '<p class="empty">' + U.esc(L(mod, "empty")) + "</p>";
    const asc = (mod.data.txns || []).slice().sort((a, b) => (a.date + (a.at || "")).localeCompare(b.date + (b.at || "")));
    let run = 0;
    const points = asc.map((t) => {
      run += (t.type === "withdrawal" ? -1 : 1) * Number(t.amount || 0);
      return { y: run, label: U.formatDate(t.date) };
    });
    const chart = points.length ? sectionHead("Balance over time") + '<div class="chart-card">' + lineChart(points, {
      padLeft: 72,
      aria: "Savings balance over " + points.length + " transactions. Latest " + U.money(stats.total, symbol) + ".",
      yFormat: (v) => U.shortMoney(v, symbol)
    }) + "</div>" : "";
    return moduleHead(mod, "Each goal tracks the deposits and withdrawals you attach to it. The balance adds everything together.") +
      '<section class="hero"><div><p class="eyebrow">' + U.esc(L(mod, "balance")) + '</p><p class="hero-num compact">' + U.esc(U.money(stats.total, symbol)) +
      '</p><p class="meta">' + U.esc((mod.options.code || "") + (stats.unassigned ? " · Unassigned " + U.money(stats.unassigned, symbol) : "")) + "</p></div></section>" +
      '<div class="actions">' + btn(L(mod, "deposit"), "add-deposit", { id: mod.id }, PRIMARY) + btn(L(mod, "withdraw"), "add-withdrawal", { id: mod.id }, GHOST) +
      btn(L(mod, "addGoal"), "add-savings-goal", { id: mod.id }, GHOST) + "</div>" + chart +
      sectionHead(L(mod, "goals")) + (goals ? '<div class="list">' + goals + "</div>" : '<p class="empty">No savings goals yet.</p>') + txnList;
  }

  function renderCounter(mod) {
    const unit = (mod.options.unit || "").trim();
    const step = mod.options.step || 1;
    const history = (mod.data.history || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const list = history.length ? '<div class="list">' + history.map((row) => '<article class="item"><div class="item-main"><p class="item-title">' +
      U.esc(signedNum(row.delta)) + '</p><p class="meta">' + U.esc(U.formatDateTime(row.at) + " · total " + U.trimNum(row.valueAfter) + (unit ? " " + unit : "")) +
      "</p>" + (row.note ? '<p class="note">' + U.esc(row.note) + "</p>" : "") +
      '</div><div class="item-actions">' + btn("Delete", "delete-counter-history", { id: mod.id, entry: row.id }, DANGER) + "</div></article>").join("") + "</div>" :
      '<p class="empty">' + U.esc(L(mod, "empty")) + "</p>";
    return moduleHead(mod, "Tap to count. History keeps each change.") +
      '<section class="hero"><div><p class="eyebrow">' + U.esc(L(mod, "hero")) + '</p><p class="hero-num">' + U.esc(U.trimNum(mod.data.value)) +
      '</p><p class="hero-unit">' + U.esc(unit) + "</p></div></section>" +
      '<div class="actions">' + btn("− " + U.trimNum(step), "counter-step", { id: mod.id, dir: "-1" }, GHOST) +
      btn("+ " + U.trimNum(step), "counter-step", { id: mod.id, dir: "1" }, PRIMARY) +
      btn(L(mod, "adjust"), "counter-adjust", { id: mod.id }, GHOST) +
      btn(L(mod, "reset"), "counter-reset", { id: mod.id }, "btn btn-danger-ghost") + "</div>" +
      sectionHead(L(mod, "history")) + list;
  }

  function renderLog(mod) {
    const unit = (mod.options.unit || "").trim();
    const desc = (mod.data.entries || []).slice().sort(byDateDesc);
    const numeric = (mod.data.entries || []).filter((e) => e.value != null).slice().sort((a, b) => (a.date + a.at).localeCompare(b.date + b.at));
    let chart = "";
    if (numeric.length) {
      const points = numeric.map((e) => ({ y: Number(e.value), label: U.formatDate(e.date) }));
      chart = sectionHead(L(mod, "chart")) + '<div class="chart-card">' + lineChart(points, {
        aria: L(mod, "chart") + ", " + points.length + " values.",
        yFormat: (v) => U.trimNum(v)
      }) + "</div>";
    }
    const list = desc.length ? '<div class="list">' + desc.map((row) => '<article class="item"><div class="item-main"><p class="item-title">' + U.esc(row.title) +
      '</p><p class="meta">' + U.esc(U.formatDate(row.date) + (row.value == null ? "" : " · " + U.trimNum(row.value) + (unit ? " " + unit : ""))) +
      "</p>" + (row.note ? '<p class="note">' + U.esc(row.note) + "</p>" : "") + '</div><div class="item-actions">' +
      btn("Edit", "edit-log", { id: mod.id, entry: row.id }, SMALL) + btn("Delete", "delete-log", { id: mod.id, entry: row.id }, DANGER) +
      "</div></article>").join("") + "</div>" : '<p class="empty">' + U.esc(L(mod, "empty")) + "</p>";
    return moduleHead(mod, "A dated list, with a trend when you enter numbers.") +
      '<div class="actions">' + btn(L(mod, "add"), "add-log", { id: mod.id }, PRIMARY) + "</div>" + chart + list;
  }

  function renderUnknown(mod) {
    return moduleHead(mod, "Kept from your backup.") + '<p class="empty">This module type (' + U.esc(mod.originalType || "unknown") +
      ") is not available in this version. It stays in your data and is included when you export.</p>";
  }

  function safeModule(mod) {
    try {
      const map = { sober: renderSober, fasting: renderFasting, goals: renderGoals, weight: renderWeight, gym: renderGym, savings: renderSavings, counter: renderCounter, log: renderLog, unknown: renderUnknown };
      const fn = map[mod.type] || renderUnknown;
      return fn(mod);
    } catch (err) {
      console.error(err);
      return moduleHead(mod, "This module hit a problem while drawing.") + '<p class="empty">Your saved entries are still there. Reload the page and try again.</p>';
    }
  }

  function dialogWrap(opts) {
    return '<div class="dialog' + (opts.wide ? " wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">' +
      U.esc(opts.title) + "</h2>" + (opts.lead ? '<p class="dialog-lead">' + U.esc(opts.lead) + "</p>" : "") + (opts.body || "") + "</div>";
  }

  function fieldHTML(f) {
    const value = f.value == null ? "" : String(f.value);
    const hint = f.hint ? '<span class="hint">' + U.esc(f.hint) + "</span>" : "";
    let control = "";
    if (f.type === "textarea") {
      control = '<textarea name="' + U.esc(f.name) + '" rows="4" maxlength="' + (f.maxlength || 2000) + '">' + U.esc(value) + "</textarea>";
    } else if (f.type === "select") {
      const opts = (f.options || []).map((o) => '<option value="' + U.esc(o.value) + '"' + (String(o.value) === value ? " selected" : "") + ">" + U.esc(o.label) + "</option>").join("");
      control = '<select name="' + U.esc(f.name) + '">' + opts + "</select>";
    } else {
      const attrs = [
        'name="' + U.esc(f.name) + '"',
        'type="' + U.esc(f.type || "text") + '"',
        'value="' + U.esc(value) + '"',
        f.step ? 'step="' + U.esc(f.step) + '"' : "",
        f.min != null ? 'min="' + U.esc(f.min) + '"' : "",
        f.max != null ? 'max="' + U.esc(f.max) + '"' : "",
        f.placeholder ? 'placeholder="' + U.esc(f.placeholder) + '"' : "",
        f.maxlength ? 'maxlength="' + f.maxlength + '"' : "",
        f.inputmode ? 'inputmode="' + U.esc(f.inputmode) + '"' : "",
        'autocomplete="off"'
      ].filter(Boolean).join(" ");
      control = "<input " + attrs + ">";
    }
    return '<label class="field"><span>' + U.esc(f.label) + "</span>" + control + hint + "</label>";
  }

  function formError(msg) {
    const el = document.querySelector("#overlay .form-error");
    if (el) el.textContent = msg;
  }

  function pushOverlay(entry) {
    entry.returnFocus = document.activeElement;
    stack.push(entry);
    renderOverlay();
  }

  function popOverlay() {
    const entry = stack.pop();
    renderOverlay();
    if (!stack.length && entry && entry.returnFocus && document.contains(entry.returnFocus)) {
      try { entry.returnFocus.focus(); } catch (e) { /* ignore */ }
    }
  }

  function renderOverlay() {
    const rootEl = document.getElementById("overlay");
    const app = document.getElementById("app");
    if (!stack.length) {
      rootEl.hidden = true;
      rootEl.innerHTML = "";
      document.body.classList.remove("modal-open");
      if (app) app.removeAttribute("inert");
      return;
    }
    const top = topOverlay();
    let html = "";
    try {
      html = overlayHTML(top);
    } catch (err) {
      console.error(err);
      stack.pop();
      rootEl.hidden = true;
      rootEl.innerHTML = "";
      toast("That screen couldn't be opened.");
      return;
    }
    rootEl.hidden = false;
    rootEl.innerHTML = html;
    document.body.classList.add("modal-open");
    if (app) app.setAttribute("inert", "");
    let focus = null;
    if (top.kind === "settings" || top.kind === "add" || top.kind === "confirm" || top.kind === "celebrate") {
      focus = rootEl.querySelector("button");
    } else {
      focus = rootEl.querySelector("[data-focus], input[type='text'], input[type='number'], textarea") || rootEl.querySelector("input, button");
    }
    if (focus) focus.focus();
  }

  function overlayHTML(top) {
    if (top.kind === "form") return formDialog(top);
    if (top.kind === "confirm") return confirmDialog(top);
    if (top.kind === "settings") return settingsDialog();
    if (top.kind === "moduleSettings") return moduleSettingsDialog(top);
    if (top.kind === "add") return addDialog();
    if (top.kind === "workout") return workoutDialog(top);
    if (top.kind === "celebrate") return celebrateDialog(top);
    return "";
  }

  function formDialog(top) {
    const secondary = top.secondary ? '<button type="button" class="btn btn-danger-ghost" data-action="form-secondary">' + U.esc(top.secondary.label) + "</button>" : "";
    const submitCls = top.danger ? "btn btn-danger" : "btn btn-primary";
    return dialogWrap({
      title: top.title,
      lead: top.lead || "",
      wide: top.wide,
      body: '<form data-form="dialog" novalidate><div class="fields">' + top.fields.map(fieldHTML).join("") +
        '</div><p class="form-error" role="alert"></p><div class="dialog-actions sticky">' + secondary +
        '<span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="close-overlay">Cancel</button>' +
        '<button type="submit" class="' + submitCls + '">' + U.esc(top.submitLabel || "Save") + "</button></div></form>"
    });
  }

  function confirmDialog(top) {
    const cls = top.danger ? "btn btn-danger" : "btn btn-primary";
    return dialogWrap({
      title: top.title,
      lead: top.message,
      body: '<div class="dialog-actions sticky"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="close-overlay">Cancel</button>' +
        '<button type="button" class="' + cls + '" data-action="confirm-ok">' + U.esc(top.confirmLabel || "Confirm") + "</button></div>"
    });
  }

  function settingsDialog() {
    const rows = state.modules.map((m, i) => '<div class="mod-row"><input class="title-input" type="text" maxlength="80" value="' + U.esc(m.title) +
      '" data-action="rename-module" data-id="' + U.esc(m.id) + '" aria-label="Name of ' + U.esc(m.title) + '"><div class="row-actions">' +
      btn("Up", "move-module", { id: m.id, dir: "-1", ariaLabel: "Move " + m.title + " up", disabled: i === 0 }, SMALL) +
      btn("Down", "move-module", { id: m.id, dir: "1", ariaLabel: "Move " + m.title + " down", disabled: i === state.modules.length - 1 }, SMALL) +
      btn("Labels & units", "module-settings", { id: m.id }, SMALL) +
      btn("Remove", "remove-module", { id: m.id }, DANGER) + "</div></div>").join("");
    const theme = state.settings.theme;
    const seg = ["system", "light", "dark"].map((value) => {
      const label = value === "system" ? "Auto" : (value === "light" ? "Light" : "Dark");
      return '<button type="button" data-action="theme-set" data-theme="' + value + '" aria-pressed="' + (theme === value ? "true" : "false") + '">' + label + "</button>";
    }).join("");
    return dialogWrap({
      title: "Settings & data",
      wide: true,
      body: '<h3>Appearance</h3><label class="field"><span>App name</span><input type="text" maxlength="80" value="' + U.esc(state.settings.appTitle) +
        '" data-action="rename-app"></label><div class="seg" role="group" aria-label="Color theme">' + seg + "</div><h3>Modules</h3><div class=\"mod-list\">" +
        (rows || '<p class="hint">No modules yet.</p>') + '</div><div class="actions">' + btn("Add a module", "add-module", {}, PRIMARY) +
        '</div><h3>Your data</h3><p class="dialog-lead">Entries stay in this browser. Export a JSON file to keep a copy or move to another device. Import replaces what is on this device.</p><div class="actions">' +
        btn("Export backup", "export", {}, PRIMARY) + btn("Import backup", "import", {}, GHOST) + btn("Clear all data", "clear-all", {}, "btn btn-danger-ghost") +
        '</div><p class="hint">Version 1. Edit, Delete, Save, and Cancel stay the same on every module.</p><div class="dialog-actions sticky"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="close-overlay">Close</button></div>'
    });
  }

  function addDialog() {
    const builtin = [];
    const custom = [];
    Object.keys(Store.TYPES).forEach((type) => {
      const meta = Store.TYPES[type];
      const html = '<button type="button" class="choice" data-action="choose-type" data-type="' + U.esc(type) + '"><strong>' + U.esc(meta.title) + "</strong><span>" + U.esc(meta.blurb) + "</span></button>";
      if (meta.custom) custom.push(html);
      else builtin.push(html);
    });
    return dialogWrap({
      title: "Add a module",
      lead: "Add another copy of a tracker, or a custom counter or log.",
      body: '<div class="choice-list">' + builtin.join("") + '</div><h3>Custom</h3><div class="choice-list">' + custom.join("") +
        '</div><div class="dialog-actions sticky"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="close-overlay">Close</button></div>'
    });
  }

  function optionFields(mod) {
    if (mod.type === "sober") {
      return '<label class="field"><span>Milestone days</span><input name="milestones" type="text" value="' + U.esc(mod.options.milestones.join(", ")) +
        '"><span class="hint">Comma-separated day counts, such as 1, 7, 30, 90.</span></label>';
    }
    if (mod.type === "fasting") {
      return '<label class="field"><span>Default target hours</span><input name="defaultTargetHours" type="number" min="0.5" max="240" step="0.5" value="' +
        U.esc(mod.options.defaultTargetHours) + '"></label>';
    }
    if (mod.type === "weight" || mod.type === "gym") {
      return '<label class="field"><span>Unit</span><select name="unit"><option value="lb"' + (mod.options.unit === "kg" ? "" : " selected") +
        '>lb</option><option value="kg"' + (mod.options.unit === "kg" ? " selected" : "") + '>kg</option></select><span class="hint">Changing units does not convert numbers already logged.</span></label>';
    }
    if (mod.type === "savings") {
      return '<label class="field"><span>Currency symbol</span><input name="symbol" type="text" maxlength="4" value="' + U.esc(mod.options.symbol) +
        '"><span class="hint">Shown before amounts. Existing numbers are not converted.</span></label><label class="field"><span>Currency code</span><input name="code" type="text" maxlength="8" value="' +
        U.esc(mod.options.code) + '"></label>';
    }
    if (mod.type === "counter") {
      return '<label class="field"><span>Step</span><input name="step" type="number" step="any" value="' + U.esc(mod.options.step) +
        '"></label><label class="field"><span>Unit</span><input name="unit" type="text" maxlength="24" value="' + U.esc(mod.options.unit || "") +
        '"><span class="hint">Optional word after the count. Leave it blank if you do not want one.</span></label>';
    }
    if (mod.type === "log") {
      return '<label class="field"><span>Unit</span><input name="unit" type="text" maxlength="24" value="' + U.esc(mod.options.unit || "") +
        '"><span class="hint">Optional. Shown beside numbers. Changing it does not convert entries.</span></label>';
    }
    return "";
  }

  function moduleSettingsDialog(top) {
    const mod = findMod(top.moduleId);
    if (!mod) return "";
    const meta = Store.TYPES[mod.type];
    let fields = '<label class="field"><span>Name</span><input name="title" type="text" maxlength="80" value="' + U.esc(mod.title) + '"></label>';
    if (meta) {
      Object.keys(meta.labels).forEach((key) => {
        const prompt = meta.prompts && meta.prompts[key] ? meta.prompts[key] : key;
        fields += '<label class="field"><span>' + U.esc(prompt) + '</span><input name="label_' + U.esc(key) + '" type="text" maxlength="80" value="' + U.esc(mod.labels[key] || "") + '"></label>';
      });
      fields += optionFields(mod);
    }
    return dialogWrap({
      title: "Customize",
      lead: "Clearing a label restores the original word.",
      wide: true,
      body: '<form data-form="module-settings" novalidate><div class="fields">' + fields + '</div><p class="form-error" role="alert"></p><div class="dialog-actions sticky"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="close-overlay">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>'
    });
  }

  function blankSet() {
    return { id: U.uid(), reps: "", weight: "" };
  }

  function blankExercise() {
    return { id: U.uid(), name: "", sets: [blankSet()] };
  }

  function workoutDialog(top) {
    const mod = findMod(top.moduleId);
    const unit = mod && mod.options.unit ? mod.options.unit : "lb";
    const draft = top.draft;
    const editing = mod && (mod.data.workouts || []).some((w) => w.id === draft.id);
    const exercises = draft.exercises.map((ex) => {
      const sets = ex.sets.map((set) => '<div class="set-row" data-set="' + U.esc(set.id) + '"><label class="field"><span>Weight (' + U.esc(unit) +
        ')</span><input data-field="weight" inputmode="decimal" value="' + U.esc(set.weight) + '" placeholder="BW"></label><label class="field"><span>Reps</span><input data-field="reps" inputmode="numeric" value="' +
        U.esc(set.reps) + '"></label><button type="button" class="btn btn-small btn-danger-ghost" data-action="workout-del-set" data-set="' + U.esc(set.id) + '" data-ex="' + U.esc(ex.id) + '">Delete</button></div>').join("");
      return '<section class="workout-ex" data-ex="' + U.esc(ex.id) + '"><label class="field"><span>Exercise</span><input data-field="exname" value="' + U.esc(ex.name) +
        '" maxlength="80"></label>' + (sets || '<p class="hint">No sets yet.</p>') + '<div class="actions"><button type="button" class="btn btn-small btn-ghost" data-action="workout-add-set" data-ex="' +
        U.esc(ex.id) + '">Add set</button><button type="button" class="btn btn-small btn-danger-ghost" data-action="workout-del-ex" data-ex="' + U.esc(ex.id) + '">Remove exercise</button></div></section>';
    }).join("");
    return dialogWrap({
      title: editing ? "Edit workout" : "Log workout",
      lead: "Leave weight blank for bodyweight.",
      wide: true,
      body: '<form data-form="workout" novalidate><div class="fields"><label class="field"><span>Date</span><input data-field="date" type="date" value="' + U.esc(draft.date) +
        '"></label><label class="field"><span>Name</span><input data-field="name" data-focus="1" type="text" maxlength="80" value="' + U.esc(draft.name) +
        '" placeholder="Push, easy run, class"></label><label class="field"><span>Note</span><textarea data-field="note" rows="2" maxlength="2000">' + U.esc(draft.note) +
        '</textarea></label></div>' + exercises + '<p class="form-error" role="alert"></p><div class="actions"><button type="button" class="btn btn-ghost" data-action="workout-add-ex">Add exercise</button></div><div class="dialog-actions sticky"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="close-overlay">Cancel</button><button type="submit" class="btn btn-primary">Save workout</button></div></form>'
    });
  }

  function celebrateDialog(top) {
    const mod = findMod(top.moduleId);
    const n = top.milestone;
    const unit = mod ? U.unitWord(n, L(mod, "unit")) : "days";
    return '<div class="dialog celebrate" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><p class="eyebrow">Milestone</p><p class="celebrate-num">' +
      U.esc(String(n)) + '</p><h2 id="dialog-title">' + U.esc(n + " " + unit) + '</h2><p class="dialog-lead">' + U.esc(milestoneCopy(n)) +
      '</p><div class="dialog-actions sticky"><span class="spacer"></span><button type="button" class="btn btn-primary" data-action="close-overlay">Continue</button></div></div>';
  }

  function openForm(opts) {
    pushOverlay({
      kind: "form",
      title: opts.title,
      lead: opts.lead || "",
      fields: opts.fields,
      submitLabel: opts.submitLabel || "Save",
      danger: Boolean(opts.danger),
      secondary: opts.secondary || null,
      validate: opts.validate || null,
      onSubmit: opts.onSubmit,
      wide: Boolean(opts.wide)
    });
  }

  function confirmDelete(opts) {
    pushOverlay({
      kind: "confirm",
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel || "Delete",
      danger: true,
      onConfirm: opts.onConfirm
    });
  }

  function requestClose() {
    const top = topOverlay();
    if (!top) return;
    if (top.kind === "workout") {
      readWorkoutDraft();
      if (JSON.stringify(top.draft) !== top.baseline) {
        pushOverlay({
          kind: "confirm",
          title: "Discard this workout?",
          message: "What you typed will not be saved.",
          confirmLabel: "Discard",
          danger: true,
          onConfirm() { popOverlay(); }
        });
        return;
      }
    }
    if (top.kind === "celebrate" && top.onClose) top.onClose();
    popOverlay();
    if (!stack.length) maybeCelebrate();
  }

  function submitDialog(form) {
    const top = topOverlay();
    if (!top || top.kind !== "form") return;
    const values = {};
    for (let i = 0; i < top.fields.length; i += 1) {
      const f = top.fields[i];
      const el = form.elements[f.name];
      const raw = el ? String(el.value).trim() : "";
      if (f.required && !raw) {
        formError(f.label + " is required.");
        if (el) el.focus();
        return;
      }
      if (f.type === "number") {
        if (!raw) values[f.name] = null;
        else {
          const n = Number(raw);
          if (!Number.isFinite(n)) { formError("Enter a number for " + f.label + "."); return; }
          if (f.min != null && n < Number(f.min)) { formError(f.label + " is too small."); return; }
          if (f.max != null && n > Number(f.max)) { formError(f.label + " is too large."); return; }
          if (f.integer && !Number.isInteger(n)) { formError(f.label + " needs a whole number."); return; }
          values[f.name] = n;
        }
      } else values[f.name] = raw;
    }
    const err = top.validate ? top.validate(values) : "";
    if (err) { formError(err); return; }
    const fn = top.onSubmit;
    popOverlay();
    if (fn) fn(values);
  }

  function readWorkoutDraft() {
    const top = topOverlay();
    if (!top || top.kind !== "workout") return;
    const rootEl = document.getElementById("overlay");
    const draft = top.draft;
    const date = rootEl.querySelector('[data-field="date"]');
    const name = rootEl.querySelector('[data-field="name"]');
    const note = rootEl.querySelector('[data-field="note"]');
    if (date) draft.date = date.value;
    if (name) draft.name = name.value;
    if (note) draft.note = note.value;
    rootEl.querySelectorAll("section[data-ex]").forEach((exEl) => {
      const ex = draft.exercises.find((e) => e.id === exEl.dataset.ex);
      if (!ex) return;
      const nameEl = exEl.querySelector('[data-field="exname"]');
      if (nameEl) ex.name = nameEl.value;
      exEl.querySelectorAll("div[data-set]").forEach((setEl) => {
        const set = ex.sets.find((s) => s.id === setEl.dataset.set);
        if (!set) return;
        const reps = setEl.querySelector('[data-field="reps"]');
        const weight = setEl.querySelector('[data-field="weight"]');
        if (reps) set.reps = reps.value;
        if (weight) set.weight = weight.value;
      });
    });
  }

  function saveWorkout() {
    const top = topOverlay();
    if (!top || top.kind !== "workout") return;
    readWorkoutDraft();
    const mod = findMod(top.moduleId);
    if (!mod) { popOverlay(); return; }
    const draft = top.draft;
    if (!U.isISODate(draft.date)) { formError("Choose a date."); return; }
    const exercises = [];
    for (let i = 0; i < draft.exercises.length; i += 1) {
      const ex = draft.exercises[i];
      const exName = String(ex.name || "").trim().slice(0, 80);
      const sets = [];
      for (let j = 0; j < ex.sets.length; j += 1) {
        const set = ex.sets[j];
        const repsRaw = String(set.reps || "").trim();
        const weightRaw = String(set.weight || "").trim();
        if (!repsRaw && !weightRaw) continue;
        const reps = Number(repsRaw);
        if (!Number.isInteger(reps) || reps < 1 || reps > 1000) {
          formError("Enter reps as a whole number on each set you fill in.");
          return;
        }
        let weight = null;
        if (weightRaw) {
          weight = Number(weightRaw);
          if (!Number.isFinite(weight) || weight < 0 || weight > 5000) {
            formError("Check the weight on each set.");
            return;
          }
          weight = Math.round(weight * 100) / 100;
        }
        sets.push({ id: set.id || U.uid(), reps, weight });
      }
      if (!sets.length && !exName) continue;
      if (!exName) { formError("Name each exercise that has sets."); return; }
      exercises.push({ id: ex.id || U.uid(), name: exName, sets });
    }
    const saved = {
      id: draft.id,
      date: draft.date,
      name: String(draft.name || "").trim().slice(0, 80) || "Workout",
      note: String(draft.note || "").trim().slice(0, 2000),
      exercises,
      at: draft.at || new Date().toISOString()
    };
    const idx = mod.data.workouts.findIndex((w) => w.id === saved.id);
    if (idx >= 0) mod.data.workouts[idx] = saved;
    else mod.data.workouts.unshift(saved);
    popOverlay();
    commit();
  }

  function parseMilestones(text) {
    const nums = [];
    String(text).split(/[^0-9]+/).forEach((part) => {
      if (!part) return;
      const x = Math.round(Number(part));
      if (x > 0 && x <= 20000 && nums.indexOf(x) === -1) nums.push(x);
    });
    nums.sort((a, b) => a - b);
    return nums.slice(0, 24);
  }

  function saveModuleSettings(form) {
    const top = topOverlay();
    const mod = top && findMod(top.moduleId);
    if (!mod) { popOverlay(); return; }
    if (mod.type === "fasting") {
      const n = Number(form.elements.defaultTargetHours.value);
      if (!Number.isFinite(n) || n < 0.5 || n > 240) {
        formError("Default target should be between 0.5 and 240 hours.");
        return;
      }
    }
    if (mod.type === "counter") {
      const n = Number(form.elements.step.value);
      if (!Number.isFinite(n) || n === 0) {
        formError("Step should be a number other than zero.");
        return;
      }
    }
    if (mod.type === "sober") {
      const miles = parseMilestones(form.elements.milestones.value);
      if (!miles.length) { formError("Add at least one milestone."); return; }
      mod.options.milestones = miles;
    }
    mod.title = form.elements.title.value.trim().slice(0, 80) || "Untitled";
    const meta = Store.TYPES[mod.type];
    if (meta) {
      Object.keys(meta.labels).forEach((key) => {
        const input = form.elements["label_" + key];
        const val = input ? input.value.trim().slice(0, 80) : "";
        mod.labels[key] = val || meta.labels[key];
      });
      if (mod.type === "fasting") mod.options.defaultTargetHours = Number(form.elements.defaultTargetHours.value);
      if (mod.type === "weight" || mod.type === "gym") mod.options.unit = form.elements.unit.value === "kg" ? "kg" : "lb";
      if (mod.type === "savings") {
        mod.options.symbol = form.elements.symbol.value.trim().slice(0, 4) || "$";
        mod.options.code = form.elements.code.value.trim().slice(0, 8) || "CAD";
      }
      if (mod.type === "counter") {
        mod.options.step = Math.min(1000000, Math.abs(Number(form.elements.step.value)));
        mod.options.unit = form.elements.unit.value.trim().slice(0, 24);
      }
      if (mod.type === "log") mod.options.unit = form.elements.unit.value.trim().slice(0, 24);
    }
    popOverlay();
    commit();
    maybeCelebrate();
  }

  function hoursError(value) {
    if (value == null) return "";
    if (value < 0.5 || value > 240) return "Target hours should be between 0.5 and 240, or left blank.";
    return "";
  }

  function openStart(mod) {
    const info = streakInfo(mod);
    openForm({
      title: info.state === "unset" ? L(mod, "setStart") : L(mod, "editStart"),
      lead: "Day 1 is this date.",
      fields: [{ name: "start", label: "Start date", type: "date", required: true, value: info.start || U.today() }],
      secondary: info.state === "future" ? {
        label: "Remove date",
        onClick() {
          mod.data.startDate = null;
          mod.data.celebrated = [];
          commit();
        }
      } : null,
      validate(values) {
        if (!U.isISODate(values.start)) return "Choose a date.";
        if (values.start < "1970-01-01" || values.start > U.addDays(U.today(), 3650)) return "Choose a date between 1970 and ten years from now.";
        return "";
      },
      onSubmit(values) {
        if (mod.data.startDate !== values.start) mod.data.celebrated = [];
        mod.data.startDate = values.start;
        commit();
        maybeCelebrate();
      }
    });
  }

  function openReset(mod) {
    const info = streakInfo(mod);
    if (info.state !== "active") return;
    const yesterday = U.addDays(U.today(), -1);
    const fallback = yesterday >= info.start ? yesterday : info.start;
    openForm({
      title: L(mod, "reset"),
      lead: "This ends the current streak and keeps it in your history. You can set a new start date afterward.",
      submitLabel: L(mod, "reset"),
      danger: true,
      fields: [{ name: "last", label: "Last sober day", type: "date", value: fallback, required: true }],
      validate(values) {
        if (!U.isISODate(values.last)) return "Choose a date.";
        if (values.last < info.start) return "That date is before the streak started.";
        if (values.last > U.today()) return "That date is in the future.";
        return "";
      },
      onSubmit(values) {
        const notes = {};
        const remain = {};
        Object.keys(mod.data.notes || {}).forEach((date) => {
          if (date >= info.start && date <= values.last) notes[date] = mod.data.notes[date];
          else remain[date] = mod.data.notes[date];
        });
        mod.data.past.unshift({
          id: U.uid(),
          startDate: info.start,
          endDate: values.last,
          days: U.daysInclusive(info.start, values.last),
          resetAt: new Date().toISOString(),
          notes
        });
        mod.data.notes = remain;
        mod.data.startDate = null;
        mod.data.celebrated = [];
        commit();
        toast("Streak saved to history.");
      }
    });
  }

  function openPastFast(mod, existing) {
    const startDefault = existing ? U.toLocalInput(existing.startedAt) : U.toLocalInput(new Date(Date.now() - 16 * 3600000).toISOString());
    const endDefault = existing ? U.toLocalInput(existing.endedAt) : U.toLocalInput(new Date().toISOString());
    openForm({
      title: existing ? "Edit fast" : L(mod, "addPast"),
      fields: [
        { name: "start", label: "Started", type: "datetime-local", required: true, value: startDefault },
        { name: "end", label: "Ended", type: "datetime-local", required: true, value: endDefault },
        { name: "target", label: "Target hours", type: "number", step: "0.5", min: 0.5, max: 240, value: existing && existing.targetHours != null ? String(existing.targetHours) : "", hint: "Leave blank for no target." },
        { name: "note", label: "Note", type: "text", maxlength: 2000, value: existing ? existing.note : "" }
      ],
      validate(values) {
        const start = U.fromLocalInput(values.start);
        const end = U.fromLocalInput(values.end);
        if (!start || !end) return "Enter a start and end.";
        if (new Date(end) <= new Date(start)) return "End time has to be after the start.";
        if (new Date(start) > Date.now() + 60000) return "Start time can't be in the future.";
        if (new Date(end) > Date.now() + 60000) return "End time can't be in the future.";
        return hoursError(values.target);
      },
      onSubmit(values) {
        const row = {
          id: existing ? existing.id : U.uid(),
          startedAt: U.fromLocalInput(values.start),
          endedAt: U.fromLocalInput(values.end),
          targetHours: values.target,
          note: values.note.slice(0, 2000)
        };
        if (existing) {
          const idx = mod.data.history.findIndex((h) => h.id === existing.id);
          if (idx >= 0) mod.data.history[idx] = row;
        } else mod.data.history.unshift(row);
        commit();
      }
    });
  }

  function openTxn(mod, type, existing) {
    openForm({
      title: existing ? "Edit transaction" : (type === "withdrawal" ? L(mod, "withdraw") : L(mod, "deposit")),
      fields: [
        { name: "amount", label: "Amount", type: "number", required: true, min: 0.01, max: 1000000000, step: "0.01", inputmode: "decimal", value: existing ? String(existing.amount) : "" },
        { name: "date", label: "Date", type: "date", required: true, value: existing ? existing.date : U.today() },
        { name: "goalId", label: "Goal", type: "select", value: existing && existing.goalId ? existing.goalId : "", options: [{ value: "", label: "Unassigned" }].concat((mod.data.goals || []).map((g) => ({ value: g.id, label: g.name }))) },
        { name: "kind", label: "Type", type: "select", value: existing ? existing.type : type, options: [{ value: "deposit", label: "Deposit" }, { value: "withdrawal", label: "Withdrawal" }] },
        { name: "note", label: "Note", type: "text", maxlength: 500, value: existing ? existing.note : "" }
      ],
      validate(values) {
        if (!U.isISODate(values.date)) return "Choose a date.";
        return "";
      },
      onSubmit(values) {
        const row = {
          id: existing ? existing.id : U.uid(),
          date: values.date,
          type: values.kind === "withdrawal" ? "withdrawal" : "deposit",
          amount: Math.round(values.amount * 100) / 100,
          goalId: values.goalId || null,
          note: values.note.slice(0, 500),
          at: existing ? existing.at : new Date().toISOString()
        };
        if (row.goalId && !(mod.data.goals || []).some((g) => g.id === row.goalId)) row.goalId = null;
        if (existing) {
          const idx = mod.data.txns.findIndex((t) => t.id === existing.id);
          if (idx >= 0) mod.data.txns[idx] = row;
        } else mod.data.txns.unshift(row);
        commit();
      }
    });
  }

  function openWorkout(mod, existing) {
    const draft = existing ? U.clone(existing) : {
      id: U.uid(),
      date: U.today(),
      name: "",
      note: "",
      exercises: [],
      at: new Date().toISOString()
    };
    (draft.exercises || []).forEach((ex) => {
      (ex.sets || []).forEach((set) => {
        set.reps = set.reps == null ? "" : String(set.reps);
        set.weight = set.weight == null ? "" : String(set.weight);
      });
    });
    pushOverlay({ kind: "workout", moduleId: mod.id, draft, baseline: JSON.stringify(draft) });
  }

  function setActive(id) {
    if (!findMod(id)) return;
    if (state.settings.activeModuleId === id) return;
    state.settings.activeModuleId = id;
    commit();
    maybeCelebrate();
  }

  const actions = {
    "theme-toggle"() {
      const order = ["system", "light", "dark"];
      const i = order.indexOf(state.settings.theme);
      state.settings.theme = order[(i + 1) % order.length];
      applyTheme();
      commit();
    },
    "theme-set"(el) {
      const theme = el.dataset.theme;
      if (["system", "light", "dark"].indexOf(theme) === -1) return;
      state.settings.theme = theme;
      applyTheme();
      persist();
      render();
      if (topOverlay() && topOverlay().kind === "settings") renderOverlay();
    },
    settings() { pushOverlay({ kind: "settings" }); },
    "add-module"() { pushOverlay({ kind: "add" }); },
    "open-module"(el) { setActive(el.dataset.id); },
    "module-settings"(el) { pushOverlay({ kind: "moduleSettings", moduleId: el.dataset.id }); },
    "dismiss-welcome"() {
      state.settings.welcomeDismissed = true;
      commit();
    },
    export() {
      try {
        U.download("personal-tracker-backup-" + U.today() + ".json", Store.serialize(state));
        toast("Backup downloaded.");
      } catch (err) {
        toast("Couldn't download the backup.");
      }
    },
    import() {
      const input = document.getElementById("import-file");
      if (input) input.click();
    },
    "clear-all"() {
      pushOverlay({
        kind: "confirm",
        title: "Delete all data on this device?",
        message: "This removes every module and entry stored in this browser. A backup file you already downloaded is not deleted.",
        confirmLabel: "Delete all data",
        danger: true,
        onConfirm() {
          state = Store.blankState();
          stack.length = 0;
          applyTheme();
          persist();
          renderOverlay();
          render();
          toast("All data cleared.");
        }
      });
    },
    "move-module"(el) {
      const dir = Number(el.dataset.dir);
      const i = state.modules.findIndex((m) => m.id === el.dataset.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= state.modules.length) return;
      const row = state.modules.splice(i, 1)[0];
      state.modules.splice(j, 0, row);
      commit();
      if (topOverlay() && topOverlay().kind === "settings") renderOverlay();
    },
    "remove-module"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      pushOverlay({
        kind: "confirm",
        title: "Remove " + mod.title + "?",
        message: "Its entries will be deleted from this browser. Export a backup first if you want to keep them.",
        confirmLabel: "Remove",
        danger: true,
        onConfirm() {
          state.modules = state.modules.filter((m) => m.id !== mod.id);
          if (!state.modules.some((m) => m.id === state.settings.activeModuleId)) {
            state.settings.activeModuleId = state.modules[0] ? state.modules[0].id : null;
          }
          commit();
          if (topOverlay() && topOverlay().kind === "settings") renderOverlay();
          toast("Module removed.");
        }
      });
    },
    "choose-type"(el) {
      const type = el.dataset.type;
      if (!Store.TYPES[type]) return;
      const base = Store.TYPES[type].title;
      const taken = {};
      state.modules.forEach((m) => { taken[m.title] = true; });
      let title = base;
      if (taken[title]) {
        let n = 2;
        while (taken[base + " " + n]) n += 1;
        title = base + " " + n;
      }
      const mod = Store.createModule(type, title);
      state.modules.push(mod);
      state.settings.activeModuleId = mod.id;
      stack.length = 0;
      renderOverlay();
      commit();
    },
    "close-overlay"() { requestClose(); },
    "confirm-ok"() {
      const top = topOverlay();
      if (!top || top.kind !== "confirm") return;
      const fn = top.onConfirm;
      popOverlay();
      if (fn) fn();
    },
    "form-secondary"() {
      const top = topOverlay();
      if (!top || !top.secondary) return;
      const fn = top.secondary.onClick;
      popOverlay();
      if (fn) fn();
    },
    "show-more-log"(el) {
      session.logLimit[el.dataset.id] = (session.logLimit[el.dataset.id] || 45) + 90;
      render();
    },
    "set-start"(el) {
      const mod = findMod(el.dataset.id);
      if (mod) openStart(mod);
    },
    "reset-streak"(el) {
      const mod = findMod(el.dataset.id);
      if (mod) openReset(mod);
    },
    "add-note"(el) {
      const mod = findMod(el.dataset.id);
      const date = el.dataset.date;
      if (!mod || !U.isISODate(date)) return;
      openForm({
        title: L(mod, "note") + " · " + U.formatDate(date),
        lead: "Leave this blank to remove the note.",
        fields: [{ name: "note", label: "Note", type: "textarea", maxlength: 2000, value: (mod.data.notes && mod.data.notes[date]) || "" }],
        onSubmit(values) {
          if (!mod.data.notes) mod.data.notes = {};
          if (!values.note) delete mod.data.notes[date];
          else mod.data.notes[date] = values.note.slice(0, 2000);
          commit();
        }
      });
    },
    "delete-past"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this streak from history?",
        message: "The current streak is left as it is.",
        onConfirm() {
          mod.data.past = mod.data.past.filter((row) => row.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "start-fast"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod || mod.data.active) return;
      openForm({
        title: L(mod, "start"),
        lead: "The timer starts now.",
        submitLabel: L(mod, "start"),
        fields: [
          { name: "target", label: "Target hours", type: "number", step: "0.5", min: 0.5, max: 240, value: String(mod.options.defaultTargetHours || ""), hint: "Leave blank for no target." },
          { name: "note", label: "Note", type: "text", maxlength: 2000 }
        ],
        validate(values) { return hoursError(values.target); },
        onSubmit(values) {
          mod.data.active = {
            id: U.uid(),
            startedAt: new Date().toISOString(),
            targetHours: values.target,
            note: values.note.slice(0, 2000)
          };
          commit();
        }
      });
    },
    "end-fast"(el) {
      const mod = findMod(el.dataset.id);
      const active = mod && mod.data.active;
      if (!active) return;
      const endedAt = new Date().toISOString();
      if (new Date(endedAt) <= new Date(active.startedAt)) {
        toast("That fast is too short to save. Discard it if it was a mistake.");
        return;
      }
      mod.data.history.unshift({
        id: U.uid(),
        startedAt: active.startedAt,
        endedAt,
        targetHours: active.targetHours,
        note: active.note || ""
      });
      mod.data.active = null;
      commit();
      toast("Fast saved.");
    },
    "discard-fast"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod || !mod.data.active) return;
      pushOverlay({
        kind: "confirm",
        title: "Discard this fast?",
        message: "It will not be added to your history.",
        confirmLabel: "Discard",
        danger: true,
        onConfirm() {
          mod.data.active = null;
          commit();
          toast("Fast discarded.");
        }
      });
    },
    "edit-active-fast"(el) {
      const mod = findMod(el.dataset.id);
      const active = mod && mod.data.active;
      if (!active) return;
      openForm({
        title: "Edit current fast",
        lead: "Started " + U.formatDateTime(active.startedAt) + ".",
        fields: [
          { name: "target", label: "Target hours", type: "number", step: "0.5", min: 0.5, max: 240, value: active.targetHours == null ? "" : String(active.targetHours), hint: "Leave blank for no target." },
          { name: "note", label: "Note", type: "text", maxlength: 2000, value: active.note || "" }
        ],
        validate(values) { return hoursError(values.target); },
        onSubmit(values) {
          active.targetHours = values.target;
          active.note = values.note.slice(0, 2000);
          commit();
        }
      });
    },
    "add-past-fast"(el) {
      const mod = findMod(el.dataset.id);
      if (mod) openPastFast(mod, null);
    },
    "edit-fast"(el) {
      const mod = findMod(el.dataset.id);
      const row = mod && mod.data.history.find((h) => h.id === el.dataset.entry);
      if (row) openPastFast(mod, row);
    },
    "delete-fast"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this fast?",
        message: "It will be removed from the history on this device.",
        onConfirm() {
          mod.data.history = mod.data.history.filter((h) => h.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "add-goal"(el) { openGoal(findMod(el.dataset.id), null); },
    "edit-goal"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (goal) openGoal(mod, goal);
    },
    "delete-goal"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (!goal) return;
      confirmDelete({
        title: "Delete " + goal.title + "?",
        message: "Its check-ins will be deleted with it.",
        onConfirm() {
          mod.data.goals = mod.data.goals.filter((g) => g.id !== goal.id);
          commit();
        }
      });
    },
    "toggle-goal"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (!goal) return;
      goal.status = goal.status === "done" ? "active" : "done";
      commit();
    },
    "add-checkin"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (goal) openCheckin(mod, goal, null);
    },
    "edit-checkin"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      const row = goal && goal.checkins.find((c) => c.id === el.dataset.checkin);
      if (row) openCheckin(mod, goal, row);
    },
    "delete-checkin"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (!goal) return;
      confirmDelete({
        title: "Delete this check-in?",
        message: "The goal's progress number stays as it is.",
        onConfirm() {
          goal.checkins = goal.checkins.filter((c) => c.id !== el.dataset.checkin);
          commit();
        }
      });
    },
    "add-weight"(el) { openWeight(findMod(el.dataset.id), null); },
    "edit-weight"(el) {
      const mod = findMod(el.dataset.id);
      const row = mod && mod.data.entries.find((entry) => entry.id === el.dataset.entry);
      if (row) openWeight(mod, row);
    },
    "delete-weight"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this weight?",
        message: "It will be removed from the chart and the log.",
        onConfirm() {
          mod.data.entries = mod.data.entries.filter((entry) => entry.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "add-workout"(el) {
      const mod = findMod(el.dataset.id);
      if (mod) openWorkout(mod, null);
    },
    "edit-workout"(el) {
      const mod = findMod(el.dataset.id);
      const row = mod && mod.data.workouts.find((w) => w.id === el.dataset.entry);
      if (row) openWorkout(mod, row);
    },
    "delete-workout"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this workout?",
        message: "Its sets will be removed from exercise history.",
        onConfirm() {
          mod.data.workouts = mod.data.workouts.filter((w) => w.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "add-deposit"(el) {
      const mod = findMod(el.dataset.id);
      if (mod) openTxn(mod, "deposit", null);
    },
    "add-withdrawal"(el) {
      const mod = findMod(el.dataset.id);
      if (mod) openTxn(mod, "withdrawal", null);
    },
    "edit-txn"(el) {
      const mod = findMod(el.dataset.id);
      const row = mod && mod.data.txns.find((t) => t.id === el.dataset.entry);
      if (row) openTxn(mod, row.type, row);
    },
    "delete-txn"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this transaction?",
        message: "The balance and goal totals will update.",
        onConfirm() {
          mod.data.txns = mod.data.txns.filter((t) => t.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "add-savings-goal"(el) { openSavingsGoal(findMod(el.dataset.id), null); },
    "edit-savings-goal"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (goal) openSavingsGoal(mod, goal);
    },
    "delete-savings-goal"(el) {
      const mod = findMod(el.dataset.id);
      const goal = mod && mod.data.goals.find((g) => g.id === el.dataset.entry);
      if (!goal) return;
      confirmDelete({
        title: "Delete " + goal.name + "?",
        message: "Deposits and withdrawals attached to it stay in the overall balance, unassigned.",
        onConfirm() {
          mod.data.goals = mod.data.goals.filter((g) => g.id !== goal.id);
          mod.data.txns.forEach((t) => { if (t.goalId === goal.id) t.goalId = null; });
          commit();
        }
      });
    },
    "counter-step"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      const dir = Number(el.dataset.dir) < 0 ? -1 : 1;
      const delta = dir * Number(mod.options.step || 1);
      mod.data.value = U.round4(Number(mod.data.value || 0) + delta);
      mod.data.history.unshift({ id: U.uid(), at: new Date().toISOString(), delta, valueAfter: mod.data.value, note: "" });
      commit();
    },
    "counter-adjust"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      openForm({
        title: L(mod, "adjust"),
        lead: "Use a negative number to subtract.",
        fields: [
          { name: "delta", label: "Amount", type: "number", required: true, step: "any", min: -1000000, max: 1000000 },
          { name: "note", label: "Note", type: "text", maxlength: 500 }
        ],
        validate(values) { return values.delta === 0 ? "Enter a number other than zero." : ""; },
        onSubmit(values) {
          mod.data.value = U.round4(Number(mod.data.value || 0) + values.delta);
          mod.data.history.unshift({ id: U.uid(), at: new Date().toISOString(), delta: values.delta, valueAfter: mod.data.value, note: values.note.slice(0, 500) });
          commit();
        }
      });
    },
    "counter-reset"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      pushOverlay({
        kind: "confirm",
        title: "Reset the count to zero?",
        message: "The history of earlier changes stays.",
        confirmLabel: L(mod, "reset"),
        danger: true,
        onConfirm() {
          const delta = U.round4(0 - Number(mod.data.value || 0));
          mod.data.value = 0;
          mod.data.history.unshift({ id: U.uid(), at: new Date().toISOString(), delta, valueAfter: 0, note: "Reset" });
          commit();
        }
      });
    },
    "delete-counter-history"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this history row?",
        message: "The current count does not change.",
        onConfirm() {
          mod.data.history = mod.data.history.filter((row) => row.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "add-log"(el) { openLog(findMod(el.dataset.id), null); },
    "edit-log"(el) {
      const mod = findMod(el.dataset.id);
      const row = mod && mod.data.entries.find((entry) => entry.id === el.dataset.entry);
      if (row) openLog(mod, row);
    },
    "delete-log"(el) {
      const mod = findMod(el.dataset.id);
      if (!mod) return;
      confirmDelete({
        title: "Delete this entry?",
        message: "It will be removed from this log.",
        onConfirm() {
          mod.data.entries = mod.data.entries.filter((entry) => entry.id !== el.dataset.entry);
          commit();
        }
      });
    },
    "workout-add-ex"() {
      readWorkoutDraft();
      const top = topOverlay();
      if (!top || top.kind !== "workout") return;
      top.draft.exercises.push(blankExercise());
      renderOverlay();
    },
    "workout-del-ex"(el) {
      readWorkoutDraft();
      const top = topOverlay();
      if (!top || top.kind !== "workout") return;
      top.draft.exercises = top.draft.exercises.filter((ex) => ex.id !== el.dataset.ex);
      renderOverlay();
    },
    "workout-add-set"(el) {
      readWorkoutDraft();
      const top = topOverlay();
      if (!top || top.kind !== "workout") return;
      const ex = top.draft.exercises.find((row) => row.id === el.dataset.ex);
      if (!ex) return;
      ex.sets.push(blankSet());
      renderOverlay();
    },
    "workout-del-set"(el) {
      readWorkoutDraft();
      const top = topOverlay();
      if (!top || top.kind !== "workout") return;
      const ex = top.draft.exercises.find((row) => row.id === el.dataset.ex);
      if (!ex) return;
      ex.sets = ex.sets.filter((set) => set.id !== el.dataset.set);
      renderOverlay();
    }
  };

  function openGoal(mod, existing) {
    if (!mod) return;
    openForm({
      title: existing ? "Edit goal" : L(mod, "add"),
      fields: [
        { name: "title", label: "Name", type: "text", required: true, maxlength: 120, value: existing ? existing.title : "" },
        { name: "detail", label: "Notes", type: "textarea", maxlength: 2000, value: existing ? existing.detail : "" },
        { name: "target", label: L(mod, "target"), type: "number", min: 0.0001, max: 1000000000, step: "any", value: existing && existing.target != null ? String(existing.target) : "", hint: "Leave blank if this goal has no number." },
        { name: "unit", label: "Unit", type: "text", maxlength: 24, value: existing ? existing.unit : "", placeholder: "books, km, $" },
        { name: "progress", label: L(mod, "progress"), type: "number", min: -1000000000, max: 1000000000, step: "any", value: existing ? String(existing.progress) : "0" },
        { name: "deadline", label: "Deadline", type: "date", value: existing && existing.deadline ? existing.deadline : "" },
        { name: "status", label: "Status", type: "select", value: existing ? existing.status : "active", options: [{ value: "active", label: "Active" }, { value: "done", label: "Done" }] }
      ],
      validate(values) {
        if (values.deadline && !U.isISODate(values.deadline)) return "Choose a deadline or leave it blank.";
        return "";
      },
      onSubmit(values) {
        const goal = {
          id: existing ? existing.id : U.uid(),
          title: values.title.slice(0, 120),
          detail: values.detail.slice(0, 2000),
          target: values.target,
          unit: values.unit.slice(0, 24),
          progress: values.progress == null ? 0 : values.progress,
          status: values.status === "done" ? "done" : "active",
          deadline: U.isISODate(values.deadline) ? values.deadline : null,
          createdAt: existing ? existing.createdAt : new Date().toISOString(),
          checkins: existing ? existing.checkins : []
        };
        if (existing) {
          const idx = mod.data.goals.findIndex((g) => g.id === existing.id);
          if (idx >= 0) mod.data.goals[idx] = goal;
        } else mod.data.goals.unshift(goal);
        commit();
      }
    });
  }

  function openCheckin(mod, goal, existing) {
    openForm({
      title: L(mod, "checkin"),
      lead: goal.title,
      fields: [
        { name: "note", label: "Note", type: "textarea", maxlength: 2000, value: existing ? existing.note : "" },
        { name: "value", label: "Set progress to", type: "number", min: -1000000000, max: 1000000000, step: "any", value: existing && existing.value != null ? String(existing.value) : "", hint: "Optional. If you enter a number, it becomes the current progress. Deleting a check-in later leaves progress as it is." },
        { name: "date", label: "Date", type: "date", required: true, value: existing ? existing.date : U.today() }
      ],
      validate(values) {
        if (!U.isISODate(values.date)) return "Choose a date.";
        if (!values.note && values.value == null) return "Add a note or a progress number.";
        return "";
      },
      onSubmit(values) {
        const row = {
          id: existing ? existing.id : U.uid(),
          date: values.date,
          note: values.note.slice(0, 2000),
          value: values.value,
          at: existing ? existing.at : new Date().toISOString()
        };
        if (existing) {
          const idx = goal.checkins.findIndex((c) => c.id === existing.id);
          if (idx >= 0) goal.checkins[idx] = row;
        } else goal.checkins.unshift(row);
        if (values.value != null) goal.progress = values.value;
        commit();
      }
    });
  }

  function openWeight(mod, existing) {
    if (!mod) return;
    const unit = mod.options.unit || "lb";
    openForm({
      title: existing ? "Edit weight" : L(mod, "add"),
      fields: [
        { name: "weight", label: "Weight (" + unit + ")", type: "number", required: true, min: 1, max: 1500, step: "0.1", inputmode: "decimal", value: existing ? String(existing.weight) : "" },
        { name: "date", label: "Date", type: "date", required: true, value: existing ? existing.date : U.today() },
        { name: "note", label: "Note", type: "text", maxlength: 500, value: existing ? existing.note : "" }
      ],
      validate(values) { return U.isISODate(values.date) ? "" : "Choose a date."; },
      onSubmit(values) {
        const row = {
          id: existing ? existing.id : U.uid(),
          date: values.date,
          weight: Math.round(values.weight * 100) / 100,
          note: values.note.slice(0, 500),
          at: existing ? existing.at : new Date().toISOString()
        };
        if (existing) {
          const idx = mod.data.entries.findIndex((entry) => entry.id === existing.id);
          if (idx >= 0) mod.data.entries[idx] = row;
        } else mod.data.entries.unshift(row);
        commit();
      }
    });
  }

  function openSavingsGoal(mod, existing) {
    if (!mod) return;
    openForm({
      title: existing ? "Edit savings goal" : L(mod, "addGoal"),
      fields: [
        { name: "name", label: "Name", type: "text", required: true, maxlength: 80, value: existing ? existing.name : "" },
        { name: "target", label: "Target", type: "number", required: true, min: 0.01, max: 100000000000, step: "0.01", value: existing ? String(existing.target) : "" }
      ],
      onSubmit(values) {
        const goal = { id: existing ? existing.id : U.uid(), name: values.name.slice(0, 80), target: Math.round(values.target * 100) / 100 };
        if (existing) {
          const idx = mod.data.goals.findIndex((g) => g.id === existing.id);
          if (idx >= 0) mod.data.goals[idx] = goal;
        } else mod.data.goals.unshift(goal);
        commit();
      }
    });
  }

  function openLog(mod, existing) {
    if (!mod) return;
    openForm({
      title: existing ? "Edit entry" : L(mod, "add"),
      fields: [
        { name: "title", label: "Title", type: "text", required: true, maxlength: 120, value: existing ? existing.title : "" },
        { name: "value", label: L(mod, "value"), type: "number", min: -1000000000, max: 1000000000, step: "any", value: existing && existing.value != null ? String(existing.value) : "", hint: "Optional. Numbers show up on the trend." },
        { name: "date", label: "Date", type: "date", required: true, value: existing ? existing.date : U.today() },
        { name: "note", label: "Note", type: "textarea", maxlength: 2000, value: existing ? existing.note : "" }
      ],
      validate(values) { return U.isISODate(values.date) ? "" : "Choose a date."; },
      onSubmit(values) {
        const row = {
          id: existing ? existing.id : U.uid(),
          date: values.date,
          title: values.title.slice(0, 120),
          value: values.value,
          note: values.note.slice(0, 2000),
          at: existing ? existing.at : new Date().toISOString()
        };
        if (existing) {
          const idx = mod.data.entries.findIndex((entry) => entry.id === existing.id);
          if (idx >= 0) mod.data.entries[idx] = row;
        } else mod.data.entries.unshift(row);
        commit();
      }
    });
  }

  function readImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = Store.parseImport(String(reader.result || ""));
      if (!result.ok) { toast(result.error); return; }
      const when = result.exportedAt ? U.formatDateTime(result.exportedAt) : "an unknown time";
      pushOverlay({
        kind: "confirm",
        title: "Replace data on this device?",
        message: "This backup has " + result.state.modules.length + " modules, exported " + when + ". Everything currently stored in this browser will be replaced.",
        confirmLabel: "Replace data",
        danger: true,
        onConfirm() {
          state = result.state;
          stack.length = 0;
          applyTheme();
          persist();
          renderOverlay();
          render();
          toast("Backup restored.");
          maybeCelebrate();
        }
      });
    };
    reader.onerror = () => toast("Couldn't read that file.");
    reader.readAsText(file);
  }

  function bind() {
    document.body.addEventListener("click", (event) => {
      const el = event.target.closest("[data-action]");
      if (!el) return;
      const fn = actions[el.dataset.action];
      if (!fn) return;
      try { fn(el, event); } catch (err) {
        console.error(err);
        toast("That action didn't complete. Your last save is still here.");
      }
    });
    document.body.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.dataset.form) return;
      event.preventDefault();
      try {
        if (form.dataset.form === "dialog") submitDialog(form);
        else if (form.dataset.form === "module-settings") saveModuleSettings(form);
        else if (form.dataset.form === "workout") saveWorkout();
      } catch (err) {
        console.error(err);
        toast("Couldn't save that.");
      }
    });
    document.body.addEventListener("change", (event) => {
      const t = event.target;
      if (t && t.dataset && t.dataset.action === "exercise-pick") {
        session.exercise[t.dataset.id] = t.value;
        render();
      }
    });
    document.body.addEventListener("input", (event) => {
      const t = event.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.dataset.action === "rename-app") {
        state.settings.appTitle = t.value.slice(0, 80);
        persist();
        const title = displayTitle();
        document.title = title;
        document.querySelectorAll(".brand-name").forEach((el) => { el.textContent = title; });
      }
      if (t.dataset.action === "rename-module") {
        const mod = findMod(t.dataset.id);
        if (!mod) return;
        mod.title = t.value.slice(0, 80);
        persist();
        const label = mod.title.trim() || "Untitled";
        document.querySelectorAll('[data-nav-id="' + CSS.escape(mod.id) + '"] .nav-label').forEach((el) => { el.textContent = label; });
        const heading = document.getElementById("module-title");
        if (heading && activeMod() && activeMod().id === mod.id) heading.textContent = label;
      }
    });
    document.body.addEventListener("focusout", (event) => {
      const t = event.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.dataset.action === "rename-app" && !t.value.trim()) {
        state.settings.appTitle = "Personal Tracker";
        t.value = "Personal Tracker";
        persist();
        document.title = displayTitle();
        document.querySelectorAll(".brand-name").forEach((el) => { el.textContent = displayTitle(); });
      }
      if (t.dataset.action === "rename-module" && !t.value.trim()) {
        const mod = findMod(t.dataset.id);
        if (!mod) return;
        mod.title = "Untitled";
        t.value = "Untitled";
        persist();
        document.querySelectorAll('[data-nav-id="' + CSS.escape(mod.id) + '"] .nav-label').forEach((el) => { el.textContent = "Untitled"; });
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && stack.length) {
        event.preventDefault();
        requestClose();
      }
    });
    const overlay = document.getElementById("overlay");
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) requestClose();
    });
    const input = document.getElementById("import-file");
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (file) readImport(file);
    });
  }

  function startTicker() {
    window.setInterval(() => {
      document.querySelectorAll("[data-live='fast']").forEach((el) => {
        const start = new Date(el.getAttribute("data-start")).getTime();
        if (!Number.isFinite(start)) return;
        const elapsed = Date.now() - start;
        el.textContent = U.formatLive(elapsed);
        const target = Number(el.getAttribute("data-target"));
        const id = el.getAttribute("data-fastid");
        if (!(target > 0) || !id) return;
        const pct = Math.max(0, Math.min(100, (elapsed / (target * 3600000)) * 100));
        const barEl = document.querySelector('[data-fast-bar="' + CSS.escape(id) + '"]');
        if (barEl) barEl.style.width = pct.toFixed(2) + "%";
        const note = document.querySelector('[data-fast-state="' + CSS.escape(id) + '"]');
        if (note) note.hidden = elapsed < target * 3600000;
      });
    }, 1000);
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  function init() {
    const loaded = Store.load();
    state = loaded.state;
    applyTheme();
    bind();
    render();
    if (loaded.warning) toast(loaded.warning);
    startTicker();
    registerSW();
    maybeCelebrate();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => { if (state.settings.theme === "system") applyTheme(); };
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof globalThis !== "undefined" ? globalThis : this);
