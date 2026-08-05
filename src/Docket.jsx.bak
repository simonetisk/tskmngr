import React, { useState, useEffect, useRef, useCallback } from "react";
import { signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";
import { appStorage } from "./storage.js";
import {
  ChevronDown, ChevronUp, Plus, X, Calendar, Trash2, Check,
  AlertCircle, Sun, Moon, Download, Upload, StickyNote,
  Play, Pause, Square, Tag, Layers, Clock, Pencil, BarChart3, CheckSquare,
  LogIn, LogOut, User, Cloud, HardDrive, TrendingUp, PieChart as PieChartIcon,
  CheckCircle2, RotateCcw, ArrowLeft, GripVertical, Hash, Search, Flag, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Docket — a work ledger for tasks
// ---------------------------------------------------------------------------

const PRIORITIES = {
  low: { label: "Low", color: "var(--pr-low)", tint: "var(--pr-low-tint)" },
  medium: { label: "Medium", color: "var(--pr-medium)", tint: "var(--pr-medium-tint)" },
  high: { label: "High", color: "var(--pr-high)", tint: "var(--pr-high-tint)" },
};
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const UNCATEGORIZED_COLOR = "#95A0AC";

const TASKS_KEY = "tasks:v1";
const CATEGORIES_KEY = "categories:v1";
const SETTINGS_KEY = "settings:v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function errMsg(e) { return (e && e.message) ? e.message : String(e || "Unknown error"); }
function isNotFoundError(e) {
  const msg = ((e && e.message) || String(e) || "").toLowerCase();
  return msg.includes("not found") || msg.includes("no such") || msg.includes("does not exist") || msg.includes("404");
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(p) { return Math.random() < p; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function formatDateYMD(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDateTimeYMD(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateYMD(ts)} ${hh}:${mm}`;
}

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function isOverdue(iso, done) {
  if (!iso || done) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return d < today;
}
function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}
function formatLeadTime(ms) {
  const totalMinutes = Math.max(0, Math.round((ms || 0) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
function sessionSeconds(task) { return (task.sessions || []).reduce((sum, s) => sum + (s.seconds || 0), 0); }
function liveSeconds(task) {
  const base = sessionSeconds(task);
  if (task.timerState === "running" && task.timerStartedAt) return base + Math.max(0, (Date.now() - task.timerStartedAt) / 1000);
  return base;
}

// ---- distinct color generation (golden-angle hue rotation — practically unlimited, non-repeating) ----
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function generateDistinctColor(index) {
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 62, 55);
}

function getPeriodRange(period) {
  const now = new Date();
  if (period === "all") return null;
  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(now); start.setDate(now.getDate() + diffToMonday); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start, end };
}

function categoryMeta(categories) {
  const map = { __uncategorized__: { name: "Uncategorized", color: UNCATEGORIZED_COLOR } };
  categories.forEach((c) => { map[c.id] = { name: c.name, color: c.color }; });
  return map;
}

function computeCategoryTotals(tasks, categories, period) {
  const range = getPeriodRange(period);
  const totals = {};
  tasks.forEach((t) => {
    (t.sessions || []).forEach((s) => {
      if (range) {
        const d = new Date(s.date + "T00:00:00");
        if (d < range.start || d >= range.end) return;
      }
      const key = t.category || "__uncategorized__";
      totals[key] = (totals[key] || 0) + (s.seconds || 0);
    });
  });
  const meta = categoryMeta(categories);
  const rows = Object.entries(totals).map(([id, seconds]) => ({
    id, name: meta[id]?.name || "Deleted category", color: meta[id]?.color || UNCATEGORIZED_COLOR, seconds,
  }));
  rows.sort((a, b) => b.seconds - a.seconds);
  return rows;
}

function computeLeadTimeByCategory(tasks, categories, period) {
  const range = getPeriodRange(period);
  const sums = {};
  tasks.forEach((t) => {
    if (!t.done || !t.completedAt || !t.createdAt) return;
    if (range) {
      const d = new Date(t.completedAt);
      if (d < range.start || d >= range.end) return;
    }
    const key = t.category || "__uncategorized__";
    const lead = t.completedAt - t.createdAt;
    if (!sums[key]) sums[key] = { total: 0, count: 0 };
    sums[key].total += lead;
    sums[key].count += 1;
  });
  const meta = categoryMeta(categories);
  const rows = Object.entries(sums).map(([id, { total, count }]) => ({
    id, name: meta[id]?.name || "Deleted category", color: meta[id]?.color || UNCATEGORIZED_COLOR,
    avgMs: total / count, count,
  }));
  rows.sort((a, b) => a.avgMs - b.avgMs);
  return rows;
}

function buildTimelineData(tasks, categories, period) {
  const range = getPeriodRange(period);
  if (!range) return null;
  const buckets = [];
  if (period === "week") {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(range.start); d.setDate(range.start.getDate() + i);
      const end = new Date(d); end.setDate(d.getDate() + 1);
      buckets.push({ label: labels[i], start: d, end });
    }
  } else if (period === "month") {
    let cur = new Date(range.start), idx = 1;
    while (cur < range.end) {
      const end = new Date(cur); end.setDate(end.getDate() + 7);
      const cappedEnd = end > range.end ? range.end : end;
      buckets.push({ label: `Week ${idx}`, start: new Date(cur), end: cappedEnd });
      cur = cappedEnd; idx++;
    }
  } else {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 0; m < 12; m++) {
      buckets.push({ label: labels[m], start: new Date(range.start.getFullYear(), m, 1), end: new Date(range.start.getFullYear(), m + 1, 1) });
    }
  }
  const rows = buckets.map((b) => {
    const row = { bucket: b.label };
    tasks.forEach((t) => {
      (t.sessions || []).forEach((s) => {
        const d = new Date(s.date + "T00:00:00");
        if (d >= b.start && d < b.end) {
          const key = t.category || "__uncategorized__";
          row[key] = (row[key] || 0) + s.seconds / 3600;
        }
      });
    });
    return row;
  });
  const seriesKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== "bucket"))));
  return { rows, seriesKeys };
}

function computeFocusGroups(tasks, vanishingIds) {
  const range = getPeriodRange("week");
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const overdue = [];
  const thisWeek = [];
  const noDeadlineHigh = [];
  tasks.forEach((t) => {
    const isVanishing = !!(vanishingIds && vanishingIds.has(t.id));
    if (t.done && !isVanishing) return;
    if (t.deadline) {
      const d = new Date(t.deadline + "T00:00:00");
      if (d < todayStart) { overdue.push(t); return; }
      if (d >= range.start && d < range.end) { thisWeek.push(t); return; }
    } else if (t.priority === "high") {
      noDeadlineHigh.push(t);
    }
  });
  const byPriorityThenDeadline = (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.deadline || "").localeCompare(b.deadline || "");
  overdue.sort(byPriorityThenDeadline);
  thisWeek.sort(byPriorityThenDeadline);
  noDeadlineHigh.sort((a, b) => b.createdAt - a.createdAt);
  return { overdue, thisWeek, noDeadlineHigh };
}

function taskMatchesSearch(t, query, categories) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (t.title.toLowerCase().includes(q)) return true;
  if (t.notes && t.notes.toLowerCase().includes(q)) return true;
  if ((t.checklist || []).some((c) => c.text.toLowerCase().includes(q))) return true;
  if ((t.tags || []).some((tag) => tag.toLowerCase().includes(q))) return true;
  if (t.category) {
    const cat = categories.find((c) => c.id === t.category);
    if (cat && cat.name.toLowerCase().includes(q)) return true;
  }
  return false;
}

function addToList(list, raw) {
  const val = raw.trim().toLowerCase();
  if (!val) return list;
  if (list.includes(val)) return list;
  return [...list, val];
}

// ---------------------------------------------------------------------------
// Demo data generation
// ---------------------------------------------------------------------------

function seedCategories() {
  const names = ["Development", "Design", "Meetings", "Budgeting", "Admin", "Marketing", "Support", "Research"];
  const ids = ["cat-development", "cat-design", "cat-meetings", "cat-budgeting", "cat-admin", "cat-marketing", "cat-support", "cat-research"];
  return names.map((name, i) => ({ id: ids[i], name, color: generateDistinctColor(i) }));
}

const TITLE_POOL = {
  "cat-development": [
    "Fix login race condition", "Refactor payment service", "Upgrade CI pipeline", "Write unit tests for API layer",
    "Investigate memory leak", "Set up staging environment", "Migrate to new ORM", "Code review: search feature",
    "Optimize database queries", "Build feature flag system", "Patch security vulnerability", "Pair on onboarding bug",
    "Clean up legacy endpoints", "Add rate limiting", "Spike: websocket support", "Refactor authentication module",
  ],
  "cat-design": [
    "Redesign settings page", "Create icon set", "Update design tokens", "Prototype mobile nav", "Review accessibility contrast",
    "Draft empty states", "Explore dark mode palette", "Design onboarding illustrations", "Update component library",
    "User test new checkout flow", "Sketch dashboard layout", "Refine typography scale", "Design email templates",
  ],
  "cat-meetings": [
    "Weekly team sync", "1:1 with manager", "Sprint planning", "Retro notes", "Client check-in call", "All-hands prep",
    "Vendor call", "Interview candidate", "Roadmap review", "Stakeholder update meeting", "Cross-team sync", "Board prep call",
  ],
  "cat-budgeting": [
    "Q3 budget review", "Reconcile expense reports", "Vendor invoice audit", "Update forecast model", "Renew software licenses",
    "Review travel expenses", "Prepare cost breakdown", "Approve purchase orders", "Payroll reconciliation", "Tax document prep",
  ],
  "cat-admin": [
    "Clean up shared drive", "Update team wiki", "Onboard new hire paperwork", "Renew domain registration", "Archive old projects",
    "Update contact list", "File expense report", "Schedule equipment maintenance", "Organize inbox", "Update password vault",
  ],
  "cat-marketing": [
    "Draft newsletter", "Plan social calendar", "Write blog post", "Update landing page copy", "Analyze campaign metrics",
    "Design ad creative", "Coordinate webinar", "SEO audit", "Customer case study interview", "Refresh brand guidelines",
  ],
  "cat-support": [
    "Triage support queue", "Investigate customer bug report", "Update help docs", "Respond to escalation", "Review CSAT results",
    "Onboard new support rep", "Write FAQ entry", "Audit ticket backlog", "Fix broken help center link", "Follow up on refund request",
  ],
  "cat-research": [
    "Competitor analysis", "User interview synthesis", "Survey draft", "Market sizing exercise", "Literature review",
    "A/B test results write-up", "Persona refresh", "Usability test plan", "Analyze churn data", "Explore new tooling",
  ],
};
const CHECKLIST_POOL = ["Draft outline", "Get feedback", "Finalize details", "Share with team", "Follow up", "Review requirements", "Test changes", "Update documentation", "Get sign-off", "Schedule follow-up"];
const TAG_POOL = ["urgent", "blocked", "waiting-on-review", "quick-win", "client-facing", "internal", "follow-up", "needs-input", "low-effort", "stretch-goal"];
const NOTE_POOL = [
  "Waiting on feedback before moving forward.",
  "Blocked on access to the staging environment.",
  "Discussed in standup — low priority for now.",
  "Needs another pass before it's ready for review.",
  "Follow up with the team next week.",
  "Double check requirements with stakeholder.",
];

function seedTasks() {
  const catIds = seedCategories().map((c) => c.id);
  const RANGE_START = new Date(2026, 5, 1).getTime();
  const RANGE_END = new Date(2026, 8, 30).getTime();
  const NOW = Date.now();
  const createdMax = Math.max(RANGE_START + 86400000, Math.min(NOW, RANGE_END));
  const COUNT = 220;
  const tasks = [];

  for (let i = 0; i < COUNT; i++) {
    const catId = pick(catIds);
    const pool = TITLE_POOL[catId] || TITLE_POOL["cat-admin"];
    const title = pick(pool);
    const pr = Math.random();
    const priority = pr < 0.22 ? "high" : pr < 0.72 ? "medium" : "low";
    const createdAt = Math.round(RANGE_START + Math.random() * (createdMax - RANGE_START));

    let deadline = "";
    if (chance(0.75)) {
      const deadlineTs = Math.round(createdAt + Math.random() * Math.max(1, RANGE_END - createdAt));
      deadline = formatDateYMD(deadlineTs);
    }

    const daysSinceCreated = (NOW - createdAt) / 86400000;
    const doneProb = Math.max(0, Math.min(0.65, daysSinceCreated / 30));
    let done = false, completedAt = null;
    if (createdAt < NOW && chance(doneProb)) {
      done = true;
      const windowEnd = Math.min(NOW, deadline ? new Date(deadline + "T23:59:59").getTime() + 5 * 86400000 : NOW);
      const compTs = Math.round(createdAt + Math.random() * Math.max(3600000, windowEnd - createdAt));
      completedAt = Math.min(NOW, Math.max(createdAt + 1800000, compTs));
    }

    const sessionWindowEnd = done ? completedAt : Math.min(NOW, deadline ? new Date(deadline + "T23:59:59").getTime() : NOW);
    const numSessions = done ? randInt(1, 4) : (chance(0.45) ? randInt(1, 3) : 0);
    const sessions = [];
    for (let s = 0; s < numSessions; s++) {
      if (sessionWindowEnd <= createdAt) break;
      const sTs = Math.round(createdAt + Math.random() * (sessionWindowEnd - createdAt));
      sessions.push({ id: uid(), seconds: randInt(900, 14400), date: formatDateYMD(sTs), source: chance(0.6) ? "timer" : "manual" });
    }

    const checklist = [];
    if (chance(0.5)) {
      const n = randInt(1, 4);
      for (let c = 0; c < n; c++) checklist.push({ id: uid(), text: pick(CHECKLIST_POOL), done: done ? true : chance(0.35) });
    }

    const tags = [];
    if (chance(0.4)) {
      const shuffled = [...TAG_POOL].sort(() => Math.random() - 0.5);
      const n = randInt(1, 2);
      for (let ti = 0; ti < n; ti++) tags.push(shuffled[ti]);
    }

    const notes = chance(0.3) ? pick(NOTE_POOL) : "";

    tasks.push({
      id: uid(), title, priority, deadline, done, createdAt, completedAt,
      notes, category: catId, tags, sessions,
      timerState: "idle", timerStartedAt: null, checklist,
    });
  }
  return tasks;
}

function normalizeImportedPayload(raw) {
  const rawTasks = Array.isArray(raw) ? raw : Array.isArray(raw?.tasks) ? raw.tasks : null;
  if (!rawTasks) return null;
  const rawCategories = Array.isArray(raw?.categories) ? raw.categories : [];
  const categories = rawCategories.map((c, i) => ({ id: c.id || uid(), name: String(c.name || "Category"), color: c.color || generateDistinctColor(i) }));
  const validCatIds = new Set(categories.map((c) => c.id));
  const tasks = rawTasks.map((t) => {
    const legacyFirst = Array.isArray(t.categories) ? t.categories[0] : null;
    const cat = t.category || legacyFirst || null;
    return {
      id: t.id || uid(),
      title: String(t.title || "Untitled task"),
      priority: PRIORITIES[t.priority] ? t.priority : "medium",
      deadline: t.deadline || "",
      done: !!t.done,
      createdAt: t.createdAt || Date.now(),
      completedAt: t.done ? (Number(t.completedAt) || Date.now()) : null,
      notes: t.notes || "",
      category: validCatIds.has(cat) ? cat : null,
      tags: Array.isArray(t.tags) ? t.tags.map((x) => String(x).toLowerCase()) : [],
      sessions: Array.isArray(t.sessions) ? t.sessions.map((s) => ({ id: s.id || uid(), seconds: Number(s.seconds) || 0, date: s.date || todayISO(), source: s.source === "manual" ? "manual" : "timer" })) : [],
      timerState: "idle",
      timerStartedAt: null,
      checklist: Array.isArray(t.checklist) ? t.checklist.map((c) => ({ id: c.id || uid(), text: String(c.text || ""), done: !!c.done })) : [],
    };
  });
  return { tasks, categories };
}

export default function Docket() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [activeView, setActiveView] = useState("tasks");
  const [reportPeriod, setReportPeriod] = useState("month");
  const [chartType, setChartType] = useState("bar");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [storageOk, setStorageOk] = useState(true);
  const [storageError, setStorageError] = useState("");
  const loadedRef = useRef(false);
  const accountRef = useRef(null);

  const [account, setAccount] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);

  const [expanded, setExpanded] = useState(() => new Set());
  const [everOpened, setEverOpened] = useState(() => new Set());
  const [vanishingIds, setVanishingIds] = useState(() => new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTags, setFilterTags] = useState(() => new Set());
  const [sortBy, setSortBy] = useState("priority");

  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDeadline, setNewDeadline] = useState("");
  const [newCategory, setNewCategory] = useState(null);
  const [newNotes, setNewNotes] = useState("");
  const [newChecklist, setNewChecklist] = useState([]);
  const [newChecklistDraft, setNewChecklistDraft] = useState("");
  const [newTags, setNewTags] = useState([]);
  const [newTagDraft, setNewTagDraft] = useState("");

  const [draftItemText, setDraftItemText] = useState({});
  const [draftTagText, setDraftTagText] = useState({});

  const [dataMessage, setDataMessage] = useState("");
  const [clearArmed, setClearArmed] = useState(false);
  const [clearChecked, setClearChecked] = useState(false);
  const fileInputRef = useRef(null);

  const [tick, setTick] = useState(0);
  const [manualOpenFor, setManualOpenFor] = useState(null);
  const [manualDraft, setManualDraft] = useState({ hours: "", minutes: "", date: todayISO() });

  const [catDropdownFor, setCatDropdownFor] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(generateDistinctColor(0));
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [catMessage, setCatMessage] = useState("");
  const [dragCategoryId, setDragCategoryId] = useState(null);

  const tasksKeyFor = (acc) => (acc ? `cloud:${acc.id}:tasks` : TASKS_KEY);
  const categoriesKeyFor = (acc) => (acc ? `cloud:${acc.id}:categories` : CATEGORIES_KEY);

  const loadForAccount = async (acc) => {
    loadedRef.current = false;
    setLoading(true);
    accountRef.current = acc;
    let realError = null;
    const safeGet = async (key) => {
      try {
        return await appStorage.get(key, false);
      } catch (e) {
        console.error(`Docket: storage read failed for ${key}`, e);
        if (!isNotFoundError(e)) realError = e;
        return null;
      }
    };
    try {
      const [taskRes, catRes] = await Promise.all([safeGet(tasksKeyFor(acc)), safeGet(categoriesKeyFor(acc))]);
      if (taskRes && taskRes.value) {
        const parsed = JSON.parse(taskRes.value);
        setTasks(Array.isArray(parsed) ? parsed.map((t) => ({
          category: null, sessions: [], timerState: "idle", timerStartedAt: null, notes: "", completedAt: null, tags: [], ...t,
          timerState: t.timerState === "running" ? "paused" : (t.timerState || "idle"),
        })) : []);
      } else {
        setTasks(acc ? [] : seedTasks());
      }
      if (catRes && catRes.value) {
        const parsed = JSON.parse(catRes.value);
        setCategories(Array.isArray(parsed) ? parsed : []);
      } else {
        setCategories(acc ? [] : seedCategories());
      }
      if (realError) {
        setStorageOk(false);
        setStorageError(`Load failed: ${errMsg(realError)}`);
      } else {
        setStorageOk(true);
        setStorageError("");
      }
    } catch (e) {
      console.error("Docket: failed to load data", e);
      setTasks(acc ? [] : seedTasks());
      setCategories(acc ? [] : seedCategories());
      setStorageOk(false);
      setStorageError(`Load failed: ${errMsg(e)}`);
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  };

  useEffect(() => {
  (async () => {
    try {
      const settingsRes = await appStorage.get(SETTINGS_KEY, false);
      if (settingsRes && settingsRes.value) {
        const s = JSON.parse(settingsRes.value);
        if (s.theme === "light" || s.theme === "dark") setTheme(s.theme);
      }
    } catch (e) {
      if (!isNotFoundError(e)) console.error("Docket: failed to load settings", e);
    }
  })();

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    const acc = user ? { id: user.uid, name: user.displayName || user.email } : null;
    setAccount(acc);
    await loadForAccount(acc);
  });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    (async () => {
      try {
        const res = await appStorage.set(tasksKeyFor(accountRef.current), JSON.stringify(tasks), false);
        if (res) { setStorageOk(true); setStorageError(""); }
        else { setStorageOk(false); setStorageError("Save failed: storage returned no result."); }
      } catch (e) {
        console.error("Docket: failed to save tasks", e);
        setStorageOk(false);
        setStorageError(`Save failed: ${errMsg(e)}`);
      }
    })();
  }, [tasks]);

  useEffect(() => {
    if (!loadedRef.current) return;
    (async () => {
      try {
        await appStorage.set(categoriesKeyFor(accountRef.current), JSON.stringify(categories), false);
      } catch (e) {
        console.error("Docket: failed to save categories", e);
        setStorageOk(false);
        setStorageError(`Save failed: ${errMsg(e)}`);
      }
    })();
  }, [categories]);

  useEffect(() => {
    if (!loadedRef.current) return;
    (async () => {
      try {
        await appStorage.set(SETTINGS_KEY, JSON.stringify({ theme }), false);
      } catch (e) {
        console.error("Docket: failed to save settings", e);
        setStorageOk(false);
        setStorageError(`Save failed: ${errMsg(e)}`);
      }
    })();
  }, [theme]);

  useEffect(() => {
    if (!dataMessage) return;
    const t = setTimeout(() => setDataMessage(""), 3400);
    return () => clearTimeout(t);
  }, [dataMessage]);

  const anyRunning = tasks.some((t) => t.timerState === "running");
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  // ---- account / auth (real Google sign-in) -----------------------
const signIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const acc = { id: user.uid, name: user.displayName || user.email };
    setAccount(acc);
    await loadForAccount(acc);
    setDataMessage(`Signed in as ${acc.name}.`);
  } catch (e) {
    console.error("Google sign-in failed", e);
    setDataMessage("Sign-in failed — check the console for details.");
  }
};
const signOut = async () => {
  await firebaseSignOut(auth);
  setAccount(null);
  setAccountMenuOpen(false);
  await loadForAccount(null);
  setDataMessage("Signed out — back to your local tasks.");
};

  // ---- task operations -----------------------------------------------
  const addTask = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;
    const task = {
      id: uid(), title, priority: newPriority, deadline: newDeadline, done: false,
      createdAt: Date.now(), completedAt: null, notes: newNotes.trim(), category: newCategory, tags: newTags,
      sessions: [], timerState: "idle", timerStartedAt: null,
      checklist: newChecklist.map((c) => ({ id: c.id, text: c.text, done: false })),
    };
    setTasks((prev) => [task, ...prev]);
    setNewTitle(""); setNewPriority("medium"); setNewDeadline(""); setNewCategory(null);
    setNewNotes(""); setNewChecklist([]); setNewChecklistDraft("");
    setNewTags([]); setNewTagDraft("");
    setExpanded((prev) => new Set(prev).add(task.id));
    setEverOpened((prev) => new Set(prev).add(task.id));
    setActiveView("tasks");
    setDataMessage("Task added.");
  }, [newTitle, newPriority, newDeadline, newCategory, newNotes, newChecklist, newTags]);

  const addNewChecklistDraftItem = () => {
    const text = newChecklistDraft.trim();
    if (!text) return;
    setNewChecklist((prev) => [...prev, { id: uid(), text }]);
    setNewChecklistDraft("");
  };
  const removeNewChecklistDraftItem = (id) => setNewChecklist((prev) => prev.filter((c) => c.id !== id));

  const addNewTag = () => { setNewTags((prev) => addToList(prev, newTagDraft)); setNewTagDraft(""); };
  const addNewTagDirect = (tag) => { setNewTags((prev) => addToList(prev, tag)); setNewTagDraft(""); };
  const removeNewTag = (tag) => setNewTags((prev) => prev.filter((t) => t !== tag));

  const toggleDone = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDoneVal = !task.done;
    const willBeHidden = (filterStatus === "active" && newDoneVal) || (filterStatus === "done" && !newDoneVal);
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      if (newDoneVal && t.timerState === "running" && t.timerStartedAt) {
        const elapsed = Math.round((Date.now() - t.timerStartedAt) / 1000);
        const sessions = elapsed > 0 ? [...t.sessions, { id: uid(), seconds: elapsed, date: todayISO(), source: "timer" }] : t.sessions;
        return { ...t, done: newDoneVal, completedAt: Date.now(), timerState: "idle", timerStartedAt: null, sessions };
      }
      if (newDoneVal && t.timerState === "paused") {
        return { ...t, done: newDoneVal, completedAt: Date.now(), timerState: "idle", timerStartedAt: null };
      }
      return { ...t, done: newDoneVal, completedAt: newDoneVal ? Date.now() : null };
    }));
    if (willBeHidden) {
      setVanishingIds((prev) => new Set(prev).add(id));
      setTimeout(() => setVanishingIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 380);
    }
  };
  const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const toggleExpand = (id) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setEverOpened((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };
  const setDeadline = (id, value) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, deadline: value } : t)));
  const setNotes = (id, value) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes: value } : t)));

  const addChecklistItem = (taskId) => {
    const text = (draftItemText[taskId] || "").trim();
    if (!text) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, checklist: [...t.checklist, { id: uid(), text, done: false }] } : t));
    setDraftItemText((prev) => ({ ...prev, [taskId]: "" }));
  };
  const toggleChecklistItem = (taskId, itemId) => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, checklist: t.checklist.map((c) => c.id === itemId ? { ...c, done: !c.done } : c) } : t));
  const deleteChecklistItem = (taskId, itemId) => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, checklist: t.checklist.filter((c) => c.id !== itemId) } : t));

  // ---- tag operations ---------------------------------------------------
  const addTaskTagFromDraft = (taskId) => {
    const raw = draftTagText[taskId] || "";
    if (!raw.trim()) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, tags: addToList(t.tags || [], raw) } : t));
    setDraftTagText((prev) => ({ ...prev, [taskId]: "" }));
  };
  const addTaskTagDirect = (taskId, tag) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, tags: addToList(t.tags || [], tag) } : t));
    setDraftTagText((prev) => ({ ...prev, [taskId]: "" }));
  };
  const removeTaskTag = (taskId, tag) => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, tags: (t.tags || []).filter((x) => x !== tag) } : t));
  const toggleFilterTag = (tag) => setFilterTags((prev) => { const n = new Set(prev); n.has(tag) ? n.delete(tag) : n.add(tag); return n; });

  // ---- timer operations ---------------------------------------------
  // Starting a timer auto-pauses whichever other task is currently running, so only one runs at a time.
  const startTimer = (id) => setTasks((prev) => prev.map((t) => {
    if (t.id === id) return { ...t, timerState: "running", timerStartedAt: Date.now() };
    if (t.timerState === "running" && t.timerStartedAt) {
      const elapsed = Math.round((Date.now() - t.timerStartedAt) / 1000);
      const sessions = elapsed > 0 ? [...t.sessions, { id: uid(), seconds: elapsed, date: todayISO(), source: "timer" }] : t.sessions;
      return { ...t, timerState: "paused", timerStartedAt: null, sessions };
    }
    return t;
  }));
  const pauseTimer = (id) => setTasks((prev) => prev.map((t) => {
    if (t.id !== id) return t;
    if (t.timerState === "running" && t.timerStartedAt) {
      const elapsed = Math.round((Date.now() - t.timerStartedAt) / 1000);
      const sessions = elapsed > 0 ? [...t.sessions, { id: uid(), seconds: elapsed, date: todayISO(), source: "timer" }] : t.sessions;
      return { ...t, timerState: "paused", timerStartedAt: null, sessions };
    }
    return { ...t, timerState: "paused", timerStartedAt: null };
  }));
  const openManual = (taskId) => { setManualOpenFor(taskId); setManualDraft({ hours: "", minutes: "", date: todayISO() }); };
  const closeManual = () => setManualOpenFor(null);
  const submitManual = (taskId) => {
    const h = parseFloat(manualDraft.hours) || 0;
    const m = parseFloat(manualDraft.minutes) || 0;
    const seconds = Math.round(h * 3600 + m * 60);
    if (seconds <= 0) return;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, sessions: [...t.sessions, { id: uid(), seconds, date: manualDraft.date || todayISO(), source: "manual" }] } : t));
    setManualOpenFor(null);
  };
  const deleteSession = (taskId, sessionId) => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, sessions: t.sessions.filter((s) => s.id !== sessionId) } : t));

  // ---- category operations -------------------------------------------
  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { setCatMessage("That category already exists."); return; }
    setCategories((prev) => [...prev, { id: uid(), name, color: newCategoryColor }]);
    setNewCategoryName("");
    setNewCategoryColor(generateDistinctColor(categories.length + 1));
    setCatMessage("");
  };
  const deleteCategory = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.map((t) => t.category === id ? { ...t, category: null } : t));
    if (filterCategory === id) setFilterCategory("all");
    if (newCategory === id) setNewCategory(null);
  };
  const startRenameCategory = (c) => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); };
  const submitRenameCategory = () => {
    const name = editingCategoryName.trim();
    if (name) setCategories((prev) => prev.map((c) => c.id === editingCategoryId ? { ...c, name } : c));
    setEditingCategoryId(null);
  };
  const updateCategoryColor = (id, color) => setCategories((prev) => prev.map((c) => c.id === id ? { ...c, color } : c));
  const setTaskCategory = (taskId, catId) => { setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, category: catId } : t)); setCatDropdownFor(null); };
  const clearTaskCategory = (taskId) => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, category: null } : t));
  const pickNewTaskCategory = (catId) => setNewCategory((prev) => (prev === catId ? null : catId));

  const handleCatDragOver = (e) => e.preventDefault();
  const handleCatDrop = (targetId) => {
    if (!dragCategoryId || dragCategoryId === targetId) { setDragCategoryId(null); return; }
    setCategories((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((c) => c.id === dragCategoryId);
      const toIdx = arr.findIndex((c) => c.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
    setDragCategoryId(null);
  };

  // ---- data: export / import / clear ------------------------------------
  const exportData = () => {
    try {
      const payload = { exportedAt: new Date().toISOString(), mode: account ? "cloud-demo" : "local", tasks, categories };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `docket-export-${todayISO()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDataMessage("Exported to a file on your computer.");
    } catch (e) { setDataMessage("Couldn't export right now."); }
  };
  const triggerImport = () => fileInputRef.current && fileInputRef.current.click();
  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const result = normalizeImportedPayload(parsed);
        if (!result) throw new Error("bad shape");
        setTasks(result.tasks);
        setCategories(result.categories);
        setDataMessage(`Imported ${result.tasks.length} task${result.tasks.length === 1 ? "" : "s"} and ${result.categories.length} categor${result.categories.length === 1 ? "y" : "ies"} into your ${account ? "cloud (demo)" : "local"} list.`);
      } catch (err) { setDataMessage("That file doesn't look like a Docket export."); }
    };
    reader.onerror = () => setDataMessage("Couldn't read that file.");
    reader.readAsText(file);
    e.target.value = "";
  };
  const armClear = () => { setClearArmed(true); setClearChecked(false); };
  const cancelClear = () => { setClearArmed(false); setClearChecked(false); };
  const confirmClear = () => {
    setTasks([]); setCategories([]); setExpanded(new Set());
    setClearArmed(false); setClearChecked(false); setDataMenuOpen(false);
    setDataMessage(`Cleared all ${account ? "cloud (demo)" : "local"} tasks and categories.`);
  };
  const loadSampleData = () => {
    const sampleTasks = seedTasks();
    setTasks(sampleTasks);
    setCategories(seedCategories());
    setExpanded(new Set());
    setDataMenuOpen(false);
    setDataMessage(`Loaded ${sampleTasks.length} sample tasks across 8 categories, replacing your current ${account ? "cloud (demo)" : "local"} list.`);
  };

  // ---- derived view ----------------------------------------------------
  const searchedTasks = tasks.filter((t) => taskMatchesSearch(t, searchQuery, categories));

  const matchesFilters = (t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStatus === "active" && t.done) return false;
    if (filterStatus === "done" && !t.done) return false;
    if (filterCategory === "__uncategorized__" && t.category) return false;
    if (filterCategory !== "all" && filterCategory !== "__uncategorized__" && t.category !== filterCategory) return false;
    if (filterTags.size > 0 && !(t.tags || []).some((tag) => filterTags.has(tag))) return false;
    return true;
  };
  let visible = searchedTasks.filter((t) => vanishingIds.has(t.id) || matchesFilters(t));
  visible = [...visible].sort((a, b) => {
    if (sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
    if (sortBy === "deadline") {
      if (!a.deadline && !b.deadline) return b.createdAt - a.createdAt;
      if (!a.deadline) return 1; if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    }
    return b.createdAt - a.createdAt;
  });
  const tasksViewHasOpen = visible.some((t) => expanded.has(t.id));

  const counts = {
    all: tasks.filter((t) => !t.done).length,
    high: tasks.filter((t) => !t.done && t.priority === "high").length,
    medium: tasks.filter((t) => !t.done && t.priority === "medium").length,
    low: tasks.filter((t) => !t.done && t.priority === "low").length,
    done: tasks.filter((t) => t.done).length,
  };
  const uncategorizedCount = tasks.filter((t) => !t.done && !t.category).length;

  const tagCounts = {};
  tasks.forEach((t) => (t.tags || []).forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
  const allTagsSorted = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b));
  const getTagSuggestions = (draft, existing) => {
    const q = (draft || "").trim().toLowerCase();
    if (!q) return [];
    return allTagsSorted.filter((t) => t.includes(q) && !existing.includes(t)).slice(0, 6);
  };

  const focusGroups = computeFocusGroups(searchedTasks, vanishingIds);
  const focusViewHasOpen = [...focusGroups.overdue, ...focusGroups.thisWeek, ...focusGroups.noDeadlineHigh].some((t) => expanded.has(t.id));

  const reportRows = computeCategoryTotals(tasks, categories, reportPeriod);
  const reportTotalSeconds = reportRows.reduce((s, r) => s + r.seconds, 0);
  const chartData = reportRows.map((r) => ({ name: r.name, hours: +(r.seconds / 3600).toFixed(2), color: r.color, seconds: r.seconds }));
  const timeline = buildTimelineData(tasks, categories, reportPeriod);
  const catMeta = categoryMeta(categories);
  const leadTimeRows = computeLeadTimeByCategory(tasks, categories, reportPeriod);

  const isDark = theme === "dark";
  const chartTickColor = isDark ? "#C7CBD6" : "#5B6272";
  const chartGridColor = isDark ? "#2B2E38" : "#E3E5EA";
  const chartTooltipBg = isDark ? "#20232C" : "#FFFFFF";
  const chartTooltipBorder = isDark ? "#3B3F4C" : "#CBCED8";
  const tooltipContentStyle = { background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 6, fontSize: 12.5, color: chartTickColor };
  const tooltipItemStyle = { color: chartTickColor };
  const tooltipLabelStyle = { color: chartTickColor, fontWeight: 600, marginBottom: 2 };
  const suggestedColors = Array.from({ length: 10 }, (_, i) => generateDistinctColor(categories.length + i));

  // ---- task card renderer (shared by Tasks list and This Week groups) ----
  const renderTaskCard = (task, listHasOpen) => {
    const p = PRIORITIES[task.priority];
    const isOpen = expanded.has(task.id);
    const total = task.checklist.length;
    const doneCount = task.checklist.filter((c) => c.done).length;
    const overdue = isOverdue(task.deadline, task.done);
    const running = task.timerState === "running";
    const totalSecs = liveSeconds(task);
    const cat = task.category ? categories.find((c) => c.id === task.category) : null;
    const vanishing = vanishingIds.has(task.id);
    const dimmed = listHasOpen && !isOpen;

    return (
      <div key={task.id} className="task-card" data-vanishing={vanishing} data-open={isOpen} data-dimmed={dimmed} style={{ "--p-color": p.color, "--p-tint": p.tint }}>
        <div className="task-header" data-done={task.done} data-running={running} onClick={() => toggleExpand(task.id)}>
          <div className="task-title-row">
            <div className="task-title">{task.title}</div>
            <div className="task-meta">
              <span className="meta-pill">{p.label}</span>
              {cat && (
                <span className="meta-cat-chip" style={{ background: `${cat.color}22`, color: cat.color }}>
                  <Tag size={9} />{cat.name}
                </span>
              )}
              {task.deadline && (
                <span className="meta-deadline" data-overdue={overdue}>
                  {overdue ? <AlertCircle size={11} /> : <Calendar size={11} />}{formatDate(task.deadline)}
                </span>
              )}
              {total > 0 && <span className="meta-progress">{doneCount}/{total} checked</span>}
              {(totalSecs > 0 || running) && (
                <span className="meta-time" data-running={running}><Clock size={10} />{formatDuration(totalSecs)}</span>
              )}
              {task.notes && task.notes.trim() && <span className="meta-notes-flag"><StickyNote size={11} /></span>}
              {task.done && <span className="meta-done-flag"><CheckCircle2 size={11} /> Done</span>}
            </div>
          </div>
          <div className="task-actions">
            {!task.done && (
              <button className="icon-btn" data-live={running}
                onClick={(e) => { e.stopPropagation(); running ? pauseTimer(task.id) : startTimer(task.id); }}
                aria-label={running ? "Pause timer" : "Start timer"}>
                {running ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            <span className="icon-btn chevron" data-open={isOpen} onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}><ChevronDown size={16} /></span>
          </div>
        </div>

        <div className="task-body-wrap" data-open={isOpen}>
          <div className="task-body-inner">
            {(isOpen || everOpened.has(task.id)) && (
            <div className="task-body">
              <button className="complete-toggle-btn" data-done={task.done} onClick={() => toggleDone(task.id)}>
                {task.done ? <><RotateCcw size={14} /> Mark as not complete</> : <><CheckCircle2 size={14} /> Mark complete</>}
              </button>

              <div className="task-stats">
                <div className="task-stat-row"><span className="task-stat-label">Created</span><span className="task-stat-value">{formatDateTimeYMD(task.createdAt)}</span></div>
                {task.done && task.completedAt && (
                  <>
                    <div className="task-stat-row"><span className="task-stat-label">Completed</span><span className="task-stat-value">{formatDateTimeYMD(task.completedAt)}</span></div>
                    <div className="task-stat-row"><span className="task-stat-label">Lead time</span><span className="task-stat-value">{formatLeadTime(task.completedAt - task.createdAt)}</span></div>
                  </>
                )}
              </div>

              {(!task.done || task.deadline) && (
                <div className="deadline-edit">
                  <label>Deadline</label>
                  {task.done ? (
                    <span className="readonly-inline">{formatDate(task.deadline)}</span>
                  ) : (
                    <input type="date" value={task.deadline || ""} onChange={(e) => setDeadline(task.id, e.target.value)} />
                  )}
                </div>
              )}

              {(!task.done || (task.notes && task.notes.trim())) && (
                <>
                  <p className="section-label"><StickyNote size={11} /> Notes</p>
                  {task.done ? (
                    <div className="readonly-block">{task.notes}</div>
                  ) : (
                    <textarea
                      className="notes-area"
                      placeholder="Jot down context, links, or anything worth remembering…"
                      value={task.notes || ""}
                      onChange={(e) => setNotes(task.id, e.target.value)}
                    />
                  )}
                </>
              )}

              {(!task.done || task.checklist.length > 0) && (
                <>
                  <p className="section-label">Checklist</p>
                  {task.done ? (
                    <div className="readonly-checklist">
                      {task.checklist.map((item) => (
                        <div className="readonly-checklist-item" key={item.id}>
                          {item.done ? <CheckSquare size={14} style={{ color: "var(--pr-low)", flexShrink: 0 }} /> : <Square size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                          <span style={item.done ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="checklist">
                        {task.checklist.map((item) => (
                          <div className="checklist-item" key={item.id}>
                            <button className="check-box" data-done={item.done} onClick={() => toggleChecklistItem(task.id, item.id)} aria-label={item.done ? "Mark item undone" : "Mark item done"}>
                              <Check size={10} strokeWidth={3} />
                            </button>
                            <span data-done={item.done}>{item.text}</span>
                            <button className="checklist-item-remove" onClick={() => deleteChecklistItem(task.id, item.id)} aria-label="Remove checklist item"><X size={13} /></button>
                          </div>
                        ))}
                      </div>
                      <div className="checklist-add">
                        <input
                          placeholder="Add a checklist item…"
                          value={draftItemText[task.id] || ""}
                          onChange={(e) => setDraftItemText((prev) => ({ ...prev, [task.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addChecklistItem(task.id)}
                        />
                        <button onClick={() => addChecklistItem(task.id)} aria-label="Add checklist item"><Plus size={14} /></button>
                      </div>
                    </>
                  )}
                </>
              )}

              {(!task.done || totalSecs > 0) && (
                <>
                  <p className="section-label"><Clock size={11} /> Time tracking</p>
                  <div className="time-section">
                    <div className="time-top-row">
                      <div>
                        <div className="time-total-label">Total logged</div>
                        <div className="time-total">{formatDuration(totalSecs)}</div>
                        {running && <div className="timer-live-badge"><span className="pulse-dot" /> running</div>}
                      </div>
                      {!task.done && (
                        <div className="timer-controls">
                          {!running && task.timerState !== "paused" && <button className="timer-btn" data-kind="start" onClick={() => startTimer(task.id)}><Play size={13} /> Start</button>}
                          {task.timerState === "paused" && <button className="timer-btn" data-kind="start" onClick={() => startTimer(task.id)}><Play size={13} /> Resume</button>}
                          {running && <button className="timer-btn" onClick={() => pauseTimer(task.id)}><Pause size={13} /> Pause</button>}
                        </div>
                      )}
                    </div>

                    {!task.done && (manualOpenFor === task.id ? (
                      <div className="manual-form">
                        <div className="manual-field"><label>Hours</label><input type="number" min="0" step="1" value={manualDraft.hours} onChange={(e) => setManualDraft((d) => ({ ...d, hours: e.target.value }))} /></div>
                        <div className="manual-field"><label>Minutes</label><input type="number" min="0" max="59" step="1" value={manualDraft.minutes} onChange={(e) => setManualDraft((d) => ({ ...d, minutes: e.target.value }))} /></div>
                        <div className="manual-field"><label>Date</label><input type="date" value={manualDraft.date} onChange={(e) => setManualDraft((d) => ({ ...d, date: e.target.value }))} /></div>
                        <button className="manual-submit" onClick={() => submitManual(task.id)}>Log time</button>
                        <button className="manual-cancel" onClick={closeManual}>Cancel</button>
                      </div>
                    ) : (
                      <button className="manual-link" onClick={() => openManual(task.id)}>+ Add time manually</button>
                    ))}

                    {task.sessions && task.sessions.length > 0 && (
                      <div className="session-log">
                        {[...task.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((s) => (
                          <div className="session-row" key={s.id}>
                            <span>{formatDate(s.date)}</span>
                            <span>{formatDuration(s.seconds)}</span>
                            <span className="sess-source">{s.source === "manual" ? "manual" : "tracked"}</span>
                            {!task.done && <button onClick={() => deleteSession(task.id, s.id)} aria-label="Remove entry"><X size={12} /></button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(!task.done || cat) && (
                <>
                  <p className="section-label"><Tag size={11} /> Category</p>
                  <div className="category-section">
                    {task.done ? (
                      <span className="readonly-cat-chip" style={{ background: `${cat.color}22`, color: cat.color }}>{cat.name}</span>
                    ) : (
                      <div className="category-chips-row">
                        {cat ? (
                          <span className="cat-chip" style={{ background: `${cat.color}22`, color: cat.color }}>
                            {cat.name}
                            <button onClick={() => clearTaskCategory(task.id)} aria-label={`Remove ${cat.name}`}><X size={11} /></button>
                          </span>
                        ) : (
                          <button className="add-cat-btn" onClick={() => setCatDropdownFor(catDropdownFor === task.id ? null : task.id)}>
                            <Plus size={11} /> Add category
                          </button>
                        )}
                        {cat && (
                          <button className="add-cat-btn" onClick={() => setCatDropdownFor(catDropdownFor === task.id ? null : task.id)}>Change</button>
                        )}
                        {catDropdownFor === task.id && (
                          <div className="cat-dropdown">
                            {categories.filter((c) => c.id !== task.category).length === 0 ? (
                              <div className="cat-dropdown-empty">{categories.length === 0 ? "No categories yet." : "No other categories."}</div>
                            ) : (
                              categories.filter((c) => c.id !== task.category).map((c) => (
                                <div key={c.id} className="cat-dropdown-item" onClick={() => setTaskCategory(task.id, c.id)}>
                                  <span className="filter-dot" style={{ background: c.color }} />{c.name}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(!task.done || (task.tags && task.tags.length > 0)) && (
                <>
                  <p className="section-label"><Hash size={11} /> Tags</p>
                  <div className="tag-section" style={{ marginBottom: 0 }}>
                    <div className="tag-chips-row">
                      {(task.tags || []).map((tag) => (
                        <span className="tag-chip" key={tag}>
                          #{tag}
                          {!task.done && <button onClick={() => removeTaskTag(task.id, tag)} aria-label={`Remove ${tag}`}><X size={11} /></button>}
                        </span>
                      ))}
                    </div>
                    {!task.done && (
                      <>
                        <div className="tag-add-row">
                          <input
                            placeholder="Add a tag…"
                            value={draftTagText[task.id] || ""}
                            onChange={(e) => setDraftTagText((prev) => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTaskTagFromDraft(task.id); } }}
                          />
                          <button onClick={() => addTaskTagFromDraft(task.id)} aria-label="Add tag"><Plus size={14} /></button>
                        </div>
                        {getTagSuggestions(draftTagText[task.id], task.tags || []).length > 0 && (
                          <div className="tag-suggestions">
                            {getTagSuggestions(draftTagText[task.id], task.tags || []).map((s) => (
                              <button key={s} onClick={() => addTaskTagDirect(task.id, s)}>#{s}</button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="delete-task-row">
                <div style={{ position: "relative" }}>
                  <button className="delete-task-btn" onClick={() => setConfirmDeleteId(confirmDeleteId === task.id ? null : task.id)}>
                    <Trash2 size={13} /> Delete task
                  </button>
                  {confirmDeleteId === task.id && (
                    <>
                      <div className="backdrop-click" onClick={() => setConfirmDeleteId(null)} />
                      <div className="delete-popover" onClick={(e) => e.stopPropagation()}>
                        <p>Delete this task? This can't be undone.</p>
                        <div className="delete-popover-actions">
                          <button className="delete-cancel-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                          <button className="delete-confirm-btn-small" onClick={() => { deleteTask(task.id); setConfirmDeleteId(null); }}>Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="docket-root" data-theme={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .docket-root {
          --paper: #E6E8ED; --card: #FFFFFF; --ink: #1C2333; --ink-soft: #5B6272; --muted: #7D8496;
          --line: #D3D7E0; --line-strong: #AFB5C4; --accent: #2F3B57;
          --pr-high: #C4483C; --pr-high-tint: #FBEAE8;
          --pr-medium: #B98A2E; --pr-medium-tint: #FAF1E0;
          --pr-low: #3E7A68; --pr-low-tint: #E8F1EC; --pr-low-rgb: 62,122,104;
          --row-active-bg: rgba(28,35,51,0.08);
          --card-shadow: 0 1px 2px rgba(24,29,41,0.05), 0 2px 8px rgba(24,29,41,0.05);
          font-family: 'Inter', sans-serif; background: var(--paper); color: var(--ink);
          min-height: 100vh; padding: 0 0 60px; box-sizing: border-box;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .docket-root * { box-sizing: border-box; }
        .docket-root[data-theme="dark"] {
          --paper: #14161C; --card: #1B1E26; --ink: #ECEDF0; --ink-soft: #ABB0BE; --muted: #6E7280;
          --line: #2B2E38; --line-strong: #3B3F4C; --accent: #9AA9CB;
          --pr-high: #E2685C; --pr-high-tint: #3A2320;
          --pr-medium: #D9A94C; --pr-medium-tint: #362C18;
          --pr-low: #63AC91; --pr-low-tint: #1C2E27; --pr-low-rgb: 99,172,145;
          --row-active-bg: rgba(255,255,255,0.08);
          --card-shadow: 0 1px 2px rgba(0,0,0,0.25), 0 2px 10px rgba(0,0,0,0.22);
        }

        .docket-shell { max-width: 980px; margin: 0 auto; padding: 0 20px; }
        @keyframes viewEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .view-transition { animation: viewEnter 0.32s ease; }

        .navbar { background: var(--card); border-bottom: 2px solid var(--ink); margin-bottom: 22px; }
        .navbar-inner { max-width: 980px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .docket-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        .docket-sub { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
        .navbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 9px; color: var(--muted); pointer-events: none; display: flex; }
        .search-input { width: 190px; font-size: 12.5px; padding: 8px 26px 8px 30px; border-radius: 6px; border: 1px solid var(--line-strong); background: var(--card); color: var(--ink); font-family: 'Inter', sans-serif; }
        .search-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .search-clear { position: absolute; right: 6px; background: none; border: none; color: var(--muted); cursor: pointer; display: flex; padding: 3px; }
        .search-clear:hover { color: var(--ink); }
        @media (max-width: 880px) { .search-input { width: 130px; } }

        .view-tabs { display: flex; gap: 4px; background: var(--paper); padding: 3px; border-radius: 7px; border: 1px solid var(--line); }
        .view-tab { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 5px; border: none; background: none; color: var(--ink-soft); cursor: pointer; font-size: 12.5px; font-weight: 500; white-space: nowrap; }
        .view-tab[data-active="true"] { background: var(--ink); color: var(--paper); }

        .nav-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--line-strong); background: var(--card); color: var(--ink-soft); cursor: pointer; font-size: 12.5px; position: relative; }
        .nav-btn:hover { color: var(--ink); border-color: var(--ink-soft); }
        .nav-btn[data-warn="true"] { border-color: var(--pr-high); }
        .storage-error-box { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; color: var(--pr-high); background: var(--pr-high-tint); border: 1px solid var(--pr-high); border-radius: 5px; padding: 8px 9px; margin-bottom: 10px; line-height: 1.4; }

        .theme-toggle { display: flex; align-items: center; gap: 6px; background: var(--card); border: 1px solid var(--line-strong); border-radius: 20px; padding: 5px 5px; cursor: pointer; }
        .theme-toggle-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--ink); color: var(--paper); display: flex; align-items: center; justify-content: center; }

        .account-btn { display: flex; align-items: center; gap: 7px; padding: 6px 12px 6px 6px; border-radius: 20px; border: 1px solid var(--line-strong); background: var(--card); color: var(--ink); cursor: pointer; font-size: 12.5px; }
        .account-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); color: var(--card); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }

        .dropdown-panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 30; background: var(--card); border: 1px solid var(--line-strong); border-radius: 8px; padding: 12px; min-width: 240px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); text-align: left; }
        .dropdown-panel-label { font-size: 11px; color: var(--muted); margin-bottom: 10px; line-height: 1.5; display: flex; align-items: center; gap: 6px; }
        .dropdown-divider { height: 1px; background: var(--line); margin: 8px 0; }
        .dropdown-item { width: 100%; display: flex; align-items: center; gap: 8px; background: none; border: none; text-align: left; padding: 8px 6px; font-size: 13px; color: var(--ink); cursor: pointer; border-radius: 5px; }
        .dropdown-item:hover { background: var(--paper); }
        .dropdown-item[data-danger="true"] { color: var(--pr-high); }

        .backdrop-click { position: fixed; inset: 0; z-index: 20; }

        .field-label { display: block; font-size: 12px; font-weight: 500; color: var(--ink-soft); margin: 14px 0 6px; }
        .field-label:first-of-type { margin-top: 0; }
        .field-label-row { display: flex; align-items: center; justify-content: space-between; margin: 14px 0 6px; }
        .field-label-row .field-label { margin: 0; }

        .docket-input, .docket-select, .docket-textarea { width: 100%; font-family: 'Inter', sans-serif; font-size: 14px; padding: 10px 11px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--paper); color: var(--ink); }
        .docket-input:focus, .docket-select:focus, .docket-textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

        .priority-picker { display: flex; gap: 6px; }
        .priority-chip { flex: 1; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 8px 4px; border-radius: 4px; border: 1.5px solid var(--line-strong); background: var(--card); cursor: pointer; text-align: center; color: var(--ink-soft); }
        .priority-chip[data-active="true"] { border-color: var(--chip-color); background: var(--chip-tint); color: var(--chip-color); font-weight: 500; }

        .cat-chip-picker { display: flex; flex-wrap: wrap; gap: 6px; }
        .cat-pick-chip { font-size: 11.5px; padding: 5px 10px; border-radius: 20px; border: 1.5px solid var(--line-strong); background: var(--card); color: var(--ink-soft); cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .cat-pick-chip[data-active="true"] { border-color: var(--chip-c); background: var(--chip-c-tint); color: var(--chip-c); font-weight: 500; }
        .cat-pick-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--chip-c); flex-shrink: 0; }
        .cat-hint { font-size: 12px; color: var(--muted); }

        .add-btn { margin-top: 18px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--ink); color: var(--paper); border: none; padding: 12px 10px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .add-btn:hover { opacity: 0.88; }
        .add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .storage-note { font-size: 11px; margin-top: 10px; font-family: 'IBM Plex Mono', monospace; color: var(--pr-high); }

        .new-task-page { max-width: 920px; margin: 0 auto; }
        .new-task-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .new-task-heading { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; margin: 0 0 4px; }
        .new-task-sub { font-size: 13px; color: var(--muted); margin: 0; }
        .new-task-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
        @media (max-width: 760px) { .new-task-grid { grid-template-columns: 1fr; } }
        .new-task-main, .new-task-side { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 22px 24px; box-shadow: var(--card-shadow); }
        .new-task-footer { max-width: 920px; margin: 24px auto 0; display: flex; flex-direction: column; align-items: center; border-top: 1px dashed var(--line-strong); padding-top: 24px; }
        .new-task-submit { max-width: 340px; margin-top: 0; padding: 14px 10px; font-size: 15px; }
        .new-task-title-input { font-size: 18px; padding: 13px 14px; }
        .new-checklist-preview { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; margin-bottom: 8px; }
        .new-checklist-row { display: flex; align-items: center; gap: 8px; font-size: 13px; background: var(--paper); border: 1px solid var(--line); border-radius: 4px; padding: 7px 9px; }
        .new-checklist-row button { margin-left: auto; background: none; border: none; color: var(--muted); cursor: pointer; display: flex; }
        .new-checklist-row button:hover { color: var(--pr-high); }

        .docket-layout { display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 720px) { .docket-layout { grid-template-columns: 1fr; } }

        .panel { background: var(--card); border: 1px solid var(--line); border-radius: 3px; padding: 16px; box-shadow: var(--card-shadow); }
        .panel + .panel { margin-top: 16px; }
        .panel-label { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin: 0 0 10px; display: flex; align-items: center; justify-content: space-between; }

        .filter-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; margin: 0 0 1px; cursor: pointer; font-size: 13px; color: var(--ink-soft); border: none; background: none; width: 100%; text-align: left; border-radius: 5px; }
        .filter-row[data-active="true"] { background: var(--row-active-bg); color: var(--ink); font-weight: 600; }
        .filter-row-count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); flex-shrink: 0; margin-left: auto; }
        .filter-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .filter-row-name { display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

        .manage-cats-link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 10.5px; font-family: 'IBM Plex Mono', monospace; padding: 0; display: flex; align-items: center; gap: 3px; text-transform: none; letter-spacing: 0; }

        .sort-row { display: flex; flex-direction: column; gap: 1px; }
        .sort-btn { display: flex; align-items: center; gap: 8px; text-align: left; background: none; border: none; font-size: 13px; color: var(--ink-soft); padding: 7px 8px; cursor: pointer; width: 100%; border-radius: 5px; }
        .sort-btn[data-active="true"] { background: var(--row-active-bg); color: var(--ink); font-weight: 600; }

        .tag-filter-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-filter-chip { font-size: 11px; padding: 4px 9px; border-radius: 14px; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink-soft); cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .tag-filter-chip[data-active="true"] { background: var(--accent); color: var(--card); border-color: var(--accent); }
        .tag-filter-chip .cnt { opacity: 0.75; font-family: 'IBM Plex Mono', monospace; }

        .data-message { font-size: 11.5px; color: var(--ink-soft); margin-top: 8px; font-family: 'IBM Plex Mono', monospace; line-height: 1.4; }

        .clear-confirm { margin-top: 10px; border: 1px solid var(--pr-high); background: var(--pr-high-tint); border-radius: 4px; padding: 10px; }
        .clear-confirm-text { font-size: 11.5px; color: var(--ink); margin-bottom: 8px; line-height: 1.4; }
        .clear-confirm-checkbox { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; color: var(--ink-soft); margin-bottom: 10px; cursor: pointer; }
        .clear-confirm-checkbox input { margin-top: 2px; }
        .clear-confirm-actions { display: flex; gap: 8px; }
        .clear-confirm-actions button { flex: 1; padding: 7px; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .clear-cancel { background: var(--card); border: 1px solid var(--line-strong); color: var(--ink-soft); }
        .clear-confirm-btn { background: var(--pr-high); border: 1px solid var(--pr-high); color: #fff; }
        .clear-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .inline-link { background: none; border: none; color: var(--accent); text-decoration: underline; cursor: pointer; font: inherit; padding: 0; }

        .task-list { display: flex; flex-direction: column; gap: 10px; }
        .task-card { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--p-color); border-radius: 3px; box-shadow: var(--card-shadow); transition: opacity 0.3s ease, transform 0.3s ease, margin 0.3s ease, box-shadow 0.3s ease; }
        @keyframes taskVanish { to { opacity: 0; transform: scale(0.96); } }
        .task-card[data-vanishing="true"] { animation: taskVanish 0.38s ease forwards; pointer-events: none; }
        .task-card[data-open="true"] { margin: 14px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.14), var(--card-shadow); }
        .task-card[data-dimmed="true"] { opacity: 0.45; }
        .task-card[data-dimmed="true"]:hover { opacity: 0.75; }

        .task-header { display: flex; align-items: flex-start; gap: 10px; padding: 13px 14px; cursor: pointer; border-radius: 2px 2px 0 0; transition: background 0.2s ease; }
        .task-header[data-done="true"] { background: var(--pr-low-tint); }
        @keyframes headerTracking {
          0%, 100% { background: rgba(var(--pr-low-rgb), 0.07); box-shadow: inset 3px 0 0 0 var(--pr-low); }
          50% { background: rgba(var(--pr-low-rgb), 0.18); box-shadow: inset 3px 0 0 0 var(--pr-low); }
        }
        .task-header[data-running="true"] { animation: headerTracking 1.8s ease-in-out infinite; }
        .task-title-row { flex: 1; min-width: 0; }
        .task-title { font-size: 14.5px; font-weight: 500; line-height: 1.35; color: var(--ink); }
        .task-meta { display: flex; gap: 8px; align-items: center; margin-top: 6px; flex-wrap: wrap; }
        .meta-pill { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; padding: 2px 7px; border-radius: 20px; color: var(--p-color); background: var(--p-tint); }
        .meta-deadline { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); display: flex; align-items: center; gap: 4px; }
        .meta-deadline[data-overdue="true"] { color: var(--pr-high); font-weight: 500; }
        .meta-progress { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); }
        .meta-notes-flag { color: var(--muted); display: flex; align-items: center; }
        .meta-done-flag { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--pr-low); display: flex; align-items: center; gap: 3px; }
        .meta-time { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; padding: 2px 7px; border-radius: 20px; display: flex; align-items: center; gap: 4px; background: var(--paper); color: var(--ink-soft); border: 1px solid var(--line); }
        .meta-time[data-running="true"] { color: var(--pr-low); border-color: var(--pr-low); animation: metaPulse 1.8s ease-in-out infinite; }
        @keyframes metaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        .meta-cat-chip { font-size: 10.5px; padding: 2px 8px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }

        .task-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .icon-btn { background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; border-radius: 3px; display: flex; }
        .icon-btn:hover { color: var(--ink); background: var(--paper); }
        .icon-btn[data-live="true"] { color: var(--pr-low); }
        .chevron { transition: transform 0.2s ease; }
        .chevron[data-open="true"] { transform: rotate(180deg); }

        .delete-popover { position: absolute; bottom: calc(100% + 6px); right: 0; z-index: 25; background: var(--card); border: 1px solid var(--pr-high); border-radius: 6px; padding: 10px; min-width: 180px; box-shadow: 0 8px 20px rgba(0,0,0,0.22); }
        .delete-popover p { font-size: 12px; color: var(--ink); margin: 0 0 8px; line-height: 1.4; }
        .delete-popover-actions { display: flex; gap: 6px; }
        .delete-popover-actions button { flex: 1; font-size: 11.5px; padding: 6px; border-radius: 4px; cursor: pointer; }
        .delete-cancel-btn { background: var(--paper); border: 1px solid var(--line-strong); color: var(--ink-soft); }
        .delete-confirm-btn-small { background: var(--pr-high); border: 1px solid var(--pr-high); color: #fff; }

        .task-body-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.28s ease; }
        .task-body-wrap[data-open="true"] { grid-template-rows: 1fr; }
        .task-body-inner { overflow: hidden; }
        .task-body { border-top: 1px dashed var(--line-strong); padding: 16px 14px; background: var(--paper); }

        .complete-toggle-btn { display: flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 5px; font-size: 13px; font-weight: 500; cursor: pointer; margin-bottom: 16px; border: 1.5px solid var(--pr-low); color: var(--pr-low); background: var(--pr-low-tint); }
        .complete-toggle-btn[data-done="true"] { background: var(--card); border-color: var(--line-strong); color: var(--ink-soft); }

        .task-stats { margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; background: var(--card); border: 1px solid var(--line); border-radius: 5px; }
        .task-stat-row { display: flex; align-items: center; gap: 10px; }
        .task-stat-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; width: 84px; flex-shrink: 0; }
        .task-stat-value { color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 12px; }

        .deadline-edit { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .deadline-edit label { font-size: 11.5px; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }
        .deadline-edit input { font-family: 'IBM Plex Mono', monospace; font-size: 12px; border: 1px solid var(--line-strong); border-radius: 3px; padding: 4px 6px; background: var(--card); color: var(--ink); }
        .readonly-inline { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); }

        .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 8px; display: flex; align-items: center; gap: 5px; }

        .time-section { margin-bottom: 16px; padding: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 5px; }
        .time-top-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .time-total { font-family: 'IBM Plex Mono', monospace; font-size: 17px; font-weight: 500; color: var(--ink); }
        .time-total-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
        .timer-controls { display: flex; gap: 6px; }
        .timer-btn { display: flex; align-items: center; gap: 5px; border-radius: 4px; padding: 7px 11px; font-size: 12.5px; cursor: pointer; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink-soft); }
        .timer-btn:hover { color: var(--ink); }
        .timer-btn[data-kind="start"] { border-color: var(--pr-low); color: var(--pr-low); }
        .timer-live-badge { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--pr-low); display: flex; align-items: center; gap: 4px; }
        .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pr-low); animation: pulse 1.4s infinite ease-in-out; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

        .manual-link { background: none; border: none; color: var(--accent); font-size: 11.5px; cursor: pointer; padding: 0; margin-top: 10px; text-decoration: underline; }
        .manual-form { margin-top: 10px; display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; padding-top: 10px; border-top: 1px dashed var(--line); }
        .manual-field { display: flex; flex-direction: column; gap: 3px; }
        .manual-field label { font-size: 10.5px; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }
        .manual-field input { width: 68px; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; padding: 6px 7px; border: 1px solid var(--line-strong); border-radius: 3px; background: var(--paper); color: var(--ink); }
        .manual-field input[type="date"] { width: 128px; }
        .manual-submit { background: var(--ink); color: var(--paper); border: none; border-radius: 3px; padding: 7px 12px; font-size: 12px; cursor: pointer; }
        .manual-cancel { background: none; border: 1px solid var(--line-strong); border-radius: 3px; padding: 7px 10px; font-size: 12px; cursor: pointer; color: var(--ink-soft); }

        .session-log { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
        .session-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }
        .session-row .sess-source { color: var(--muted); }
        .session-row button { margin-left: auto; background: none; border: none; color: var(--line-strong); cursor: pointer; display: flex; }
        .session-row:hover button { color: var(--muted); }

        .delete-task-row { margin-top: 20px; padding-top: 16px; border-top: 1px dashed var(--line); display: flex; justify-content: flex-end; }
        .delete-task-btn { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 7px 12px; border-radius: 4px; border: 1px solid var(--pr-high); color: var(--pr-high); background: var(--pr-high-tint); cursor: pointer; }
        .delete-task-btn:hover { opacity: 0.85; }

        .category-section { margin-bottom: 16px; }
        .category-chips-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; position: relative; }
        .cat-chip { font-size: 11.5px; padding: 4px 9px; border-radius: 20px; display: flex; align-items: center; gap: 6px; }
        .cat-chip button { background: none; border: none; cursor: pointer; display: flex; opacity: 0.7; }
        .cat-chip button:hover { opacity: 1; }
        .add-cat-btn { font-size: 11.5px; padding: 4px 10px; border-radius: 20px; border: 1px dashed var(--line-strong); background: none; color: var(--muted); cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .add-cat-btn:hover { color: var(--ink); border-color: var(--ink-soft); }
        .cat-dropdown { position: absolute; top: 34px; left: 0; z-index: 5; background: var(--card); border: 1px solid var(--line-strong); border-radius: 5px; padding: 6px; min-width: 160px; box-shadow: 0 6px 18px rgba(0,0,0,0.18); }
        .cat-dropdown-item { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12.5px; color: var(--ink); }
        .cat-dropdown-item:hover { background: var(--paper); }
        .cat-dropdown-empty { padding: 8px; font-size: 12px; color: var(--muted); }

        .tag-section { margin-bottom: 16px; }
        .tag-chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .tag-chip { font-size: 11px; padding: 3px 9px; border-radius: 20px; background: var(--paper); border: 1px solid var(--line-strong); color: var(--ink-soft); display: flex; align-items: center; gap: 5px; }
        .tag-chip button { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; }
        .tag-chip button:hover { color: var(--pr-high); }
        .tag-add-row { display: flex; gap: 6px; }
        .tag-add-row input { flex: 1; font-size: 13px; padding: 6px 8px; border: 1px solid var(--line-strong); border-radius: 3px; background: var(--card); color: var(--ink); }
        .tag-add-row button { background: var(--paper); border: 1px solid var(--line-strong); border-radius: 3px; padding: 6px 8px; cursor: pointer; color: var(--ink-soft); display: flex; }
        .tag-suggestions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
        .tag-suggestions button { font-size: 11px; padding: 3px 8px; border-radius: 14px; background: var(--card); border: 1px dashed var(--line-strong); color: var(--ink-soft); cursor: pointer; }
        .tag-suggestions button:hover { border-color: var(--accent); color: var(--ink); }

        .notes-area { width: 100%; min-height: 64px; resize: vertical; font-family: 'Inter', sans-serif; font-size: 13px; padding: 9px 10px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--card); color: var(--ink); margin-bottom: 16px; line-height: 1.45; }
        .notes-area:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .notes-area::placeholder { color: var(--muted); }

        .readonly-block { font-size: 13px; color: var(--ink-soft); background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 9px 10px; line-height: 1.5; margin-bottom: 16px; }
        .readonly-cat-chip { font-size: 11.5px; padding: 4px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; }
        .readonly-checklist { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .readonly-checklist-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-soft); }

        .checklist { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
        .checklist-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .check-box { width: 15px; height: 15px; border-radius: 3px; border: 1.5px solid var(--line-strong); background: var(--card); cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: transparent; }
        .check-box[data-done="true"] { background: var(--pr-low); border-color: var(--pr-low); color: #fff; }
        .checklist-item span[data-done="true"] { text-decoration: line-through; color: var(--muted); }
        .checklist-item-remove { margin-left: auto; background: none; border: none; color: var(--line-strong); cursor: pointer; padding: 2px; display: flex; }
        .checklist-item:hover .checklist-item-remove { color: var(--muted); }
        .checklist-add { display: flex; gap: 6px; align-items: center; margin-bottom: 16px; }
        .checklist-add input { flex: 1; font-size: 13px; padding: 6px 8px; border: 1px solid var(--line-strong); border-radius: 3px; background: var(--card); color: var(--ink); }
        .checklist-add button { background: var(--paper); border: 1px solid var(--line-strong); border-radius: 3px; padding: 6px 8px; cursor: pointer; color: var(--ink-soft); display: flex; }
        .checklist-add button:hover { color: var(--ink); }

        .empty-state { text-align: center; padding: 50px 20px; color: var(--muted); font-size: 13.5px; border: 1px dashed var(--line-strong); border-radius: 3px; background: var(--card); }
        .loading-state { text-align: center; padding: 60px 20px; color: var(--muted); font-family: 'IBM Plex Mono', monospace; font-size: 12px; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(10,11,15,0.55); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal-panel { background: var(--card); border-radius: 8px; border: 1px solid var(--line); width: 100%; max-width: 460px; padding: 22px 24px; max-height: 85vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .modal-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; margin: 0; }
        .modal-close { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; }
        .modal-close:hover { color: var(--ink); }
        .modal-sub { font-size: 12px; color: var(--muted); margin: 0 0 16px; line-height: 1.5; }

        .cat-manage-row { display: flex; align-items: center; gap: 9px; padding: 8px 4px; border-bottom: 1px solid var(--line); }
        .cat-manage-row[data-dragging="true"] { opacity: 0.35; }
        .drag-handle { cursor: grab; color: var(--muted); display: flex; flex-shrink: 0; }
        .drag-handle:active { cursor: grabbing; }
        .cat-color-input { width: 20px; height: 20px; padding: 0; border: none; border-radius: 50%; cursor: pointer; background: none; flex-shrink: 0; }
        .cat-color-input::-webkit-color-swatch-wrapper { padding: 0; border-radius: 50%; }
        .cat-color-input::-webkit-color-swatch { border: 2px solid var(--card); border-radius: 50%; }
        .cat-color-input::-moz-color-swatch { border: 2px solid var(--card); border-radius: 50%; }
        .cat-manage-name { flex: 1; font-size: 13.5px; }
        .cat-manage-name-input { flex: 1; font-size: 13.5px; padding: 4px 6px; border: 1px solid var(--line-strong); border-radius: 3px; background: var(--paper); color: var(--ink); }
        .cat-manage-actions { display: flex; gap: 2px; }

        .cat-add-form { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--line-strong); }
        .cat-swatches { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 12px; align-items: center; }
        .swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
        .swatch[data-active="true"] { border-color: var(--ink); }
        .swatch-custom-wrap { width: 22px; height: 22px; border-radius: 50%; border: 2px dashed var(--line-strong); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .swatch-custom-wrap input { width: 26px; height: 26px; padding: 0; border: none; cursor: pointer; background: none; }
        .cat-message { font-size: 11.5px; color: var(--pr-high); margin-top: 8px; }
        .cat-empty { font-size: 12.5px; color: var(--muted); padding: 10px 4px; }

        .auth-note { font-size: 11.5px; background: var(--paper); border: 1px solid var(--line); border-radius: 5px; padding: 9px 10px; color: var(--ink-soft); line-height: 1.5; margin-bottom: 14px; }
        .auth-submit { display: flex; gap: 8px; margin-top: 12px; }
        .auth-submit .add-btn { margin-top: 0; }

        .focus-page { display: flex; flex-direction: column; gap: 30px; }
        .focus-section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .focus-section-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; margin: 0; }
        .focus-section-title[data-tone="danger"] { color: var(--pr-high); }
        .focus-count { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--muted); background: var(--card); border: 1px solid var(--line); padding: 2px 9px; border-radius: 12px; }
        .focus-empty { font-size: 12.5px; color: var(--muted); padding: 12px 4px; border: 1px dashed var(--line-strong); border-radius: 4px; background: var(--card); }

        .reports-panel { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 22px 24px; box-shadow: var(--card-shadow); }
        .reports-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
        .reports-heading { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; margin: 0; }
        .reports-subheading { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 600; margin: 26px 0 10px; }
        .period-picker, .chart-type-picker { display: flex; gap: 6px; }
        .period-chip { font-size: 12.5px; padding: 7px 13px; border-radius: 20px; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink-soft); cursor: pointer; }
        .period-chip[data-active="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .chart-type-chip { display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 6px 11px; border-radius: 20px; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink-soft); cursor: pointer; }
        .chart-type-chip[data-active="true"] { background: var(--accent); color: var(--card); border-color: var(--accent); }
        .reports-controls-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
        .reports-total { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--ink-soft); margin-bottom: 18px; }
        .reports-total strong { color: var(--ink); font-size: 15px; }
        .breakdown-list { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .breakdown-row { display: flex; align-items: center; gap: 10px; }
        .breakdown-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .breakdown-name { flex: 1; font-size: 13px; color: var(--ink); }
        .breakdown-time { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); }
        .breakdown-pct { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); width: 62px; text-align: right; }
      `}</style>

      <div className="navbar">
        <div className="navbar-inner">
          <div>
            <p className="docket-title">Docket</p>
            <p className="docket-sub">Today's working list</p>
          </div>

          <div className="navbar-right">
            <div className="search-wrap">
              <span className="search-icon"><Search size={13} /></span>
              <input
                className="search-input"
                placeholder="Search everything…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search"><X size={13} /></button>
              )}
            </div>

            <div className="view-tabs">
              <button className="view-tab" data-active={activeView === "tasks"} onClick={() => setActiveView("tasks")}><CheckSquare size={13} /> Tasks</button>
              <button className="view-tab" data-active={activeView === "focus"} onClick={() => setActiveView("focus")}><Flag size={13} /> This Week</button>
              <button className="view-tab" data-active={activeView === "new"} onClick={() => setActiveView("new")}><Plus size={13} /> New Task</button>
              <button className="view-tab" data-active={activeView === "reports"} onClick={() => setActiveView("reports")}><BarChart3 size={13} /> Reports</button>
            </div>

            <div style={{ position: "relative" }}>
              <button className="nav-btn" data-warn={!storageOk} onClick={() => setDataMenuOpen((v) => !v)}>
                {account ? <Cloud size={14} /> : <HardDrive size={14} />} Data
                {!storageOk && <AlertCircle size={13} style={{ color: "var(--pr-high)" }} />}
                <ChevronDown size={13} />
              </button>
              {dataMenuOpen && (
                <>
                  <div className="backdrop-click" onClick={() => { setDataMenuOpen(false); setClearArmed(false); }} />
                  <div className="dropdown-panel">
                    {!storageOk && (
                      <div className="storage-error-box">
                        <AlertCircle size={13} /> {storageError || "Changes aren't saving right now."}
                      </div>
                    )}
                    <div className="dropdown-panel-label">
                      {account ? <><Cloud size={12} /> Cloud (demo) — {account.name}</> : <><HardDrive size={12} /> Saved locally on this device</>}
                    </div>
                    <button className="dropdown-item" onClick={exportData}><Download size={14} /> Save to a file</button>
                    <button className="dropdown-item" onClick={triggerImport}><Upload size={14} /> Load from a file</button>
                    <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" onClick={loadSampleData}><Sparkles size={14} /> Load sample data</button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" data-danger="true" onClick={armClear}><Trash2 size={14} /> Clear all data</button>
                    {clearArmed && (
                      <div className="clear-confirm">
                        <p className="clear-confirm-text">This permanently deletes every task and category in this {account ? "cloud (demo)" : "local"} list.</p>
                        <label className="clear-confirm-checkbox">
                          <input type="checkbox" checked={clearChecked} onChange={(e) => setClearChecked(e.target.checked)} />
                          I understand this can't be undone.
                        </label>
                        <div className="clear-confirm-actions">
                          <button className="clear-cancel" onClick={cancelClear}>Cancel</button>
                          <button className="clear-confirm-btn" disabled={!clearChecked} onClick={confirmClear}>Permanently clear</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ position: "relative" }}>
              {account ? (
                <button className="account-btn" onClick={() => setAccountMenuOpen((v) => !v)}>
                  <span className="account-avatar">{account.name.trim()[0]?.toUpperCase() || "U"}</span>
                  {account.name}
                </button>
              ) : (
                <button className="nav-btn" onClick={signIn}><LogIn size={14} /> Sign in with Google</button>
              )}
              {accountMenuOpen && account && (
                <>
                  <div className="backdrop-click" onClick={() => setAccountMenuOpen(false)} />
                  <div className="dropdown-panel">
                    <div className="dropdown-panel-label"><User size={12} /> Signed in as {account.name} (demo)</div>
                    <button className="dropdown-item" data-danger="true" onClick={signOut}><LogOut size={14} /> Sign out</button>
                  </div>
                </>
              )}
            </div>

            <button className="theme-toggle" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} aria-label="Toggle dark mode">
              <span className="theme-toggle-thumb">{theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="docket-shell">
        {loading ? (
          <div className="loading-state">Loading docket…</div>
        ) : (
          <div key={activeView} className="view-transition">
          {activeView === "new" ? (
          <div className="new-task-page">
            <div className="new-task-header-row">
              <div>
                <p className="new-task-heading">New entry</p>
                <p className="new-task-sub">Add a task with as much detail as you'd like — you can always fill in more later.</p>
              </div>
              <button className="nav-btn" onClick={() => setActiveView("tasks")}><ArrowLeft size={14} /> Back to tasks</button>
            </div>

            <div className="new-task-grid">
              <div className="new-task-main">
                <label className="field-label">Task</label>
                <input
                  className="docket-input new-task-title-input"
                  placeholder="What needs doing?"
                  value={newTitle}
                  autoFocus
                  onChange={(e) => setNewTitle(e.target.value)}
                />

                <label className="field-label">Notes</label>
                <textarea
                  className="notes-area"
                  placeholder="Context, links, or anything worth remembering…"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{ minHeight: 90 }}
                />

                <label className="field-label">Checklist</label>
                {newChecklist.length > 0 && (
                  <div className="new-checklist-preview">
                    {newChecklist.map((item) => (
                      <div className="new-checklist-row" key={item.id}>
                        <span>{item.text}</span>
                        <button onClick={() => removeNewChecklistDraftItem(item.id)} aria-label="Remove item"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="checklist-add" style={{ marginBottom: 20 }}>
                  <input
                    placeholder="Add a checklist item…"
                    value={newChecklistDraft}
                    onChange={(e) => setNewChecklistDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNewChecklistDraftItem()}
                  />
                  <button onClick={addNewChecklistDraftItem} aria-label="Add checklist item"><Plus size={14} /></button>
                </div>
              </div>

              <div className="new-task-side">
                <label className="field-label">Priority</label>
                <div className="priority-picker">
                  {Object.entries(PRIORITIES).map(([key, p]) => (
                    <button key={key} className="priority-chip" data-active={newPriority === key}
                      style={{ "--chip-color": p.color, "--chip-tint": p.tint }} onClick={() => setNewPriority(key)}>
                      {p.label}
                    </button>
                  ))}
                </div>

                <label className="field-label">Deadline</label>
                <input type="date" className="docket-input" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />

                <div className="field-label-row">
                  <label className="field-label">Category</label>
                  <button className="manage-cats-link" onClick={() => setShowCategoryManager(true)}><Layers size={11} /> Manage</button>
                </div>
                {categories.length === 0 ? (
                  <p className="cat-hint">No categories yet — use Manage above to add one.</p>
                ) : (
                  <div className="cat-chip-picker">
                    {categories.map((c) => (
                      <button key={c.id} className="cat-pick-chip" data-active={newCategory === c.id}
                        style={{ "--chip-c": c.color, "--chip-c-tint": `${c.color}22` }}
                        onClick={() => pickNewTaskCategory(c.id)}>
                        <span className="cat-pick-dot" />{c.name}
                      </button>
                    ))}
                  </div>
                )}

                <label className="field-label"><Hash size={11} style={{ display: "inline", marginRight: 4 }} />Tags</label>
                {newTags.length > 0 && (
                  <div className="tag-chips-row">
                    {newTags.map((tag) => (
                      <span className="tag-chip" key={tag}>#{tag}<button onClick={() => removeNewTag(tag)} aria-label={`Remove ${tag}`}><X size={11} /></button></span>
                    ))}
                  </div>
                )}
                <div className="tag-add-row">
                  <input
                    placeholder="Add a tag…"
                    value={newTagDraft}
                    onChange={(e) => setNewTagDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addNewTag(); } }}
                  />
                  <button onClick={addNewTag} aria-label="Add tag"><Plus size={14} /></button>
                </div>
                {getTagSuggestions(newTagDraft, newTags).length > 0 && (
                  <div className="tag-suggestions">
                    {getTagSuggestions(newTagDraft, newTags).map((s) => (
                      <button key={s} onClick={() => addNewTagDirect(s)}>#{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="new-task-footer">
              <button className="add-btn new-task-submit" onClick={addTask} disabled={!newTitle.trim()}>
                <Plus size={16} /> Add to docket
              </button>
              {!storageOk && (
                <p className="storage-note" style={{ marginTop: 12, textAlign: "center" }}>
                  Changes aren't saving right now{storageError ? ` — ${storageError}` : "."}
                </p>
              )}
            </div>
          </div>
        ) : activeView === "focus" ? (
          <div className="focus-page">
            <div>
              <div className="focus-section-head">
                <AlertCircle size={16} style={{ color: "var(--pr-high)" }} />
                <p className="focus-section-title" data-tone="danger">Overdue</p>
                <span className="focus-count">{focusGroups.overdue.length}</span>
              </div>
              {focusGroups.overdue.length === 0 ? (
                <p className="focus-empty">Nothing overdue — nice work.</p>
              ) : (
                <div className="task-list">{focusGroups.overdue.map((t) => renderTaskCard(t, focusViewHasOpen))}</div>
              )}
            </div>
            <div>
              <div className="focus-section-head">
                <Flag size={16} style={{ color: "var(--accent)" }} />
                <p className="focus-section-title">Due this week</p>
                <span className="focus-count">{focusGroups.thisWeek.length}</span>
              </div>
              {focusGroups.thisWeek.length === 0 ? (
                <p className="focus-empty">Nothing due this week.</p>
              ) : (
                <div className="task-list">{focusGroups.thisWeek.map((t) => renderTaskCard(t, focusViewHasOpen))}</div>
              )}
            </div>
            <div>
              <div className="focus-section-head">
                <AlertCircle size={16} style={{ color: "var(--pr-medium)" }} />
                <p className="focus-section-title">High priority, no deadline</p>
                <span className="focus-count">{focusGroups.noDeadlineHigh.length}</span>
              </div>
              {focusGroups.noDeadlineHigh.length === 0 ? (
                <p className="focus-empty">None right now.</p>
              ) : (
                <div className="task-list">{focusGroups.noDeadlineHigh.map((t) => renderTaskCard(t, focusViewHasOpen))}</div>
              )}
            </div>
          </div>
        ) : activeView === "tasks" ? (
          <div className="docket-layout">
            <div>
              <div className="panel">
                <p className="panel-label">Status</p>
                <button className="filter-row" data-active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>All<span className="filter-row-count">{tasks.length}</span></button>
                <button className="filter-row" data-active={filterStatus === "active"} onClick={() => setFilterStatus("active")}>Active<span className="filter-row-count">{counts.all}</span></button>
                <button className="filter-row" data-active={filterStatus === "done"} onClick={() => setFilterStatus("done")}>Completed<span className="filter-row-count">{counts.done}</span></button>
              </div>

              <div className="panel">
                <p className="panel-label">Priority</p>
                <button className="filter-row" data-active={filterPriority === "all"} onClick={() => setFilterPriority("all")}>All</button>
                {Object.entries(PRIORITIES).map(([key, p]) => (
                  <button key={key} className="filter-row" data-active={filterPriority === key} onClick={() => setFilterPriority(key)}>
                    {p.label}<span className="filter-row-count">{counts[key]}</span>
                  </button>
                ))}
              </div>

              <div className="panel">
                <p className="panel-label">
                  Category
                  <button className="manage-cats-link" onClick={() => setShowCategoryManager(true)}><Layers size={11} /> Manage</button>
                </p>
                <button className="filter-row" data-active={filterCategory === "all"} onClick={() => setFilterCategory("all")}>All</button>
                {categories.map((c) => (
                  <button key={c.id} className="filter-row" data-active={filterCategory === c.id} onClick={() => setFilterCategory(c.id)}>
                    <span className="filter-row-name"><span className="filter-dot" style={{ background: c.color }} />{c.name}</span>
                  </button>
                ))}
                <button className="filter-row" data-active={filterCategory === "__uncategorized__"} onClick={() => setFilterCategory("__uncategorized__")}>
                  <span className="filter-row-name"><span className="filter-dot" style={{ background: UNCATEGORIZED_COLOR }} />Uncategorized</span>
                  <span className="filter-row-count">{uncategorizedCount}</span>
                </button>
              </div>

              {allTagsSorted.length > 0 && (
                <div className="panel">
                  <p className="panel-label">Tags</p>
                  <div className="tag-filter-list">
                    {allTagsSorted.map((tag) => (
                      <button key={tag} className="tag-filter-chip" data-active={filterTags.has(tag)} onClick={() => toggleFilterTag(tag)}>
                        #{tag} <span className="cnt">{tagCounts[tag]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel">
                <p className="panel-label">Sort by</p>
                <div className="sort-row">
                  <button className="sort-btn" data-active={sortBy === "priority"} onClick={() => setSortBy("priority")}>Priority</button>
                  <button className="sort-btn" data-active={sortBy === "deadline"} onClick={() => setSortBy("deadline")}>Deadline</button>
                  <button className="sort-btn" data-active={sortBy === "created"} onClick={() => setSortBy("created")}>Date added</button>
                </div>
              </div>

              {dataMessage && <p className="data-message">{dataMessage}</p>}
            </div>

            <div className="task-list">
              {visible.length === 0 && (
                <div className="empty-state">
                  Nothing here. <button className="inline-link" onClick={() => setActiveView("new")}>Add a task</button>, or adjust filters to see more of the docket.
                </div>
              )}
              {visible.map((t) => renderTaskCard(t, tasksViewHasOpen))}
            </div>
          </div>
        ) : (
          <div className="reports-panel">
            <div className="reports-head">
              <p className="reports-heading">Time by category</p>
              <div className="period-picker">
                {["week", "month", "year", "all"].map((p) => (
                  <button key={p} className="period-chip" data-active={reportPeriod === p} onClick={() => setReportPeriod(p)}>
                    {p === "all" ? "All time" : p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="reports-controls-row">
              <div className="reports-total" style={{ marginBottom: 0 }}>
                <strong>{formatDuration(reportTotalSeconds)}</strong> tracked {reportPeriod === "all" ? "in total" : `this ${reportPeriod}`}
              </div>
              <div className="chart-type-picker">
                <button className="chart-type-chip" data-active={chartType === "bar"} onClick={() => setChartType("bar")}><BarChart3 size={13} /> Bar</button>
                <button className="chart-type-chip" data-active={chartType === "pie"} onClick={() => setChartType("pie")}><PieChartIcon size={13} /> Pie</button>
                <button className="chart-type-chip" data-active={chartType === "timeline"} onClick={() => setChartType("timeline")}><TrendingUp size={13} /> Timeline</button>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="empty-state">No tracked time in this period yet. Start a timer or log time manually on a task.</div>
            ) : (
              <>
                {chartType === "bar" && (
                  <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 46)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
                      <CartesianGrid stroke={chartGridColor} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: chartTickColor }} axisLine={{ stroke: chartGridColor }} tickLine={false} unit="h" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: chartTickColor }} axisLine={{ stroke: chartGridColor }} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
                        contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}
                        formatter={(value, name, props) => [formatDuration(props.payload.seconds), "Time"]}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={22}>
                        {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {chartType === "pie" && (
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie data={chartData} dataKey="hours" nameKey="name" cx="50%" cy="50%" innerRadius={64} outerRadius={112} paddingAngle={2}>
                        {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}
                        formatter={(value, name, props) => [formatDuration(props.payload.seconds), props.payload.name]}
                      />
                      <Legend formatter={(value) => <span style={{ color: chartTickColor, fontSize: 12.5 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {chartType === "timeline" && (
                  timeline ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timeline.rows} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: chartTickColor }} axisLine={{ stroke: chartGridColor }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: chartTickColor }} axisLine={{ stroke: chartGridColor }} tickLine={false} unit="h" />
                        <Tooltip
                          cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
                          contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}
                          formatter={(value, name) => [`${(+value).toFixed(2)}h`, catMeta[name]?.name || name]}
                        />
                        {timeline.seriesKeys.map((key) => (
                          <Bar key={key} dataKey={key} stackId="a" fill={catMeta[key]?.color || UNCATEGORIZED_COLOR} name={catMeta[key]?.name || key} radius={[2, 2, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">Pick Week, Month, or Year above to see the timeline view.</div>
                  )
                )}

                <div className="breakdown-list">
                  {reportRows.map((r) => (
                    <div className="breakdown-row" key={r.id}>
                      <span className="breakdown-dot" style={{ background: r.color }} />
                      <span className="breakdown-name">{r.name}</span>
                      <span className="breakdown-time">{formatDuration(r.seconds)}</span>
                      <span className="breakdown-pct">{reportTotalSeconds ? Math.round((r.seconds / reportTotalSeconds) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {leadTimeRows.length > 0 && (
              <>
                <p className="reports-subheading">Average lead time by category</p>
                <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "-4px 0 12px" }}>
                  Time from creating a task to marking it complete, for tasks finished {reportPeriod === "all" ? "at any time" : `this ${reportPeriod}`}.
                </p>
                <div className="breakdown-list">
                  {leadTimeRows.map((r) => (
                    <div className="breakdown-row" key={r.id}>
                      <span className="breakdown-dot" style={{ background: r.color }} />
                      <span className="breakdown-name">{r.name}</span>
                      <span className="breakdown-time">{formatLeadTime(r.avgMs)}</span>
                      <span className="breakdown-pct">{r.count} task{r.count === 1 ? "" : "s"}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          )}
          </div>
        )}
      </div>

      {showCategoryManager && (
        <div className="modal-backdrop" onClick={() => setShowCategoryManager(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="modal-title">Categories</p>
              <button className="modal-close" onClick={() => setShowCategoryManager(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal-sub">Manage the tags you can assign to tasks. Drag the handle to reorder — the order shown here is used everywhere.</p>

            {categories.length === 0 && <p className="cat-empty">No categories yet — add your first one below.</p>}
            {categories.map((c) => (
              <div
                className="cat-manage-row" key={c.id}
                draggable
                onDragStart={() => setDragCategoryId(c.id)}
                onDragOver={handleCatDragOver}
                onDrop={() => handleCatDrop(c.id)}
                onDragEnd={() => setDragCategoryId(null)}
                data-dragging={dragCategoryId === c.id}
              >
                <span className="drag-handle"><GripVertical size={14} /></span>
                <input
                  type="color" className="cat-color-input" value={c.color}
                  onChange={(e) => updateCategoryColor(c.id, e.target.value)}
                  aria-label={`Change color for ${c.name}`}
                />
                {editingCategoryId === c.id ? (
                  <input className="cat-manage-name-input" value={editingCategoryName} autoFocus
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitRenameCategory()}
                    onBlur={submitRenameCategory} />
                ) : (
                  <span className="cat-manage-name">{c.name}</span>
                )}
                <div className="cat-manage-actions">
                  <button className="icon-btn" onClick={() => startRenameCategory(c)} aria-label={`Rename ${c.name}`}><Pencil size={13} /></button>
                  <button className="icon-btn" onClick={() => deleteCategory(c.id)} aria-label={`Delete ${c.name}`}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}

            <div className="cat-add-form">
              <label className="field-label">New category</label>
              <input className="docket-input" placeholder="e.g. Budgeting, Development…" value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
              <div className="cat-swatches">
                {suggestedColors.slice(0, 8).map((color) => (
                  <button key={color} className="swatch" data-active={newCategoryColor === color} style={{ background: color }} onClick={() => setNewCategoryColor(color)} aria-label={`Choose color ${color}`} />
                ))}
                <label className="swatch-custom-wrap" title="Custom color" style={{ background: newCategoryColor }}>
                  <input type="color" value={newCategoryColor} onChange={(e) => setNewCategoryColor(e.target.value)} />
                </label>
              </div>
              <button className="add-btn" onClick={addCategory} disabled={!newCategoryName.trim()}><Plus size={14} /> Add category</button>
              {catMessage && <p className="cat-message">{catMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
