(function (root) {
  "use strict";

  function uid() {
    const bytes = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function today() {
    return toISODate(new Date());
  }

  function parseDate(iso) {
    const parts = String(iso || "").split("-").map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function isISODate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = parseDate(s);
    return !Number.isNaN(d.getTime()) && toISODate(d) === s;
  }

  function isDateTime(s) {
    if (typeof s !== "string" || !s) return false;
    return Number.isFinite(new Date(s).getTime());
  }

  function addDays(iso, n) {
    const d = parseDate(iso);
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  function daysInclusive(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / 86400000) + 1;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = isISODate(iso) ? parseDate(iso) : new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function toLocalInput(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return "";
    return toISODate(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function fromLocalInput(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function formatLive(ms) {
    ms = Math.max(0, Number(ms) || 0);
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (days > 0) return days + "d " + hours + "h " + pad(mins) + "m " + pad(sec) + "s";
    return hours + "h " + pad(mins) + "m " + pad(sec) + "s";
  }

  function formatDuration(ms) {
    ms = Math.max(0, Number(ms) || 0);
    const totalMin = Math.floor(ms / 60000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0) return days + "d " + hours + "h " + mins + "m";
    if (hours > 0) return hours + "h " + mins + "m";
    const sec = Math.floor((ms % 60000) / 1000);
    return mins + "m " + String(sec) + "s";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function trimNum(n) {
    const x = Math.round(Number(n) * 100) / 100;
    if (!Number.isFinite(x)) return "";
    return String(x);
  }

  function round4(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 10000) / 10000;
  }

  function unitWord(n, unit) {
    const u = String(unit || "").trim();
    if (!u) return "";
    if (/^days?$/i.test(u)) return Math.abs(Number(n)) === 1 ? "day" : "days";
    return u;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function money(amount, symbol) {
    const n = Number(amount) || 0;
    const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? "-" : "") + (symbol || "$") + abs;
  }

  function shortMoney(amount, symbol) {
    const n = Number(amount) || 0;
    const abs = Math.abs(n);
    let body;
    if (abs >= 1000) body = Math.round(abs).toLocaleString();
    else if (abs >= 100) body = String(Math.round(abs));
    else body = abs.toFixed(0);
    return (n < 0 ? "-" : "") + (symbol || "$") + body;
  }

  function sameLocalDay(a, b) {
    const da = new Date(a);
    const db = new Date(b);
    return toISODate(da) === toISODate(db);
  }

  root.PTUtil = {
    uid,
    today,
    parseDate,
    toISODate,
    isISODate,
    isDateTime,
    addDays,
    daysInclusive,
    formatDate,
    formatDateTime,
    formatTime,
    toLocalInput,
    fromLocalInput,
    formatLive,
    formatDuration,
    esc,
    trimNum,
    round4,
    unitWord,
    clone,
    download,
    money,
    shortMoney,
    sameLocalDay
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
