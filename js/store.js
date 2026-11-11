(function (root) {
  "use strict";

  const KEY = "sj-personal-tracker-v1";
  const BAK = KEY + "-backup";
  const CORRUPT = KEY + "-unreadable";
  const U = () => root.PTUtil;

  const TYPES = {
    sober: {
      title: "Sober days",
      blurb: "Count a streak, mark milestones, and keep each day.",
      custom: false,
      labels: {
        hero: "Current streak",
        since: "Sober since",
        unit: "days",
        milestones: "Milestones",
        journal: "Sober days",
        history: "Past streaks",
        reset: "Reset streak",
        setStart: "Set start date",
        editStart: "Edit start date",
        note: "Note"
      },
      prompts: {
        hero: "Caption above the big number",
        since: "Label beside the start date",
        unit: "Word after the count. The count itself stays in calendar days.",
        milestones: "Heading on the milestone list",
        journal: "Heading on the day-by-day log",
        history: "Heading on ended streaks",
        reset: "Reset button",
        setStart: "Button when no streak is running",
        editStart: "Button to change the start date",
        note: "Button on each day"
      }
    },
    fasting: {
      title: "Fasting",
      blurb: "Start and stop a fast, with a live timer and a history.",
      custom: false,
      labels: {
        hero: "Current fast",
        start: "Start fast",
        end: "End fast",
        discard: "Discard fast",
        history: "History",
        addPast: "Add past fast",
        edit: "Edit"
      },
      prompts: {
        hero: "Caption above the timer",
        start: "Start button",
        end: "Button that saves the fast",
        discard: "Button that throws away the current fast",
        history: "Heading on past fasts",
        addPast: "Button to log a fast you already finished",
        edit: "Edit button"
      }
    },
    goals: {
      title: "Goals",
      blurb: "Targets, progress, and dated check-ins.",
      custom: false,
      labels: {
        add: "Add goal",
        checkin: "Check-in",
        empty: "No goals yet.",
        target: "Target",
        progress: "Progress",
        done: "Mark done",
        reopen: "Reopen"
      },
      prompts: {
        add: "Button to create a goal",
        checkin: "Button to add a dated note",
        empty: "Message when the list is empty",
        target: "Word beside the target number",
        progress: "Word beside the current number",
        done: "Button that marks a goal done",
        reopen: "Button that marks a goal active again"
      }
    },
    weight: {
      title: "Weight",
      blurb: "Log weight and see a simple trend.",
      custom: false,
      labels: {
        add: "Log weight",
        empty: "No weights yet.",
        chart: "Trend",
        latest: "Latest",
        change: "Change",
        entries: "Entries"
      },
      prompts: {
        add: "Button to log a weight",
        empty: "Message when nothing is logged",
        chart: "Heading above the chart",
        latest: "Label on the latest number",
        change: "Label on the change since the first entry",
        entries: "Label on the entry count"
      }
    },
    gym: {
      title: "Gym",
      blurb: "Log workouts and look back at each exercise.",
      custom: false,
      labels: {
        add: "Log workout",
        history: "Exercise history",
        empty: "No workouts yet.",
        volume: "Volume"
      },
      prompts: {
        add: "Button to log a workout",
        history: "Heading on the per-exercise history",
        empty: "Message when nothing is logged",
        volume: "Word beside total weight × reps"
      }
    },
    savings: {
      title: "Savings",
      blurb: "Deposits, withdrawals, and targets.",
      custom: false,
      labels: {
        balance: "Balance",
        deposit: "Add deposit",
        withdraw: "Add withdrawal",
        addGoal: "Add savings goal",
        goals: "Goals",
        empty: "No transactions yet."
      },
      prompts: {
        balance: "Caption above the balance",
        deposit: "Button to add money",
        withdraw: "Button to take money out",
        addGoal: "Button to add a target",
        goals: "Heading on the goal list",
        empty: "Message when nothing is logged"
      }
    },
    counter: {
      title: "Counter",
      blurb: "A simple tally you can step up or down.",
      custom: true,
      labels: {
        hero: "Count",
        adjust: "Adjust",
        reset: "Reset",
        history: "History",
        empty: "No adjustments yet."
      },
      prompts: {
        hero: "Caption above the number",
        adjust: "Button to add a custom amount",
        reset: "Button that sets the count back to zero",
        history: "Heading on the history",
        empty: "Message when nothing has been logged"
      }
    },
    log: {
      title: "Log",
      blurb: "A dated list, with a trend if you enter numbers.",
      custom: true,
      labels: {
        add: "Add entry",
        value: "Value",
        empty: "Nothing logged yet.",
        chart: "Trend"
      },
      prompts: {
        add: "Button to add a row",
        value: "Label on the optional number",
        empty: "Message when the list is empty",
        chart: "Heading above the chart"
      }
    }
  };

  function asId(v) {
    if (typeof v === "string" && /^[A-Za-z0-9_-]{4,80}$/.test(v)) return v;
    return U().uid();
  }

  function asTitle(v, fallback) {
    const s = typeof v === "string" ? v.trim().slice(0, 80) : "";
    return s || fallback;
  }

  function asText(v, max) {
    if (typeof v !== "string") return "";
    return v.trim().slice(0, max);
  }

  function asArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function finite(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function sanitizeMilestones(list) {
    const fallback = [1, 7, 30, 60, 90, 180, 365];
    if (!Array.isArray(list)) return fallback.slice();
    const nums = [];
    for (let i = 0; i < list.length && nums.length < 24; i += 1) {
      const x = Math.round(Number(list[i]));
      if (Number.isFinite(x) && x > 0 && x <= 20000 && nums.indexOf(x) === -1) nums.push(x);
    }
    nums.sort((a, b) => a - b);
    return nums.length ? nums : fallback.slice();
  }

  function sanitizeOptions(type, raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    if (type === "sober") return { milestones: sanitizeMilestones(src.milestones) };
    if (type === "fasting") {
      let n = finite(src.defaultTargetHours);
      if (n == null || n <= 0) n = 16;
      return { defaultTargetHours: clamp(n, 0.5, 240) };
    }
    if (type === "weight" || type === "gym") {
      return { unit: src.unit === "kg" ? "kg" : "lb" };
    }
    if (type === "savings") {
      const symbol = asText(src.symbol, 4) || "$";
      const code = asText(src.code, 8) || "CAD";
      return { symbol, code };
    }
    if (type === "counter") {
      let step = finite(src.step);
      if (step == null || step === 0) step = 1;
      return { step: clamp(Math.abs(step), 0.0001, 1000000), unit: asText(src.unit, 24) };
    }
    if (type === "log") return { unit: asText(src.unit, 24) };
    return {};
  }

  function sanitizeSober(src) {
    const notes = {};
    if (src.notes && typeof src.notes === "object" && !Array.isArray(src.notes)) {
      Object.keys(src.notes).forEach((key) => {
        if (!U().isISODate(key)) return;
        const text = asText(src.notes[key], 2000);
        if (text) notes[key] = text;
      });
    }
    const past = [];
    asArray(src.past).forEach((row) => {
      if (!row || typeof row !== "object") return;
      if (!U().isISODate(row.startDate) || !U().isISODate(row.endDate)) return;
      if (row.endDate < row.startDate) return;
      const snap = {};
      if (row.notes && typeof row.notes === "object" && !Array.isArray(row.notes)) {
        Object.keys(row.notes).forEach((key) => {
          if (!U().isISODate(key)) return;
          const text = asText(row.notes[key], 2000);
          if (text) snap[key] = text;
        });
      }
      past.push({
        id: asId(row.id),
        startDate: row.startDate,
        endDate: row.endDate,
        days: U().daysInclusive(row.startDate, row.endDate),
        resetAt: U().isDateTime(row.resetAt) ? row.resetAt : new Date().toISOString(),
        notes: snap
      });
    });
    const celebrated = [];
    asArray(src.celebrated).forEach((n) => {
      const x = Math.round(Number(n));
      if (Number.isFinite(x) && celebrated.indexOf(x) === -1) celebrated.push(x);
    });
    return {
      startDate: U().isISODate(src.startDate) ? src.startDate : null,
      notes,
      past,
      celebrated
    };
  }

  function optionalHours(v) {
    if (v == null || v === "") return null;
    const n = finite(v);
    if (n == null || n <= 0) return null;
    return clamp(n, 0.5, 240);
  }

  function sanitizeFasting(src) {
    let active = null;
    if (src.active && typeof src.active === "object" && U().isDateTime(src.active.startedAt)) {
      active = {
        id: asId(src.active.id),
        startedAt: new Date(src.active.startedAt).toISOString(),
        targetHours: optionalHours(src.active.targetHours),
        note: asText(src.active.note, 2000)
      };
    }
    const history = [];
    asArray(src.history).forEach((row) => {
      if (!row || !U().isDateTime(row.startedAt) || !U().isDateTime(row.endedAt)) return;
      if (new Date(row.endedAt) <= new Date(row.startedAt)) return;
      history.push({
        id: asId(row.id),
        startedAt: new Date(row.startedAt).toISOString(),
        endedAt: new Date(row.endedAt).toISOString(),
        targetHours: optionalHours(row.targetHours),
        note: asText(row.note, 2000)
      });
    });
    return { active, history };
  }

  function sanitizeGoals(src) {
    const goals = [];
    asArray(src.goals).forEach((row) => {
      if (!row || typeof row !== "object") return;
      const title = asText(row.title, 120);
      if (!title) return;
      const checkins = [];
      asArray(row.checkins).forEach((c) => {
        if (!c || !U().isISODate(c.date)) return;
        const note = asText(c.note, 2000);
        let value = null;
        if (c.value != null && c.value !== "") {
          const n = finite(c.value);
          if (n == null) return;
          value = clamp(n, -1000000000, 1000000000);
        }
        if (!note && value == null) return;
        checkins.push({
          id: asId(c.id),
          date: c.date,
          note,
          value,
          at: U().isDateTime(c.at) ? c.at : new Date().toISOString()
        });
      });
      let target = null;
      if (row.target != null && row.target !== "") {
        const n = finite(row.target);
        if (n != null && n > 0) target = clamp(n, 0, 1000000000);
      }
      const progressN = finite(row.progress);
      goals.push({
        id: asId(row.id),
        title,
        detail: asText(row.detail, 2000),
        target,
        unit: asText(row.unit, 24),
        progress: progressN == null ? 0 : clamp(progressN, -1000000000, 1000000000),
        status: row.status === "done" ? "done" : "active",
        deadline: U().isISODate(row.deadline) ? row.deadline : null,
        createdAt: U().isDateTime(row.createdAt) ? row.createdAt : new Date().toISOString(),
        checkins
      });
    });
    return { goals };
  }

  function sanitizeWeight(src) {
    const entries = [];
    asArray(src.entries).forEach((row) => {
      if (!row || !U().isISODate(row.date)) return;
      const weight = finite(row.weight);
      if (weight == null || weight <= 0 || weight > 20000) return;
      entries.push({
        id: asId(row.id),
        date: row.date,
        weight: Math.round(weight * 100) / 100,
        note: asText(row.note, 500),
        at: U().isDateTime(row.at) ? row.at : new Date().toISOString()
      });
    });
    return { entries };
  }

  function sanitizeGym(src) {
    const workouts = [];
    asArray(src.workouts).forEach((row) => {
      if (!row || !U().isISODate(row.date)) return;
      const exercises = [];
      asArray(row.exercises).forEach((ex) => {
        if (!ex) return;
        const name = asText(ex.name, 80);
        const sets = [];
        asArray(ex.sets).forEach((set) => {
          if (!set) return;
          const reps = Math.round(Number(set.reps));
          if (!Number.isFinite(reps) || reps < 1 || reps > 1000) return;
          let weight = null;
          if (set.weight != null && set.weight !== "") {
            const w = finite(set.weight);
            if (w == null || w < 0 || w > 5000) return;
            weight = Math.round(w * 100) / 100;
          }
          sets.push({ id: asId(set.id), reps, weight });
        });
        if (!name || !sets.length) return;
        exercises.push({ id: asId(ex.id), name, sets });
      });
      workouts.push({
        id: asId(row.id),
        date: row.date,
        name: asText(row.name, 80) || "Workout",
        note: asText(row.note, 2000),
        exercises,
        at: U().isDateTime(row.at) ? row.at : new Date().toISOString()
      });
    });
    return { workouts };
  }

  function sanitizeSavings(src) {
    const goals = [];
    const idMap = {};
    asArray(src.goals).forEach((row) => {
      if (!row) return;
      const name = asText(row.name, 80);
      const target = finite(row.target);
      if (!name || target == null || target <= 0) return;
      const id = asId(row.id);
      if (typeof row.id === "string") idMap[row.id] = id;
      idMap[id] = id;
      goals.push({ id, name, target: clamp(target, 0, 100000000000) });
    });
    const txns = [];
    asArray(src.txns).forEach((row) => {
      if (!row || !U().isISODate(row.date)) return;
      const amount = finite(row.amount);
      if (amount == null || amount <= 0 || amount > 100000000000) return;
      const type = row.type === "withdrawal" ? "withdrawal" : "deposit";
      const mapped = typeof row.goalId === "string" ? idMap[row.goalId] : null;
      txns.push({
        id: asId(row.id),
        date: row.date,
        type,
        amount: Math.round(amount * 100) / 100,
        goalId: mapped || null,
        note: asText(row.note, 500),
        at: U().isDateTime(row.at) ? row.at : new Date().toISOString()
      });
    });
    return { goals, txns };
  }

  function sanitizeCounter(src) {
    const valueN = finite(src.value);
    const history = [];
    asArray(src.history).forEach((row) => {
      if (!row) return;
      const delta = finite(row.delta);
      const valueAfter = finite(row.valueAfter);
      if (delta == null || valueAfter == null) return;
      history.push({
        id: asId(row.id),
        at: U().isDateTime(row.at) ? row.at : new Date().toISOString(),
        delta,
        valueAfter,
        note: asText(row.note, 500)
      });
    });
    return { value: valueN == null ? 0 : U().round4(valueN), history };
  }

  function sanitizeLog(src) {
    const entries = [];
    asArray(src.entries).forEach((row) => {
      if (!row || !U().isISODate(row.date)) return;
      const title = asText(row.title, 120);
      if (!title) return;
      let value = null;
      if (row.value != null && row.value !== "") {
        const n = finite(row.value);
        if (n != null) value = clamp(n, -1000000000, 1000000000);
      }
      entries.push({
        id: asId(row.id),
        date: row.date,
        title,
        value,
        note: asText(row.note, 2000),
        at: U().isDateTime(row.at) ? row.at : new Date().toISOString()
      });
    });
    return { entries };
  }

  function sanitizeData(type, data) {
    const src = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    if (type === "sober") return sanitizeSober(src);
    if (type === "fasting") return sanitizeFasting(src);
    if (type === "goals") return sanitizeGoals(src);
    if (type === "weight") return sanitizeWeight(src);
    if (type === "gym") return sanitizeGym(src);
    if (type === "savings") return sanitizeSavings(src);
    if (type === "counter") return sanitizeCounter(src);
    if (type === "log") return sanitizeLog(src);
    return {};
  }

  function sanitizeLabels(type, raw) {
    const defaults = TYPES[type].labels;
    const src = raw && typeof raw === "object" ? raw : {};
    const labels = {};
    Object.keys(defaults).forEach((key) => {
      const custom = typeof src[key] === "string" ? src[key].trim().slice(0, 80) : "";
      labels[key] = custom || defaults[key];
    });
    return labels;
  }

  function createModule(type, title) {
    const meta = TYPES[type];
    if (!meta) throw new Error("Unknown module type");
    return {
      id: U().uid(),
      type,
      title: title || meta.title,
      labels: sanitizeLabels(type, null),
      options: sanitizeOptions(type, meta.options || {}),
      data: sanitizeData(type, {})
    };
  }

  function normalizeModule(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (!TYPES[raw.type]) {
      let data = {};
      try {
        data = JSON.parse(JSON.stringify(raw.data && typeof raw.data === "object" ? raw.data : {}));
      } catch (e) {
        data = {};
      }
      return {
        id: asId(raw.id),
        type: "unknown",
        originalType: typeof raw.type === "string" ? raw.type.slice(0, 40) : "unknown",
        title: asTitle(raw.title, "Saved module"),
        labels: {},
        options: {},
        data
      };
    }
    return {
      id: asId(raw.id),
      type: raw.type,
      title: asTitle(raw.title, TYPES[raw.type].title),
      labels: sanitizeLabels(raw.type, raw.labels),
      options: sanitizeOptions(raw.type, raw.options),
      data: sanitizeData(raw.type, raw.data)
    };
  }

  function blankState() {
    const modules = ["sober", "fasting", "goals", "weight", "gym", "savings"].map((type) => createModule(type));
    return {
      version: 1,
      settings: {
        appTitle: "Personal Tracker",
        theme: "system",
        activeModuleId: modules[0].id,
        welcomeDismissed: false
      },
      modules
    };
  }

  function normalize(input) {
    const src = input && typeof input === "object" ? input : {};
    const settingsSrc = src.settings && typeof src.settings === "object" ? src.settings : {};
    const theme = ["system", "light", "dark"].indexOf(settingsSrc.theme) !== -1 ? settingsSrc.theme : "system";
    const modules = [];
    asArray(src.modules).forEach((row) => {
      const mod = normalizeModule(row);
      if (mod) modules.push(mod);
    });
    const active = typeof settingsSrc.activeModuleId === "string" ? settingsSrc.activeModuleId : null;
    const activeOk = modules.some((m) => m.id === active);
    return {
      version: 1,
      settings: {
        appTitle: asTitle(settingsSrc.appTitle, "Personal Tracker"),
        theme,
        activeModuleId: activeOk ? active : (modules[0] ? modules[0].id : null),
        welcomeDismissed: Boolean(settingsSrc.welcomeDismissed)
      },
      modules
    };
  }

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      return { state: blankState(), warning: "This browser wouldn't open local storage. You can still use the page, but it may not keep data." };
    }
    if (!raw) return { state: blankState(), warning: null };
    try {
      return { state: normalize(JSON.parse(raw)), warning: null };
    } catch (e) {
      try {
        localStorage.setItem(CORRUPT, raw);
      } catch (err) { /* ignore */ }
      try {
        const bak = localStorage.getItem(BAK);
        if (bak) {
          return { state: normalize(JSON.parse(bak)), warning: "The last save couldn't be read. Restored the previous copy." };
        }
      } catch (err2) { /* ignore */ }
      return { state: blankState(), warning: "Saved data couldn't be read. Started fresh. If you have a backup file, import it from Settings." };
    }
  }

  function save(state) {
    try {
      const raw = JSON.stringify(state);
      const prev = localStorage.getItem(KEY);
      if (prev && prev !== raw) localStorage.setItem(BAK, prev);
      localStorage.setItem(KEY, raw);
      return true;
    } catch (e) {
      return false;
    }
  }

  function serialize(state) {
    return JSON.stringify({
      app: "sj-personal-tracker",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      modules: state.modules
    }, null, 2);
  }

  function parseImport(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: "That file isn't valid JSON." };
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "That file isn't a tracker backup." };
    }
    if (data.app && data.app !== "sj-personal-tracker") {
      return { ok: false, error: "That file is not a Personal Tracker backup." };
    }
    if (!data.settings || typeof data.settings !== "object" || !Array.isArray(data.modules)) {
      return { ok: false, error: "That backup is missing tracker data." };
    }
    try {
      return { ok: true, state: normalize(data), exportedAt: U().isDateTime(data.exportedAt) ? data.exportedAt : null };
    } catch (e) {
      return { ok: false, error: "That backup couldn't be read." };
    }
  }

  root.PTStore = {
    KEY,
    TYPES,
    blankState,
    createModule,
    normalize,
    load,
    save,
    serialize,
    parseImport
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
