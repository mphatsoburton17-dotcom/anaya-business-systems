import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Store, Scissors, Coffee, Wrench, Package, Users, Receipt,
  BarChart3, Bell, Megaphone, Settings, Plus, X, Check,
  ChevronRight, LogOut, ShieldCheck, AlertTriangle, Trash2, MoreHorizontal,
  Moon, Sun, Calculator, FileText, Printer, TrendingDown, TrendingUp, Download, Search as SearchIcon,
  CalendarDays, Lock, Mail, BookOpen, Wallet, HandCoins, Puzzle, HelpCircle, Phone, MessageCircle,
  Sparkles, Building2, Smartphone, Layers, Pencil, Share2,
  ShoppingCart, Shirt, Hammer, Sofa, Pill, Wheat, GraduationCap, UtensilsCrossed, Cookie, Beer, Car,
  ClipboardList, Truck, CalendarClock, ChevronLeft, PiggyBank, PackageCheck, ScanLine,
  Lightbulb, CheckCircle2
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const EXPENSE_CATEGORIES = [
  "Restocking / buying stock", "Rent", "Utilities", "Transport",
  "Damages / loss", "Repairs & maintenance", "Marketing", "Refunds / returns",
  "Salaries & wages", "Staff loans / advances", "Other",
];
// Property/Rentals businesses don't buy stock or pay themselves "rent" — their expenses
// look more like the costs of maintaining and managing rented-out units.
const PROPERTY_EXPENSE_CATEGORIES = [
  "Property maintenance & repairs", "Utilities (paid by landlord)", "Property taxes / rates",
  "Insurance", "Legal & agent fees", "Marketing", "Refunds / returns",
  "Salaries & wages", "Staff loans / advances", "Other",
];
function expenseCategoriesFor(categoryId) {
  return categoryId === "property" ? PROPERTY_EXPENSE_CATEGORIES : EXPENSE_CATEGORIES;
}

// Units of measure for stocked items — for businesses that sell by weight/volume
// (rice, cooking oil, fabric by the metre) rather than by the piece.
const STOCK_UNITS = ["pcs", "kg", "g", "l", "ml", "m", "box", "bag", "dozen"];
function unitLabel(unit, plural = false) {
  const u = unit || "pcs";
  if (u === "pcs") return plural ? "pieces" : "piece";
  return u; // kg, l, m etc. read the same singular or plural
}

/* ---------------------------------------------------------
   ANAYA BUSINESS SYSTEMS — Foundation Build
   Real, persisted data (window.storage). No mock UI states.
   --------------------------------------------------------- */

const CATEGORIES = [
  {
    id: "retail",
    name: "Retail / Goods",
    icon: Store,
    examples: "Clothing, cosmetics, electronics",
    itemLabel: "Product",
    itemLabelPlural: "Products",
    orderNoun: "Order",
    orderNounPlural: "Orders",
    customerNoun: "Customer",
    customerNounPlural: "Customers",
    hasVariants: true,
    hasStock: true,
    extraFieldLabel: "Starting stock",
    statusLabels: { pending: "Pending", paid: "Paid", fulfilled: "Delivered" },
    theme: { accent: "#1449B0", accentSoft: "#E5EDFB", gold: "#0F3A8C", goldSoft: "#DCE7F9" },
    heroStat: "topStock",
    quickLabels: { newItem: "New product", newOrder: "New sale", people: "Customers" },
    recentTitle: "Recent sales",
    staffRoleLabel: "Sales Assistant",
    suggestedCategories: ["Clothing", "Cosmetics", "Electronics", "Groceries", "Household", "Other"],
    highVolumeExample: "a busy grocery or general dealer where dozens of customers pay at the till every hour",
    subtypes: [
      { id: "grocery", name: "Grocery / Supermarket", icon: ShoppingCart },
      { id: "clothing", name: "Clothing & Fashion", icon: Shirt },
      { id: "electronics", name: "Electronics & Phones", icon: Smartphone },
      { id: "hardware", name: "Hardware & Building Supplies", icon: Hammer },
      { id: "furniture", name: "Furniture", icon: Sofa },
      { id: "pharmacy", name: "Pharmacy / Chemist", icon: Pill, isPharmacy: true },
      { id: "agriculture", name: "Agriculture & Farm Produce", icon: Wheat },
      { id: "cosmetics", name: "Cosmetics & Beauty Products", icon: Sparkles },
      { id: "bookshop", name: "Book Shop", icon: BookOpen },
      { id: "retail_general", name: "General Dealer / Other", icon: Store },
    ],
  },
  {
    id: "service",
    name: "Appointment / Service",
    icon: Scissors,
    examples: "Barbershop, salon, spa",
    itemLabel: "Service",
    itemLabelPlural: "Services",
    orderNoun: "Booking",
    orderNounPlural: "Bookings",
    customerNoun: "Client",
    customerNounPlural: "Clients",
    hasVariants: false,
    hasStock: false,
    extraFieldLabel: "Duration (minutes)",
    statusLabels: { pending: "Requested", paid: "Confirmed", fulfilled: "Completed" },
    theme: { accent: "#2B6CD4", accentSoft: "#E8F0FC", gold: "#164E9E", goldSoft: "#DEEAFA" },
    heroStat: "busiestService",
    quickLabels: { newItem: "New service", newOrder: "New booking", people: "Clients" },
    recentTitle: "Today's bookings",
    staffRoleLabel: "Stylist",
    suggestedCategories: ["Haircuts", "Braiding", "Nails & beauty", "Spa & massage", "Other"],
    highVolumeExample: "a walk-in barbershop or salon on a Saturday, where clients are handled back-to-back",
    subtypes: [
      { id: "salon", name: "Hair Salon", icon: Scissors },
      { id: "barbershop", name: "Barbershop", icon: Scissors },
      { id: "spa", name: "Spa & Massage", icon: Sparkles },
      { id: "tutoring", name: "Tutoring / Consulting", icon: GraduationCap },
      { id: "cleaning", name: "Cleaning Services", icon: Sparkles },
      { id: "service_general", name: "Other Service", icon: Scissors },
    ],
  },
  {
    id: "food",
    name: "Food & Beverage",
    icon: Coffee,
    examples: "Café, restaurant, bakery",
    itemLabel: "Menu item",
    itemLabelPlural: "Menu",
    orderNoun: "Order",
    orderNounPlural: "Orders",
    customerNoun: "Customer",
    customerNounPlural: "Regulars",
    hasVariants: false,
    hasStock: true,
    extraFieldLabel: "Portions in stock",
    statusLabels: { pending: "Preparing", paid: "Ready", fulfilled: "Served" },
    theme: { accent: "#0E5FA8", accentSoft: "#E3EFFA", gold: "#0A4A85", goldSoft: "#DAE9F7" },
    heroStat: "bestSeller",
    quickLabels: { newItem: "New menu item", newOrder: "New order", people: "Regulars" },
    recentTitle: "Kitchen queue",
    staffRoleLabel: "Server",
    suggestedCategories: ["Drinks", "Mains", "Snacks", "Desserts", "Other"],
    highVolumeExample: "a café or takeaway during lunch rush, with a long line and no time to itemize every plate",
    subtypes: [
      { id: "restaurant", name: "Restaurant", icon: UtensilsCrossed },
      { id: "cafe", name: "Café / Coffee Shop", icon: Coffee },
      { id: "bakery", name: "Bakery", icon: Cookie },
      { id: "takeaway", name: "Takeaway / Fast Food", icon: Package },
      { id: "bar", name: "Bar / Pub", icon: Beer },
      { id: "food_general", name: "Other Food & Beverage", icon: Coffee },
    ],
  },
  {
    id: "repair",
    name: "Repair / Trade",
    icon: Wrench,
    examples: "Phone repair, tailor, mechanic",
    itemLabel: "Job type",
    itemLabelPlural: "Job types",
    orderNoun: "Job",
    orderNounPlural: "Jobs",
    customerNoun: "Client",
    customerNounPlural: "Clients",
    hasVariants: false,
    hasStock: false,
    extraFieldLabel: "Typical turnaround (hrs)",
    statusLabels: { pending: "Received", paid: "In progress", fulfilled: "Completed" },
    theme: { accent: "#1E5AA8", accentSoft: "#E6EEFB", gold: "#123E77", goldSoft: "#DCE8F8" },
    heroStat: "openJobs",
    quickLabels: { newItem: "New job type", newOrder: "New job", people: "Clients" },
    recentTitle: "Jobs in progress",
    staffRoleLabel: "Technician",
    suggestedCategories: ["Phone repair", "Tailoring", "Mechanical", "Electrical", "Other"],
    highVolumeExample: "a workshop with several small jobs coming in per hour that are hard to log one by one",
    subtypes: [
      { id: "phonerepair", name: "Phone & Electronics Repair", icon: Smartphone },
      { id: "mechanic", name: "Mechanic / Auto Repair", icon: Car },
      { id: "tailoring", name: "Tailoring & Alterations", icon: Scissors },
      { id: "carpentry", name: "Carpentry", icon: Hammer },
      { id: "plumbing", name: "Plumbing & Electrical", icon: Wrench },
      { id: "repair_general", name: "Other Repair / Trade", icon: Wrench },
    ],
  },
  {
    id: "property",
    name: "Property / Rentals",
    icon: Building2,
    examples: "Rental houses, shops, offices, land",
    itemLabel: "Property",
    itemLabelPlural: "Properties",
    orderNoun: "Rent payment",
    orderNounPlural: "Rent payments",
    customerNoun: "Tenant",
    customerNounPlural: "Tenants",
    hasVariants: false,
    hasStock: false,
    extraFieldLabel: "Tenant name (leave blank if vacant)",
    statusLabels: { pending: "Due", paid: "Paid", fulfilled: "Paid" },
    theme: { accent: "#0E6E5C", accentSoft: "#E1F3EF", gold: "#0A5747", goldSoft: "#D8EFE9" },
    heroStat: "occupiedProperties",
    quickLabels: { newItem: "New property", newOrder: "Record rent payment", people: "Tenants" },
    recentTitle: "Recent rent payments",
    staffRoleLabel: "Property Manager",
    suggestedCategories: ["Land", "House", "Apartment / Room", "Shop / Retail Space", "Office", "Warehouse", "Other"],
    highVolumeExample: "an agent managing many rented units where itemizing every payment by hand gets tedious",
  },
];

// Matches a free-text business description to the closest category using keywords.
// This is simple client-side matching, not real language understanding — genuinely
// custom dashboards generated from any description would need an AI backend step.
const CATEGORY_KEYWORDS = {
  retail: ["shop", "store", "sell", "selling", "goods", "products", "clothes", "clothing", "boutique", "electronics", "cosmetics", "groceries", "grocery", "hardware", "phones", "accessories", "stock", "wholesale", "retail", "shoes", "fashion", "furniture"],
  service: ["salon", "barber", "barbershop", "spa", "nails", "massage", "appointment", "booking", "haircut", "beauty", "stylist", "consult", "consulting", "tutor", "tutoring", "gym", "fitness", "cleaning service", "photography", "makeup", "braiding"],
  food: ["restaurant", "café", "cafe", "food", "kitchen", "menu", "bakery", "bake", "drinks", "beverage", "takeaway", "take-away", "grill", "chips", "catering", "meals", "snacks", "coffee shop"],
  repair: ["repair", "fix", "fixing", "mechanic", "garage", "tailor", "tailoring", "sewing", "technician", "maintenance", "workshop", "carpentry", "plumber", "plumbing", "electrician", "welding", "phone repair"],
  property: ["rent", "rental", "rentals", "landlord", "tenant", "tenants", "lease", "leasing", "property", "properties", "apartment", "apartments", "real estate", "estate agent", "letting", "house for rent", "office space", "warehouse"],
};
function suggestCategoryFromText(text) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  Object.entries(CATEGORY_KEYWORDS).forEach(([id, words]) => {
    const matched = words.filter((w) => t.includes(w));
    if (matched.length > bestScore) { bestScore = matched.length; best = { id, matched }; }
  });
  return best;
}

const ROLES = {
  owner: { label: "Owner", color: "#1B4332" },
  full: { label: "Full access", color: "#1B4332" },
  manager: { label: "Manager", color: "#0F3A8C" },
  sales: { label: "Staff", color: "#8A6D00" },
  custom: { label: "Custom access", color: "#7A4FBF" },
  record: { label: "Staff record", color: "#8A8578" },
};
function roleLabel(role, category) {
  if (role === "owner") return "Owner";
  if (role === "full") return "Full access";
  if (role === "manager") return "Manager";
  if (role === "custom") return "Custom access";
  if (role === "record") return "No system access";
  return category.staffRoleLabel;
}

// Modules that "Custom access" staff can be individually granted. Each maps to one
// or more tabs in the app. Owner always has everything; Manager keeps its existing
// fixed bundle (reports/accounting/documents/marketing, own branch) for backwards
// compatibility; Custom is the new fully pick-and-choose tier.
const ACCESS_MODULES = [
  { id: "sales", label: "Sales & orders", desc: "Add/edit items and manage orders (beyond basic recording)" },
  { id: "hr", label: "HR / Staff", desc: "View and manage staff records" },
  { id: "accounting", label: "Accounting", desc: "Profit & loss, ledger, receivables" },
  { id: "reports", label: "Reports & activity", desc: "Reports, expenses, daily activity log" },
  { id: "marketing", label: "Marketing & documents", desc: "Flyers, broadcasts, generated letters" },
  { id: "branches", label: "Branches", desc: "Manage locations" },
];
function hasModuleAccess(emp, moduleId) {
  if (!emp) return false;
  if (emp.role === "owner" || emp.role === "full") return true;
  if (emp.role === "manager") return ["reports", "accounting", "marketing", "hr"].includes(moduleId);
  if (emp.role === "custom") return (emp.permissions || []).includes(moduleId);
  return false;
}
// Like hasModuleAccess, but for whether a Custom-access employee can actually add/edit/
// delete within a module, not just view it — a finer-grained layer on top of the
// existing view permission. Owner/Full/Manager keep their existing full-edit behavior;
// Custom-access staff need both the module's view permission AND its edit permission.
function canEditModule(emp, moduleId) {
  if (!emp) return false;
  if (emp.role === "owner" || emp.role === "full") return true;
  if (emp.role === "manager") return ["reports", "accounting", "marketing", "hr"].includes(moduleId);
  if (emp.role === "custom") return (emp.permissions || []).includes(moduleId) && (emp.editPermissions || []).includes(moduleId);
  return false;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Human-friendly business ID, e.g. "ANY-48213" — given to the owner at signup so they
// can log in with it instead of remembering an email.
function generateBusinessId(existingAccounts) {
  const taken = new Set(Object.values(existingAccounts || {}).map((a) => a.business?.profile?.businessId).filter(Boolean));
  let id;
  do {
    id = `ANY-${Math.floor(10000 + Math.random() * 90000)}`;
  } while (taken.has(id));
  return id;
}
// Looks up an account by email OR business ID so login can accept either.
function findAccountEntry(accounts, identifier) {
  const clean = identifier.trim();
  if (!clean) return null;
  const byEmail = accounts[clean.toLowerCase()];
  if (byEmail) return [clean.toLowerCase(), byEmail];
  const match = Object.entries(accounts).find(([, a]) => a.business?.profile?.businessId?.toLowerCase() === clean.toLowerCase());
  return match || null;
}

function currency(n) {
  return `MWK ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}
function article(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/* ---------------- theme helpers ---------------- */
const LIGHT_BASE = {
  "--ink": "#101828",
  "--ink-soft": "#475467",
  "--ink-faint": "#8C97A8",
  "--surface": "#FFFFFF",
  "--bg": "#EEF3FB",
  "--line": "#D6E0F0",
};
const DARK_BASE = {
  "--ink": "#EDF2FB",
  "--ink-soft": "#B9C4D8",
  "--ink-faint": "#7C879C",
  "--surface": "#101A2E",
  "--bg": "#0A1220",
  "--line": "#233250",
};
function hexAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ---------------- account + storage helpers (browser localStorage) ---------------- */
const ACCOUNTS_KEY = "anaya:accounts";
const SESSION_KEY = "anaya:session";
const SEAT_LIMITS = { solo: 1, small: 4, medium: 10, large: 999 }; // legacy — used only to migrate old accounts

/* ---------------- packages / billing (placeholder — needs a real payment gateway) ----------------
   Pricing model: three flat monthly tiers (Starter, Growth, Pro), each unlocking more of the app.
   Starter can optionally add Accounting on its own for a smaller add-on price, without jumping to
   the full Growth tier. Additional businesses (a second business under one login) are always a
   separate purchase, except Pro includes one for free. */
const TRIAL_DAYS = 7;
const TIERS = {
  starter: {
    id: "starter", name: "Starter", price: 20000,
    branchLimit: 1, seatLimit: 1,
    hasAccounting: false, hasGrowth: false, hasHR: false, hasBranchMgmt: false,
    freeExtraBusinesses: 0,
    desc: "Sales, items, customers, quotes, calendar, and receipts — everything to run daily sales.",
  },
  growth: {
    id: "growth", name: "Growth", price: 35000,
    branchLimit: 2, seatLimit: 2,
    hasAccounting: true, hasGrowth: true, hasHR: true, hasBranchMgmt: false,
    freeExtraBusinesses: 0,
    desc: "Everything in Starter, plus Expenses, Suppliers, Purchase Orders, Reports, Accounting, Documents, and Staff & HR. Up to 2 branches and 2 staff logins.",
  },
  pro: {
    id: "pro", name: "Pro", price: 50000, price3Month: 100000,
    branchLimit: Infinity, seatLimit: Infinity,
    hasAccounting: true, hasGrowth: true, hasHR: true, hasBranchMgmt: true,
    freeExtraBusinesses: 1,
    desc: "Everything in Growth, plus unlimited branches and staff logins, full Branches management, and one additional business included free.",
  },
};
const ACCOUNTING_ADDON_PRICE = 10000; // MWK / month — lets a Starter plan add just Accounting, without upgrading to Growth
function tierOf(biz) {
  return TIERS[biz?.profile?.tier] || TIERS.starter;
}
function daysSince(ts) {
  return (Date.now() - (ts || 0)) / 86400000;
}
function isTrialActive(profile) {
  return daysSince(profile.createdAt) < TRIAL_DAYS;
}
function trialDaysLeft(profile) {
  return Math.max(0, Math.ceil(TRIAL_DAYS - daysSince(profile.createdAt)));
}
// Accounting is available on Growth/Pro automatically, or on Starter if the add-on was bought.
function hasAccounting(biz) {
  if (isTrialActive(biz.profile)) return true;
  const t = tierOf(biz);
  return t.hasAccounting || !!biz.profile.accountingAddon;
}
// Expenses, Suppliers, Purchase Orders, Reports, Activity, Documents — bundled together, Growth and up.
function hasGrowthFeatures(biz) {
  if (isTrialActive(biz.profile)) return true;
  return tierOf(biz).hasGrowth;
}
function hasStaffHR(biz) {
  if (isTrialActive(biz.profile)) return true;
  return tierOf(biz).hasHR;
}
function hasBranchMgmt(biz) {
  if (isTrialActive(biz.profile)) return true;
  return tierOf(biz).hasBranchMgmt;
}
function seatLimitFor(biz) {
  if (isTrialActive(biz.profile)) return Infinity;
  return tierOf(biz).seatLimit;
}
function branchLimitFor(biz) {
  if (isTrialActive(biz.profile)) return Infinity;
  return tierOf(biz).branchLimit;
}
function freeExtraBusinessesFor(biz) {
  if (isTrialActive(biz.profile)) return 1; // let them try a second business during the trial too
  return tierOf(biz).freeExtraBusinesses;
}
// Downgrading never deletes anything — it locks the overflow instead. Whatever was created
// first (branches, in creation order; the owner plus whoever was added first, for staff)
// stays active; anything beyond the new plan's limit becomes locked until they upgrade again.
function isBranchLocked(biz, branchId) {
  const limit = branchLimitFor(biz);
  if (limit === Infinity) return false;
  const idx = (biz.branches || []).findIndex((b) => b.id === branchId);
  return idx >= limit;
}
function isEmployeeLocked(biz, employeeId) {
  const limit = seatLimitFor(biz);
  if (limit === Infinity) return false;
  const emp = (biz.employees || []).find((e) => e.id === employeeId);
  if (!emp || emp.pin === "0000") return false; // the owner's own login is never locked
  const nonOwnerLimit = Math.max(0, limit - 1); // the owner always takes one of the seats
  const nonOwners = (biz.employees || []).filter((e) => e.pin !== "0000");
  const idx = nonOwners.findIndex((e) => e.id === employeeId);
  return idx >= nonOwnerLimit;
}

/* ---------------- branches ---------------- */
function filterByBranch(list, branchId) {
  return branchId ? list.filter((x) => x.branchId === branchId) : list;
}
// Same idea, but for products/items specifically: older items saved before
// branch-tagging existed have no branchId at all. Treat those as visible
// everywhere rather than hiding them, so nothing already added disappears.
function itemsForBranch(list, branchId) {
  return !branchId ? list : list.filter((x) => !x.branchId || x.branchId === branchId);
}
// Suggests how much to reorder for a low-stock item, based on how fast it's actually been
// selling — average daily quantity sold over the last 30 days, times a 14-day buffer, minus
// what's already on hand. Returns null when there's not enough recent sales history to base
// a suggestion on, or when stock is already comfortably above that buffer.
function suggestReorderQty(biz, item) {
  if (item.stock === undefined) return null;
  const lookbackDays = 30, bufferDays = 14;
  const since = Date.now() - lookbackDays * 86400000;
  let qtySold = 0;
  (biz.orders || []).forEach((o) => {
    if (o.ts < since || o.quickSale) return;
    (o.items || []).forEach((line) => { if (line.itemId === item.id) qtySold += line.qty; });
  });
  if (qtySold <= 0) return null;
  const avgDaily = qtySold / lookbackDays;
  const suggested = Math.ceil(avgDaily * bufferDays) - (item.stock || 0);
  return suggested > 0 ? { suggested, avgDaily } : null;
}

/* ---------------- image helpers (client-side only, no backend yet) ---------------- */
// Hands text off to whatever app the person picks on their phone (WhatsApp, Facebook, SMS, etc.)
// via the native share sheet. Falls back to copying to the clipboard on browsers/devices that
// don't support it (mainly desktop), so it degrades gracefully everywhere.
async function shareText(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (e) {
      if (e?.name === "AbortError") return; // person cancelled the share sheet, not an error
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard — your device doesn't support direct sharing, so paste this into WhatsApp, Facebook, or wherever you'd like to send it.");
  } catch {
    alert(text);
  }
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
// Best-effort cleanup of a phone number for use in wa.me / sms: links — strips
// spaces, dashes, brackets, and keeps a leading "+" out of the wa.me path.
function digitsOnly(phone) {
  return (phone || "").replace(/[^\d+]/g, "");
}
// Free "click-to-chat" link — opens WhatsApp with the message pre-typed into the
// chat box. The business owner still has to tap Send inside WhatsApp; this never
// sends anything by itself, which is what keeps it free and keeps a human in control.
function waLink(phone, message) {
  const clean = digitsOnly(phone).replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
function smsLink(phone, message) {
  return `sms:${digitsOnly(phone)}?body=${encodeURIComponent(message)}`;
}
// Orders only store a customer's name — phone numbers live on the customer record,
// so look it up there (same matching-by-name pattern used when orders create customers).
function findCustomerPhone(biz, name) {
  if (!name) return "";
  const match = (biz.customers || []).find((c) => c.name?.toLowerCase() === name.trim().toLowerCase());
  return match?.phone || "";
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// Resizes an image data URL down to a max dimension, to keep localStorage usage reasonable.
function resizeDataUrl(dataUrl, maxDim = 300) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
// Rough client-side dominant-color pick from an uploaded image (e.g. a sample document or logo).
// This is a simple heuristic, not real logo/signature extraction — that needs a backend AI step.
function extractDominantColor(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = canvas.width = 60;
      const h = canvas.height = 60;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      let r = 0, g = 0, b = 0, count = 0;
      try {
        const data = ctx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < data.length; i += 4) {
          const [rr, gg, bb, aa] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          const brightness = (rr + gg + bb) / 3;
          // skip near-white / near-transparent pixels so we pick up ink/brand color, not the page background
          if (aa < 100 || brightness > 235) continue;
          r += rr; g += gg; b += bb; count++;
        }
      } catch { resolve(null); return; }
      if (count === 0) { resolve(null); return; }
      const toHex = (v) => Math.round(v / count).toString(16).padStart(2, "0");
      resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* ---------------- flyer canvas helpers (used by MarketingPanel) ---------------- */
// Loads a data URL (or plain URL) into an <img> for drawImage — resolves to null on
// failure or a missing src, so callers can just fall back to a placeholder.
function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
// Lightens (positive percent, 0–1) or darkens (negative percent, -1–0) a hex color.
function shadeColor(hex, percent) {
  const h = (hex || "#1B4332").replace("#", "");
  let r = parseInt(h.substring(0, 2), 16) || 0, g = parseInt(h.substring(2, 4), 16) || 0, b = parseInt(h.substring(4, 6), 16) || 0;
  if (percent < 0) { r *= (1 + percent); g *= (1 + percent); b *= (1 + percent); }
  else { r += (255 - r) * percent; g += (255 - g) * percent; b += (255 - b) * percent; }
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}
// Draws a rounded-rectangle path (doesn't fill/stroke — caller does that after).
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
// Word-wraps text onto the canvas starting at (x,y), returns the y position after the
// last line drawn. Truncates with an ellipsis if it would run past maxLines.
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = (text || "").split(" ").filter(Boolean);
  if (!words.length) return y;
  let line = "", lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    if (ctx.measureText(testLine).width > maxWidth && line) { lines.push(line); line = words[n]; }
    else line = testLine;
  }
  lines.push(line);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

// Renders a full flyer onto the given canvas element from plain data — logo, brand
// color, headline, price badge, up to a few selling points, and a bottom contact bar.
// Everything is drawn with the canvas API (no image-generation service, no extra
// library), so a photo is optional: without one, the photo panel becomes a soft
// brand-color gradient instead of leaving a gap.
async function drawFlyer(canvas, opts) {
  const { businessName, tagline, logoSrc, headline, subheadline, description, priceLabel, priceUnit, features, photoSrc, phone, location, color } = opts;
  const W = 1080, H = 1620;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const accent = color || "#1B4332";
  const accentDark = shadeColor(accent, -0.35);
  const accentSoft = shadeColor(accent, 0.85);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const [logoImg, photoImg] = await Promise.all([loadImg(logoSrc), loadImg(photoSrc)]);

  // Photo panel, top-right
  const photoX = W * 0.46, photoY = 44, photoW = W - photoX - 44, photoH = H * 0.4;
  roundRectPath(ctx, photoX, photoY, photoW, photoH, 44);
  ctx.save(); ctx.clip();
  if (photoImg) {
    const scale = Math.max(photoW / photoImg.width, photoH / photoImg.height);
    const iw = photoImg.width * scale, ih = photoImg.height * scale;
    ctx.drawImage(photoImg, photoX + (photoW - iw) / 2, photoY + (photoH - ih) / 2, iw, ih);
  } else {
    const grad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    grad.addColorStop(0, accent); grad.addColorStop(1, accentDark);
    ctx.fillStyle = grad; ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.font = "150px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillText("🌿", photoX + photoW / 2, photoY + photoH / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; roundRectPath(ctx, photoX, photoY, photoW, photoH, 44); ctx.stroke();

  // Header: logo + business name + tagline
  const headX = 44, headY = 54;
  if (logoImg) {
    ctx.save(); roundRectPath(ctx, headX, headY, 92, 92, 18); ctx.clip();
    ctx.drawImage(logoImg, headX, headY, 92, 92); ctx.restore();
  } else {
    ctx.fillStyle = accent; roundRectPath(ctx, headX, headY, 92, 92, 18); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((businessName || "A")[0].toUpperCase(), headX + 46, headY + 48);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  ctx.fillStyle = accentDark; ctx.font = "bold 44px Georgia, serif";
  ctx.fillText(businessName || "Your Business", headX + 112, headY + 50);
  if (tagline) {
    ctx.fillStyle = "#6B7280"; ctx.font = "bold 19px sans-serif";
    ctx.fillText(tagline.toUpperCase(), headX + 112, headY + 78);
  }

  // Headline
  let y = headY + 175;
  ctx.fillStyle = "#101828"; ctx.font = "bold 74px sans-serif";
  y = wrapCanvasText(ctx, (headline || "Your product").toUpperCase(), headX, y, photoX - headX - 24, 78, 3);

  // Subheadline banner
  if (subheadline) {
    y += 18;
    ctx.font = "bold 32px sans-serif";
    const w = Math.min(ctx.measureText(subheadline.toUpperCase()).width + 56, photoX - headX - 24);
    ctx.fillStyle = accent; roundRectPath(ctx, headX, y, w, 62, 31); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
    ctx.fillText(subheadline.toUpperCase(), headX + 28, y + 32);
    ctx.textBaseline = "alphabetic";
    y += 96;
  } else {
    y += 24;
  }

  // Description — once we're clear of the photo panel, use the full width
  const descY = Math.max(y, photoY + photoH + 56);
  ctx.fillStyle = "#374151"; ctx.font = "29px sans-serif";
  let curY = description ? wrapCanvasText(ctx, description, headX, descY, W - headX * 2, 38, 3) : descY;

  // Price badge, overlapping the bottom-left corner of the photo panel
  if (priceLabel) {
    const bx = photoX + 14, by = photoY + photoH - 6, br = 108;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 52px sans-serif"; ctx.fillText(priceLabel, bx, by - 12);
    if (priceUnit) { ctx.font = "bold 24px sans-serif"; ctx.fillText(priceUnit.toUpperCase(), bx, by + 28); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // Feature rows — icon circle + text pill
  let fy = curY + 36;
  const iconR = 40;
  (features || []).filter((f) => f && f.trim()).slice(0, 4).forEach((f) => {
    ctx.beginPath(); ctx.arc(headX + iconR, fy + iconR, iconR, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "38px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("✓", headX + iconR, fy + iconR + 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const pillX = headX + iconR * 2 + 18, pillW = W - pillX - 44, pillH = iconR * 2;
    ctx.fillStyle = accentSoft; roundRectPath(ctx, pillX, fy, pillW, pillH, pillH / 2); ctx.fill();
    ctx.fillStyle = accentDark; ctx.font = "bold 30px sans-serif"; ctx.textBaseline = "middle";
    wrapCanvasText(ctx, f.trim(), pillX + 30, fy + pillH / 2 + 2, pillW - 60, 34, 1);
    ctx.textBaseline = "alphabetic";
    fy += pillH + 18;
  });

  // Bottom contact bar
  const barH = 108, barY = H - 216;
  ctx.fillStyle = accentDark; ctx.fillRect(0, barY, W, barH);
  ctx.fillStyle = "#fff"; ctx.font = "32px sans-serif"; ctx.textBaseline = "middle";
  ctx.fillText(`📍 ${location || "Add your location in Settings"}`, 46, barY + barH / 2);
  ctx.textBaseline = "alphabetic";

  // Footer strip — big phone number
  ctx.fillStyle = "#101828"; ctx.fillRect(0, H - 108, W, 108);
  ctx.fillStyle = "#fff"; ctx.font = "bold 50px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`📞 ${phone || "Add your phone number in Settings"}`, W / 2, H - 44);
  ctx.textAlign = "left";
}

// ---------------- Supabase-backed account + business storage ----------------
// Real Supabase Auth session replaces the old ACCOUNTS_KEY/SESSION_KEY
// localStorage bookkeeping. The whole `biz` object (items, orders, staff,
// expenses, etc.) is still shaped exactly like before — it's just now saved
// to and loaded from the `businesses.app_state` column in Supabase instead
// of localStorage, so it follows the account across devices.
async function fetchBizForUser(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("business_id, businesses(*)")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile || !profile.businesses) return null;
  const row = profile.businesses;
  const stored = row.app_state && Object.keys(row.app_state).length ? row.app_state : null;
  const base = stored || emptyBusiness(row.name, row.category_id, { businessId: row.business_id });
  return {
    ...base,
    profile: { ...base.profile, name: row.name, categoryId: row.category_id, businessId: row.business_id },
  };
}
async function persistBizForUser(userId, biz) {
  try {
    const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", userId).maybeSingle();
    if (!profile) return;
    await supabase.from("businesses").update({ app_state: biz, name: biz.profile.name, category_id: biz.profile.categoryId }).eq("id", profile.business_id);
  } catch (e) {
    console.error("sync to Supabase failed", e);
  }
}
// Finds a free short business ID (e.g. "ANA-1042") by checking Supabase,
// same idea as the old generateBusinessId(accounts) but against the real table.
async function generateBusinessIdRemote() {
  for (let i = 0; i < 20; i++) {
    const candidate = `ANA-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await supabase.from("businesses").select("id").eq("business_id", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `ANA-${Date.now().toString().slice(-6)}`;
}

// ---------------- multi-business accounts ----------------
const ADDITIONAL_BUSINESS_PRICE = 15000; // MWK / month for each extra business under one login

// Every business a given login has access to (the one they signed up with,
// plus any additional ones added via the flow below).
async function fetchMyBusinesses(userId) {
  const { data, error } = await supabase
    .from("user_businesses")
    .select("business_id, role, businesses(id, business_id, name, category_id)")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data
    .filter((row) => row.businesses)
    .map((row) => ({
      uuid: row.businesses.id,
      shortId: row.businesses.business_id,
      name: row.businesses.name,
      categoryId: row.businesses.category_id,
      role: row.role,
    }));
}
// Moves the "active" business pointer for this login to a different one
// they already have access to.
async function switchActiveBusinessRemote(businessUuid) {
  const { error } = await supabase.rpc("switch_active_business", { p_business_uuid: businessUuid });
  return { ok: !error, error: error?.message };
}
// Creates a brand-new business under an already-logged-in account (called
// only after PayChangu confirms payment — see the completion handler below).
async function createAdditionalBusinessRemote(shortId, name, categoryId) {
  const { data, error } = await supabase.rpc("create_additional_business", {
    p_business_id: shortId, p_name: name, p_category_id: categoryId,
  });
  if (error) return { error: error.message };
  return { businessUuid: data };
}

// Every business's very first account is created with role "owner" and pin "0000" (see emptyBusiness
// below), and pin is never touched by the staff-edit form. If something ever leaves the business with
// no "owner" anymore (e.g. an older version of the app let that account's own access level be edited),
// this finds that original account by its pin and restores it — so nobody can get locked out of their
// own business. It also clears a stray branchId off that same account, since an Owner should always
// see every branch, never be locked to just one.
function repairOwnerRole(business) {
  const employees = business?.employees || [];
  if (!employees.length) return business;
  let idx = employees.findIndex((e) => e.role === "owner");
  if (idx < 0) idx = employees.findIndex((e) => e.pin === "0000");
  if (idx < 0) return business;
  const owner = employees[idx];
  if (owner.role === "owner" && !owner.branchId) return business;
  return { ...business, employees: employees.map((e, i) => i === idx ? { ...e, role: "owner", branchId: null } : e) };
}

/* ---------------- default data shape ---------------- */
function emptyBusiness(name, categoryId, details = {}) {
  const ownerName = details.ownerName?.trim();
  const mainBranchId = uid("branch");
  return {
    profile: {
      name, categoryId, createdAt: Date.now(),
      businessId: details.businessId || null,
      description: details.description || "",
      businessSubtypeId: details.businessSubtypeId || null,
      businessSubtypeName: details.businessSubtypeName || "",
      logoInitial: name?.[0]?.toUpperCase() || "A",
      phone: details.phone || "",
      location: details.location || "",
      tier: TIERS[details.tier] ? details.tier : "starter", // starter | growth | pro
      accountingAddon: !!details.accountingAddon, // Starter-only add-on; ignored once tier is growth/pro
      branding: { logo: details.logo || null, primaryColor: details.primaryColor || "", secondaryColor: details.secondaryColor || "", address: details.location || "", signature: null },
      // "detailed" = every sale logged item-by-item. "totals" = just a running daily total,
      // for high-volume businesses where itemizing every sale isn't realistic. Set during
      // onboarding, changeable anytime in Settings.
      recordingMode: details.recordingMode === "totals" ? "totals" : "detailed",
    },
    categories: Array.isArray(details.categories) ? details.categories : [], // product/service categories, for grouping items & reports
    branches: [{ id: mainBranchId, name: "Main branch", location: details.location || "", phone: details.phone || "" }],
    items: [],       // products/services
    customers: [],
    orders: [],
    quotes: [],      // quotations / estimates — can later convert into a real order
    suppliers: [],   // formal supplier records (contact info + running spend, linked from restocks)
    employees: [
      { id: uid("emp"), name: ownerName ? `${ownerName} (Owner)` : "You (Owner)", role: "owner", pin: "0000" },
    ],
    notifications: [],
    documents: [],
    expenses: [],
    restocks: [], // stock-in / purchase history: what was bought from suppliers, at what cost
    billingRequests: [], // "I've paid, here's proof" submissions — see BillingPanel
    personalBudgets: [], // owner-only personal/family budgets — entirely separate from the business's own numbers
    recurringExpenses: [], // templates that auto-log a regular expense (rent, subscriptions) once per month
    purchaseOrders: [], // formal orders sent to a supplier before goods arrive — the buying-side mirror of Quotes
    calendarNotes: [], // free-text personal reminders pinned to a specific day on the Calendar tab
    settings: { theme: "light", taxRate: 0, discountRate: 0, activeBranchId: null },
  };
}

// ---------------- PayChangu payment flow ----------------
// The actual API calls happen in Supabase Edge Functions (paychangu-initiate,
// paychangu-verify) so the PayChangu secret key never reaches the browser.
// This app only ever talks to those two functions, never to PayChangu directly.
const PAYCHANGU_PENDING_KEY = "anaya:paychangu-pending";

// Starts a PayChangu hosted checkout. Stashes the not-yet-saved order/rent-payment
// locally (keyed by tx_ref) so it can be completed once the customer is redirected
// back, then sends the browser to PayChangu's payment page.
async function startPayChanguCheckout({ amount, customerName, businessName, description, pendingRecord }) {
  const txRef = uid("pcg");
  const cleanUrl = window.location.origin + window.location.pathname;
  const returnUrl = `${cleanUrl}?tx_ref=${txRef}`;

  const nameParts = (customerName || "Customer").trim().split(" ");
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || "";

  const { data, error } = await supabase.functions.invoke("paychangu-initiate", {
    body: {
      amount, currency: "MWK", email: "customer@example.com",
      first_name: firstName, last_name: lastName,
      tx_ref: txRef, return_url: returnUrl,
      title: businessName, description: description || "Payment",
    },
  });

  if (error || !data?.checkout_url) {
    return { ok: false, error: error?.message || "PayChangu didn't return a payment link. Please try again." };
  }

  try {
    const pendingAll = JSON.parse(localStorage.getItem(PAYCHANGU_PENDING_KEY) || "{}");
    pendingAll[txRef] = pendingRecord;
    localStorage.setItem(PAYCHANGU_PENDING_KEY, JSON.stringify(pendingAll));
  } catch { /* if localStorage is unavailable, verification after redirect just won't find a match */ }

  window.location.href = data.checkout_url;
  return { ok: true };
}

// Called once, after the app loads, if the URL has a ?tx_ref= from a PayChangu
// redirect. Confirms with PayChangu (server-side, via the edge function) whether
// the payment actually succeeded, then hands back the matching pending record.
async function checkPayChanguReturn() {
  const params = new URLSearchParams(window.location.search);
  const txRef = params.get("tx_ref");
  if (!txRef) return null;

  // Clean the URL immediately so refreshing the page doesn't re-trigger this.
  window.history.replaceState({}, "", window.location.origin + window.location.pathname);

  let pendingRecord = null;
  try {
    const pendingAll = JSON.parse(localStorage.getItem(PAYCHANGU_PENDING_KEY) || "{}");
    pendingRecord = pendingAll[txRef] || null;
    if (pendingRecord) {
      delete pendingAll[txRef];
      localStorage.setItem(PAYCHANGU_PENDING_KEY, JSON.stringify(pendingAll));
    }
  } catch { /* no-op */ }

  if (!pendingRecord) return null;

  const { data, error } = await supabase.functions.invoke("paychangu-verify", { body: { tx_ref: txRef } });
  const succeeded = !error && data?.status === "success";
  return { succeeded, pendingRecord, status: data?.status || "error" };
}

// ---------------- AI Assist (Supabase Edge Function) ----------------
// One shared entry point used by the Flyer maker, Documents, Budget, and Content
// Ideas to ask Claude for help. The actual API call happens server-side in the
// "ai-assist" Supabase Edge Function — see the separate function file — so the
// Anthropic API key never reaches the browser, the same pattern PayChangu uses above.
// If that function isn't deployed yet (or has no API key configured), this just
// returns a friendly error instead of throwing.
async function callAiAssist(kind, input) {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", { body: { kind, input } });
    if (error) return { ok: false, error: "AI assist isn't set up yet for this business. Ask whoever manages your Supabase account to add it." };
    if (!data || data.error) return { ok: false, error: data?.error || "AI assist didn't return a result — please try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Couldn't reach the AI assist service. Please try again." };
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState(null);
  const [account, setAccount] = useState(null); // { email }
  const [authMode, setAuthMode] = useState("landing"); // landing | login | register
  const [session, setSession] = useState(null); // employee id currently "logged in"
  const [tab, setTab] = useState("overview");
  const [myBusinesses, setMyBusinesses] = useState([]); // every business this login can access
  const [switchingBusiness, setSwitchingBusiness] = useState(false);

  // Loads whichever business is currently "active" (profiles.business_id) for
  // this login, and applies the same migration/repair steps every time —
  // used on first sign-in, and again after switching to a different business.
  const loadActiveBiz = useCallback(async (userId) => {
    const biz_ = await fetchBizForUser(userId);
    if (!biz_) return null;
    const legacyBranchId = uid("branch");
    const branches = biz_.branches && biz_.branches.length > 0
      ? biz_.branches
      : [{ id: legacyBranchId, name: "Main branch", location: biz_.profile?.location || "", phone: biz_.profile?.phone || "" }];
    const defaultBranchId = branches[0].id;
    const migrated = repairOwnerRole({
      ...biz_,
      documents: biz_.documents || [],
      categories: biz_.categories || [],
      restocks: biz_.restocks || [],
      billingRequests: biz_.billingRequests || [],
      quotes: biz_.quotes || [],
      suppliers: biz_.suppliers || [],
      personalBudgets: biz_.personalBudgets || [],
      recurringExpenses: biz_.recurringExpenses || [],
      purchaseOrders: biz_.purchaseOrders || [],
      calendarNotes: biz_.calendarNotes || [],
      expenses: (biz_.expenses || []).map((e) => ({ branchId: defaultBranchId, ...e })),
      orders: (biz_.orders || []).map((o) => ({ branchId: defaultBranchId, ...o })),
      branches,
      settings: { theme: "light", taxRate: 0, discountRate: 0, activeBranchId: null, ...biz_.settings },
      profile: {
        recordingMode: "detailed",
        ...biz_.profile,
        // Best-effort migration from the old base-plan + seats/branches + packages model:
        // a business that already had the old "growth" package, or had bought extra seats/
        // branches, is mapped onto the closest new tier so nobody loses access they'd paid for.
        tier: TIERS[biz_.profile.tier] ? biz_.profile.tier : (
          biz_.profile.packages?.growth ? "growth"
          : (biz_.profile.extraBranches >= 4 || biz_.profile.extraSeats >= 4) ? "pro"
          : (biz_.profile.extraBranches > 0 || biz_.profile.extraSeats > 0) ? "growth"
          : "starter"
        ),
        accountingAddon: biz_.profile.accountingAddon ?? !!biz_.profile.packages?.accounting,
        branding: { logo: null, primaryColor: "", secondaryColor: "", address: biz_.profile?.location || "", signature: null, ...biz_.profile?.branding },
      },
    });
    if (JSON.stringify(migrated) !== JSON.stringify(biz_)) persistBizForUser(userId, migrated);
    return migrated;
  }, []);

  const loadFromSession = useCallback(async (authSession) => {
    if (!authSession) { setBiz(null); setAccount(null); setSession(null); setMyBusinesses([]); return; }
    const migrated = await loadActiveBiz(authSession.user.id);
    if (!migrated) { setBiz(null); setAccount(null); setSession(null); setMyBusinesses([]); return; }
    setBiz(migrated);
    setAccount({ email: authSession.user.email, userId: authSession.user.id });
    setSession(migrated.employees[0]?.id || null);
    fetchMyBusinesses(authSession.user.id).then(setMyBusinesses);
  }, [loadActiveBiz]);

  // Switches to a different business this login already has access to, then
  // reloads the dashboard scoped to it. Used by the business switcher.
  const switchBusiness = useCallback(async (businessUuid) => {
    if (!account?.userId) return;
    setSwitchingBusiness(true);
    const result = await switchActiveBusinessRemote(businessUuid);
    if (!result.ok) { alert(result.error || "Couldn't switch businesses."); setSwitchingBusiness(false); return; }
    const migrated = await loadActiveBiz(account.userId);
    if (migrated) { setBiz(migrated); setSession(migrated.employees[0]?.id || null); setTab("overview"); }
    setSwitchingBusiness(false);
  }, [account, loadActiveBiz]);

  // Creates a brand-new business under this login and switches into it — shared by the
  // PayChangu success handler below (paid extra business) and the free Pro perk in
  // BusinessesPanel (1 additional business included at no charge on the Pro plan).
  const createAndEnterBusiness = useCallback(async (shortId, name, categoryId) => {
    const created = await createAdditionalBusinessRemote(shortId, name, categoryId);
    if (created.error) return { ok: false, error: created.error };
    const list = await fetchMyBusinesses(account.userId);
    setMyBusinesses(list);
    const switched = await switchActiveBusinessRemote(created.businessUuid);
    if (switched.ok) {
      const migrated = await loadActiveBiz(account.userId);
      if (migrated) { setBiz(migrated); setSession(migrated.employees[0]?.id || null); setTab("overview"); }
    }
    return { ok: true };
  }, [account, loadActiveBiz]);

  const [recoverySession, setRecoverySession] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (active) await loadFromSession(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, authSession) => {
      // A password-reset link lands here with a temporary "recovery" session — show the
      // set-new-password screen instead of loading straight into the dashboard with it.
      if (event === "PASSWORD_RECOVERY") {
        setRecoverySession(authSession);
        setLoading(false);
        return;
      }
      loadFromSession(authSession);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadFromSession]);

  const persist = useCallback((next) => {
    setBiz(next);
    if (account?.userId) persistBizForUser(account.userId, next);
  }, [account]);

  // Creates the Supabase Auth login, then the business + owner profile in one
  // atomic step (see create_business_and_owner in supabase/schema-patch-01.sql).
  const handleRegister = async (email, password, name, categoryId, details) => {
    const businessId = await generateBusinessIdRemote();
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) return { error: signUpErr.message };
    const ownerName = details.ownerName?.trim() || "Owner";
    const { error: rpcErr } = await supabase.rpc("create_business_and_owner", {
      p_business_id: businessId, p_name: name, p_category_id: categoryId, p_owner_name: ownerName,
    });
    if (rpcErr) return { error: rpcErr.message };
    const business = emptyBusiness(name, categoryId, { ...details, businessId });
    if (signUpData.session) await persistBizForUser(signUpData.user.id, business);
    return { businessId, business, email, userId: signUpData.user?.id, needsEmailConfirm: !signUpData.session };
  };

  const handleEnter = ({ business, email, userId }) => {
    setAccount({ email, userId });
    setBiz(business);
    setSession(business.employees[0].id);
  };

  const handleLogin = async (identifier, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setAccount(null);
    setBiz(null);
    setSession(null);
    setAuthMode("landing");
    setTab("overview");
  };

  const notify = useCallback((biz_, type, message) => {
    const n = { id: uid("note"), type, message, ts: Date.now(), read: false };
    return { ...biz_, notifications: [n, ...biz_.notifications].slice(0, 50) };
  }, []);

  // After a PayChangu checkout redirect, the browser lands back here with
  // ?tx_ref=... in the URL. Once `biz` is loaded, check whether that payment
  // actually succeeded (verified server-side) and, if so, finish saving the
  // order/rent-payment that was staged locally before the redirect away.
  useEffect(() => {
    if (!biz || !account) return;
    let cancelled = false;
    (async () => {
      const result = await checkPayChanguReturn();
      if (!result || cancelled) return;
      const { succeeded, pendingRecord, status } = result;
      if (succeeded && pendingRecord?.type === "new-business") {
        const result = await createAndEnterBusiness(pendingRecord.shortId, pendingRecord.name, pendingRecord.categoryId);
        if (!result.ok) {
          alert(`Payment succeeded, but creating the business failed: ${result.error}. Please contact support — your payment went through.`);
        } else {
          alert(`"${pendingRecord.name}" has been created and is ready to set up.`);
        }
      } else if (succeeded && pendingRecord?.type === "billing") {
        // A paid plan runs for a fixed period from the moment payment clears — a month,
        // or 3 months for Pro's quarterly option — after which the renewal reminder
        // email (sent by the send-subscription-emails function) kicks in.
        const req = pendingRecord.requested;
        const durationDays = req.tier === "pro" && req.proDuration === "3month" ? 90 : 30;
        const newExpiresAt = Date.now() + durationDays * 86400000;
        setBiz((current) => {
          if (!current) return current;
          let next = {
            ...current,
            profile: {
              ...current.profile,
              tier: req.tier,
              accountingAddon: req.tier === "starter" ? !!req.accountingAddon : false,
              subscriptionExpiresAt: newExpiresAt,
            },
            billingRequests: [
              { id: uid("billreq"), ts: Date.now(), status: "confirmed", confirmedAt: Date.now(), requested: req, total: pendingRecord.total, note: "Paid via PayChangu" },
              ...(current.billingRequests || []),
            ],
          };
          next = notify(next, "payment", `Plan updated via PayChangu — now ${currency(pendingRecord.total)}/month`);
          persistBizForUser(account.userId, next);
          return next;
        });
        // Fire-and-forget: tells the send-payment-confirmation Edge Function to email a
        // receipt right away. It re-checks the notificationSettings toggle server-side too,
        // so turning the toggle off is still respected even if this call fires anyway.
        supabase.functions.invoke("send-payment-confirmation", {
          body: { userId: account.userId, planName: TIERS[req.tier]?.name || req.tier, amount: pendingRecord.total, expiresAt: newExpiresAt },
        }).catch((e) => console.error("payment confirmation email failed to trigger", e));
        alert(`Payment confirmed — your plan has been updated to ${currency(pendingRecord.total)}/month.`);
      } else if (succeeded && pendingRecord?.order) {
        setBiz((current) => {
          if (!current) return current;
          let next = { ...current, orders: [pendingRecord.order, ...current.orders] };
          if (pendingRecord.stockDeltas?.length) {
            next = {
              ...next,
              items: next.items.map((it) => {
                const delta = pendingRecord.stockDeltas.find((d) => d.itemId === it.id);
                if (delta && it.stock !== undefined) return { ...it, stock: Math.max(0, it.stock - delta.qty) };
                return it;
              }),
            };
          }
          if (pendingRecord.customerName) {
            const nameLower = pendingRecord.customerName.trim().toLowerCase();
            const existing = next.customers.find((c) => c.name.toLowerCase() === nameLower);
            next = existing
              ? { ...next, customers: next.customers.map((c) => c.id === existing.id ? { ...c, orders: c.orders + 1 } : c) }
              : { ...next, customers: [{ id: uid("cust"), name: pendingRecord.customerName.trim(), orders: 1 }, ...next.customers] };
          }
          next = notify(next, "payment", `PayChangu payment of ${currency(pendingRecord.order.total)} confirmed${pendingRecord.customerName ? " from " + pendingRecord.customerName : ""}`);
          persistBizForUser(account.userId, next);
          return next;
        });
        alert(`Payment confirmed — ${currency(pendingRecord.order.total)} received via PayChangu.`);
      } else if (pendingRecord) {
        alert(`PayChangu payment was not completed (status: ${status}). Nothing was recorded — you can try again.`);
      }
    })();
    return () => { cancelled = true; };
  }, [biz, account, notify, loadActiveBiz, createAndEnterBusiness]);

  // Auto-logs any recurring expense templates (rent, subscriptions, etc.) that are due
  // and haven't been logged yet this month. Runs once per session, right after the
  // business loads — the lastLoggedMonth guard on each template makes this idempotent,
  // so there's no risk of double-logging even if this effect re-fires.
  const recurringCheckedRef = useRef(false);
  useEffect(() => {
    if (!biz || !account || recurringCheckedRef.current) return;
    const recurring = biz.recurringExpenses || [];
    if (!recurring.length) { recurringCheckedRef.current = true; return; }
    recurringCheckedRef.current = true;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let next = { ...biz };
    let loggedCount = 0;
    const updatedRecurring = recurring.map((r) => {
      if (!r.active || r.lastLoggedMonth === monthKey || now.getDate() < (r.dayOfMonth || 1)) return r;
      const ts = new Date(now.getFullYear(), now.getMonth(), Math.min(r.dayOfMonth || 1, 28), 12, 0, 0).getTime();
      const exp = { id: uid("exp"), category: r.category, amount: r.amount, note: r.note || "Recurring expense", branchId: r.branchId || null, ts, recurringId: r.id };
      next = { ...next, expenses: [exp, ...next.expenses] };
      loggedCount++;
      return { ...r, lastLoggedMonth: monthKey };
    });
    if (loggedCount > 0) {
      next = { ...next, recurringExpenses: updatedRecurring };
      next = notify(next, "expense", `${loggedCount} recurring expense${loggedCount > 1 ? "s" : ""} logged automatically for this month.`);
      persist(next);
    }
  }, [biz, account, notify, persist]);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingMark}>A</div>
      </div>
    );
  }

  if (recoverySession) {
    return (
      <ResetPasswordScreen
        onDone={async () => {
          const s = recoverySession;
          setRecoverySession(null);
          setLoading(true);
          await loadFromSession(s);
          setLoading(false);
        }}
      />
    );
  }

  if (!biz || !account) {
    return <AuthGate onRegister={handleRegister} onLogin={handleLogin} onEnter={handleEnter} />;
  }

  const category = CATEGORIES.find((c) => c.id === biz.profile.categoryId) || CATEGORIES[0];
  const currentEmployee = biz.employees.find((e) => e.id === session) || biz.employees[0];
  const isOwner = currentEmployee?.role === "owner";
  const isManager = currentEmployee?.role === "manager";
  const isCustomAccess = currentEmployee?.role === "custom";
  const isFullAccess = isOwner || currentEmployee?.role === "full";
  const isStaffView = isFullAccess || isManager || isCustomAccess; // sees the day-to-day dashboard, scoped to their access
  const catTheme = category.theme;
  const isDark = biz.settings?.theme === "dark";
  const base = isDark ? DARK_BASE : LIGHT_BASE;
  const themeVars = {
    "--accent": catTheme.accent,
    "--accent-soft": isDark ? hexAlpha(catTheme.accent, 0.22) : catTheme.accentSoft,
    "--gold": catTheme.gold,
    "--gold-soft": isDark ? hexAlpha(catTheme.gold, 0.22) : catTheme.goldSoft,
    ...base,
  };

  const canSee = (moduleId) => isOwner || isManager || hasModuleAccess(currentEmployee, moduleId);

  return (
    <div style={{ ...styles.appShell, ...themeVars }} className="app-shell">
      <style>{fontImports}</style>
      <Sidebar
        biz={biz} category={category} tab={tab} setTab={setTab}
        isOwner={isOwner} isManager={isManager} canSee={canSee}
        unread={biz.notifications.filter((n) => !n.read).length}
      />
      <div className="app-main">
      <TopBar biz={biz} category={category} currentEmployee={currentEmployee} persist={persist}
        onSwitchRole={(empId) => {
          setSession(empId);
          const emp = biz.employees.find((e) => e.id === empId);
          if (emp?.role !== "owner" && emp?.branchId && emp.branchId !== biz.settings?.activeBranchId) {
            persist({ ...biz, settings: { ...biz.settings, activeBranchId: emp.branchId } });
          }
        }} />

      <div style={styles.body} className="app-body">
        {tab === "overview" && (
          <Overview biz={biz} category={category} isOwner={isStaffView} setTab={setTab} />
        )}
        {tab === "items" && (
          <ItemsPanel biz={biz} category={category} persist={persist} notify={notify} isOwner={isFullAccess || isManager || canEditModule(currentEmployee, "sales")} />
        )}
        {tab === "orders" && (
          <OrdersPanel biz={biz} category={category} persist={persist} notify={notify} currentEmployee={currentEmployee} />
        )}
        {tab === "quotes" && (
          <QuotesPanel biz={biz} category={category} persist={persist} notify={notify} currentEmployee={currentEmployee} isOwner={isStaffView} />
        )}
        {tab === "calendar" && (
          <CalendarPanel biz={biz} category={category} persist={persist} setTab={setTab} />
        )}
        {tab === "reminders" && (
          <RemindersPanel biz={biz} category={category} persist={persist} />
        )}
        {tab === "customers" && (
          <CustomersPanel biz={biz} category={category} persist={persist} isOwner={isStaffView} setTab={setTab} />
        )}
        {tab === "suppliers" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          hasGrowthFeatures(biz)
            ? <SuppliersPanel biz={biz} category={category} persist={persist} setTab={setTab} />
            : <PaywallScreen message="Suppliers is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "purchaseOrders" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          hasGrowthFeatures(biz)
            ? <PurchaseOrdersPanel biz={biz} category={category} persist={persist} notify={notify} setTab={setTab} />
            : <PaywallScreen message="Purchase Orders is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "employees" && (isOwner || isManager || hasModuleAccess(currentEmployee, "hr")) && (
          hasStaffHR(biz)
            ? <EmployeesPanel biz={biz} category={category} persist={persist} setTab={setTab} currentEmployee={currentEmployee} />
            : <PaywallScreen message="Staff & HR is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "branches" && (isOwner || hasModuleAccess(currentEmployee, "branches")) && (
          hasBranchMgmt(biz)
            ? <BranchesPanel biz={biz} category={category} persist={persist} setTab={setTab} currentEmployee={currentEmployee} />
            : <PaywallScreen message="Managing multiple branches is a Pro plan feature." setTab={setTab} />
        )}
        {tab === "reports" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          hasGrowthFeatures(biz)
            ? <ReportsPanel biz={biz} category={category} setTab={setTab} />
            : <PaywallScreen message="Reports is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "expenses" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          hasGrowthFeatures(biz)
            ? <ExpensesPanel biz={biz} category={category} persist={persist} setTab={setTab} currentEmployee={currentEmployee} canEdit={isOwner || isManager || canEditModule(currentEmployee, "reports")} />
            : <PaywallScreen message="Expenses tracking is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "activity" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          hasGrowthFeatures(biz)
            ? <ActivityPanel biz={biz} category={category} setTab={setTab} />
            : <PaywallScreen message="The Activity log is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "alerts" && (
          <AlertsPanel biz={biz} persist={persist} />
        )}
        {tab === "documents" && (isOwner || isManager || hasModuleAccess(currentEmployee, "marketing")) && (
          hasGrowthFeatures(biz)
            ? <DocumentsPanel biz={biz} category={category} persist={persist} setTab={setTab} canEditBranding={isOwner} />
            : <PaywallScreen message="Documents is part of the Growth plan and above." setTab={setTab} />
        )}
        {tab === "accounting" && (isOwner || isManager || hasModuleAccess(currentEmployee, "accounting")) && (
          hasAccounting(biz)
            ? <AccountingPanel biz={biz} category={category} persist={persist} setTab={setTab} />
            : <PaywallScreen message={`Accounting isn't on your current plan. Upgrade to Growth, or add it to Starter for +${currency(ACCOUNTING_ADDON_PRICE)}/month.`} setTab={setTab} />
        )}
        {tab === "billing" && isOwner && (
          <BillingPanel biz={biz} persist={persist} setTab={setTab} />
        )}
        {tab === "businesses" && isOwner && (
          <BusinessesPanel myBusinesses={myBusinesses} biz={biz} switchBusiness={switchBusiness} switchingBusiness={switchingBusiness} setTab={setTab} createAndEnterBusiness={createAndEnterBusiness} />
        )}
        {tab === "budget" && isOwner && (
          <BudgetPanel biz={biz} persist={persist} notify={notify} setTab={setTab} />
        )}
        {tab === "calculator" && (
          <CalculatorPanel biz={biz} persist={persist} setTab={setTab} />
        )}
        {tab === "settings" && isOwner && (
          <SettingsPanel biz={biz} category={category} persist={persist} setTab={setTab} onLogout={handleLogout} account={account} />
        )}
        {tab === "help" && (
          <HelpPanel setTab={setTab} />
        )}
        {tab === "more" && (
          <MorePanel isOwner={isOwner} isManager={isManager} currentEmployee={currentEmployee} category={category} setTab={setTab} />
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} isOwner={isStaffView} category={category} unread={biz.notifications.filter(n => !n.read).length} />
      </div>
    </div>
  );
}

/* =========================================================
   AUTH GATE (register / login)
   ========================================================= */
/* =========================================================
   MARKETING LANDING PAGE
   ========================================================= */
// Brand palette used before login, when there's no business category yet to theme around.
const BRAND = { accent: "#1B4332", accentSoft: "#E3EFE7", ink: "#101828", inkSoft: "#475467", inkFaint: "#8C97A8", bg: "#F5F9F6", surface: "#FFFFFF", line: "#DCE6DE" };

const landingCss = `
@keyframes floatY { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes drift { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-10px) scale(1.05); } 100% { transform: translate(0,0) scale(1); } }
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
.hero-mock { animation: floatY 5s ease-in-out infinite; }
.blob-a { animation: drift 9s ease-in-out infinite; }
.blob-b { animation: drift 11s ease-in-out infinite reverse; }
@media (max-width: 860px) {
  .lp-two-col { grid-template-columns: 1fr !important; }
  .lp-hero-title { font-size: 34px !important; }
  .lp-nav-links { display: none !important; }
}
`;

// Fades + slides a section up into place the first time it scrolls into view.
function Reveal({ children, delay = 0, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal${visible ? " visible" : ""}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", boxShadow: "0 4px 14px rgba(16,24,40,0.08)" }}>
      <div style={{ fontSize: 10.5, color: BRAND.inkFaint, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || BRAND.ink, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const LP_FEATURES = [
  { icon: Receipt, title: "Sales, your way", desc: "Log every sale item by item, or just a daily total when the queue's out the door. You choose per business, per moment." },
  { icon: TrendingUp, title: "Real profit, not guesswork", desc: "Buying cost vs. selling price, calculated automatically — down to per-kilogram or per-liter margins." },
  { icon: Package, title: "Stock that matches how you sell", desc: "Pieces, kilograms, liters, boxes — track what you actually have, with low-stock alerts before you run out." },
  { icon: HandCoins, title: "Never lose track of credit", desc: "Sales on credit are tied to a name automatically, so you always know exactly who owes you what." },
  { icon: Users, title: "Staff, with real boundaries", desc: "Give access only to what someone should see — or none at all, and keep punching in the numbers yourself." },
  { icon: Building2, title: "Built for more than one branch", desc: "Every location tracked separately, with its own numbers, staff, and stock — or all of it combined in one view." },
];

const LP_STEPS = [
  { n: "01", title: "Set up in minutes", desc: "Tell us what kind of business you run, and how you sell — we shape the whole app around it." },
  { n: "02", title: "Record as you go", desc: "Every sale, restock, and expense — logged from your phone or laptop, right when it happens." },
  { n: "03", title: "Watch your numbers", desc: "Real reports on profit, stock, staff, and credit — the things a notebook can never tell you." },
];

const LP_BUSINESS_TYPES = [
  { icon: Store, name: "Retail", examples: "Groceries, boutiques, hardware, furniture, phone shops" },
  { icon: Scissors, name: "Service", examples: "Salons, barbershops, tailoring, tutoring, consulting" },
  { icon: Coffee, name: "Food", examples: "Restaurants, cafés, bakeries, takeaways, catering" },
  { icon: Wrench, name: "Repair", examples: "Phone repair, mechanics, workshops, appliance fixes" },
];

function LandingPage({ onGetStarted, onLogin }) {
  const s = {
    page: { fontFamily: "'Inter', sans-serif", background: BRAND.bg, color: BRAND.ink, minHeight: "100vh", overflowX: "hidden" },
    wrap: { maxWidth: 1080, margin: "0 auto", padding: "0 24px" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", maxWidth: 1080, margin: "0 auto" },
    navMark: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: BRAND.accent },
    navLinks: { display: "flex", gap: 28, fontSize: 14, fontWeight: 600, color: BRAND.inkSoft },
    navBtns: { display: "flex", gap: 10, alignItems: "center" },
    ghostBtn: { border: "none", background: "none", fontSize: 14, fontWeight: 700, color: BRAND.ink, cursor: "pointer", padding: "10px 14px" },
    solidBtn: { border: "none", background: BRAND.accent, color: "#fff", fontSize: 14, fontWeight: 700, padding: "11px 20px", borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 8px 20px ${hexAlpha(BRAND.accent, 0.28)}` },
    bigBtn: { border: "none", background: BRAND.accent, color: "#fff", fontSize: 16, fontWeight: 700, padding: "16px 28px", borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: `0 10px 26px ${hexAlpha(BRAND.accent, 0.3)}` },
    outlineBtn: { border: `1.5px solid ${BRAND.line}`, background: "#fff", color: BRAND.ink, fontSize: 16, fontWeight: 700, padding: "16px 28px", borderRadius: 999, cursor: "pointer" },
    eyebrowPill: { display: "inline-flex", alignItems: "center", gap: 6, background: BRAND.accentSoft, color: BRAND.accent, fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 999, marginBottom: 20 },
    h1: { fontFamily: "'Fraunces', serif", fontSize: 50, lineHeight: 1.08, fontWeight: 700, color: BRAND.ink, margin: "0 0 18px" },
    lead: { fontSize: 18, color: BRAND.inkSoft, lineHeight: 1.6, maxWidth: 480, margin: "0 0 30px" },
    sectionLabel: { fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: BRAND.accent, marginBottom: 10 },
    h2: { fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 700, color: BRAND.ink, margin: "0 0 14px", lineHeight: 1.15 },
    sectionLead: { fontSize: 16.5, color: BRAND.inkSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 0 44px" },
    card: { background: "#fff", borderRadius: 20, padding: 28, border: `1px solid ${BRAND.line}` },
    featureIconWrap: { width: 46, height: 46, borderRadius: 12, background: BRAND.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    featureTitle: { fontSize: 17, fontWeight: 700, color: BRAND.ink, marginBottom: 8 },
    featureDesc: { fontSize: 14.5, color: BRAND.inkSoft, lineHeight: 1.55 },
    footer: { borderTop: `1px solid ${BRAND.line}`, padding: "40px 24px", textAlign: "center", color: BRAND.inkFaint, fontSize: 13.5 },
  };

  return (
    <div style={s.page}>
      <style>{fontImports}</style>
      <style>{landingCss}</style>

      {/* NAV */}
      <div style={s.nav}>
        <div style={s.navMark}>Anaya</div>
        <div style={s.navLinks} className="lp-nav-links">
          <span>Features</span>
          <span>Business types</span>
          <span>Pricing</span>
          <span>How it works</span>
        </div>
        <div style={s.navBtns}>
          <button style={s.ghostBtn} onClick={onLogin}>Log in</button>
          <button style={s.solidBtn} onClick={onGetStarted}>Get started <ChevronRight size={15} /></button>
        </div>
      </div>

      {/* HERO */}
      <div style={{ ...s.wrap, position: "relative", paddingTop: 40, paddingBottom: 60 }}>
        <div className="blob-a" style={{ position: "absolute", top: -60, right: -80, width: 320, height: 320, borderRadius: "50%", background: hexAlpha(BRAND.accent, 0.12), filter: "blur(10px)", zIndex: 0 }} />
        <div className="blob-b" style={{ position: "absolute", bottom: -40, left: -100, width: 260, height: 260, borderRadius: "50%", background: hexAlpha(BRAND.accent, 0.08), filter: "blur(10px)", zIndex: 0 }} />

        <div className="lp-two-col" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 40, alignItems: "center" }}>
          <div>
            <div style={s.eyebrowPill}><Sparkles size={13} /> Free for 7 days — every tool unlocked</div>
            <h1 style={s.h1} className="lp-hero-title">The business system built for how small businesses actually run.</h1>
            <p style={s.lead}>Track sales, stock, staff, and real profit — whether you're counting every transaction or just too busy to stop and log one. One app, shaped around your business, not the other way around.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={s.bigBtn} onClick={onGetStarted}>Start free <ChevronRight size={18} /></button>
              <button style={s.outlineBtn} onClick={onLogin}>I already have an account</button>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div className="hero-mock" style={{ ...s.card, boxShadow: "0 30px 60px rgba(16,24,40,0.14)", maxWidth: 340, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: BRAND.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "'Fraunces', serif" }}>M</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Mwavi General Store</div>
                  <div style={{ fontSize: 11.5, color: BRAND.inkFaint }}>Retail · Main branch</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <MiniStat label="TOTAL REVENUE" value="MWK 482,300" color={BRAND.accent} />
                <MiniStat label="ORDERS" value="146" />
                <MiniStat label="MARGIN / KG" value="MWK 400" />
                <MiniStat label="LOW STOCK" value="2 items" color="#B54708" />
              </div>
              <div style={{ background: BRAND.accentSoft, borderRadius: 12, padding: 12, fontSize: 12.5, color: BRAND.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={15} /> Net profit up this month
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BUILT FOR ROW */}
      <Reveal>
        <div style={{ ...s.wrap, padding: "10px 24px 50px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: BRAND.inkFaint, marginBottom: 22 }}>Built for small businesses like</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
            {LP_BUSINESS_TYPES.map(({ icon: Icon, name }) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, color: BRAND.inkSoft, fontWeight: 700, fontSize: 15 }}>
                <Icon size={18} color={BRAND.accent} /> {name}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* PROBLEM */}
      <div style={{ background: "#fff", padding: "70px 0" }}>
        <div style={s.wrap}>
          <Reveal>
            <div style={s.sectionLabel}>Sound familiar?</div>
            <h2 style={s.h2}>You know cash came in. You don't actually know if you made money.</h2>
            <p style={s.sectionLead}>Most small businesses run on notebooks, memory, and guesswork — not because the owner doesn't care, but because nothing built for them ever made it easy to know better.</p>
          </Reveal>
          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              ["Stock disappears and nobody's sure why", "Between damage, discounts, and memory, small gaps add up to real losses."],
              ["Credit sales turn into forgotten money", "\"I'll pay you later\" is easy to say and easy to lose track of, for both sides."],
              ["Busy days mean sales go unrecorded", "When the queue's out the door, itemizing every sale just isn't realistic."],
            ].map(([title, desc], i) => (
              <Reveal key={title} delay={i * 100}>
                <div style={s.card}>
                  <AlertTriangle size={20} color="#B54708" style={{ marginBottom: 14 }} />
                  <div style={s.featureTitle}>{title}</div>
                  <div style={s.featureDesc}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding: "70px 0" }}>
        <div style={s.wrap}>
          <Reveal>
            <div style={s.sectionLabel}>Everything in one place</div>
            <h2 style={s.h2}>A system that bends to your business, not the reverse.</h2>
            <p style={s.sectionLead}>Every feature below adapts to how you actually sell — the kind of business you run, and how much time you have to record it.</p>
          </Reveal>
          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {LP_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 100}>
                <div style={s.card}>
                  <div style={s.featureIconWrap}><Icon size={22} color={BRAND.accent} /></div>
                  <div style={s.featureTitle}>{title}</div>
                  <div style={s.featureDesc}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ background: "#fff", padding: "70px 0" }}>
        <div style={s.wrap}>
          <Reveal>
            <div style={s.sectionLabel}>How it works</div>
            <h2 style={s.h2}>From notebook to real numbers, in three steps.</h2>
          </Reveal>
          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30, marginTop: 40 }}>
            {LP_STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 120}>
                <div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 700, color: BRAND.accentSoft, marginBottom: 6 }}>{step.n}</div>
                  <div style={s.featureTitle}>{step.title}</div>
                  <div style={s.featureDesc}>{step.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* BUSINESS TYPES DEEP */}
      <div style={{ padding: "70px 0" }}>
        <div style={s.wrap}>
          <Reveal>
            <div style={s.sectionLabel}>Made to fit</div>
            <h2 style={s.h2}>Whatever you're running, the app already knows the shape of it.</h2>
            <p style={s.sectionLead}>Pick your business type at setup, and the labels, reports, and workflow all shift to match — no configuring, no generic spreadsheet feel.</p>
          </Reveal>
          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {LP_BUSINESS_TYPES.map(({ icon: Icon, name, examples }, i) => (
              <Reveal key={name} delay={(i % 2) * 100}>
                <div style={{ ...s.card, display: "flex", gap: 18, alignItems: "flex-start" }}>
                  <div style={{ ...s.featureIconWrap, marginBottom: 0, flexShrink: 0 }}><Icon size={22} color={BRAND.accent} /></div>
                  <div>
                    <div style={s.featureTitle}>{name}</div>
                    <div style={s.featureDesc}>{examples}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* WORKS ON EVERYTHING */}
      <div style={{ background: "#fff", padding: "70px 0" }}>
        <div style={s.wrap}>
          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            <Reveal>
              <div style={s.sectionLabel}>One app, every screen</div>
              <h2 style={s.h2}>Phone at the till. Laptop at the desk. Same numbers, either way.</h2>
              <p style={s.sectionLead}>No separate app to download, no waiting on app store reviews — it's a website that works like an app, everywhere you open it.</p>
            </Reveal>
            <Reveal delay={100}>
              <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                <div style={{ ...s.card, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Smartphone size={26} color={BRAND.accent} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Phone</div>
                </div>
                <div style={{ ...s.card, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Layers size={26} color={BRAND.accent} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Tablet</div>
                </div>
                <div style={{ ...s.card, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <BookOpen size={26} color={BRAND.accent} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Laptop</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ background: "#fff", padding: "70px 0" }}>
        <div style={s.wrap}>
          <Reveal>
            <div style={s.sectionLabel}>Simple pricing</div>
            <h2 style={s.h2}>Pick the plan that fits your business.</h2>
            <p style={s.sectionLead}>Three flat monthly plans, each unlocking more of the app. Every plan starts with a free 7-day trial, every tool unlocked.</p>
          </Reveal>

          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
            {Object.values(TIERS).map((t, i) => (
              <Reveal key={t.id} delay={i * 100}>
                <div style={{ ...s.card, ...(t.id === "growth" ? { borderColor: BRAND.accent, borderWidth: 2 } : {}) }}>
                  <div style={s.featureTitle}>{t.name} — {currency(t.price)}/month</div>
                  {t.price3Month && <div style={{ fontSize: 13, color: BRAND.accent, fontWeight: 700, marginBottom: 8 }}>or {currency(t.price3Month)} for 3 months</div>}
                  <div style={s.featureDesc}>{t.desc}</div>
                  <div style={{ fontSize: 13, color: BRAND.inkFaint, marginTop: 10, fontWeight: 600 }}>
                    {t.branchLimit === Infinity ? "Unlimited" : t.branchLimit} branch{t.branchLimit !== 1 ? "es" : ""} · {t.seatLimit === Infinity ? "unlimited" : t.seatLimit} staff login{t.seatLimit !== 1 ? "s" : ""}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ ...s.card, marginBottom: 20 }}>
              <div style={s.featureTitle}>Just want Accounting on Starter?</div>
              <div style={s.featureDesc}>Add it on its own for +{currency(ACCOUNTING_ADDON_PRICE)}/month, without upgrading to Growth.</div>
            </div>
          </Reveal>

          <Reveal>
            <div style={{ background: BRAND.accentSoft, borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 10, color: BRAND.accent, fontWeight: 700, fontSize: 14.5 }}>
              <Sparkles size={17} /> Free for your first 7 days on any plan — no card needed to start.
            </div>
          </Reveal>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ padding: "80px 0" }}>
        <Reveal>
          <div style={{ ...s.wrap, textAlign: "center" }}>
            <h2 style={{ ...s.h2, fontSize: 38 }}>Start running your business on real numbers.</h2>
            <p style={{ ...s.sectionLead, margin: "0 auto 30px" }}>Free for 7 days, every tool unlocked. No card needed to start.</p>
            <button style={s.bigBtn} onClick={onGetStarted}>Create your account <ChevronRight size={18} /></button>
          </div>
        </Reveal>
      </div>

      <div style={s.footer}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: BRAND.accent, fontWeight: 700, marginBottom: 6 }}>Anaya</div>
        Business Systems — built for small businesses.
      </div>
    </div>
  );
}

/* =========================================================
   RESET PASSWORD (shown after tapping a password-reset email link)
   ========================================================= */
function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  };

  return (
    <div style={{ ...styles.onboardShell, "--accent": BRAND.accent, "--accent-soft": BRAND.accentSoft, "--ink": BRAND.ink, "--ink-soft": BRAND.inkSoft, "--ink-faint": BRAND.inkFaint, "--surface": BRAND.surface, "--bg": BRAND.bg, "--line": BRAND.line }}>
      <style>{fontImports}</style>
      <div style={styles.onboardMark}>Anaya</div>
      <div style={styles.onboardSub}>Business Systems</div>
      <div style={styles.onboardCard}>
        {done ? (
          <>
            <h1 style={styles.h1}>Password updated</h1>
            <p style={styles.helperText}>You can continue into your dashboard now.</p>
            <button className="primary-btn-smart" style={styles.primaryBtn} onClick={onDone}>
              Continue <ChevronRight size={18} />
            </button>
          </>
        ) : (
          <>
            <h1 style={styles.h1}>Set a new password</h1>
            <p style={styles.helperText}>Choose a new password for your account.</p>
            <div style={styles.authFieldWrap}>
              <Lock size={16} color="var(--ink-faint)" />
              <input style={styles.authField} type="password" placeholder="New password" value={password}
                onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={styles.authFieldWrap}>
              <Lock size={16} color="var(--ink-faint)" />
              <input style={styles.authField} type="password" placeholder="Confirm new password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && submit()} />
            </div>
            {error && <div style={styles.authError}>{error}</div>}
            <button className="primary-btn-smart" style={{ ...styles.primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
              {busy ? "Saving…" : "Save new password"} <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AuthGate({ onRegister, onLogin, onEnter }) {
  const [screen, setScreen] = useState("landing"); // landing | login | register-creds | register-onboard
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState(""); // login screen: email OR business ID
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null); // { businessId, business, email }
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const goRegisterCreds = () => { setError(""); setScreen("register-creds"); };
  const goLogin = () => { setError(""); setScreen("login"); };
  const goLanding = () => { setError(""); setScreen("landing"); };
  const goForgot = () => { setError(""); setForgotSent(false); setForgotEmail(identifier.includes("@") ? identifier : ""); setScreen("forgot"); };

  const submitForgot = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) { setError("Enter a valid email address."); return; }
    setForgotBusy(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: window.location.origin + window.location.pathname,
    });
    setForgotBusy(false);
    if (err) { setError(err.message); return; }
    setForgotSent(true);
  };

  const submitLogin = async () => {
    if (!identifier.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    const result = await onLogin(identifier.trim(), password);
    setBusy(false);
    if (!result.ok) setError(result.error || "That email or password is incorrect.");
  };

  const submitRegisterCreds = () => {
    if (!normalizedEmail || !normalizedEmail.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setError("");
    setScreen("register-onboard");
  };

  if (pendingRegistration) {
    return (
      <div style={{ ...styles.onboardShell, "--accent": BRAND.accent, "--accent-soft": BRAND.accentSoft, "--ink": BRAND.ink, "--ink-soft": BRAND.inkSoft, "--ink-faint": BRAND.inkFaint, "--surface": BRAND.surface, "--bg": BRAND.bg, "--line": BRAND.line }}>
        <style>{fontImports}</style>
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>You're all set</div>
          <h1 style={styles.h1}>Your business ID</h1>
          <p style={styles.helperText}>Save this for your own reference. You'll log back in with your email and password.{pendingRegistration.needsEmailConfirm ? " Check your email to confirm your address before your first login." : ""}</p>
          <div style={styles.businessIdCard}>{pendingRegistration.businessId}</div>
          <button className="primary-btn-smart" style={styles.primaryBtn} onClick={() => onEnter(pendingRegistration)}>
            Continue to dashboard <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (screen === "register-onboard") {
    return (
      <Onboarding
        onCreate={async (name, categoryId, details) => {
          setBusy(true);
          const result = await onRegister(normalizedEmail, password, name, categoryId, details);
          setBusy(false);
          if (result.error) { setError(result.error); setScreen("register-creds"); return; }
          setPendingRegistration(result);
        }}
      />
    );
  }

  if (screen === "landing") {
    return <LandingPage onGetStarted={goRegisterCreds} onLogin={goLogin} />;
  }

  return (
    <div style={{ ...styles.onboardShell, "--accent": BRAND.accent, "--accent-soft": BRAND.accentSoft, "--ink": BRAND.ink, "--ink-soft": BRAND.inkSoft, "--ink-faint": BRAND.inkFaint, "--surface": BRAND.surface, "--bg": BRAND.bg, "--line": BRAND.line }}>
      <style>{fontImports}</style>
      <div style={styles.onboardMark}>Anaya</div>
      <div style={styles.onboardSub}>Business Systems</div>

      {screen === "login" && (
        <div style={styles.onboardCard}>
          <button style={styles.backTextBtn} onClick={goLanding}>Back</button>
          <h1 style={styles.h1}>Log in</h1>
          <div style={styles.authFieldWrap}>
            <ShieldCheck size={16} color="var(--ink-faint)" />
            <input style={styles.authField} placeholder="Email" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" />
          </div>
          <div style={styles.authFieldWrap}>
            <Lock size={16} color="var(--ink-faint)" />
            <input style={styles.authField} type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && submitLogin()} />
          </div>
          <button type="button" style={{ ...styles.textLinkBtn, marginTop: -6, marginBottom: 12 }} onClick={goForgot}>Forgot password?</button>
          {error && <div style={styles.authError}>{error}</div>}
          <button className="primary-btn-smart" style={{ ...styles.primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submitLogin}>
            {busy ? "Logging in…" : "Log in"} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {screen === "forgot" && (
        <div style={styles.onboardCard}>
          <button style={styles.backTextBtn} onClick={goLogin}>Back</button>
          <h1 style={styles.h1}>Reset your password</h1>
          {forgotSent ? (
            <p style={styles.helperText}>Check your email for a link to reset your password. It can take a minute or two to arrive.</p>
          ) : (
            <>
              <p style={styles.helperText}>Enter the email on your account and we'll send you a reset link.</p>
              <div style={styles.authFieldWrap}>
                <Mail size={16} color="var(--ink-faint)" />
                <input style={styles.authField} placeholder="Email" value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)} autoCapitalize="none"
                  onKeyDown={(e) => e.key === "Enter" && !forgotBusy && submitForgot()} />
              </div>
              {error && <div style={styles.authError}>{error}</div>}
              <button className="primary-btn-smart" style={{ ...styles.primaryBtn, opacity: forgotBusy ? 0.6 : 1 }} disabled={forgotBusy} onClick={submitForgot}>
                {forgotBusy ? "Sending…" : "Send reset link"} <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {screen === "register-creds" && (
        <div style={styles.onboardCard}>
          <button style={styles.backTextBtn} onClick={goLanding}>Back</button>
          <div style={styles.eyebrow}>Create your account</div>
          <h1 style={styles.h1}>Set your login details</h1>
          <p style={styles.helperText}>You'll use these to log back in later.</p>
          <div style={styles.authFieldWrap}>
            <Mail size={16} color="var(--ink-faint)" />
            <input style={styles.authField} placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
          </div>
          <div style={styles.authFieldWrap}>
            <Lock size={16} color="var(--ink-faint)" />
            <input style={styles.authField} type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={styles.authFieldWrap}>
            <Lock size={16} color="var(--ink-faint)" />
            <input style={styles.authField} type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitRegisterCreds()} />
          </div>
          {error && <div style={styles.authError}>{error}</div>}
          <button className="primary-btn-smart" style={styles.primaryBtn} onClick={submitRegisterCreds}>
            Continue <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ONBOARDING
   ========================================================= */
const RECORDING_MODE_OPTIONS = [
  {
    id: "detailed",
    label: "Every sale, itemized",
    desc: "Log what was sold, to whom, and how it was paid — for the fullest reports (top sellers, sales by category, per-staff totals).",
  },
  {
    id: "totals",
    label: "Just daily totals",
    desc: "Record one running total for the day instead of each sale. Best for high-traffic spots where itemizing everything isn't realistic. You can still log detail sales when you have time.",
  },
];

function Onboarding({ onCreate }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [subtypeId, setSubtypeId] = useState(null);
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState(null); // { id, matched } | null | "none"
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTier, setSelectedTier] = useState("starter");
  const [logo, setLogo] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#1449B0");
  const [recordingMode, setRecordingMode] = useState("detailed");
  const [categoryTags, setCategoryTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [setupPhase, setSetupPhase] = useState(0); // for the building-your-dashboard step
  const [setupError, setSetupError] = useState("");

  const TOTAL_STEPS = 7;
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const subtype = category?.subtypes?.find((s) => s.id === subtypeId) || null;

  const addTag = (raw) => {
    const clean = raw.trim();
    if (!clean) return;
    if (categoryTags.some((c) => c.toLowerCase() === clean.toLowerCase())) { setTagInput(""); return; }
    setCategoryTags([...categoryTags, clean]);
    setTagInput("");
  };
  const removeTag = (t) => setCategoryTags(categoryTags.filter((c) => c !== t));

  const onLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataUrl(file);
    setLogo(await resizeDataUrl(raw, 240));
  };

  useEffect(() => {
    if (step !== 6) return;
    setSetupPhase(0);
    setSetupError("");
    const phases = [400, 900, 1400, 1900];
    const timers = phases.map((t, i) => setTimeout(() => setSetupPhase(i + 1), t));
    return () => { timers.forEach(clearTimeout); };
  }, [step]);

  // Finishing the account is a manual tap (not a timer) — this way there's
  // no way to get silently stuck on this screen: if it fails, we show why.
  const finishSetup = () => {
    try {
      onCreate(name.trim(), categoryId, {
        ownerName: ownerName.trim(), phone: phone.trim(), location: location.trim(),
        tier: selectedTier,
        description: description.trim(), logo, primaryColor,
        recordingMode, categories: categoryTags,
        businessSubtypeId: subtypeId, businessSubtypeName: subtype?.name || "",
      });
    } catch (err) {
      console.error("Setup failed", err);
      setSetupError("Something went wrong finishing setup. You can try again — nothing you entered is lost.");
    }
  };

  return (
    <div style={{ ...styles.onboardShell, "--accent": BRAND.accent, "--accent-soft": BRAND.accentSoft, "--ink": BRAND.ink, "--ink-soft": BRAND.inkSoft, "--ink-faint": BRAND.inkFaint, "--surface": BRAND.surface, "--bg": BRAND.bg, "--line": BRAND.line }}>
      <style>{fontImports}</style>
      {step < 6 && (
        <>
          <div style={styles.onboardMark}>Anaya</div>
          <div style={styles.onboardSub}>Business Systems</div>
          <div style={styles.progressTrack}>
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <div key={i} style={{ ...styles.progressSeg, background: i <= step ? "var(--accent, #1B4332)" : "var(--line)" }} />
            ))}
          </div>
        </>
      )}

      {step === 0 && (
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>Step 1 of {TOTAL_STEPS - 1}</div>
          <h1 style={styles.h1}>What's your business called?</h1>
          <input
            style={styles.textInput}
            placeholder="e.g. Chikondi Fashions"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            style={styles.textInput}
            placeholder="Your name (the owner)"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <button
            style={{ ...styles.primaryBtn, opacity: name.trim() && ownerName.trim() ? 1 : 0.4 }}
            disabled={!name.trim() || !ownerName.trim()}
            onClick={() => setStep(1)}
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>Step 2 of {TOTAL_STEPS - 1}</div>
          <h1 style={styles.h1}>What kind of business do you run?</h1>
          <p style={styles.helperText}>Describe it in your own words and we'll suggest the closest setup — or just pick one below. You can change this later.</p>

          <textarea
            style={styles.textArea}
            rows={2}
            placeholder="e.g. I run a small hair salon in Blantyre, mostly braiding and haircuts"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setSuggestion(null); }}
          />
          <button
            type="button"
            style={{ ...styles.smallAddBtn, display: "inline-block", opacity: description.trim() ? 1 : 0.5 }}
            disabled={!description.trim()}
            onClick={() => {
              const match = suggestCategoryFromText(description);
              setSuggestion(match || "none");
              if (match) { setCategoryId(match.id); setSubtypeId(null); }
            }}
          >
            Suggest my setup
          </button>

          {suggestion && suggestion !== "none" && (
            <Callout icon={Check} tone="info">
              Based on "{suggestion.matched[0]}", <strong>{CATEGORIES.find((c) => c.id === suggestion.id)?.name}</strong> looks like the closest fit — selected below. Not quite right? Tap a different card.
            </Callout>
          )}
          {suggestion === "none" && (
            <Callout icon={AlertTriangle} tone="warn">
              Couldn't match that to one of the setups below automatically — just pick whichever is closest. (This is simple keyword matching, not full understanding of any description — a smarter match is on the list for once the backend is built.)
            </Callout>
          )}

          <div style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { setCategoryId(c.id); setSubtypeId(null); setSuggestion(null); }}
                  style={{
                    ...styles.categoryCard,
                    borderColor: active ? c.theme.accent : "var(--line)",
                    background: active ? c.theme.accentSoft : "var(--surface)",
                    boxShadow: active ? `0 6px 18px ${hexAlpha(c.theme.accent, 0.18)}` : styles.categoryCard.boxShadow,
                  }}
                >
                  <div style={{ ...styles.categoryIconWrap, background: active ? c.theme.accent : "var(--bg)" }}>
                    <Icon size={20} color={active ? "#fff" : "var(--ink-soft)"} />
                  </div>
                  <div style={styles.categoryName}>{c.name}</div>
                  <div style={styles.categoryExamples}>{c.examples}</div>
                </button>
              );
            })}
          </div>

          {category && category.subtypes?.length > 0 && (
            <>
              <div style={{ ...styles.listRowSub, marginTop: 4 }}>Which fits best? This is what shows on your dashboard and receipts.</div>
              <div style={styles.categoryGrid}>
                {category.subtypes.map((s) => {
                  const Icon = s.icon;
                  const active = subtypeId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSubtypeId(s.id)}
                      style={{
                        ...styles.categoryCard,
                        borderColor: active ? category.theme.accent : "var(--line)",
                        background: active ? category.theme.accentSoft : "var(--surface)",
                        boxShadow: active ? `0 6px 18px ${hexAlpha(category.theme.accent, 0.18)}` : styles.categoryCard.boxShadow,
                      }}
                    >
                      <div style={{ ...styles.categoryIconWrap, background: active ? category.theme.accent : "var(--bg)" }}>
                        <Icon size={20} color={active ? "#fff" : "var(--ink-soft)"} />
                      </div>
                      <div style={styles.categoryName}>{s.name}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div style={styles.stepNavRow}>
            <button style={styles.backTextBtn} onClick={() => setStep(0)}>Back</button>
            <button
              style={{ ...styles.primaryBtnInline, opacity: categoryId && (!category?.subtypes?.length || subtypeId) ? 1 : 0.4 }}
              disabled={!categoryId || (category?.subtypes?.length > 0 && !subtypeId)}
              onClick={() => setStep(2)}
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && category && (
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>Step 3 of {TOTAL_STEPS - 1}</div>
          <h1 style={styles.h1}>How will you record sales?</h1>
          <p style={styles.helperText}>
            Think about {category.highVolumeExample} — is that you? If logging every {category.orderNoun.toLowerCase()} isn't realistic, daily totals will fit better. Either way, this only shapes your defaults — you can switch it anytime in Settings.
          </p>
          <div style={styles.staffSizeGrid}>
            {RECORDING_MODE_OPTIONS.map((opt) => {
              const active = recordingMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setRecordingMode(opt.id)}
                  style={{
                    ...styles.staffSizeCard,
                    borderColor: active ? "var(--accent, #1B4332)" : "var(--line)",
                    background: active ? "var(--accent-soft, #E3EFE7)" : "var(--surface)",
                  }}
                >
                  <div>{opt.label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          <div style={styles.listRowSub}>What {category.itemLabelPlural.toLowerCase()} do you offer?</div>
          <p style={{ ...styles.helperText, marginTop: 4 }}>Add the main categories — this drives "sales by category" in your reports. Optional, and easy to change later.</p>

          {category.suggestedCategories?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {category.suggestedCategories.filter((s) => s !== "Other").map((s) => {
                const active = categoryTags.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    style={{ ...styles.paymentChip, flex: "none", ...(active ? styles.paymentChipActive : {}) }}
                    onClick={() => (active ? removeTag(s) : addTag(s))}
                  >
                    {active ? "✓ " : "+ "}{s}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: categoryTags.length ? 10 : 0 }}>
            <input
              style={{ ...styles.textInput, marginBottom: 0 }}
              placeholder="Add your own category…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
            />
            <button type="button" style={styles.smallAddBtn} onClick={() => addTag(tagInput)}>Add</button>
          </div>

          {categoryTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {categoryTags.map((t) => (
                <span key={t} style={{ ...styles.paymentChip, ...styles.paymentChipActive, flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  {t}
                  <button type="button" onClick={() => removeTag(t)} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0 }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={styles.stepNavRow}>
            <button style={styles.backTextBtn} onClick={() => setStep(1)}>Back</button>
            <button style={styles.primaryBtnInline} onClick={() => setStep(3)}>
              Continue <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>Step 4 of {TOTAL_STEPS - 1}</div>
          <h1 style={styles.h1}>A few business details</h1>
          <p style={styles.helperText}>Used on your invoices and letters.</p>
          <input
            style={styles.textInput}
            placeholder="Business phone / WhatsApp number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            style={styles.textInput}
            placeholder="Location / town (e.g. Blantyre)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div style={styles.stepNavRow}>
            <button style={styles.backTextBtn} onClick={() => setStep(2)}>Back</button>
            <button style={styles.primaryBtnInline} onClick={() => setStep(4)}>
              Continue <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>Step 5 of {TOTAL_STEPS - 1}</div>
          <h1 style={styles.h1}>Pick your plan</h1>
          <p style={styles.helperText}>Your first 7 days are completely free with everything unlocked — nothing is charged today. You can switch plans anytime later in Packages &amp; billing.</p>

          <div style={styles.staffSizeGrid}>
            {Object.values(TIERS).map((t) => {
              const active = selectedTier === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  style={{
                    ...styles.staffSizeCard,
                    borderColor: active ? "var(--accent, #1B4332)" : "var(--line)",
                    background: active ? "var(--accent-soft, #E3EFE7)" : "var(--surface)",
                  }}
                >
                  <div>{t.name} — {currency(t.price)}/month{t.price3Month ? ` (or ${currency(t.price3Month)} for 3 months)` : ""}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
                </button>
              );
            })}
          </div>
          <p style={{ ...styles.helperText, marginTop: -8 }}>On Starter, you can add Accounting on its own later for +{currency(ACCOUNTING_ADDON_PRICE)}/month, without upgrading to Growth.</p>

          <div style={styles.stepNavRow}>
            <button style={styles.backTextBtn} onClick={() => setStep(3)}>Back</button>
            <button style={styles.primaryBtnInline} onClick={() => setStep(5)}>
              Continue <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={styles.onboardCard}>
          <div style={styles.eyebrow}>Step 6 of {TOTAL_STEPS - 1}</div>
          <h1 style={styles.h1}>Make it look like you</h1>
          <p style={styles.helperText}>Your logo and color show up on your dashboard, invoices, and letters. Skip this and add it later if you don't have one handy.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            {logo
              ? <img src={logo} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid var(--line)" }} />
              : <div style={{ ...styles.buildingMark, width: 56, height: 56, fontSize: 20, margin: 0, background: primaryColor || "var(--accent)" }}>{name[0]?.toUpperCase() || "A"}</div>}
            <label style={{ ...styles.smallAddBtn, display: "inline-block" }}>
              {logo ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={onLogoFile} />
            </label>
          </div>

          <div style={styles.listRowSub}>Brand color</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 18 }}>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 44, height: 36, border: "none", background: "none" }} />
            <span style={styles.mono}>{primaryColor}</span>
          </div>

          <div style={styles.stepNavRow}>
            <button style={styles.backTextBtn} onClick={() => setStep(4)}>Back</button>
            <button style={styles.primaryBtnInline} onClick={() => setStep(6)}>
              Set up my dashboard <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 6 && category && (
        <div style={styles.buildingScreen}>
          <div style={{ ...styles.buildingMark, background: primaryColor || category.theme.accent }}>
            {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", borderRadius: 18, objectFit: "cover" }} /> : (name[0]?.toUpperCase() || "A")}
          </div>
          <h1 style={styles.buildingTitle}>Setting up {name}</h1>
          <div style={styles.buildingSteps}>
            <BuildingStep done={setupPhase > 0} active={setupPhase === 0} label={`Configuring for ${category.name.toLowerCase()}`} />
            <BuildingStep done={setupPhase > 1} active={setupPhase === 1} label={`Loading ${category.itemLabelPlural.toLowerCase()}, ${category.orderNounPlural.toLowerCase()} & ${category.customerNounPlural.toLowerCase()}`} />
            <BuildingStep done={setupPhase > 2} active={setupPhase === 2} label={selectedTier === "starter" ? "Setting up your owner account" : "Setting up staff roles & permissions"} />
            <BuildingStep done={setupPhase > 3} active={setupPhase === 3} label="Finalizing your dashboard" />
          </div>
          {setupError && <div style={styles.authError}>{setupError}</div>}
          {setupPhase > 3 && (
            <button className="primary-btn-smart" style={{ ...styles.primaryBtn, maxWidth: 280 }} onClick={finishSetup}>
              {setupError ? "Try again" : "Continue to dashboard"} <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BuildingStep({ done, active, label }) {
  return (
    <div style={{ ...styles.buildingStepRow, opacity: done || active ? 1 : 0.35 }}>
      <div style={styles.buildingStepIcon}>
        {done ? <Check size={14} color="#fff" /> : active ? <div style={styles.buildingSpinner} /> : null}
      </div>
      <span style={styles.buildingStepLabel}>{label}</span>
    </div>
  );
}

/* =========================================================
   TOP BAR
   ========================================================= */
function TopBar({ biz, category, currentEmployee, onSwitchRole, persist }) {
  const [showSwitch, setShowSwitch] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState(null);
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchError, setSwitchError] = useState("");
  const branches = biz.branches || [];
  const activeBranchId = biz.settings?.activeBranchId || null;
  const activeBranchName = activeBranchId ? branches.find((b) => b.id === activeBranchId)?.name : "All branches";

  const setActiveBranch = (id) => {
    if (id && isBranchLocked(biz, id)) {
      alert("This branch is locked because your current plan doesn't have room for it. Upgrade your plan to select it again — nothing about the branch has been lost.");
      return;
    }
    persist({ ...biz, settings: { ...biz.settings, activeBranchId: id } });
  };

  const closeSwitcher = () => {
    setShowSwitch(false);
    setPendingSwitchId(null);
    setSwitchPassword("");
    setSwitchError("");
  };

  const attemptSwitch = (emp) => {
    if (isEmployeeLocked(biz, emp.id)) {
      alert(`${emp.name}'s login is locked because your current plan doesn't have room for it. Upgrade your plan to reactivate it — nothing about their account has been lost.`);
      return;
    }
    if (emp.branchPassword) {
      setPendingSwitchId(emp.id);
      setSwitchPassword("");
      setSwitchError("");
      return;
    }
    onSwitchRole(emp.id);
    closeSwitcher();
  };

  const confirmSwitch = (emp) => {
    if (switchPassword !== emp.branchPassword) {
      setSwitchError("Wrong password");
      return;
    }
    onSwitchRole(emp.id);
    closeSwitcher();
  };

  return (
    <div style={styles.topBar}>
      <div style={styles.topBarLeft}>
        {biz.profile.branding?.logo ? (
          <img src={biz.profile.branding.logo} alt="" style={styles.logoImg} />
        ) : (
          <div style={styles.logoMark}>{biz.profile.logoInitial}</div>
        )}
        <div>
          <div style={styles.bizName}>{biz.profile.name}</div>
          <div style={styles.bizCategory}>{biz.profile.businessSubtypeName || category.name}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {branches.length > 1 && (
          currentEmployee.role !== "owner" && currentEmployee.branchId ? (
            <span style={styles.branchLockedTag}>
              <Lock size={11} /> {branches.find((b) => b.id === currentEmployee.branchId)?.name || "Branch"}
            </span>
          ) : (
            <select
              style={styles.branchSelect}
              value={activeBranchId || ""}
              onChange={(e) => setActiveBranch(e.target.value || null)}
            >
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{isBranchLocked(biz, b.id) ? " (locked)" : ""}</option>)}
            </select>
          )
        )}
        <div style={{ position: "relative" }}>
          <button style={styles.roleChip} onClick={() => (showSwitch ? closeSwitcher() : setShowSwitch(true))}>
            <ShieldCheck size={14} color={ROLES[currentEmployee.role].color} />
            {roleLabel(currentEmployee.role, category)}
          </button>
          {showSwitch && (
            <div style={styles.roleDropdown}>
              {biz.employees.filter((e) => e.role !== "record").map((e) => (
                pendingSwitchId === e.id ? (
                  <div key={e.id} style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={styles.listRowSub}>{e.name}'s password</div>
                    <input
                      type="password" autoFocus style={styles.textInput} value={switchPassword}
                      placeholder="Password" onChange={(ev) => { setSwitchPassword(ev.target.value); setSwitchError(""); }}
                      onKeyDown={(ev) => { if (ev.key === "Enter") confirmSwitch(e); }}
                    />
                    {switchError && <div style={{ fontSize: 12, color: "var(--danger, #d64545)" }}>{switchError}</div>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={styles.primaryBtnSmall} onClick={() => confirmSwitch(e)}>Unlock</button>
                      <button style={styles.smallAddBtn} onClick={() => setPendingSwitchId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    key={e.id}
                    style={{ ...styles.roleDropdownItem, ...(isEmployeeLocked(biz, e.id) ? { opacity: 0.5 } : {}) }}
                    onClick={() => attemptSwitch(e)}
                  >
                    {e.name} · {roleLabel(e.role, category)}{e.branchPassword ? " 🔒" : ""}{isEmployeeLocked(biz, e.id) ? " · Locked" : ""}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR (desktop / wide screens only — see .app-sidebar CSS)
   ========================================================= */
function Sidebar({ biz, category, tab, setTab, isOwner, isManager, canSee, unread }) {
  const groups = [
    {
      title: "Overview",
      rows: [
        { id: "overview", label: "Dashboard", icon: BarChart3, show: true },
        { id: "alerts", label: "Alerts", icon: Bell, badge: unread, show: true },
        { id: "reminders", label: "Reminders", icon: MessageCircle, show: true },
        { id: "calendar", label: "Calendar", icon: CalendarClock, show: true },
      ],
    },
    {
      title: "Sales & customers",
      rows: [
        { id: "orders", label: category.orderNounPlural, icon: Receipt, show: true },
        { id: "quotes", label: "Quotes & Estimates", icon: ClipboardList, show: true },
        { id: "items", label: category.itemLabelPlural, icon: Package, show: true },
        { id: "customers", label: category.customerNounPlural, icon: Users, show: true },
        { id: "calculator", label: "Price calculator", icon: Calculator, show: true },
      ],
    },
    {
      title: "Records & money",
      rows: [
        { id: "activity", label: "Activity", icon: CalendarDays, show: canSee("reports") },
        { id: "expenses", label: "Expenses", icon: TrendingDown, show: canSee("reports") },
        { id: "suppliers", label: "Suppliers", icon: Truck, show: canSee("reports") },
        { id: "purchaseOrders", label: "Purchase Orders", icon: PackageCheck, show: canSee("reports") },
        { id: "accounting", label: "Accounting", icon: BookOpen, show: canSee("accounting") },
        { id: "reports", label: "Reports", icon: BarChart3, show: canSee("reports") },
      ],
    },
    {
      title: "People & locations",
      rows: [
        { id: "employees", label: "Staff & HR", icon: ShieldCheck, show: canSee("hr") },
        { id: "branches", label: "Branches", icon: Store, show: isOwner || canSee("branches") },
      ],
    },
    {
      title: "Growth",
      rows: [
        { id: "documents", label: "Documents", icon: FileText, show: canSee("marketing") },
      ],
    },
    {
      title: "Personal",
      rows: [
        { id: "budget", label: "Budget", icon: PiggyBank, show: isOwner },
      ],
    },
    {
      title: "Business",
      rows: [
        { id: "billing", label: "Packages & billing", icon: Wallet, show: isOwner },
        { id: "businesses", label: "Businesses", icon: Building2, show: isOwner },
        { id: "settings", label: "Settings", icon: Settings, show: isOwner },
        { id: "help", label: "Help", icon: HelpCircle, show: true },
      ],
    },
  ].map((g) => ({ ...g, rows: g.rows.filter((r) => r.show) })).filter((g) => g.rows.length > 0);

  return (
    <div className="app-sidebar" style={styles.sidebar}>
      <div style={styles.sidebarBrand}>
        {biz.profile.branding?.logo ? (
          <img src={biz.profile.branding.logo} alt="" style={styles.logoImg} />
        ) : (
          <div style={styles.logoMark}>{biz.profile.logoInitial}</div>
        )}
        <div>
          <div style={styles.sidebarBizName}>{biz.profile.name}</div>
          <div style={styles.sidebarBizCategory}>{biz.profile.businessSubtypeName || category.name}</div>
        </div>
      </div>
      <div style={styles.sidebarScroll}>
        {groups.map((g) => (
          <div key={g.title} style={styles.sidebarGroup}>
            <div style={styles.sidebarGroupTitle}>{g.title}</div>
            {g.rows.map((r) => {
              const Icon = r.icon;
              const active = tab === r.id;
              return (
                <button
                  key={r.id}
                  className={active ? "" : "sidebar-item-btn"}
                  style={{ ...styles.sidebarItem, ...(active ? styles.sidebarItemActive : {}) }}
                  onClick={() => setTab(r.id)}
                >
                  <Icon size={16} color={active ? "#fff" : "var(--sidebar-ink-faint)"} />
                  <span>{r.label}</span>
                  {r.badge > 0 && <span style={styles.sidebarBadge} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   OVERVIEW
   ========================================================= */
function Overview({ biz, category, isOwner, setTab }) {
  const [statsPeriod, setStatsPeriod] = useState("today"); // today | week | month | all

  const branchOrders = filterByBranch(biz.orders, biz.settings?.activeBranchId);
  const isTotalsMode = biz.profile?.recordingMode === "totals";
  const lowStock = category.hasStock
    ? biz.items.filter((i) => i.stock !== undefined && i.stock <= (i.lowStockAt ?? 3))
    : [];
  const isPharmacy = biz.profile?.businessSubtypeId === "pharmacy";
  const expiringSoon = isPharmacy
    ? biz.items.filter((i) => i.expiryDate && Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / 86400000) <= 30)
    : [];

  const now = new Date();
  const today = periodSummary(biz, new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  const thisWeek = periodSummary(biz, startOfWeek(now), endOfWeek(now));
  const thisMonth = periodSummary(biz, new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
  const allTime = periodSummary(biz, new Date(0), new Date(now.getFullYear() + 50, 0, 1));

  // Which period the top stat cards (revenue, orders, average sale) are scoped to —
  // "Total revenue" was previously always all-time with no expenses subtracted and
  // no indication of what date range it covered, which was confusing on its own.
  const PERIOD_LABELS = { today: "Today", week: "This week", month: "This month", all: "All time" };
  const PERIOD_DATA = { today, week: thisWeek, month: thisMonth, all: allTime };
  const selected = PERIOD_DATA[statsPeriod];
  const selectedOrderCount = selected.orders.length;
  const avgSale = selectedOrderCount ? Math.round(selected.revenue / selectedOrderCount) : 0;
  const netRevenue = selected.revenue - selected.spent;

  // last 7 days revenue vs expenses for the trend chart
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const dayTotals = days.map((d) => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return branchOrders.filter((o) => o.ts >= d.getTime() && o.ts < next.getTime()).reduce((s, o) => s + o.total, 0);
  });
  const branchExpenses = filterByBranch(biz.expenses || [], biz.settings?.activeBranchId);
  const dayExpenseTotals = days.map((d) => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return branchExpenses.filter((e) => e.ts >= d.getTime() && e.ts < next.getTime()).reduce((s, e) => s + e.amount, 0);
  });
  const maxDay = Math.max(...dayTotals, ...dayExpenseTotals, 1);
  const hasAnySales = dayTotals.some((v) => v > 0) || dayExpenseTotals.some((v) => v > 0);

  // breakdown of how money came in this week, by payment method
  const paymentBreakdown = (() => {
    const inRangeOrders = periodSummary(biz, startOfWeek(new Date()), endOfWeek(new Date())).orders;
    const byMethod = {};
    inRangeOrders.forEach((o) => {
      const key = o.paymentStatus === "credit" ? "On credit" : (o.paymentMethod || "Cash");
      byMethod[key] = (byMethod[key] || 0) + o.total;
    });
    const total = Object.values(byMethod).reduce((s, v) => s + v, 0);
    return { byMethod, total };
  })();
  const METHOD_COLOR = { "Cash": "#1B4332", "PayChangu": "#0F3A8C", "Mobile Money": "#0F3A8C", "Bank Transfer": "#7A4FBF", "Card": "#B8862F", "On credit": "#B23B3B" };

  // this month's expenses broken down by category, for the donut chart
  const EXPENSE_CATEGORY_COLOR = {
    "Restocking / buying stock": "#1B4332", "Rent": "#0F3A8C", "Utilities": "#7A4FBF",
    "Transport": "#B8862F", "Damages / loss": "#B23B3B", "Repairs & maintenance": "#8A6D00",
    "Marketing": "#0E7C7B", "Other": "#8A8578",
  };
  const expenseBreakdown = (() => {
    const monthExpenses = thisMonth.expenses;
    const byCategory = {};
    monthExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const slices = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: EXPENSE_CATEGORY_COLOR[label] || "var(--ink-faint)" }));
    return { slices, total };
  })();

  // Occupancy + overdue-rent tracking for Property/Rentals businesses. A property "item" carries
  // the tenant name in `meta` (blank = vacant). A tenant is considered paid for the month if any
  // itemized rent payment this month links back to their property's itemId — quick-total payments
  // (no item selected) can't be tied to a specific property, so they don't clear an overdue flag.
  const isPropertyBiz = category.id === "property";
  const properties = itemsForBranch(biz.items, biz.settings?.activeBranchId);
  const occupiedProperties = properties.filter((p) => p.meta);
  const vacantProperties = properties.filter((p) => !p.meta);
  const paidPropertyIdsThisMonth = new Set(
    thisMonth.orders.flatMap((o) => (o.items || []).map((it) => it.itemId)).filter(Boolean)
  );
  const overdueProperties = occupiedProperties.filter((p) => !paidPropertyIdsThisMonth.has(p.id));

  // Growth trend — revenue for the current period vs. the one right before it, plus a short
  // line chart across the last 6 periods at whatever granularity is currently selected
  // (day-over-day, week-over-week, or month-over-month). "All time" falls back to monthly.
  const growthKind = statsPeriod === "all" ? "month" : statsPeriod;
  const growthPoints = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;
    const [start, end] = periodBoundsFor(growthKind, offset);
    const value = periodSummary(biz, start, end).revenue;
    const label = growthKind === "today"
      ? start.toLocaleDateString("default", { weekday: "narrow" })
      : growthKind === "week"
      ? `W${6 - i}`
      : start.toLocaleDateString("default", { month: "short" });
    return { label, value };
  });
  const growthPct = percentChange(growthPoints[5].value, growthPoints[4].value);
  const hasGrowthData = growthPoints.some((p) => p.value > 0);
  const growthKindLabel = growthKind === "today" ? "day over day" : growthKind === "week" ? "week over week" : "month over month";

  // Receivables aging — money customers owe you, bucketed by how overdue it is.
  // Same idea as the "Aging" panel in accounting dashboards: the older a balance
  // gets, the more it should stand out visually.
  const receivablesAging = (() => {
    if (!hasAccounting(biz)) return null;
    const creditOrders = branchOrders.filter((o) => o.paymentStatus === "credit");
    if (creditOrders.length === 0) return null;
    const buckets = { "1-30 days": 0, "31-60 days": 0, "61-90 days": 0, "Over 90 days": 0 };
    const nowTs = Date.now();
    creditOrders.forEach((o) => {
      const daysOld = Math.floor((nowTs - o.ts) / 86400000);
      const key = daysOld <= 30 ? "1-30 days" : daysOld <= 60 ? "31-60 days" : daysOld <= 90 ? "61-90 days" : "Over 90 days";
      buckets[key] += o.total;
    });
    const total = Object.values(buckets).reduce((s, v) => s + v, 0);
    return { buckets, total, overdueCount: creditOrders.length };
  })();
  const AGING_COLOR = { "1-30 days": "#E0A63A", "31-60 days": "#D97706", "61-90 days": "#C2410C", "Over 90 days": "#B23B3B" };

  // A handful of plain-English takeaways, pulled from the numbers already on this
  // page — the kind of thing an owner would want pointed out rather than having
  // to read every chart themselves.
  const insights = (() => {
    if (!isOwner) return [];
    const list = [];
    if (growthPct !== null && hasGrowthData) {
      list.push(`Revenue is ${growthPct >= 0 ? "up" : "down"} ${Math.abs(Math.round(growthPct))}% ${growthKindLabel} compared to the period before.`);
    }
    const topItem = (() => {
      const counts = {};
      thisMonth.orders.forEach((o) => (o.items || []).forEach((it) => { counts[it.name] = (counts[it.name] || 0) + (it.qty || 1); }));
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    })();
    if (topItem) list.push(`${topItem} is your best-selling ${category.itemLabel.toLowerCase()} this month.`);
    if (expenseBreakdown.slices[0]) {
      list.push(`${expenseBreakdown.slices[0].label} is your biggest expense this month, at ${currency(expenseBreakdown.slices[0].value)}.`);
    }
    if (receivablesAging && receivablesAging.total > 0) {
      list.push(`${receivablesAging.overdueCount} sale${receivablesAging.overdueCount !== 1 ? "s" : ""} on credit still owed — ${currency(receivablesAging.total)} outstanding.`);
    }
    if (lowStock.length > 0) {
      list.push(`${lowStock.length} ${lowStock.length === 1 ? "item is" : "items are"} running low on stock.`);
    }
    return list.slice(0, 4);
  })();

  return (
    <div style={styles.panel}>
      <SectionTitle title="Overview" />
      {isOwner && isTrialActive(biz.profile) && (
        <Callout icon={Wallet}>
          Free trial — every tool is unlocked. {trialDaysLeft(biz.profile)} day{trialDaysLeft(biz.profile) !== 1 ? "s" : ""} left.
          <button style={styles.calloutLink} onClick={() => setTab("billing")}>View packages</button>
        </Callout>
      )}

      {isOwner && (
        <div style={styles.segmentedRow}>
          {[["today", "Today"], ["week", "This week"], ["month", "This month"], ["all", "All time"]].map(([id, label]) => (
            <button
              key={id}
              style={{ ...styles.segmentBtn, ...(statsPeriod === id ? styles.segmentBtnActive : {}) }}
              onClick={() => setStatsPeriod(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={styles.statGrid} className="stat-grid">
        <StatCard
          label={`Total revenue — ${PERIOD_LABELS[statsPeriod]}`}
          value={currency(selected.revenue)}
          sub={selected.spent > 0 ? `-${currency(selected.spent)} spent · Net ${currency(netRevenue)}` : undefined}
          icon={Wallet} tint="linear-gradient(135deg, #22A06B 0%, #146C43 100%)"
        />
        <StatCard label={category.orderNounPlural} value={selectedOrderCount} icon={Receipt} tint="linear-gradient(135deg, #2E6FE0 0%, #10399E 100%)" />
        <StatCard label={category.itemLabelPlural} value={itemsForBranch(biz.items, biz.settings?.activeBranchId).length} icon={Package} tint="linear-gradient(135deg, #9D6FE8 0%, #6432B8 100%)" />
        {isTotalsMode
          ? <StatCard label="Average sale" value={currency(avgSale)} icon={Wallet} tint="linear-gradient(135deg, #E0A63A 0%, #A6690F 100%)" />
          : <StatCard label={category.customerNounPlural} value={biz.customers.length} icon={Users} tint="linear-gradient(135deg, #E0A63A 0%, #A6690F 100%)" />}
      </div>

      {isOwner && hasGrowthData && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeaderRow}>
            <div style={styles.trendHeader}>Growth — {growthKindLabel}</div>
            <span style={{
              fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
              color: growthPct === null ? "var(--accent)" : growthPct >= 0 ? "#22A06B" : "#B23A2E",
            }}>
              {growthPct === null ? "New" : (
                <>
                  {growthPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(Math.round(growthPct))}%
                </>
              )}
            </span>
          </div>
          <GrowthLineChart points={growthPoints} />
        </div>
      )}

      {isOwner && (
        <>
          <SectionTitle title="Activities" small />
          <button className="lift-card" style={styles.activitiesCard} onClick={() => setTab("activity")}>
            <div style={styles.activitiesRow}>
              <div style={styles.activitiesCol}>
                <div style={styles.activitiesLabel}>Today</div>
                <div style={styles.activitiesValue}>{currency(today.revenue)}</div>
                {today.spent > 0 && <div style={{ ...styles.activitiesLabel, color: "#B23B3B" }}>-{currency(today.spent)} spent</div>}
              </div>
              <div style={styles.activitiesCol}>
                <div style={styles.activitiesLabel}>This week</div>
                <div style={styles.activitiesValue}>{currency(thisWeek.revenue)}</div>
                {thisWeek.spent > 0 && <div style={{ ...styles.activitiesLabel, color: "#B23B3B" }}>-{currency(thisWeek.spent)} spent</div>}
              </div>
              <div style={styles.activitiesCol}>
                <div style={styles.activitiesLabel}>This month</div>
                <div style={styles.activitiesValue}>{currency(thisMonth.revenue)}</div>
                {thisMonth.spent > 0 && <div style={{ ...styles.activitiesLabel, color: "#B23B3B" }}>-{currency(thisMonth.spent)} spent</div>}
              </div>
            </div>
            <div style={styles.activitiesFooter}>View daily, weekly & monthly activity <ChevronRight size={13} /></div>
          </button>
        </>
      )}

      {hasAnySales && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeaderRow}>
            <div style={styles.trendHeader}>Last 7 days</div>
            <div style={styles.trendLegendInline}>
              <span style={styles.trendLegendItem}><span style={{ ...styles.trendLegendDot, background: "var(--accent)" }} />In</span>
              <span style={styles.trendLegendItem}><span style={{ ...styles.trendLegendDot, background: "var(--ink-faint)" }} />Out</span>
            </div>
          </div>
          <div style={styles.trendBars}>
            {days.map((d, i) => (
              <div key={i} style={styles.trendBarCol}>
                <div style={styles.trendBarTrack}>
                  <div style={styles.trendBarPair}>
                    <div style={{ ...styles.trendBarFill, height: `${Math.max(4, (dayTotals[i] / maxDay) * 100)}%` }} title={currency(dayTotals[i])} />
                    <div style={{ ...styles.trendBarFillOut, height: `${Math.max(dayExpenseTotals[i] ? 4 : 0, (dayExpenseTotals[i] / maxDay) * 100)}%` }} title={currency(dayExpenseTotals[i])} />
                  </div>
                </div>
                <div style={styles.trendBarLabel}>{d.toLocaleDateString("default", { weekday: "narrow" })}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && paymentBreakdown.total > 0 && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeader}>This week, by payment method</div>
          <div style={styles.paymentBreakdownBar}>
            {Object.entries(paymentBreakdown.byMethod).map(([method, amt]) => (
              <div key={method} style={{ width: `${(amt / paymentBreakdown.total) * 100}%`, background: METHOD_COLOR[method] || "var(--ink-faint)" }} title={`${method}: ${currency(amt)}`} />
            ))}
          </div>
          <div style={styles.paymentBreakdownList}>
            {Object.entries(paymentBreakdown.byMethod).sort((a, b) => b[1] - a[1]).map(([method, amt]) => (
              <div key={method} style={styles.paymentBreakdownRow}>
                <span style={styles.trendLegendItem}><span style={{ ...styles.trendLegendDot, background: METHOD_COLOR[method] || "var(--ink-faint)" }} />{method}</span>
                <span style={styles.mono}>{currency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && expenseBreakdown.total > 0 && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeader}>This month, where money went</div>
          <div style={styles.donutRow}>
            <DonutChart slices={expenseBreakdown.slices} />
            <div style={{ ...styles.paymentBreakdownList, flex: 1 }}>
              {expenseBreakdown.slices.slice(0, 5).map((s) => (
                <div key={s.label} style={styles.paymentBreakdownRow}>
                  <span style={styles.trendLegendItem}><span style={{ ...styles.trendLegendDot, background: s.color }} />{s.label}</span>
                  <span style={styles.mono}>{currency(s.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isOwner && insights.length > 0 && (
        <div className="lift-card" style={{ ...styles.trendCard, background: "linear-gradient(135deg, rgba(20,73,176,0.06), rgba(20,73,176,0.02))" }}>
          <div style={{ ...styles.trendHeaderRow, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lightbulb size={15} color="var(--accent)" />
              <div style={{ ...styles.trendHeader, marginBottom: 0 }}>Insights</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)" }}>
                <CheckCircle2 size={15} color="#22A06B" style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && receivablesAging && receivablesAging.total > 0 && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeaderRow}>
            <div style={styles.trendHeader}>Receivables aging</div>
            <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{receivablesAging.overdueCount} on credit</span>
          </div>
          <div style={{ ...styles.listRowTitle, marginBottom: 12 }}>{currency(receivablesAging.total)} outstanding</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(receivablesAging.buckets).map(([bucket, amt]) => (
              <div key={bucket}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                  <span>{bucket}</span>
                  <span style={styles.mono}>{currency(amt)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--bg)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(amt > 0 ? 3 : 0, (amt / receivablesAging.total) * 100)}%`, background: AGING_COLOR[bucket], borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...styles.calloutLink, marginTop: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => setTab("reminders")}>Send payment reminders <ChevronRight size={13} /></button>
        </div>
      )}

      {isOwner && lowStock.length > 0 && (
        <Callout icon={AlertTriangle} tone="warn">
          {lowStock.length} item{lowStock.length > 1 ? "s" : ""} running low on stock.
          <button style={styles.calloutLink} onClick={() => setTab("items")}>Review stock</button>
        </Callout>
      )}

      {isOwner && expiringSoon.length > 0 && (
        <Callout icon={AlertTriangle} tone="warn">
          {expiringSoon.length} item{expiringSoon.length > 1 ? "s" : ""} expiring within 30 days.
          <button style={styles.calloutLink} onClick={() => setTab("items")}>Review stock</button>
        </Callout>
      )}

      {isOwner && isPropertyBiz && (
        <>
          <SectionTitle title="Rent status" small />
          <div style={styles.statGrid}>
            <StatCard label="Occupied" value={occupiedProperties.length} />
            <StatCard label="Vacant" value={vacantProperties.length} />
            <StatCard label="Rent collected — this month" value={currency(thisMonth.revenue)} />
            <StatCard label="Overdue tenants" value={overdueProperties.length} />
          </div>
          {overdueProperties.length > 0 && (
            <Callout icon={AlertTriangle} tone="warn">
              {overdueProperties.length} tenant{overdueProperties.length > 1 ? "s" : ""} without a rent payment logged this month (based on itemized rent payments — a "quick total" payment isn't linked to one property).
              <button style={styles.calloutLink} onClick={() => setTab("items")}>Review properties</button>
            </Callout>
          )}
        </>
      )}

      <div style={styles.quickRow}>
        <QuickAction icon={Plus} label={category.quickLabels.newItem} onClick={() => setTab("items")} />
        <QuickAction icon={Receipt} label={category.quickLabels.newOrder} onClick={() => setTab("orders")} />
        <QuickAction icon={ClipboardList} label="New quote" onClick={() => setTab("quotes")} />
        {!isTotalsMode && <QuickAction icon={Users} label={category.quickLabels.people} onClick={() => setTab("customers")} />}
      </div>

      <SectionTitle title={category.recentTitle} small />
      {branchOrders.length === 0 ? (
        <EmptyState text={`No ${category.orderNounPlural.toLowerCase()} yet. Create your first one from the ${category.orderNounPlural} tab.`} icon={Receipt} />
      ) : (
        <div style={styles.list}>
          {branchOrders.slice(0, 5).map((o) => (
            <div key={o.id} style={styles.listRow}>
              <div>
                <div style={styles.listRowTitle}>{o.quickSale ? (o.items[0]?.name || "Daily total entry") : (o.customerName || "Walk-in")}</div>
                <div style={styles.listRowSub}>{o.quickSale ? new Date(o.ts).toLocaleDateString() : o.items.map((i) => i.name).join(", ")}</div>
              </div>
              <div style={styles.listRowRight}>
                <div style={styles.mono}>{currency(o.total)}</div>
                <StatusBadge status={o.status} category={category} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint, sub }) {
  if (Icon && tint) {
    return (
      <div className="lift-card" style={{ ...styles.statCardColored, background: tint }}>
        <div style={styles.statCardColoredIconWrap}>
          <Icon size={16} color="#fff" />
        </div>
        <div style={styles.statCardColoredValue}>{value}</div>
        <div style={styles.statCardColoredLabel}>{label}</div>
        {sub && <div style={{ ...styles.statCardColoredLabel, marginTop: 4, opacity: 0.92 }}>{sub}</div>}
      </div>
    );
  }
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      {sub && <div style={{ ...styles.statLabel, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
// A simple SVG donut chart. slices: [{ label, value, color }]
function DonutChart({ slices, size = 120, thickness = 18 }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg)" strokeWidth={thickness} />
        {total > 0 && slices.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circumference;
          const gap = circumference - dash;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
              strokeLinecap={slices.length > 1 ? "butt" : "round"} />
          );
          offset += dash;
          return el;
        })}
      </g>
    </svg>
  );
}
// A simple SVG line/area chart of revenue over several consecutive periods, used for the
// dashboard's growth trend. points: [{ label, value }], oldest first.
function GrowthLineChart({ points, width = 300, height = 110 }) {
  const pad = { top: 10, right: 10, bottom: 20, left: 10 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const range = max - min || 1;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + innerH - ((p.value - min) / range) * innerH,
    ...p,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`;
  const rising = points.length > 1 && points[points.length - 1].value >= points[0].value;
  const lineColor = rising ? "#22A06B" : "#B23A2E";
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={areaPath} fill={rising ? "rgba(34,160,107,0.12)" : "rgba(178,58,46,0.10)"} stroke="none" />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2.5} fill={lineColor} />
      ))}
      {coords.map((c, i) => (
        <text key={i} x={c.x} y={height - 4} fontSize="9" textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"} fill="var(--ink-faint)">{c.label}</text>
      ))}
    </svg>
  );
}
// A simple horizontal bar list — label + value, bar length relative to the largest
// value in the set. Used for "sales by branch" / "top customers" style breakdowns.
function BarListChart({ data, color = "var(--accent)" }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4, gap: 8 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
            <span style={{ ...styles.mono, flexShrink: 0 }}>{currency(d.value)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(3, (d.value / max) * 100)}%`, background: color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button style={styles.quickAction} onClick={onClick}>
      <div style={styles.quickActionIconWrap}>
        <Icon size={16} color="var(--accent)" />
      </div>
      <span style={styles.quickActionLabel}>{label}</span>
    </button>
  );
}
function Callout({ icon: Icon, tone, children }) {
  return (
    <div style={{ ...styles.callout, ...(tone === "warn" ? styles.calloutWarn : {}) }}>
      <Icon size={16} />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
function EmptyState({ text, icon: Icon }) {
  return (
    <div style={styles.emptyState}>
      {Icon && (
        <div style={styles.emptyStateIconWrap}>
          <Icon size={20} color="var(--accent)" />
        </div>
      )}
      <div style={styles.emptyStateText}>{text}</div>
    </div>
  );
}
function StatusBadge({ status, category }) {
  const map = {
    pending: { bg: "var(--gold-soft)", fg: "#8A6D00" },
    paid: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    fulfilled: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  };
  const s = map[status] || map.pending;
  const label = category?.statusLabels?.[status] || status;
  return (
    <span style={{ ...styles.badge, background: s.bg, color: s.fg }}>{label}</span>
  );
}
function SectionTitle({ title, small }) {
  return <div style={small ? styles.sectionTitleSmall : styles.sectionTitle}>{title}</div>;
}

/* =========================================================
   BARCODE SCANNER (shared — used by ItemsPanel to register a barcode, and by
   OrdersPanel to look one up at checkout)
   Uses the browser's built-in BarcodeDetector API where available (no extra
   library needed), and falls back to typing the code in by hand everywhere
   else — iOS Safari and most desktop browsers don't support it yet.
   ========================================================= */
function BarcodeScannerModal({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [supported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);
  const [manualMode, setManualMode] = useState(() => !(typeof window !== "undefined" && "BarcodeDetector" in window));
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (manualMode) return undefined;
    let cancelled = false;
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
    } catch {
      setManualMode(true);
      return undefined;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              cancelled = true;
              onDetect(codes[0].rawValue);
              return;
            }
          } catch { /* frame not ready — keep trying next frame */ }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) { setCameraError("Couldn't access the camera — you can type the barcode instead."); setManualMode(true); }
      });
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [manualMode, onDetect]);

  const submitManual = () => {
    if (!manualCode.trim()) return;
    onDetect(manualCode.trim());
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.invoiceHeader}>
          <div style={styles.invoiceBrand}>Scan barcode</div>
          <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {!manualMode ? (
          <>
            <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 10, background: "#000", marginBottom: 12 }} />
            <p style={styles.helperText}>Point the camera at the barcode — it'll be picked up automatically.</p>
            <button type="button" style={styles.textLinkBtn} onClick={() => setManualMode(true)}>Type the code instead</button>
          </>
        ) : (
          <>
            {cameraError && <div style={styles.authError}>{cameraError}</div>}
            <input style={styles.textInput} placeholder="Enter barcode / SKU" value={manualCode} autoFocus
              onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitManual(); }} />
            <button style={styles.primaryBtnSmall} onClick={submitManual}><Check size={16} /> Use this code</button>
            {supported && (
              <button type="button" style={{ ...styles.textLinkBtn, marginTop: 10 }} onClick={() => { setManualMode(false); setCameraError(""); }}>Use camera instead</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   ITEMS (Products / Services)
   ========================================================= */
function ItemsPanel({ biz, category, persist, notify, isOwner }) {
  const isPharmacy = biz.profile?.businessSubtypeId === "pharmacy";
  const isPropertyBiz = category.id === "property";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", cost: "", stock: "", meta: "", itemCategory: "", unit: "pcs", expiryDate: "", batchNumber: "", requiresPrescription: false, dueDay: "1", barcode: "" });
  const [showScanner, setShowScanner] = useState(false);
  const [query, setQuery] = useState("");
  const [newTag, setNewTag] = useState("");
  const [restockingId, setRestockingId] = useState(null); // item id currently showing the restock form
  const [restockForm, setRestockForm] = useState({ qty: "", costPerUnit: "", supplierId: "", supplier: "", logExpense: true });
  const bizCategories = biz.categories || [];
  const suppliers = biz.suppliers || [];

  const addCategoryTag = () => {
    const clean = newTag.trim();
    if (!clean) return;
    if (bizCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) { setForm({ ...form, itemCategory: clean }); setNewTag(""); return; }
    persist({ ...biz, categories: [...bizCategories, clean] });
    setForm({ ...form, itemCategory: clean });
    setNewTag("");
  };

  const addItem = () => {
    if (!form.name.trim() || !form.price) return;
    const item = {
      id: uid("item"),
      name: form.name.trim(),
      price: Number(form.price),
      cost: Number(form.cost) || 0,
      stock: category.hasStock ? Number(form.stock) || 0 : undefined,
      unit: category.hasStock ? (form.unit || "pcs") : undefined,
      meta: !category.hasStock ? form.meta.trim() : undefined,
      category: form.itemCategory.trim() || undefined,
      lowStockAt: 3,
      branchId: biz.settings?.activeBranchId || null,
      expiryDate: isPharmacy && form.expiryDate ? form.expiryDate : undefined,
      batchNumber: isPharmacy && form.batchNumber.trim() ? form.batchNumber.trim() : undefined,
      requiresPrescription: isPharmacy ? !!form.requiresPrescription : undefined,
      dueDay: isPropertyBiz ? (Math.min(28, Math.max(1, Number(form.dueDay) || 1))) : undefined,
      barcode: category.hasStock && form.barcode.trim() ? form.barcode.trim() : undefined,
    };
    let next = { ...biz, items: [item, ...biz.items] };
    persist(next);
    setForm({ name: "", price: "", cost: "", stock: "", meta: "", itemCategory: "", unit: "pcs", expiryDate: "", batchNumber: "", requiresPrescription: false, dueDay: "1", barcode: "" });
    setShowForm(false);
  };

  const removeItem = (id) => {
    const item = biz.items.find((i) => i.id === id);
    if (!window.confirm(`Remove "${item?.name || "this item"}"? This can't be undone.`)) return;
    persist({ ...biz, items: biz.items.filter((i) => i.id !== id) });
  };

  const openRestock = (item) => {
    setRestockingId(item.id);
    setRestockForm({ qty: "", costPerUnit: item.cost ? String(item.cost) : "", supplierId: "", supplier: "", logExpense: true });
  };

  const submitRestock = (item) => {
    const qty = Number(restockForm.qty);
    const costPerUnit = Number(restockForm.costPerUnit);
    if (!qty || qty <= 0 || !costPerUnit || costPerUnit < 0) return;
    const totalCost = Math.round(qty * costPerUnit);
    const pickedSupplier = restockForm.supplierId ? suppliers.find((s) => s.id === restockForm.supplierId) : null;
    const supplierName = pickedSupplier ? pickedSupplier.name : (restockForm.supplier.trim() || null);
    const record = {
      id: uid("restock"),
      itemId: item.id,
      itemName: item.name,
      qty,
      unit: item.unit || "pcs",
      costPerUnit,
      totalCost,
      supplier: supplierName,
      supplierId: pickedSupplier ? pickedSupplier.id : null,
      sellPriceAtTime: item.price,
      ts: Date.now(),
      branchId: biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
    };
    let next = {
      ...biz,
      items: biz.items.map((i) => i.id === item.id ? { ...i, stock: (i.stock || 0) + qty, cost: costPerUnit } : i),
      restocks: [record, ...(biz.restocks || [])],
    };
    if (restockForm.logExpense) {
      const exp = {
        id: uid("exp"),
        category: "Restocking / buying stock",
        amount: totalCost,
        note: `${qty} ${unitLabel(item.unit, qty !== 1)} of ${item.name}${record.supplier ? ` from ${record.supplier}` : ""}`,
        branchId: record.branchId,
        ts: record.ts,
      };
      next = { ...next, expenses: [exp, ...next.expenses] };
    }
    next = notify(next, "stock", `Restocked ${qty} ${unitLabel(item.unit, qty !== 1)} of ${item.name} — ${currency(totalCost)} total${record.supplier ? ` from ${record.supplier}` : ""}`);
    persist(next);
    setRestockingId(null);
    setRestockForm({ qty: "", costPerUnit: "", supplierId: "", supplier: "", logExpense: true });
  };

  const recentRestocks = filterByBranch(biz.restocks || [], biz.settings?.activeBranchId).slice(0, 8);

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <SectionTitle title={category.itemLabelPlural} />
        {isOwner && (
          <button style={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <input style={styles.textInput} placeholder={`${category.itemLabel} name`}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          {category.hasStock && (
            <>
              <div style={styles.miniLabel}>Sold by</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {STOCK_UNITS.map((u) => (
                  <button key={u} type="button"
                    style={{ ...styles.paymentChip, flex: "none", ...(form.unit === u ? styles.paymentChipActive : {}) }}
                    onClick={() => setForm({ ...form, unit: u })}>
                    {u}
                  </button>
                ))}
              </div>
              <div style={styles.formRow}>
                <input style={{ ...styles.textInput, flex: 1, marginBottom: 0 }} placeholder="Barcode / SKU (optional)"
                  value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                <button type="button" style={styles.smallAddBtn} onClick={() => setShowScanner(true)}>
                  <ScanLine size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> Scan
                </button>
              </div>
              {showScanner && (
                <BarcodeScannerModal
                  onDetect={(code) => { setForm((f) => ({ ...f, barcode: code })); setShowScanner(false); }}
                  onClose={() => setShowScanner(false)}
                />
              )}
            </>
          )}

          <div style={styles.formRow}>
            <input style={{ ...styles.textInputHalf, ...(category.id === "property" ? { flex: 1 } : {}) }} type="number" placeholder={category.hasStock ? `Price per ${form.unit || "pcs"} (MWK)` : (category.id === "property" ? "Monthly rent (MWK)" : "Price (MWK)")}
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            {category.id !== "property" && (
              <input style={styles.textInputHalf} type="number" placeholder={category.hasStock ? `Buying cost per ${form.unit || "pcs"} (optional)` : "Cost (optional)"}
                value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            )}
          </div>
          {category.hasStock && Number(form.price) > 0 && Number(form.cost) > 0 && (
            <p style={{ ...styles.helperText, marginTop: -8 }}>
              Margin: {currency(Number(form.price) - Number(form.cost))} per {form.unit || "pcs"}
              {" "}({Math.round(((Number(form.price) - Number(form.cost)) / Number(form.price)) * 100)}%)
            </p>
          )}

          {category.hasStock ? (
            <input style={styles.textInput} type="number" step="any" placeholder={`Starting stock (${form.unit || "pcs"})`}
              value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          ) : (
            <input style={styles.textInput} type={category.id === "property" ? "text" : "number"} placeholder={category.extraFieldLabel}
              value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
          )}

          {isPropertyBiz && (
            <>
              <div style={styles.miniLabel}>Rent due day of month</div>
              <input style={{ ...styles.textInput, marginTop: 6 }} type="number" min="1" max="28" placeholder="e.g. 1"
                value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
              <p style={{ ...styles.helperText, marginTop: -8 }}>Used to mark this property on the Calendar tab each month.</p>
            </>
          )}

          {isPharmacy && (
            <>
              <div style={styles.miniLabel}>Expiry date</div>
              <input style={{ ...styles.textInput, marginTop: 6 }} type="date"
                value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              <input style={styles.textInput} placeholder="Batch / lot number (optional)"
                value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-faint)", marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={form.requiresPrescription}
                  onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })} />
                Requires a prescription reference at sale
              </label>
            </>
          )}

          {category.id !== "property" && (
            <>
              <div style={styles.miniLabel}>Category (for "sales by category" in Reports)</div>
              {bizCategories.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {bizCategories.map((c) => (
                    <button key={c} type="button"
                      style={{ ...styles.paymentChip, flex: "none", ...(form.itemCategory === c ? styles.paymentChipActive : {}) }}
                      onClick={() => setForm({ ...form, itemCategory: form.itemCategory === c ? "" : c })}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input style={{ ...styles.textInput, marginBottom: 0 }} placeholder="New category…"
                  value={newTag} onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategoryTag(); } }} />
                <button type="button" style={styles.smallAddBtn} onClick={addCategoryTag}>Add</button>
              </div>
            </>
          )}

          <button style={styles.primaryBtnSmall} onClick={addItem}>
            <Check size={16} /> Save {category.itemLabel.toLowerCase()}
          </button>
        </div>
      )}

      {itemsForBranch(biz.items, biz.settings?.activeBranchId).length === 0 ? (
        <EmptyState text={`No ${category.itemLabelPlural.toLowerCase()} yet. Add your first one above.`} icon={category.icon} />
      ) : (
        <>
          {itemsForBranch(biz.items, biz.settings?.activeBranchId).length > 4 && (
            <div style={styles.searchWrap}>
              <SearchIcon size={15} color="var(--ink-faint)" />
              <input style={styles.searchInput} placeholder={`Search ${category.itemLabelPlural.toLowerCase()}…`}
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <div style={styles.list}>
          {itemsForBranch(biz.items, biz.settings?.activeBranchId).filter((i) => i.name.toLowerCase().includes(query.toLowerCase())).map((item) => (
            <div key={item.id}>
              <div style={styles.listRow}>
                <div>
                  <div style={styles.listRowTitle}>{item.name}</div>
                  <div style={styles.listRowSub}>
                    {currency(item.price)}{category.hasStock ? ` / ${item.unit || "pcs"}` : (category.id === "property" ? "/month" : "")}
                    {category.hasStock && item.stock !== undefined && (
                      <span style={item.stock <= item.lowStockAt ? styles.lowStockText : undefined}>
                        {"  ·  "}{item.stock} {unitLabel(item.unit, item.stock !== 1)} in stock
                      </span>
                    )}
                    {category.id === "property" ? (
                      <span style={!item.meta ? styles.lowStockText : undefined}>
                        {"  ·  "}{item.meta ? `Tenant: ${item.meta}` : "Vacant"}{item.dueDay ? ` · Due day ${item.dueDay}` : ""}
                      </span>
                    ) : (!category.hasStock && item.meta && (
                      <span>{"  ·  "}{item.meta} {category.id === "service" ? "min" : category.id === "repair" ? "hrs" : ""}</span>
                    ))}
                    {item.category && <span>{"  ·  "}{item.category}</span>}
                    {item.cost > 0 && (
                      <span>{"  ·  "}Margin {currency(item.price - item.cost)}{category.hasStock ? `/${item.unit || "pcs"}` : ""}</span>
                    )}
                    {item.expiryDate && (() => {
                      const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
                      const soon = daysLeft <= 30;
                      return (
                        <span style={soon ? styles.lowStockText : undefined}>
                          {"  ·  "}{daysLeft < 0 ? "Expired" : `Expires ${new Date(item.expiryDate).toLocaleDateString()}`}
                        </span>
                      );
                    })()}
                    {item.batchNumber && <span>{"  ·  "}Batch {item.batchNumber}</span>}
                    {item.requiresPrescription && <span>{"  ·  "}Rx required</span>}
                    {item.barcode && <span>{"  ·  "}Barcode {item.barcode}</span>}
                  </div>
                  {category.hasStock && item.stock !== undefined && item.stock <= item.lowStockAt && (() => {
                    const reorder = suggestReorderQty(biz, item);
                    return reorder ? (
                      <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>
                        Selling ~{reorder.avgDaily < 1 ? reorder.avgDaily.toFixed(1) : Math.round(reorder.avgDaily)} {unitLabel(item.unit, true)}/day recently — consider reordering ~{reorder.suggested} {unitLabel(item.unit, reorder.suggested !== 1)}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isOwner && category.hasStock && (
                    <button style={styles.textLinkBtn} onClick={() => (restockingId === item.id ? setRestockingId(null) : openRestock(item))}>
                      Restock
                    </button>
                  )}
                  {isOwner && (
                    <button style={styles.iconBtn} onClick={() => removeItem(item.id)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {restockingId === item.id && (
                <div style={styles.formCard}>
                  <p style={styles.helperText}>Log what you bought from the supplier — this tops up stock and updates the buying cost used for your profit numbers.</p>
                  <div style={styles.formRow}>
                    <input style={styles.textInputHalf} type="number" step="any" placeholder={`Qty received (${item.unit || "pcs"})`}
                      value={restockForm.qty} onChange={(e) => setRestockForm({ ...restockForm, qty: e.target.value })} />
                    <input style={styles.textInputHalf} type="number" placeholder={`Cost per ${item.unit || "pcs"} (MWK)`}
                      value={restockForm.costPerUnit} onChange={(e) => setRestockForm({ ...restockForm, costPerUnit: e.target.value })} />
                  </div>
                  <div style={styles.miniLabel}>Supplier</div>
                  {suppliers.length > 0 && (
                    <select style={styles.textInput} value={restockForm.supplierId}
                      onChange={(e) => setRestockForm({ ...restockForm, supplierId: e.target.value, supplier: "" })}>
                      <option value="">Type a name below instead…</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  {!restockForm.supplierId && (
                    <input style={styles.textInput} placeholder="Supplier / wholesaler name (optional)"
                      value={restockForm.supplier} onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })} />
                  )}
                  {suppliers.length === 0 && (
                    <p style={{ ...styles.helperText, marginTop: -8 }}>Tip: add this supplier under the Suppliers tab to track your total spend with them over time.</p>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-faint)", marginBottom: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={restockForm.logExpense}
                      onChange={(e) => setRestockForm({ ...restockForm, logExpense: e.target.checked })} />
                    Also log this as a "Restocking" expense (counts as cash out now, in Reports)
                  </label>
                  {Number(restockForm.qty) > 0 && Number(restockForm.costPerUnit) >= 0 && (
                    <p style={{ ...styles.helperText, marginTop: -8 }}>
                      Total cost: {currency(Number(restockForm.qty) * Number(restockForm.costPerUnit))}
                      {" — "}selling at {currency(item.price)}/{item.unit || "pcs"} gives{" "}
                      {currency(item.price - Number(restockForm.costPerUnit))} profit per {item.unit || "pcs"}
                      {Number(restockForm.costPerUnit) > 0 && ` (${Math.round(((item.price - Number(restockForm.costPerUnit)) / item.price) * 100)}%)`}
                    </p>
                  )}
                  <button style={styles.primaryBtnSmall} onClick={() => submitRestock(item)}>
                    <Check size={16} /> Save restock
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      {recentRestocks.length > 0 && (
        <>
          <SectionTitle title="Recent restocking" small />
          <div style={styles.list}>
            {recentRestocks.map((r) => (
              <div key={r.id} style={styles.listRow}>
                <div>
                  <div style={styles.listRowTitle}>{r.itemName}</div>
                  <div style={styles.listRowSub}>
                    {r.qty} {unitLabel(r.unit, r.qty !== 1)} @ {currency(r.costPerUnit)}{r.supplier ? ` · ${r.supplier}` : ""} · {new Date(r.ts).toLocaleDateString()}
                  </div>
                </div>
                <div style={styles.listRowRight}>
                  <div style={styles.mono}>{currency(r.totalCost)}</div>
                  {r.sellPriceAtTime > r.costPerUnit && (
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>+{currency(r.sellPriceAtTime - r.costPerUnit)}/{unitLabel(r.unit)} margin</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   ORDERS
   ========================================================= */
function OrdersPanel({ biz, category, persist, notify, currentEmployee }) {
  const [showForm, setShowForm] = useState(false);
  const [saleMode, setSaleMode] = useState(biz.profile?.recordingMode === "totals" ? "quick" : "itemized"); // itemized | quick
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [cart, setCart] = useState([]);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [formError, setFormError] = useState("");
  const [saleDate, setSaleDate] = useState(toDateInputValue(new Date()));
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState("");
  const today = new Date();

  const selectedUnit = biz.items.find((i) => i.id === selectedItemId)?.unit || "pcs";

  const handleScan = (code) => {
    setShowScanner(false);
    const found = itemsForBranch(biz.items, biz.settings?.activeBranchId).find((i) => i.barcode && i.barcode === code);
    if (!found) { setScanError(`No ${category.itemLabel.toLowerCase()} found with barcode "${code}".`); return; }
    setScanError("");
    setCart((c) => [...c, { itemId: found.id, name: found.name, price: found.price, category: found.category, unit: found.unit, qty: 1 }]);
  };

  const addToCart = () => {
    const item = biz.items.find((i) => i.id === selectedItemId);
    if (!item) return;
    setCart([...cart, { itemId: item.id, name: item.name, price: item.price, category: item.category, unit: item.unit, qty: Number(qty) || 1 }]);
    setSelectedItemId("");
    setQty(1);
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const taxRate = biz.settings?.taxRate || 0;
  const discountRate = subtotal >= (biz.settings?.discountThreshold || Infinity) ? (biz.settings?.discountRate || 0) : 0;
  const discountAmount = subtotal * (discountRate / 100);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = Math.round(subtotal - discountAmount + taxAmount);
  const quickTotal = Math.round(Number(quickAmount) || 0);

  const branchOrders = filterByBranch(biz.orders, biz.settings?.activeBranchId).slice().sort((a, b) => b.ts - a.ts);

  const resetForm = () => {
    setCart([]);
    setQuickAmount("");
    setQuickNote("");
    setCustomerName("");
    setPaymentMethod("Cash");
    setPaymentNote("");
    setSaleDate(toDateInputValue(new Date()));
    setEditingOrderId(null);
    setFormError("");
    setShowForm(false);
  };

  const startEdit = (order) => {
    setEditingOrderId(order.id);
    setSaleMode(order.quickSale ? "quick" : "itemized");
    if (order.quickSale) {
      setQuickAmount(String(order.total));
      const note = order.items?.[0]?.name || "";
      setQuickNote(note === "Quick sale (not itemized)" ? "" : note);
      setCart([]);
    } else {
      setCart((order.items || []).map((i) => ({ ...i })));
      setQuickAmount(""); setQuickNote("");
    }
    setCustomerName(order.customerName || "");
    setPaymentMethod(order.paymentMethod || "Cash");
    setPaymentNote(order.paymentNote || "");
    setSaleDate(toDateInputValue(new Date(order.ts)));
    setFormError("");
    setInvoiceOrder(null);
    setShowForm(true);
  };

  const submitOrder = () => {
    if (saleMode === "itemized" && cart.length === 0) return;
    if (saleMode === "quick" && quickTotal <= 0) return;
    if (paymentMethod === "On credit" && !customerName.trim()) {
      setFormError(`A ${category.customerNoun.toLowerCase()} name is required for credit sales — otherwise there's no way to know who owes you.`);
      return;
    }
    setFormError("");

    const isQuick = saleMode === "quick";
    const isEditing = !!editingOrderId;
    const existingOrder = isEditing ? biz.orders.find((o) => o.id === editingOrderId) : null;
    // Keep the time-of-day from the original order when just nudging the date on an edit;
    // otherwise stamp new sales at midday on the chosen date (same convention as Daily activity).
    const ts = new Date(saleDate + "T12:00:00").getTime();

    const order = {
      id: isEditing ? editingOrderId : uid("ord"),
      items: isQuick ? [{ itemId: null, name: quickNote.trim() || "Quick sale (not itemized)", qty: 1, price: quickTotal }] : cart,
      subtotal: isQuick ? quickTotal : subtotal,
      discountAmount: isQuick ? 0 : discountAmount,
      taxAmount: isQuick ? 0 : taxAmount,
      taxRate: isQuick ? 0 : taxRate,
      total: isQuick ? quickTotal : total,
      quickSale: isQuick,
      customerName: customerName.trim() || null,
      paymentMethod,
      paymentNote: paymentNote.trim() || null,
      status: existingOrder?.status || "paid",
      paymentStatus: paymentMethod === "On credit" ? "credit" : "paid",
      employeeId: existingOrder?.employeeId || currentEmployee.id,
      branchId: existingOrder?.branchId || (biz.settings?.activeBranchId || biz.branches?.[0]?.id || null),
      ts,
    };

    let next = { ...biz };

    if (isEditing) {
      // Reconcile stock: put back whatever the original order consumed, then apply the new lines.
      if (category.hasStock) {
        next = {
          ...next,
          items: next.items.map((it) => {
            if (it.stock === undefined) return it;
            let stock = it.stock;
            const oldLine = existingOrder && !existingOrder.quickSale ? existingOrder.items.find((c) => c.itemId === it.id) : null;
            if (oldLine) stock += oldLine.qty;
            const newLine = !isQuick ? cart.find((c) => c.itemId === it.id) : null;
            if (newLine) stock = Math.max(0, stock - newLine.qty);
            return stock === it.stock ? it : { ...it, stock };
          }),
        };
      }
      // Reconcile the customer's order tally if the name on the sale changed.
      const oldName = (existingOrder?.customerName || "").trim().toLowerCase();
      const newName = customerName.trim().toLowerCase();
      if (oldName !== newName) {
        let customers = next.customers;
        if (oldName) {
          customers = customers.map((c) => c.name.toLowerCase() === oldName ? { ...c, orders: Math.max(0, c.orders - 1) } : c);
        }
        if (newName) {
          const existingCust = customers.find((c) => c.name.toLowerCase() === newName);
          customers = existingCust
            ? customers.map((c) => c.id === existingCust.id ? { ...c, orders: c.orders + 1 } : c)
            : [{ id: uid("cust"), name: customerName.trim(), orders: 1 }, ...customers];
        }
        next = { ...next, customers };
      }
      next = { ...next, orders: next.orders.map((o) => (o.id === editingOrderId ? order : o)) };
      const branchTag = (biz.branches?.length > 1)
        ? ` — ${biz.branches.find((b) => b.id === order.branchId)?.name || "branch"}`
        : "";
      next = notify(next, "edit", `Sale for ${order.customerName || "walk-in"} updated to ${currency(order.total)} (${new Date(order.ts).toLocaleDateString()})${branchTag}`);
    } else {
      next = { ...next, orders: [order, ...next.orders] };

      // decrement stock (itemized sales only — quick sales aren't tied to specific items)
      if (category.hasStock && !isQuick) {
        next = {
          ...next,
          items: next.items.map((it) => {
            const inCart = cart.find((c) => c.itemId === it.id);
            if (inCart && it.stock !== undefined) {
              const newStock = Math.max(0, it.stock - inCart.qty);
              return { ...it, stock: newStock };
            }
            return it;
          }),
        };
      }

      // add/find customer
      if (customerName.trim()) {
        const existing = next.customers.find((c) => c.name.toLowerCase() === customerName.trim().toLowerCase());
        if (!existing) {
          next = { ...next, customers: [{ id: uid("cust"), name: customerName.trim(), orders: 1 }, ...next.customers] };
        } else {
          next = { ...next, customers: next.customers.map((c) => c.id === existing.id ? { ...c, orders: c.orders + 1 } : c) };
        }
      }

      const branchTag = (biz.branches?.length > 1)
        ? ` — ${biz.branches.find((b) => b.id === order.branchId)?.name || "branch"}`
        : "";
      const staffTag = currentEmployee.role !== "owner" ? ` (by ${currentEmployee.name})` : "";
      next = paymentMethod === "On credit"
        ? notify(next, "payment", `Credit sale of ${currency(order.total)} recorded${customerName ? " for " + customerName : ""}${staffTag}${branchTag}`)
        : notify(next, "payment", `Payment of ${currency(order.total)} received${customerName ? " from " + customerName : ""}${staffTag}${branchTag}`);

      // low stock check
      if (category.hasStock && !isQuick) {
        const justLow = next.items.filter((it) => cart.some(c => c.itemId === it.id) && it.stock <= it.lowStockAt);
        justLow.forEach((it) => {
          next = notify(next, "stock", `${it.name} is running low — ${it.stock} ${unitLabel(it.unit, it.stock !== 1)} left`);
        });
      }
    }

    persist(next);
    setInvoiceOrder(order);
    resetForm();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <SectionTitle title={category.orderNounPlural} />
        <button style={styles.addBtn} onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {editingOrderId ? <><X size={16} /> Cancel edit</> : <><Plus size={16} /> {category.quickLabels.newOrder}</>}
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          {editingOrderId && <p style={styles.helperText}>Editing this {category.orderNoun.toLowerCase()} — change what needs fixing and save.</p>}

          <div style={styles.segmentedRow}>
            <button style={{ ...styles.segmentBtn, ...(saleMode === "itemized" ? styles.segmentBtnActive : {}), ...(editingOrderId ? { opacity: 0.5, cursor: "default" } : {}) }}
              disabled={!!editingOrderId} onClick={() => setSaleMode("itemized")}>
              Itemized
            </button>
            <button style={{ ...styles.segmentBtn, ...(saleMode === "quick" ? styles.segmentBtnActive : {}), ...(editingOrderId ? { opacity: 0.5, cursor: "default" } : {}) }}
              disabled={!!editingOrderId} onClick={() => setSaleMode("quick")}>
              Quick total{biz.profile?.recordingMode === "totals" ? " (your default)" : ""}
            </button>
          </div>

          <label style={styles.listRowSub}>Date</label>
          <input style={{ ...styles.textInput, marginTop: 6 }} type="date" value={saleDate} onChange={(e) => e.target.value && setSaleDate(e.target.value)} />
          {saleDate > toDateInputValue(today) && <p style={styles.helperText}>Dated in the future — this will show up once that date arrives.</p>}

          {saleMode === "quick" ? (
            <>
              <p style={styles.helperText}>For busy moments when you can't track each product — just record what came in and how it was paid.</p>
              <input style={styles.textInput} type="number" placeholder="Total amount, MWK" value={quickAmount} onChange={(e) => setQuickAmount(e.target.value)} />
              <input style={styles.textInput} placeholder="Note (optional, e.g. 'morning rush')" value={quickNote} onChange={(e) => setQuickNote(e.target.value)} />
            </>
          ) : (
            <>
              <div style={styles.formRow}>
                <select style={{ ...styles.textInputHalf, minWidth: 0 }} value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); setQty(1); }}>
                  <option value="">Select {category.itemLabel.toLowerCase()}…</option>
                  {itemsForBranch(biz.items, biz.settings?.activeBranchId).map((i) => (
                    <option key={i.id} value={i.id}>{i.name} — {currency(i.price)}{category.hasStock && i.unit && i.unit !== "pcs" ? `/${i.unit}` : ""}</option>
                  ))}
                </select>
                <input style={styles.qtyInput} type="number" min="0" step={selectedUnit !== "pcs" ? "any" : "1"}
                  placeholder={category.id === "property" ? "Months" : (selectedUnit !== "pcs" ? selectedUnit : "")} value={qty} onChange={(e) => setQty(e.target.value)} />
                <button style={styles.smallAddBtn} onClick={addToCart}>Add</button>
              </div>
              {category.hasStock && (
                <>
                  <button type="button" style={{ ...styles.textLinkBtn, marginTop: -6, marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }} onClick={() => { setShowScanner(true); setScanError(""); }}>
                    <ScanLine size={14} /> Scan a barcode to add instantly
                  </button>
                  {scanError && <div style={styles.authError}>{scanError}</div>}
                  {showScanner && <BarcodeScannerModal onDetect={handleScan} onClose={() => setShowScanner(false)} />}
                </>
              )}
              {category.id === "property" && (
                <p style={{ ...styles.helperText, marginTop: -8 }}>Paying for more than one month at once? Set "Months" to 2, 3, or however many are being paid now.</p>
              )}

              {cart.length > 0 && (
                <div style={styles.cartBox}>
                  {cart.map((c, idx) => (
                    <div key={idx} style={styles.cartRow}>
                      <span>{category.id === "property" ? `${c.qty} month${c.qty !== 1 ? "s" : ""} — ${c.name}` : `${c.qty} ${c.unit && c.unit !== "pcs" ? c.unit : "×"} ${c.name}`}</span>
                      <span style={styles.mono}>{currency(c.price * c.qty)}</span>
                    </div>
                  ))}
                  {discountAmount > 0 && (
                    <div style={styles.cartRow}>
                      <span>Discount ({biz.settings.discountRate}%)</span>
                      <span style={styles.mono}>−{currency(discountAmount)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div style={styles.cartRow}>
                      <span>Tax ({taxRate}%)</span>
                      <span style={styles.mono}>+{currency(taxAmount)}</span>
                    </div>
                  )}
                  <div style={styles.cartTotalRow}>
                    <span>Total</span>
                    <span style={styles.mono}>{currency(total)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <input style={styles.textInput}
            placeholder={paymentMethod === "On credit" ? `${category.customerNoun} name (required for credit)` : `${category.customerNoun} name (optional)`}
            value={customerName} onChange={(e) => { setCustomerName(e.target.value); if (formError) setFormError(""); }} />

          <div style={styles.paymentMethodRow}>
            {["Cash", "Bank Transfer", "Mobile Money", ...(hasAccounting(biz) ? ["On credit"] : [])].map((m) => (
              <button key={m}
                style={{ ...styles.paymentChip, ...(paymentMethod === m ? styles.paymentChipActive : {}) }}
                onClick={() => setPaymentMethod(m)}>
                {m}
              </button>
            ))}
          </div>
          {(paymentMethod === "Bank Transfer" || paymentMethod === "Mobile Money") && (
            <input style={styles.textInput} placeholder="Reference / note (optional) — e.g. bank name, phone number, transaction ID"
              value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
          )}

          {formError && <div style={styles.authError}>{formError}</div>}

          <button style={{ ...styles.primaryBtnSmall, opacity: (saleMode === "quick" ? quickTotal > 0 : cart.length > 0) ? 1 : 0.4 }}
            disabled={saleMode === "quick" ? quickTotal <= 0 : !cart.length} onClick={submitOrder}>
            <Check size={16} /> {editingOrderId ? "Save changes" : (saleMode === "quick" ? "Record sale" : `Complete ${category.orderNoun.toLowerCase()} & generate invoice`)}
          </button>
        </div>
      )}

      {biz.items.length === 0 && !showForm && (
        <EmptyState text={`Add some ${category.itemLabelPlural.toLowerCase()} first, then create ${article(category.orderNoun)} ${category.orderNoun.toLowerCase()}.`} icon={category.icon} />
      )}

      {biz.orders.length === 0 ? (
        biz.items.length > 0 && <EmptyState text={`No ${category.orderNounPlural.toLowerCase()} yet.`} icon={Receipt} />
      ) : (
        <div style={styles.list}>
          {branchOrders.map((o) => (
            <button key={o.id} className="lift-card" style={styles.listRowClickable} onClick={() => setInvoiceOrder(o)}>
              <div>
                <div style={styles.listRowTitle}>{o.customerName || "Walk-in"}</div>
                <div style={styles.listRowSub}>
                  {!isSameDay(o.ts, today) ? `${new Date(o.ts).toLocaleDateString("default", { month: "short", day: "numeric" })} · ` : ""}
                  {o.quickSale ? (o.items[0]?.name || "Quick sale") : o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  {o.paymentMethod ? ` · ${o.paymentMethod}` : ""}
                </div>
              </div>
              <div style={styles.listRowRight}>
                <div style={styles.mono}>{currency(o.total)}</div>
                {(o.refundedAmount || 0) > 0
                  ? <span style={{ ...styles.badge, background: "rgba(178,58,46,0.12)", color: "#B23A2E" }}>{(o.refundedAmount || 0) >= o.total ? "Refunded" : "Partial refund"}</span>
                  : o.paymentStatus === "credit"
                  ? <span style={{ ...styles.badge, background: "var(--gold-soft)", color: "#8A6D00" }}>Owing</span>
                  : <StatusBadge status={o.status} category={category} />}
              </div>
            </button>
          ))}
        </div>
      )}

      {invoiceOrder && <InvoiceModal order={invoiceOrder} biz={biz} category={category} persist={persist} notify={notify} onClose={() => setInvoiceOrder(null)} onEdit={() => startEdit(invoiceOrder)} onRefunded={setInvoiceOrder} />}
    </div>
  );
}

function InvoiceModal({ order, biz, category, persist, notify, onClose, onEdit, onRefunded }) {
  const branding = biz.profile.branding || {};
  const alreadyRefunded = order.refundedAmount || 0;
  const refundable = Math.max(0, order.total - alreadyRefunded);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState(String(refundable));
  const [refundNote, setRefundNote] = useState("");

  const shareReceipt = () => {
    const lines = [
      biz.profile.name,
      `Invoice #${order.id.slice(-6).toUpperCase()} — ${new Date(order.ts).toLocaleDateString()}`,
      `Bill to: ${order.customerName || `Walk-in ${category.customerNoun.toLowerCase()}`}`,
      "",
      ...order.items.map((it) => `${it.qty}× ${it.name} — ${currency(it.price * it.qty)}`),
      "",
      order.discountAmount > 0 ? `Discount: −${currency(order.discountAmount)}` : "",
      order.taxAmount > 0 ? `Tax (${order.taxRate}%): +${currency(order.taxAmount)}` : "",
      `Total: ${currency(order.total)}`,
      order.paymentStatus === "credit" ? "Status: Owing" : "",
      alreadyRefunded > 0 ? `Refunded: ${currency(alreadyRefunded)}` : "",
    ].filter(Boolean);
    shareText(`Receipt — ${biz.profile.name}`, lines.join("\n"));
  };

  // Refunding logs the amount as a "Refunds / returns" expense — which already flows into
  // every profit number everywhere (Reports, Accounting, Overview) — rather than editing the
  // sale's own total, so the original sale record stays accurate. Itemized, stock-tracked
  // sales also get the matching stock back, proportional to how much was refunded.
  const submitRefund = () => {
    const amt = Math.min(refundable, Math.max(0, Number(refundAmount) || 0));
    if (amt <= 0) return;
    const newRefundedAmount = alreadyRefunded + amt;
    const fraction = order.total > 0 ? amt / order.total : 0;
    let next = { ...biz };
    if (category.hasStock && !order.quickSale) {
      next = {
        ...next,
        items: next.items.map((it) => {
          const line = order.items.find((c) => c.itemId === it.id);
          if (!line || it.stock === undefined) return it;
          const qtyBack = Math.round(line.qty * fraction);
          return qtyBack > 0 ? { ...it, stock: it.stock + qtyBack } : it;
        }),
      };
    }
    const exp = {
      id: uid("exp"), category: "Refunds / returns", amount: amt,
      note: `Refund for ${order.customerName || "walk-in"} sale${refundNote.trim() ? " — " + refundNote.trim() : ""}`,
      branchId: order.branchId || biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
      ts: Date.now(), refundedOrderId: order.id,
    };
    const updatedOrder = { ...order, refundedAmount: newRefundedAmount };
    next = {
      ...next,
      expenses: [exp, ...next.expenses],
      orders: next.orders.map((o) => (o.id === order.id ? updatedOrder : o)),
    };
    next = notify(next, "refund", `Refunded ${currency(amt)}${newRefundedAmount >= order.total ? " (fully refunded)" : ""} for ${order.customerName || "walk-in"} sale`);
    persist(next);
    if (onRefunded) onRefunded(updatedOrder);
    setShowRefundForm(false);
    setRefundNote("");
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.invoiceHeader, borderBottomColor: branding.primaryColor || undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {branding.logo && <img src={branding.logo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />}
            <div>
              <div style={{ ...styles.invoiceBrand, color: branding.primaryColor || undefined }}>{biz.profile.name}</div>
              {(branding.address || biz.profile.location || biz.profile.phone) && (
                <div style={styles.invoiceMeta}>{[branding.address || biz.profile.location, biz.profile.phone].filter(Boolean).join(" · ")}</div>
              )}
              <div style={styles.invoiceMeta}>Invoice #{order.id.slice(-6).toUpperCase()}</div>
              <div style={styles.invoiceMeta}>{new Date(order.ts).toLocaleDateString()}</div>
            </div>
          </div>
          <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={styles.invoiceCustomer}>Bill to: {order.customerName || `Walk-in ${category.customerNoun.toLowerCase()}`}</div>
        <div style={styles.invoiceItems}>
          {order.items.map((it, idx) => (
            <div key={idx} style={styles.invoiceItemRow}>
              <span>{it.qty}× {it.name}</span>
              <span style={styles.mono}>{currency(it.price * it.qty)}</span>
            </div>
          ))}
        </div>
        {order.discountAmount > 0 && (
          <div style={styles.invoiceItemRow}>
            <span>Discount</span>
            <span style={styles.mono}>−{currency(order.discountAmount)}</span>
          </div>
        )}
        {order.taxAmount > 0 && (
          <div style={styles.invoiceItemRow}>
            <span>Tax ({order.taxRate}%)</span>
            <span style={styles.mono}>+{currency(order.taxAmount)}</span>
          </div>
        )}
        <div style={styles.invoiceTotalRow}>
          <span>Total</span>
          <span style={styles.mono}>{currency(order.total)}</span>
        </div>
        <div style={styles.invoiceStatus}>
          {order.paymentStatus === "credit"
            ? <span style={{ ...styles.badge, background: "var(--gold-soft)", color: "#8A6D00" }}>Owing</span>
            : <StatusBadge status={order.status} category={category} />}
          {order.paymentMethod && <span style={styles.invoicePaymentTag}>{order.paymentMethod}</span>}
          {alreadyRefunded > 0 && (
            <span style={{ ...styles.badge, background: "rgba(178,58,46,0.12)", color: "#B23A2E" }}>
              {refundable <= 0 ? "Refunded" : "Partially refunded"}
            </span>
          )}
        </div>
        {alreadyRefunded > 0 && (
          <div style={{ ...styles.listRowSub, marginBottom: 4 }}>{currency(alreadyRefunded)} refunded of {currency(order.total)}</div>
        )}
        {order.paymentNote && <div style={{ ...styles.listRowSub, marginBottom: 12 }}>{order.paymentNote}</div>}

        {showRefundForm && (
          <div style={{ ...styles.formCard, marginTop: 4 }}>
            <div style={styles.miniLabel}>Refund amount (up to {currency(refundable)})</div>
            <input style={styles.textInput} type="number" min="0" max={refundable} value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)} />
            <input style={styles.textInput} placeholder="Reason (optional)" value={refundNote} onChange={(e) => setRefundNote(e.target.value)} />
            <p style={{ ...styles.helperText, marginTop: -8 }}>
              Logged as a "Refunds / returns" expense{category.hasStock && !order.quickSale ? ", and the matching stock is added back." : "."}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.primaryBtnSmall} onClick={submitRefund}><Check size={16} /> Confirm refund</button>
              <button style={styles.smallAddBtn} onClick={() => setShowRefundForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...styles.printBtn, flex: 1 }} onClick={() => window.print()}>
            <Printer size={15} /> Print / save as PDF
          </button>
          <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }} onClick={shareReceipt}>
            <Share2 size={15} /> Share
          </button>
          {onEdit && (
            <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }} onClick={onEdit}>
              <Pencil size={15} /> Edit
            </button>
          )}
        </div>
        {refundable > 0 && !showRefundForm && (
          <button style={{ ...styles.printBtn, background: "none", border: "1px solid var(--line)", color: "#B23A2E" }}
            onClick={() => { setRefundAmount(String(refundable)); setShowRefundForm(true); }}>
            <TrendingDown size={15} /> Refund this sale
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   QUOTATIONS & ESTIMATES
   A formal price quote a customer can review before committing — the natural
   step before an order when someone asks "how much would X + Y cost?". A quote
   can later be converted straight into a real sale (with stock decremented and
   the customer recorded), so nothing has to be re-typed once they say yes.
   ========================================================= */
const QUOTE_STATUS_LABELS = { sent: "Sent", accepted: "Accepted", declined: "Declined", converted: "Converted to sale" };
function quoteIsExpired(q) {
  return q.status === "sent" && q.validUntil && Date.now() > q.validUntil;
}
function QuoteStatusBadge({ quote }) {
  const expired = quoteIsExpired(quote);
  const map = {
    sent: { bg: "var(--gold-soft)", fg: "#8A6D00" },
    accepted: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    declined: { bg: "rgba(178,58,46,0.12)", fg: "#B23A2E" },
    converted: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  };
  const s = map[quote.status] || map.sent;
  const label = expired ? "Expired" : QUOTE_STATUS_LABELS[quote.status] || quote.status;
  return <span style={{ ...styles.badge, background: expired ? "rgba(178,58,46,0.12)" : s.bg, color: expired ? "#B23A2E" : s.fg }}>{label}</span>;
}

function QuotesPanel({ biz, category, persist, notify, currentEmployee, isOwner }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [note, setNote] = useState("");
  const [viewingQuote, setViewingQuote] = useState(null);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState("Cash");

  const selectedUnit = biz.items.find((i) => i.id === selectedItemId)?.unit || "pcs";

  const addToCart = () => {
    const item = biz.items.find((i) => i.id === selectedItemId);
    if (!item) return;
    setCart([...cart, { itemId: item.id, name: item.name, price: item.price, category: item.category, unit: item.unit, qty: Number(qty) || 1 }]);
    setSelectedItemId("");
    setQty(1);
  };
  const addCustomLine = () => {
    if (!customName.trim() || !customPrice) return;
    setCart([...cart, { itemId: null, name: customName.trim(), price: Number(customPrice), unit: "pcs", qty: 1 }]);
    setCustomName("");
    setCustomPrice("");
  };
  const removeLine = (idx) => setCart(cart.filter((_, i) => i !== idx));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const taxRate = biz.settings?.taxRate || 0;
  const discountRate = subtotal >= (biz.settings?.discountThreshold || Infinity) ? (biz.settings?.discountRate || 0) : 0;
  const discountAmount = subtotal * (discountRate / 100);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = Math.round(subtotal - discountAmount + taxAmount);

  const branchQuotes = filterByBranch(biz.quotes || [], biz.settings?.activeBranchId).slice().sort((a, b) => b.ts - a.ts);

  const resetForm = () => {
    setCart([]); setCustomerName(""); setPhone(""); setValidDays("7"); setNote("");
    setCustomName(""); setCustomPrice(""); setShowForm(false);
  };

  const submitQuote = () => {
    if (cart.length === 0) return;
    const quote = {
      id: uid("quote"),
      code: `Q-${Date.now().toString().slice(-6)}`,
      items: cart,
      subtotal, discountAmount, taxAmount, taxRate, total,
      customerName: customerName.trim() || null,
      phone: phone.trim() || null,
      note: note.trim(),
      status: "sent",
      ts: Date.now(),
      validUntil: Date.now() + (Number(validDays) || 7) * 86400000,
      branchId: biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
      convertedOrderId: null,
    };
    let next = { ...biz, quotes: [quote, ...(biz.quotes || [])] };
    next = notify(next, "quote", `Quote ${quote.code} for ${currency(quote.total)} created${quote.customerName ? " for " + quote.customerName : ""}`);
    persist(next);
    setViewingQuote(quote);
    resetForm();
  };

  const setQuoteStatus = (quote, status) => {
    const next = { ...biz, quotes: biz.quotes.map((q) => q.id === quote.id ? { ...q, status } : q) };
    persist(next);
    setViewingQuote({ ...quote, status });
  };

  const deleteQuote = (quote) => {
    if (!window.confirm(`Delete quote ${quote.code}? This can't be undone.`)) return;
    persist({ ...biz, quotes: biz.quotes.filter((q) => q.id !== quote.id) });
    setViewingQuote(null);
  };

  // Converts an accepted/sent quote straight into a real sale — same effects a normal
  // order has (stock decremented, customer recorded), so nothing needs re-entering.
  const convertToSale = (quote) => {
    const order = {
      id: uid("ord"),
      items: quote.items,
      subtotal: quote.subtotal, discountAmount: quote.discountAmount, taxAmount: quote.taxAmount,
      taxRate: quote.taxRate, total: quote.total, quickSale: false,
      customerName: quote.customerName,
      paymentMethod: convertPaymentMethod,
      status: "paid",
      paymentStatus: convertPaymentMethod === "On credit" ? "credit" : "paid",
      employeeId: currentEmployee.id,
      branchId: quote.branchId || biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
      ts: Date.now(),
      fromQuoteId: quote.id,
    };
    let next = { ...biz, orders: [order, ...biz.orders] };
    if (category.hasStock) {
      next = {
        ...next,
        items: next.items.map((it) => {
          const line = quote.items.find((c) => c.itemId === it.id);
          if (line && it.stock !== undefined) return { ...it, stock: Math.max(0, it.stock - line.qty) };
          return it;
        }),
      };
    }
    if (quote.customerName) {
      const nameLower = quote.customerName.trim().toLowerCase();
      const existing = next.customers.find((c) => c.name.toLowerCase() === nameLower);
      next = existing
        ? { ...next, customers: next.customers.map((c) => c.id === existing.id ? { ...c, orders: c.orders + 1 } : c) }
        : { ...next, customers: [{ id: uid("cust"), name: quote.customerName.trim(), phone: quote.phone || "", orders: 1 }, ...next.customers] };
    }
    next = { ...next, quotes: next.quotes.map((q) => q.id === quote.id ? { ...q, status: "converted", convertedOrderId: order.id } : q) };
    next = notify(next, "payment", `Quote ${quote.code} converted to a sale — ${currency(order.total)}${quote.customerName ? " from " + quote.customerName : ""}`);
    persist(next);
    setViewingQuote({ ...quote, status: "converted", convertedOrderId: order.id });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <SectionTitle title="Quotes & Estimates" />
        {isOwner && (
          <button style={styles.addBtn} onClick={() => (showForm ? resetForm() : setShowForm(true))}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New quote</>}
          </button>
        )}
      </div>
      <p style={styles.helperText}>Give a customer a formal price before they commit — for existing {category.itemLabelPlural.toLowerCase()} or one-off lines like delivery. Convert it into a real sale the moment they say yes.</p>

      {showForm && (
        <div style={styles.formCard}>
          <div style={styles.formRow}>
            <select style={{ ...styles.textInputHalf, minWidth: 0 }} value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); setQty(1); }}>
              <option value="">Select {category.itemLabel.toLowerCase()}…</option>
              {itemsForBranch(biz.items, biz.settings?.activeBranchId).map((i) => (
                <option key={i.id} value={i.id}>{i.name} — {currency(i.price)}{category.hasStock && i.unit && i.unit !== "pcs" ? `/${i.unit}` : ""}</option>
              ))}
            </select>
            <input style={styles.qtyInput} type="number" min="0" step={selectedUnit !== "pcs" ? "any" : "1"}
              placeholder={selectedUnit !== "pcs" ? selectedUnit : ""} value={qty} onChange={(e) => setQty(e.target.value)} />
            <button style={styles.smallAddBtn} onClick={addToCart}>Add</button>
          </div>

          <div style={styles.miniLabel}>Or add a one-off line (e.g. delivery, installation)</div>
          <div style={styles.formRow}>
            <input style={styles.textInputHalf} placeholder="Description" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <input style={{ ...styles.textInputHalf, maxWidth: 110 }} type="number" placeholder="Price" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
            <button style={styles.smallAddBtn} onClick={addCustomLine}>Add</button>
          </div>

          {cart.length > 0 && (
            <div style={styles.cartBox}>
              {cart.map((c, idx) => (
                <div key={idx} style={styles.cartRow}>
                  <span>{c.qty} {c.unit && c.unit !== "pcs" ? c.unit : "×"} {c.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={styles.mono}>{currency(c.price * c.qty)}</span>
                    <button type="button" style={{ ...styles.iconBtn, padding: 0 }} onClick={() => removeLine(idx)}><X size={13} /></button>
                  </span>
                </div>
              ))}
              {discountAmount > 0 && (
                <div style={styles.cartRow}><span>Discount ({biz.settings.discountRate}%)</span><span style={styles.mono}>−{currency(discountAmount)}</span></div>
              )}
              {taxAmount > 0 && (
                <div style={styles.cartRow}><span>Tax ({taxRate}%)</span><span style={styles.mono}>+{currency(taxAmount)}</span></div>
              )}
              <div style={styles.cartTotalRow}><span>Total</span><span style={styles.mono}>{currency(total)}</span></div>
            </div>
          )}

          <input style={styles.textInput} placeholder={`${category.customerNoun} name (optional)`}
            value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input style={styles.textInput} placeholder="Phone number (optional)"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div style={styles.formRow}>
            <div style={{ flex: 1 }}>
              <div style={styles.miniLabel}>Valid for (days)</div>
              <input style={styles.textInputHalf} type="number" min="1" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
            </div>
          </div>
          <textarea style={styles.textArea} rows={2} placeholder="Note for the customer (optional)"
            value={note} onChange={(e) => setNote(e.target.value)} />

          <button style={{ ...styles.primaryBtnSmall, opacity: cart.length ? 1 : 0.4 }} disabled={!cart.length} onClick={submitQuote}>
            <Check size={16} /> Save quote
          </button>
        </div>
      )}

      {branchQuotes.length === 0 ? (
        <EmptyState text="No quotes yet — create one above when a customer asks for a price before committing." icon={ClipboardList} />
      ) : (
        <div style={styles.list}>
          {branchQuotes.map((q) => (
            <button key={q.id} className="lift-card" style={styles.listRowClickable} onClick={() => { setViewingQuote(q); setConvertPaymentMethod("Cash"); }}>
              <div>
                <div style={styles.listRowTitle}>{q.code} — {q.customerName || "No name given"}</div>
                <div style={styles.listRowSub}>
                  {q.items.map((i) => i.name).join(", ")} · {new Date(q.ts).toLocaleDateString()}
                </div>
              </div>
              <div style={styles.listRowRight}>
                <div style={styles.mono}>{currency(q.total)}</div>
                <QuoteStatusBadge quote={q} />
              </div>
            </button>
          ))}
        </div>
      )}

      {viewingQuote && (
        <div style={styles.modalOverlay} onClick={() => setViewingQuote(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.invoiceHeader}>
              <div>
                <div style={styles.invoiceBrand}>{biz.profile.name}</div>
                <div style={styles.invoiceMeta}>Quotation {viewingQuote.code}</div>
                <div style={styles.invoiceMeta}>{new Date(viewingQuote.ts).toLocaleDateString()} · valid until {new Date(viewingQuote.validUntil).toLocaleDateString()}</div>
              </div>
              <button style={styles.iconBtn} onClick={() => setViewingQuote(null)}><X size={18} /></button>
            </div>
            <div style={styles.invoiceCustomer}>For: {viewingQuote.customerName || `Unnamed ${category.customerNoun.toLowerCase()}`}{viewingQuote.phone ? ` · ${viewingQuote.phone}` : ""}</div>
            <div style={styles.invoiceItems}>
              {viewingQuote.items.map((it, idx) => (
                <div key={idx} style={styles.invoiceItemRow}>
                  <span>{it.qty}× {it.name}</span>
                  <span style={styles.mono}>{currency(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
            {viewingQuote.discountAmount > 0 && (
              <div style={styles.invoiceItemRow}><span>Discount</span><span style={styles.mono}>−{currency(viewingQuote.discountAmount)}</span></div>
            )}
            {viewingQuote.taxAmount > 0 && (
              <div style={styles.invoiceItemRow}><span>Tax ({viewingQuote.taxRate}%)</span><span style={styles.mono}>+{currency(viewingQuote.taxAmount)}</span></div>
            )}
            <div style={styles.invoiceTotalRow}><span>Total</span><span style={styles.mono}>{currency(viewingQuote.total)}</span></div>
            {viewingQuote.note && <p style={{ ...styles.helperText, marginTop: 10 }}>{viewingQuote.note}</p>}
            <div style={styles.invoiceStatus}><QuoteStatusBadge quote={viewingQuote} /></div>

            {viewingQuote.status !== "converted" && viewingQuote.status !== "declined" && (
              <div style={{ ...styles.formCard, marginTop: 12, marginBottom: 0 }}>
                <div style={styles.miniLabel}>Convert to a real sale</div>
                <div style={styles.paymentMethodRow}>
                  {["Cash", "On credit"].map((m) => (
                    <button key={m} style={{ ...styles.paymentChip, ...(convertPaymentMethod === m ? styles.paymentChipActive : {}) }} onClick={() => setConvertPaymentMethod(m)}>{m}</button>
                  ))}
                </div>
                <button style={styles.primaryBtnSmall} onClick={() => convertToSale(viewingQuote)}>
                  <Check size={16} /> Convert to sale
                </button>
              </div>
            )}

            {viewingQuote.status === "converted" && (
              <Callout icon={Check} tone="info">This quote has been converted to a sale.</Callout>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{ ...styles.printBtn, flex: 1 }} onClick={() => window.print()}>
                <Printer size={15} /> Print / save as PDF
              </button>
              <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }}
                onClick={() => shareText(`Quote ${viewingQuote.code}`, [
                  biz.profile.name, `Quotation ${viewingQuote.code}`, `Valid until ${new Date(viewingQuote.validUntil).toLocaleDateString()}`, "",
                  ...viewingQuote.items.map((it) => `${it.qty}× ${it.name} — ${currency(it.price * it.qty)}`), "",
                  `Total: ${currency(viewingQuote.total)}`,
                ].join("\n"))}>
                <Share2 size={15} /> Share
              </button>
            </div>
            {viewingQuote.status === "sent" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }} onClick={() => setQuoteStatus(viewingQuote, "accepted")}>Mark accepted</button>
                <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }} onClick={() => setQuoteStatus(viewingQuote, "declined")}>Mark declined</button>
              </div>
            )}
            {viewingQuote.status !== "converted" && (
              <button style={{ ...styles.logoutBtn, marginTop: 8 }} onClick={() => deleteQuote(viewingQuote)}><Trash2 size={15} /> Delete quote</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CUSTOMERS
   ========================================================= */
function CustomersPanel({ biz, category, persist, isOwner, setTab }) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [expandedId, setExpandedId] = useState(null);

  const stats = (cust) => {
    const orders = biz.orders.filter((o) => (o.customerName || "").trim().toLowerCase() === cust.name.trim().toLowerCase());
    const totalSpent = orders.filter((o) => o.paymentStatus !== "credit" || o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
    const lastOrder = orders.length ? Math.max(...orders.map((o) => o.ts)) : null;
    return { totalSpent, lastOrder, orderCount: orders.length };
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ name: "", phone: "" });
    setShowForm((s) => !s);
  };
  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || "" });
    setShowForm(true);
  };
  const saveCustomer = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      persist({ ...biz, customers: biz.customers.map((c) => c.id === editingId ? { ...c, name: form.name.trim(), phone: form.phone.trim() } : c) });
    } else {
      const exists = biz.customers.some((c) => c.name.trim().toLowerCase() === form.name.trim().toLowerCase());
      if (exists) { setShowForm(false); return; }
      persist({ ...biz, customers: [{ id: uid("cust"), name: form.name.trim(), phone: form.phone.trim(), orders: 0 }, ...biz.customers] });
    }
    setEditingId(null);
    setForm({ name: "", phone: "" });
    setShowForm(false);
  };
  const removeCustomer = (id) => {
    const cust = biz.customers.find((c) => c.id === id);
    if (!window.confirm(`Remove ${cust?.name || "this " + category.customerNoun.toLowerCase()}? This can't be undone.`)) return;
    persist({ ...biz, customers: biz.customers.filter((c) => c.id !== id) });
  };

  const shareCustomerNote = (c) => {
    const { totalSpent, orderCount } = stats(c);
    const lines = [
      `${biz.profile.name}`,
      `Hi ${c.name}, thanks for being a valued customer!`,
      orderCount ? `You've made ${orderCount} ${category.orderNoun.toLowerCase()}${orderCount !== 1 ? "s" : ""} with us, totalling ${currency(totalSpent)}.` : "",
    ].filter(Boolean);
    shareText(`Message for ${c.name}`, lines.join("\n"));
  };

  const filtered = biz.customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title={category.customerNounPlural} />
        {isOwner && (
          <button style={styles.addBtn} onClick={startAdd}>
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <input style={styles.textInput} placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input style={styles.textInput} placeholder="Phone number (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <button style={styles.primaryBtnSmall} onClick={saveCustomer}>
            <Check size={16} /> {editingId ? "Save changes" : "Save customer"}
          </button>
        </div>
      )}

      {biz.customers.length === 0 ? (
        <EmptyState text={`${category.customerNounPlural} are added automatically when you take ${article(category.orderNoun)} ${category.orderNoun.toLowerCase()} with their name, or add one manually above.`} icon={Users} />
      ) : (
        <>
          {biz.customers.length > 4 && (
            <div style={styles.searchWrap}>
              <SearchIcon size={15} color="var(--ink-faint)" />
              <input style={styles.searchInput} placeholder={`Search ${category.customerNounPlural.toLowerCase()}…`}
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <div style={styles.list}>
            {filtered.map((c) => {
              const { totalSpent, lastOrder, orderCount } = stats(c);
              const isExpanded = expandedId === c.id;
              return (
                <div key={c.id} style={styles.listRow}>
                  <button type="button" style={{ all: "unset", cursor: "pointer", flex: 1 }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                    <div style={styles.listRowTitle}>{c.name}</div>
                    <div style={styles.listRowSub}>
                      {orderCount} {category.orderNoun.toLowerCase()}{orderCount !== 1 ? "s" : ""}
                      {totalSpent > 0 ? ` · ${currency(totalSpent)} spent` : ""}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {lastOrder && <div style={styles.staffDetailLine}>Last {category.orderNoun.toLowerCase()}: {new Date(lastOrder).toLocaleDateString()}</div>}
                        {!c.phone && <div style={styles.staffDetailLine}>No phone number on file</div>}
                      </div>
                    )}
                  </button>
                  {isOwner && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {c.phone && (
                        <button style={styles.iconBtn} title="Share a message" onClick={() => shareCustomerNote(c)}><Share2 size={15} /></button>
                      )}
                      <button style={styles.iconBtn} title="Edit" onClick={() => startEdit(c)}><Pencil size={15} /></button>
                      <button style={styles.iconBtn} title="Remove" onClick={() => removeCustomer(c.id)}><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   EMPLOYEES (owner only)
   ========================================================= */
function BackRow({ onBack, label }) {
  return (
    <button style={styles.backRow} onClick={onBack}>
      <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> {label}
    </button>
  );
}

function EmployeesPanel({ biz, category, persist, setTab, currentEmployee }) {
  const isViewerOwner = currentEmployee?.role === "owner" || currentEmployee?.role === "full";
  const isViewerManager = currentEmployee?.role === "manager";
  const blankForm = {
    name: "", position: "", role: "sales", permissions: [], editPermissions: [], hourlyRate: "", branchId: "",
    phone: "", email: "", age: "", address: "", idNumber: "", startDate: "", emergencyName: "", emergencyPhone: "",
    status: "fulltime", salary: "", bankAccount: "", target: "", performanceNotes: "",
  };

  const [showForm, setShowForm] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null); // employee whose details are being edited
  const [expandedId, setExpandedId] = useState(null); // employee whose details are being viewed
  const [editingPayId, setEditingPayId] = useState(null);
  const [hoursInput, setHoursInput] = useState("");
  const [payFormId, setPayFormId] = useState(null); // employee id whose "add pay record" form is open
  const [payForm, setPayForm] = useState({ type: "salary", amount: "", note: "", date: new Date().toISOString().slice(0, 10) });

  const seatLimit = seatLimitFor(biz);
  const atLimit = biz.employees.length >= seatLimit;
  const hasBranches = (biz.branches || []).length > 1;

  // A manager only sees people in their own branch (plus themself); staff can't reach this panel at all.
  const visibleEmployees = isViewerManager
    ? biz.employees.filter((e) => e.branchId === currentEmployee.branchId || e.id === currentEmployee.id)
    : biz.employees;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startAdd = () => {
    setForm({ ...blankForm, branchId: isViewerManager ? (currentEmployee.branchId || "") : "" });
    setEditingId(null);
    setShowForm((s) => !s);
  };

  const startEdit = (emp) => {
    setForm({
      name: emp.name, position: emp.position || "", role: emp.role, permissions: emp.permissions || [], editPermissions: emp.editPermissions || [], hourlyRate: String(emp.hourlyRate || ""), branchId: emp.branchId || "",
      phone: emp.phone || "", email: emp.email || "", age: emp.age || "", address: emp.address || "", idNumber: emp.idNumber || "",
      startDate: emp.startDate || "", emergencyName: emp.emergencyName || "", emergencyPhone: emp.emergencyPhone || "",
      status: emp.status || "fulltime", salary: String(emp.salary || ""), bankAccount: emp.bankAccount || "",
      target: emp.target || "", performanceNotes: emp.performanceNotes || "",
    });
    setEditingId(emp.id);
    setShowForm(true);
    setShowMoreFields(true);
  };

  const togglePermission = (moduleId) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(moduleId) ? f.permissions.filter((p) => p !== moduleId) : [...f.permissions, moduleId],
      // Revoking view access for a module also revokes edit access to it — edit never
      // makes sense without view.
      editPermissions: f.permissions.includes(moduleId) ? f.editPermissions.filter((p) => p !== moduleId) : f.editPermissions,
    }));
  };
  const toggleEditPermission = (moduleId) => {
    setForm((f) => ({
      ...f,
      editPermissions: f.editPermissions.includes(moduleId) ? f.editPermissions.filter((p) => p !== moduleId) : [...f.editPermissions, moduleId],
    }));
  };

  const saveEmployee = () => {
    if (!form.name.trim()) return;
    const editingEmp = editingId ? biz.employees.find((e) => e.id === editingId) : null;
    const isOwnerRecord = editingEmp?.pin === "0000";
    const role = isOwnerRecord ? "owner" : (isViewerManager ? "sales" : form.role); // owner's own account can't be reassigned; managers can only bring on staff-level people
    const branchId = isOwnerRecord ? null : (isViewerManager ? currentEmployee.branchId : (form.branchId || null));
    const sharedFields = {
      name: form.name.trim(), position: form.position.trim(), role, branchId,
      permissions: role === "custom" ? form.permissions : [],
      editPermissions: role === "custom" ? form.editPermissions : [],
      hourlyRate: Number(form.hourlyRate) || 0,
      phone: form.phone.trim(), email: form.email.trim(), age: form.age, address: form.address.trim(),
      idNumber: form.idNumber.trim(),
      emergencyName: form.emergencyName.trim(), emergencyPhone: form.emergencyPhone.trim(),
      status: form.status, salary: Number(form.salary) || 0, bankAccount: form.bankAccount.trim(),
      target: form.target.trim(), performanceNotes: form.performanceNotes.trim(),
    };
    if (editingId) {
      persist({
        ...biz,
        employees: biz.employees.map((e) => e.id === editingId ? { ...e, ...sharedFields, startDate: form.startDate } : e),
      });
    } else {
      if (atLimit) return;
      const emp = {
        id: uid("emp"), ...sharedFields,
        pin: role === "record" ? null : String(Math.floor(1000 + Math.random() * 9000)),
        hoursThisMonth: 0, startDate: form.startDate || new Date().toISOString().slice(0, 10),
        attendanceLog: [], payRecords: [],
      };
      persist({ ...biz, employees: [...biz.employees, emp] });
    }
    setForm(blankForm);
    setEditingId(null);
    setShowForm(false);
    setShowMoreFields(false);
  };

  const removeEmployee = (id) => {
    const emp = biz.employees.find((e) => e.id === id);
    if (!window.confirm(`Remove ${emp?.name || "this person"}? Their PIN will stop working and this can't be undone.`)) return;
    persist({ ...biz, employees: biz.employees.filter((e) => e.id !== id) });
  };

  const todayISO = new Date().toISOString().slice(0, 10);
  const currentMonthKey = todayISO.slice(0, 7);
  const attendanceThisMonth = (emp) => (emp.attendanceLog || []).filter((d) => d.startsWith(currentMonthKey)).length;
  const markAttendance = (emp) => {
    const log = emp.attendanceLog || [];
    if (log.includes(todayISO)) return; // already marked today
    persist({ ...biz, employees: biz.employees.map((e) => e.id === emp.id ? { ...e, attendanceLog: [...log, todayISO] } : e) });
  };

  const openPayForm = (emp) => {
    setPayFormId(payFormId === emp.id ? null : emp.id);
    setPayForm({ type: "salary", amount: "", note: "", date: todayISO });
  };
  const savePayRecord = (emp) => {
    if (!payForm.amount) return;
    const rec = { id: uid("pay"), type: payForm.type, amount: Number(payForm.amount) || 0, note: payForm.note.trim(), date: payForm.date };
    let next = { ...biz, employees: biz.employees.map((e) => e.id === emp.id ? { ...e, payRecords: [rec, ...(e.payRecords || [])] } : e) };
    // Money actually paid out (salary, wage, or a loan given to staff) also lands in Expenses,
    // so it's counted alongside rent/restocking/etc. when totalling what's going out of the business.
    // (Loan repayments are money coming back IN, so they don't get an expense entry.)
    if (rec.type === "salary" || rec.type === "wage" || rec.type === "loan") {
      const expenseCategory = rec.type === "loan" ? "Staff loans / advances" : "Salaries & wages";
      const exp = {
        id: uid("exp"), category: expenseCategory, amount: rec.amount,
        note: `${emp.name}${rec.note ? " — " + rec.note : ""}`,
        branchId: emp.branchId || biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
        ts: new Date(rec.date + "T12:00:00").getTime(), payrollRecordId: rec.id, employeeId: emp.id,
      };
      next = { ...next, expenses: [exp, ...next.expenses] };
    }
    persist(next);
    setPayFormId(null);
  };
  const outstandingLoans = (emp) => {
    const recs = emp.payRecords || [];
    const loaned = recs.filter((r) => r.type === "loan").reduce((s, r) => s + r.amount, 0);
    const repaid = recs.filter((r) => r.type === "loan_repayment").reduce((s, r) => s + r.amount, 0);
    return loaned - repaid;
  };
  const STATUS_LABEL = { fulltime: "Full-time", parttime: "Part-time", probation: "Probation" };

  const canRemove = (e) => {
    if (e.id === currentEmployee?.id) return false;
    if (isViewerOwner) return e.role !== "owner";
    if (isViewerManager) return e.role === "sales" && e.branchId === currentEmployee.branchId;
    return false;
  };
  const canEdit = (e) => {
    if (isViewerOwner) return true;
    if (isViewerManager) return e.role === "sales" && e.branchId === currentEmployee.branchId;
    return false;
  };

  const saveHours = (id) => {
    persist({ ...biz, employees: biz.employees.map((e) => e.id === id ? { ...e, hoursThisMonth: Number(hoursInput) || 0 } : e) });
    setEditingPayId(null);
    setHoursInput("");
  };

  const onOfferLetterFile = async (emp, ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("That file is quite large (over 3MB). Please attach a smaller PDF or image so it saves reliably.");
      ev.target.value = "";
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    persist({ ...biz, employees: biz.employees.map((e) => e.id === emp.id ? { ...e, offerLetterUrl: dataUrl, offerLetterName: file.name } : e) });
    ev.target.value = "";
  };
  const removeOfferLetter = (emp) => {
    persist({ ...biz, employees: biz.employees.map((e) => e.id === emp.id ? { ...e, offerLetterUrl: null, offerLetterName: null } : e) });
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title="Staff & HR" />
        <button style={{ ...styles.addBtn, opacity: atLimit ? 0.5 : 1 }} onClick={() => !atLimit && startAdd()} disabled={atLimit}>
          <Plus size={16} /> Add
        </button>
      </div>

      <div style={styles.statGrid}>
        <StatCard label="Staff" value={biz.employees.length} />
        <StatCard label="On payroll" value={biz.employees.filter((e) => (e.salary || 0) > 0 || (e.hourlyRate || 0) > 0).length} />
        <StatCard label="Monthly payroll" value={currency(biz.employees.reduce((s, e) => s + (e.salary || 0) + (e.hourlyRate || 0) * (e.hoursThisMonth || 0), 0))} />
        <StatCard label="Loans outstanding" value={currency(biz.employees.reduce((s, e) => s + outstandingLoans(e), 0))} />
      </div>

      <Callout icon={ShieldCheck} tone="info">
        Add someone as a record only (no login), or give them system access: {category.staffRoleLabel.toLowerCase()}-level, Manager, Custom (pick exactly which parts they can see), or Full access.
        {hasBranches && " Assign someone to a branch and their app locks to that branch — their sales are tagged and reported to you automatically."}
      </Callout>

      <div style={styles.seatMeter}>
        <span>{biz.employees.length} of {seatLimit === Infinity ? "unlimited" : seatLimit} staff accounts used</span>
      </div>

      {atLimit && !editingId && (
        <Callout icon={Lock} tone="warn">
          Your plan is registered for {seatLimit} {seatLimit === 1 ? "person" : "people"}. Upgrade your plan to add more staff accounts.
        </Callout>
      )}

      {showForm && (!atLimit || editingId) && (
        <div style={styles.formCard}>
          <div style={styles.staffFormSectionLabel}>Employee record</div>
          <input style={styles.textInput} placeholder="Full name" value={form.name} onChange={setField("name")} />
          <input style={styles.textInput} placeholder="Position / job title (e.g. Cashier, Cook, Sales rep)" value={form.position} onChange={setField("position")} />
          <select style={styles.textInput} value={form.status} onChange={setField("status")}>
            <option value="fulltime">Full-time</option>
            <option value="parttime">Part-time</option>
            <option value="probation">Probation</option>
          </select>
          {hasBranches && !isViewerManager && biz.employees.find((e) => e.id === editingId)?.pin !== "0000" && (
            <select style={styles.textInput} value={form.branchId} onChange={setField("branchId")}>
              <option value="">All branches (not tied to one)</option>
              {biz.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input style={styles.textInput} type="number" placeholder="Monthly salary, MWK (optional)"
            value={form.salary} onChange={setField("salary")} />
          <input style={styles.textInput} type="number" placeholder="Hourly rate, MWK (optional, for payroll)"
            value={form.hourlyRate} onChange={setField("hourlyRate")} />
          <input style={styles.textInput} placeholder="Bank account number / details" value={form.bankAccount} onChange={setField("bankAccount")} />
          <input style={styles.textInput} placeholder="Target (e.g. 50 sales/month)" value={form.target} onChange={setField("target")} />
          <textarea style={{ ...styles.textInput, minHeight: 60 }} placeholder="Performance notes"
            value={form.performanceNotes} onChange={setField("performanceNotes")} />

          <button type="button" style={styles.textLinkBtn} onClick={() => setShowMoreFields((s) => !s)}>
            {showMoreFields ? "Hide" : "Add"} more details (phone, age, address, ID, emergency contact)
          </button>

          {showMoreFields && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 10 }}>
              <input style={styles.textInput} placeholder="Phone number" value={form.phone} onChange={setField("phone")} />
              <input style={styles.textInput} type="email" placeholder="Email address" value={form.email} onChange={setField("email")} />
              <input style={styles.textInput} type="number" placeholder="Age" value={form.age} onChange={setField("age")} />
              <input style={styles.textInput} placeholder="Home address" value={form.address} onChange={setField("address")} />
              <input style={styles.textInput} placeholder="National ID / passport number" value={form.idNumber} onChange={setField("idNumber")} />
              <label style={styles.listRowSub}>Start date</label>
              <input style={{ ...styles.textInput, marginTop: 6 }} type="date" value={form.startDate} onChange={setField("startDate")} />
              <input style={styles.textInput} placeholder="Emergency contact name" value={form.emergencyName} onChange={setField("emergencyName")} />
              <input style={styles.textInput} placeholder="Emergency contact phone" value={form.emergencyPhone} onChange={setField("emergencyPhone")} />
            </div>
          )}

          {!isViewerManager && (
            <>
              <div style={{ ...styles.staffFormSectionLabel, marginTop: 14 }}>System access</div>
              {biz.employees.find((e) => e.id === editingId)?.pin === "0000" ? (
                <div style={styles.helperText}>This is the Owner account — it always has full access to everything and every branch, and can't be changed to another access level or locked to one branch here.</div>
              ) : (
              <>
              <div style={styles.helperText}>Choose whether this person can log into the app, and how much they can see.</div>
              <select style={styles.textInput} value={form.role} onChange={setField("role")}>
                <option value="record">No system access — records only, they don't log in</option>
                <option value="sales">{category.staffRoleLabel} (basic — sales, {category.customerNounPlural.toLowerCase()}, own stats)</option>
                <option value="manager">Manager (own branch — reports, accounting, documents, HR)</option>
                <option value="custom">Custom — pick exactly what they can see</option>
                <option value="full">Full access (acts on your behalf, every branch)</option>
              </select>
              </>
              )}

              {form.role === "custom" && (
                <div style={styles.permissionGrid}>
                  <p style={{ ...styles.helperText, marginBottom: 4, marginTop: 0 }}>Tick a module to let them see it. Tick "Can edit/delete" as well if they should also be able to add, change, or remove things there — otherwise it's view-only.</p>
                  {ACCESS_MODULES.map((m) => {
                    const canView = form.permissions.includes(m.id);
                    return (
                      <div key={m.id} style={styles.permissionRow}>
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, cursor: "pointer" }}>
                          <input type="checkbox" checked={canView} onChange={() => togglePermission(m.id)} />
                          <div>
                            <div style={styles.listRowTitle}>{m.label}</div>
                            <div style={styles.listRowSub}>{m.desc}</div>
                          </div>
                        </label>
                        {canView && (
                          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, marginLeft: 24, cursor: "pointer" }}>
                            <input type="checkbox" checked={form.editPermissions.includes(m.id)} onChange={() => toggleEditPermission(m.id)} />
                            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Can edit/delete (not just view)</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <button style={styles.primaryBtnSmall} onClick={saveEmployee}>
            <Check size={16} /> {editingId ? "Save changes" : "Add employee"}
          </button>
        </div>
      )}

      <div style={styles.list}>
        {visibleEmployees.map((e) => (
          <div key={e.id} style={styles.listRow}>
            <div style={{ flex: 1 }}>
              <button type="button" style={styles.staffRowHeader} onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                <div>
                  <div style={styles.listRowTitle}>{e.name}{e.position ? ` · ${e.position}` : ""}{isEmployeeLocked(biz, e.id) ? <span style={{ color: "#B23A2E", fontWeight: 700 }}> · Locked</span> : ""}</div>
                  <div style={styles.listRowSub}>
                    {roleLabel(e.role, category)}{e.pin ? ` · PIN ${e.pin}` : ""} · {STATUS_LABEL[e.status || "fulltime"]}
                    {hasBranches && e.branchId && ` · ${biz.branches.find((b) => b.id === e.branchId)?.name || ""}`}
                  </div>
                </div>
                <ChevronRight size={15} color="var(--ink-faint)" style={{ transform: expandedId === e.id ? "rotate(90deg)" : "none" }} />
              </button>

              {expandedId === e.id && (
                <div style={styles.staffDetails}>
                  {e.salary > 0 && <div style={styles.staffDetailLine}>Salary: {currency(e.salary)}/month</div>}
                  {e.bankAccount && <div style={styles.staffDetailLine}>Bank account: {e.bankAccount}</div>}
                  {e.target && <div style={styles.staffDetailLine}>Target: {e.target}</div>}
                  {e.performanceNotes && <div style={styles.staffDetailLine}>Performance: {e.performanceNotes}</div>}
                  {e.role === "custom" && (
                    <div style={styles.staffDetailLine}>
                      Access: {(e.permissions || []).length ? e.permissions.map((p) => ACCESS_MODULES.find((m) => m.id === p)?.label || p).join(", ") : "None granted yet"}
                    </div>
                  )}
                  {e.phone && <div style={styles.staffDetailLine}>Phone: {e.phone}</div>}
                  {e.email && <div style={styles.staffDetailLine}>Email: {e.email}</div>}
                  {e.age && <div style={styles.staffDetailLine}>Age: {e.age}</div>}
                  {e.address && <div style={styles.staffDetailLine}>Address: {e.address}</div>}
                  {e.idNumber && <div style={styles.staffDetailLine}>ID number: {e.idNumber}</div>}
                  {e.startDate && <div style={styles.staffDetailLine}>Started: {e.startDate}</div>}
                  {(e.emergencyName || e.emergencyPhone) && (
                    <div style={styles.staffDetailLine}>Emergency contact: {[e.emergencyName, e.emergencyPhone].filter(Boolean).join(" · ")}</div>
                  )}

                  <div style={styles.staffDetailLine}>
                    Offer letter: {e.offerLetterUrl ? (
                      <>
                        <a href={e.offerLetterUrl} download={e.offerLetterName || "offer-letter"} style={styles.textLinkBtn}>{e.offerLetterName || "View"}</a>
                        {canEdit(e) && <button type="button" style={styles.textLinkBtn} onClick={() => removeOfferLetter(e)}>Remove</button>}
                      </>
                    ) : canEdit(e) ? (
                      <label style={{ ...styles.textLinkBtn, cursor: "pointer" }}>
                        Attach offer letter
                        <input type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={(ev) => onOfferLetterFile(e, ev)} />
                      </label>
                    ) : "Not attached"}
                  </div>

                  <div style={styles.staffDetailLine}>
                    Attendance this month: {attendanceThisMonth(e)} day{attendanceThisMonth(e) === 1 ? "" : "s"}
                    {(e.attendanceLog || []).includes(todayISO)
                      ? <span style={{ marginLeft: 8, color: "var(--ink-faint)" }}>· marked present today</span>
                      : <button type="button" style={styles.textLinkBtn} onClick={() => markAttendance(e)}>Mark present today</button>}
                  </div>

                  <div style={styles.staffDetailLine}>
                    Loans outstanding: {currency(outstandingLoans(e))}
                    <button type="button" style={styles.textLinkBtn} onClick={() => openPayForm(e)}>
                      {payFormId === e.id ? "Cancel" : "Add salary / wage / loan record"}
                    </button>
                  </div>
                  {payFormId === e.id && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "6px 0 10px" }}>
                      <select style={styles.textInput} value={payForm.type} onChange={(ev) => setPayForm((f) => ({ ...f, type: ev.target.value }))}>
                        <option value="salary">Salary payment</option>
                        <option value="wage">Wage payment</option>
                        <option value="loan">Loan given</option>
                        <option value="loan_repayment">Loan repayment</option>
                      </select>
                      <input style={styles.textInput} type="number" placeholder="Amount, MWK" value={payForm.amount}
                        onChange={(ev) => setPayForm((f) => ({ ...f, amount: ev.target.value }))} />
                      <input style={styles.textInput} type="date" value={payForm.date}
                        onChange={(ev) => setPayForm((f) => ({ ...f, date: ev.target.value }))} />
                      <input style={styles.textInput} placeholder="Note (optional)" value={payForm.note}
                        onChange={(ev) => setPayForm((f) => ({ ...f, note: ev.target.value }))} />
                      <button style={styles.smallAddBtn} onClick={() => savePayRecord(e)}>Save record</button>
                    </div>
                  )}
                  {(e.payRecords || []).slice(0, 5).map((r) => (
                    <div key={r.id} style={styles.staffDetailLine}>
                      {r.date} · {({ salary: "Salary", wage: "Wage", loan: "Loan given", loan_repayment: "Loan repaid" })[r.type]} · {currency(r.amount)}
                      {r.note ? ` · ${r.note}` : ""}
                    </div>
                  ))}

                  {canEdit(e) && (
                    <button type="button" style={styles.textLinkBtn} onClick={() => startEdit(e)}>Edit details</button>
                  )}
                </div>
              )}

              {e.hourlyRate > 0 && (
                editingPayId === e.id ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input style={styles.payHoursInput} type="number" placeholder="Hours this month"
                      value={hoursInput} onChange={(ev) => setHoursInput(ev.target.value)} autoFocus />
                    <button style={styles.smallAddBtn} onClick={() => saveHours(e.id)}>Save</button>
                  </div>
                ) : (
                  <button style={styles.payrollLine} onClick={() => { setEditingPayId(e.id); setHoursInput(String(e.hoursThisMonth || "")); }}>
                    {currency(e.hourlyRate)}/hr · {e.hoursThisMonth || 0} hrs this month = {currency(e.hourlyRate * (e.hoursThisMonth || 0))}
                  </button>
                )
              )}
            </div>
            {canRemove(e) && (
              <button style={styles.iconBtn} onClick={() => removeEmployee(e.id)}><Trash2 size={15} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   BRANCHES (owner only)
   ========================================================= */
function BranchesPanel({ biz, category, persist, setTab, currentEmployee }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignForm, setAssignForm] = useState({ employeeId: "", idNumber: "", email: "", password: "" });
  const isOwner = currentEmployee?.role === "owner";
  const branchLimit = branchLimitFor(biz);
  const atBranchLimit = biz.branches.length >= branchLimit;

  const startAdd = () => {
    if (atBranchLimit) return;
    setEditingId(null);
    setName(""); setLocation(""); setPhone("");
    setShowForm((s) => !s);
  };

  const startEdit = (branch) => {
    setEditingId(branch.id);
    setName(branch.name); setLocation(branch.location || ""); setPhone(branch.phone || "");
    setShowForm(true);
  };

  const saveBranch = () => {
    if (!name.trim()) return;
    if (editingId) {
      persist({ ...biz, branches: biz.branches.map((b) => b.id === editingId ? { ...b, name: name.trim(), location: location.trim(), phone: phone.trim() } : b) });
    } else {
      if (atBranchLimit) return;
      const branch = { id: uid("branch"), name: name.trim(), location: location.trim(), phone: phone.trim() };
      persist({ ...biz, branches: [...biz.branches, branch] });
    }
    setEditingId(null);
    setName(""); setLocation(""); setPhone(""); setShowForm(false);
  };

  const removeBranch = (id) => {
    if (biz.branches.length <= 1) return;
    const branch = biz.branches.find((b) => b.id === id);
    if (!window.confirm(`Remove ${branch?.name || "this branch"}? Its past sales and expenses stay on record, but the branch itself can't be brought back.`)) return;
    const next = { ...biz, branches: biz.branches.filter((b) => b.id !== id) };
    if (biz.settings?.activeBranchId === id) {
      next.settings = { ...biz.settings, activeBranchId: null };
    }
    persist(next);
  };

  const switchToBranch = (id) => {
    persist({ ...biz, settings: { ...biz.settings, activeBranchId: id } });
  };

  const startAssign = (branch) => {
    setAssigningId(branch.id);
    const emp = biz.employees.find((e) => e.id === branch.assignedEmployeeId);
    setAssignForm({ employeeId: emp?.id || "", idNumber: emp?.idNumber || "", email: emp?.email || "", password: "" });
  };

  const saveAssignment = (branch) => {
    if (!assignForm.employeeId || !assignForm.password.trim()) return;
    const next = {
      ...biz,
      // Picking someone here now also ties them to this branch directly —
      // no need to separately set their branch under Staff & HR first.
      employees: biz.employees.map((e) => e.id === assignForm.employeeId
        ? { ...e, branchId: branch.id, idNumber: assignForm.idNumber.trim(), email: assignForm.email.trim(), branchPassword: assignForm.password.trim() }
        : e),
      branches: biz.branches.map((b) => b.id === branch.id ? { ...b, assignedEmployeeId: assignForm.employeeId } : b),
    };
    persist(next);
    setAssigningId(null);
    setAssignForm({ employeeId: "", idNumber: "", email: "", password: "" });
  };

  const removeAssignment = (branch) => {
    const next = {
      ...biz,
      employees: biz.employees.map((e) => e.id === branch.assignedEmployeeId ? { ...e, branchPassword: null } : e),
      branches: biz.branches.map((b) => b.id === branch.id ? { ...b, assignedEmployeeId: null } : b),
    };
    persist(next);
  };

  const now = new Date();
  const performance = biz.branches.map((b) => {
    const orders = biz.orders.filter((o) => o.branchId === b.id);
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.ts);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const expenses = biz.expenses.filter((e) => e.branchId === b.id);
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.ts);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const revenue = monthOrders.reduce((s, o) => s + o.total, 0);
    const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const staffCount = biz.employees.filter((e) => e.branchId === b.id).length;
    return { branch: b, revenue, spent, net: revenue - spent, orderCount: monthOrders.length, staffCount };
  });

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title="Branches" />
        <button style={{ ...styles.addBtn, opacity: atBranchLimit ? 0.5 : 1 }} onClick={startAdd} disabled={atBranchLimit}>
          <Plus size={16} /> Add branch
        </button>
      </div>
      <p style={styles.helperText}>Add a branch for every location. Switch between them from the top of the screen to record sales and expenses separately, or view "All branches" to see everything combined. Once you have 2 or more, you can assign staff to a specific branch under Staff & HR.</p>
      {atBranchLimit && (
        <Callout icon={Wallet}>
          You're using all {branchLimit} branch{branchLimit !== 1 ? "es" : ""} on your plan. Add more in Packages & billing.
        </Callout>
      )}

      {showForm && (
        <div style={styles.formCard}>
          <input style={styles.textInput} placeholder="Branch name (e.g. Lilongwe branch)"
            value={name} onChange={(e) => setName(e.target.value)} />
          <input style={styles.textInput} placeholder="Location / town (optional)"
            value={location} onChange={(e) => setLocation(e.target.value)} />
          <input style={styles.textInput} placeholder="Phone (optional)"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button style={styles.primaryBtnSmall} onClick={saveBranch}>
            <Check size={16} /> {editingId ? "Save changes" : "Save branch"}
          </button>
        </div>
      )}

      <SectionTitle title="This month, by branch" small />
      <div style={styles.list}>
        {performance.map(({ branch, revenue, spent, net, orderCount, staffCount }) => {
          const isActive = biz.settings?.activeBranchId === branch.id;
          const controller = branch.assignedEmployeeId ? biz.employees.find((e) => e.id === branch.assignedEmployeeId) : null;
          return (
          <div key={branch.id} style={styles.formCard}>
            <div style={styles.panelHeader}>
              <div style={styles.listRowTitle}>{branch.name}{isActive ? " (active)" : ""}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {!isActive && (
                  <button style={styles.smallAddBtn} onClick={() => switchToBranch(branch.id)}>Switch here</button>
                )}
                <button style={styles.iconBtn} onClick={() => startEdit(branch)} title="Edit branch"><Pencil size={15} /></button>
                {biz.branches.length > 1 && (
                  <button style={styles.iconBtn} onClick={() => removeBranch(branch.id)} title="Remove branch"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
            {branch.location && <div style={styles.listRowSub}>{branch.location}{branch.phone ? ` · ${branch.phone}` : ""}</div>}
            <div style={styles.statGrid}>
              <StatCard label="Revenue" value={currency(revenue)} />
              <StatCard label="Expenses" value={currency(spent)} />
              <StatCard label="Net" value={currency(net)} />
              <StatCard label={category.orderNounPlural} value={orderCount} />
              <StatCard label="Staff" value={staffCount} />
            </div>

            {isOwner && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                {controller ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={styles.listRowSub}>🔒 Locked to <strong style={{ color: "var(--ink)" }}>{controller.name}</strong> — only they can edit this branch's expenses. You can still view everything.</div>
                    <button style={styles.smallAddBtn} onClick={() => removeAssignment(branch)}>Remove access</button>
                  </div>
                ) : assigningId === branch.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={styles.listRowSub}>Give one staff member exclusive control of this branch. You'll still be able to view its data, but only they can edit it.</div>
                    <select style={styles.textInput} value={assignForm.employeeId} onChange={(e) => setAssignForm((f) => ({ ...f, employeeId: e.target.value }))}>
                      <option value="">Select staff member…</option>
                      {biz.employees.filter((e) => e.pin !== "0000").map((e) => <option key={e.id} value={e.id}>{e.name}{e.position ? ` (${e.position})` : ""}{e.branchId && e.branchId !== branch.id ? " — currently at another branch" : ""}</option>)}
                    </select>
                    {biz.employees.filter((e) => e.pin !== "0000").length === 0 && <div style={styles.listRowSub}>No staff added yet — add someone first under Staff &amp; HR.</div>}
                    <input style={styles.textInput} placeholder="ID number" value={assignForm.idNumber} onChange={(e) => setAssignForm((f) => ({ ...f, idNumber: e.target.value }))} />
                    <input style={styles.textInput} type="email" placeholder="Email address" value={assignForm.email} onChange={(e) => setAssignForm((f) => ({ ...f, email: e.target.value }))} />
                    <input style={styles.textInput} type="password" placeholder="Set a password" value={assignForm.password} onChange={(e) => setAssignForm((f) => ({ ...f, password: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={styles.primaryBtnSmall} onClick={() => saveAssignment(branch)}><Check size={16} /> Give access</button>
                      <button style={styles.smallAddBtn} onClick={() => setAssigningId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button style={styles.smallAddBtn} onClick={() => startAssign(branch)}>Assign branch access</button>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   EXPENSES (owner only)
   ========================================================= */
function ExpensesPanel({ biz, category: bizCategory, persist, setTab, currentEmployee, canEdit = true }) {
  const expenseCategoryOptions = expenseCategoriesFor(bizCategory?.id);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(expenseCategoryOptions[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(toDateInputValue(new Date()));
  const [showRecurring, setShowRecurring] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ category: expenseCategoryOptions[0], amount: "", dayOfMonth: "1", note: "" });
  const today = new Date();

  const branchExpenses = filterByBranch(biz.expenses, biz.settings?.activeBranchId);
  const recurringExpenses = biz.recurringExpenses || [];

  const activeBranch = biz.branches?.find((b) => b.id === biz.settings?.activeBranchId);
  const isLocked = !!(activeBranch?.assignedEmployeeId && activeBranch.assignedEmployeeId !== currentEmployee?.id);
  const lockedByName = isLocked ? biz.employees.find((e) => e.id === activeBranch.assignedEmployeeId)?.name : null;

  const addExpense = () => {
    if (isLocked || !canEdit) return;
    if (!amount || Number(amount) <= 0) return;
    const ts = new Date((expenseDate || toDateInputValue(new Date())) + "T12:00:00").getTime();
    const exp = { id: uid("exp"), category, amount: Number(amount), note: note.trim(), branchId: biz.settings?.activeBranchId || biz.branches?.[0]?.id || null, ts };
    persist({ ...biz, expenses: [exp, ...biz.expenses] });
    setAmount(""); setNote(""); setExpenseDate(toDateInputValue(new Date())); setShowForm(false);
  };

  const removeExpense = (id) => {
    if (isLocked || !canEdit) return;
    if (!window.confirm("Remove this expense? This can't be undone.")) return;
    persist({ ...biz, expenses: biz.expenses.filter((e) => e.id !== id) });
  };

  // Recurring expense templates — auto-logged once per month by the effect in the main
  // App component (see recurringCheckedRef there). This panel just creates/edits/removes them.
  const addRecurring = () => {
    if (isLocked || !canEdit) return;
    if (!recurringForm.amount || Number(recurringForm.amount) <= 0) return;
    const rec = {
      id: uid("rec"), category: recurringForm.category, amount: Number(recurringForm.amount),
      dayOfMonth: Math.min(28, Math.max(1, Number(recurringForm.dayOfMonth) || 1)),
      note: recurringForm.note.trim(), branchId: biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
      active: true, lastLoggedMonth: null,
    };
    persist({ ...biz, recurringExpenses: [rec, ...recurringExpenses] });
    setRecurringForm({ category: expenseCategoryOptions[0], amount: "", dayOfMonth: "1", note: "" });
    setShowRecurringForm(false);
  };
  const toggleRecurringActive = (id) => {
    persist({ ...biz, recurringExpenses: recurringExpenses.map((r) => r.id === id ? { ...r, active: !r.active } : r) });
  };
  const removeRecurring = (id) => {
    if (!window.confirm("Remove this recurring expense? It won't be logged automatically anymore.")) return;
    persist({ ...biz, recurringExpenses: recurringExpenses.filter((r) => r.id !== id) });
  };

  const now = new Date();
  const thisMonthExpenses = branchExpenses.filter((e) => {
    const d = new Date(e.ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const damagesThisMonth = thisMonthExpenses.filter((e) => e.category === "Damages / loss").reduce((s, e) => s + e.amount, 0);

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title="Expenses" />
        {!isLocked && canEdit && (
          <button style={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {isLocked && (
        <div style={styles.helperBanner}>
          🔒 This branch's expenses are locked to {lockedByName || "its assigned staff member"}. You can view them here, but only that person can add or remove entries.
        </div>
      )}

      {!isLocked && !canEdit && (
        <div style={styles.helperBanner}>
          You have view-only access to expenses — ask the owner for edit access if you need to add or remove entries.
        </div>
      )}

      <div style={styles.statGrid}>
        <StatCard label="Spent this month" value={currency(totalThisMonth)} />
        {bizCategory?.id !== "property" && <StatCard label="Damages / loss" value={currency(damagesThisMonth)} />}
      </div>

      {showForm && !isLocked && canEdit && (
        <div style={styles.formCard}>
          <select style={styles.textInput} value={category} onChange={(e) => setCategory(e.target.value)}>
            {expenseCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input style={styles.textInput} type="number" placeholder="Amount (MWK)"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
          <label style={styles.listRowSub}>Date</label>
          <input style={{ ...styles.textInput, marginTop: 6 }} type="date" value={expenseDate} max={toDateInputValue(today)}
            onChange={(e) => e.target.value && setExpenseDate(e.target.value)} />
          <p style={styles.helperText}>Defaults to today — change this to log an expense from an earlier date.</p>
          <input style={styles.textInput} placeholder="Note (optional)"
            value={note} onChange={(e) => setNote(e.target.value)} />
          <button style={styles.primaryBtnSmall} onClick={addExpense}><Check size={16} /> Save expense</button>
        </div>
      )}

      {branchExpenses.length === 0 ? (
        <EmptyState text="Log money going out — restocking, rent, damages, or anything else — to see accurate profit." icon={TrendingDown} />
      ) : (
        <div style={styles.list}>
          {branchExpenses.map((e) => (
            <div key={e.id} style={styles.listRow}>
              <div>
                <div style={styles.listRowTitle}>{e.category}</div>
                <div style={styles.listRowSub}>{e.note ? `${e.note} · ` : ""}{new Date(e.ts).toLocaleDateString()}{e.payrollRecordId ? " · via Staff & HR" : ""}{e.recurringId ? " · recurring" : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={styles.mono}>−{currency(e.amount)}</span>
                {!e.payrollRecordId && !isLocked && canEdit && <button style={styles.iconBtn} onClick={() => removeExpense(e.id)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLocked && canEdit && (
        <>
          <button type="button" style={{ ...styles.textLinkBtn, marginTop: 16 }} onClick={() => setShowRecurring((s) => !s)}>
            {showRecurring ? "Hide" : "Manage"} recurring expenses ({recurringExpenses.length})
          </button>

          {showRecurring && (
            <div style={{ marginTop: 12 }}>
              <p style={styles.helperText}>Rent, subscriptions, anything that repeats — set it up once and it logs itself automatically on the day you choose each month, the next time the app is opened on or after that date.</p>

              {recurringExpenses.length > 0 && (
                <div style={styles.list}>
                  {recurringExpenses.map((r) => (
                    <div key={r.id} style={{ ...styles.listRow, opacity: r.active ? 1 : 0.55 }}>
                      <div>
                        <div style={styles.listRowTitle}>{r.category}</div>
                        <div style={styles.listRowSub}>{currency(r.amount)}/month · day {r.dayOfMonth}{r.note ? ` · ${r.note}` : ""}{!r.active ? " · paused" : ""}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button style={styles.smallAddBtn} onClick={() => toggleRecurringActive(r.id)}>{r.active ? "Pause" : "Resume"}</button>
                        <button style={styles.iconBtn} onClick={() => removeRecurring(r.id)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showRecurringForm ? (
                <button style={{ ...styles.smallAddBtn, marginTop: 10 }} onClick={() => setShowRecurringForm(true)}>+ Add recurring expense</button>
              ) : (
                <div style={{ ...styles.formCard, marginTop: 10 }}>
                  <select style={styles.textInput} value={recurringForm.category} onChange={(e) => setRecurringForm((f) => ({ ...f, category: e.target.value }))}>
                    {expenseCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={styles.formRow}>
                    <input style={styles.textInputHalf} type="number" placeholder="Amount/month (MWK)" value={recurringForm.amount}
                      onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))} />
                    <input style={{ ...styles.textInputHalf, maxWidth: 100 }} type="number" min="1" max="28" placeholder="Day" value={recurringForm.dayOfMonth}
                      onChange={(e) => setRecurringForm((f) => ({ ...f, dayOfMonth: e.target.value }))} />
                  </div>
                  <input style={styles.textInput} placeholder="Note (optional)" value={recurringForm.note}
                    onChange={(e) => setRecurringForm((f) => ({ ...f, note: e.target.value }))} />
                  <button style={styles.primaryBtnSmall} onClick={addRecurring}><Check size={16} /> Save recurring expense</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =========================================================
   SUPPLIERS
   A formal supplier record — contact info, what you buy from them, and a running
   total spent — built on top of the restocking log that already exists. Restocks
   can optionally be tied to a supplierId (see ItemsPanel); this panel is where
   that spend adds up.
   ========================================================= */
function SuppliersPanel({ biz, category, persist, setTab }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", suppliesWhat: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [query, setQuery] = useState("");

  const suppliers = biz.suppliers || [];
  const restocks = biz.restocks || [];

  const statsFor = (supplier) => {
    // Matches restocks linked by supplierId, plus older restocks that only ever
    // had a free-text supplier name matching this one (before Suppliers existed).
    const matching = restocks.filter((r) => r.supplierId === supplier.id
      || (!r.supplierId && r.supplier && r.supplier.trim().toLowerCase() === supplier.name.trim().toLowerCase()));
    const totalSpent = matching.reduce((s, r) => s + r.totalCost, 0);
    const lastRestock = matching.length ? Math.max(...matching.map((r) => r.ts)) : null;
    return { totalSpent, lastRestock, restockCount: matching.length };
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", address: "", suppliesWhat: "" });
    setShowForm((s) => !s);
  };
  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", suppliesWhat: s.suppliesWhat || "" });
    setShowForm(true);
  };
  const saveSupplier = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      persist({ ...biz, suppliers: suppliers.map((s) => s.id === editingId ? { ...s, ...form, name: form.name.trim() } : s) });
    } else {
      const supplier = { id: uid("sup"), name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), suppliesWhat: form.suppliesWhat.trim(), ts: Date.now() };
      persist({ ...biz, suppliers: [supplier, ...suppliers] });
    }
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", address: "", suppliesWhat: "" });
    setShowForm(false);
  };
  const removeSupplier = (id) => {
    const s = suppliers.find((x) => x.id === id);
    if (!window.confirm(`Remove ${s?.name || "this supplier"}? Their restocking history stays on record, but the contact can't be brought back.`)) return;
    persist({ ...biz, suppliers: suppliers.filter((s) => s.id !== id) });
  };

  const contactSupplier = (s) => {
    shareText(`Message for ${s.name}`, `Hi ${s.name}, this is ${biz.profile.name}. `);
  };

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  const totalSpentAllSuppliers = suppliers.reduce((sum, s) => sum + statsFor(s).totalSpent, 0);

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title="Suppliers" />
        <button style={styles.addBtn} onClick={startAdd}>
          <Plus size={16} /> Add
        </button>
      </div>
      <p style={styles.helperText}>Keep contact details for who you buy stock from, and see how much you've spent with each one over time — pulled automatically from your Restocking log.</p>

      <div style={styles.statGrid}>
        <StatCard label="Suppliers" value={suppliers.length} />
        <StatCard label="Total spent (all time)" value={currency(totalSpentAllSuppliers)} />
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <input style={styles.textInput} placeholder="Supplier / business name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input style={styles.textInput} placeholder="Phone number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <input style={styles.textInput} type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input style={styles.textInput} placeholder="Address / location (optional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <input style={styles.textInput} placeholder="What you buy from them (e.g. rice, cooking oil)" value={form.suppliesWhat} onChange={(e) => setForm((f) => ({ ...f, suppliesWhat: e.target.value }))} />
          <button style={styles.primaryBtnSmall} onClick={saveSupplier}>
            <Check size={16} /> {editingId ? "Save changes" : "Save supplier"}
          </button>
        </div>
      )}

      {suppliers.length === 0 ? (
        <EmptyState text="Add a supplier here, then pick them next time you restock an item — their running total builds up automatically." icon={Truck} />
      ) : (
        <>
          {suppliers.length > 4 && (
            <div style={styles.searchWrap}>
              <SearchIcon size={15} color="var(--ink-faint)" />
              <input style={styles.searchInput} placeholder="Search suppliers…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <div style={styles.list}>
            {filtered.map((s) => {
              const { totalSpent, lastRestock, restockCount } = statsFor(s);
              const isExpanded = expandedId === s.id;
              return (
                <div key={s.id} style={styles.listRow}>
                  <button type="button" style={{ all: "unset", cursor: "pointer", flex: 1 }} onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                    <div style={styles.listRowTitle}>{s.name}</div>
                    <div style={styles.listRowSub}>
                      {restockCount} restock{restockCount !== 1 ? "s" : ""}{totalSpent > 0 ? ` · ${currency(totalSpent)} spent` : ""}{s.suppliesWhat ? ` · ${s.suppliesWhat}` : ""}
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {s.phone && <div style={styles.staffDetailLine}>Phone: {s.phone}</div>}
                        {s.email && <div style={styles.staffDetailLine}>Email: {s.email}</div>}
                        {s.address && <div style={styles.staffDetailLine}>Address: {s.address}</div>}
                        {lastRestock && <div style={styles.staffDetailLine}>Last restock: {new Date(lastRestock).toLocaleDateString()}</div>}
                        {!restockCount && <div style={styles.staffDetailLine}>No restocks logged with this supplier yet.</div>}
                      </div>
                    )}
                  </button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {s.phone && <button style={styles.iconBtn} title="Message" onClick={() => contactSupplier(s)}><MessageCircle size={15} /></button>}
                    <button style={styles.iconBtn} title="Edit" onClick={() => startEdit(s)}><Pencil size={15} /></button>
                    <button style={styles.iconBtn} title="Remove" onClick={() => removeSupplier(s.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   PURCHASE ORDERS
   The buying-side mirror of Quotes & Estimates: a formal order sent to a supplier
   before goods arrive, built from the Suppliers list. "Mark received" turns it into
   real stock + a logged expense in one step — the same effect a manual restock has,
   just started from an order instead of typed in after the fact.
   ========================================================= */
const PO_STATUS_LABELS = { sent: "Sent", received: "Received", cancelled: "Cancelled" };
function POStatusBadge({ po }) {
  const map = {
    sent: { bg: "var(--gold-soft)", fg: "#8A6D00" },
    received: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    cancelled: { bg: "rgba(178,58,46,0.12)", fg: "#B23A2E" },
  };
  const s = map[po.status] || map.sent;
  return <span style={{ ...styles.badge, background: s.bg, color: s.fg }}>{PO_STATUS_LABELS[po.status] || po.status}</span>;
}

function PurchaseOrdersPanel({ biz, category, persist, notify, setTab }) {
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [costPerUnit, setCostPerUnit] = useState("");
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customCost, setCustomCost] = useState("");
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState("");
  const [viewingPO, setViewingPO] = useState(null);

  const suppliers = biz.suppliers || [];
  const purchaseOrders = biz.purchaseOrders || [];
  const branchPOs = filterByBranch(purchaseOrders, biz.settings?.activeBranchId).slice().sort((a, b) => b.ts - a.ts);

  const selectedItem = biz.items.find((i) => i.id === selectedItemId);

  const addToCart = () => {
    if (!selectedItem || !costPerUnit) return;
    setCart([...cart, { itemId: selectedItem.id, name: selectedItem.name, qty: Number(qty) || 1, unit: selectedItem.unit || "pcs", costPerUnit: Number(costPerUnit) || 0 }]);
    setSelectedItemId(""); setQty(1); setCostPerUnit("");
  };
  const addCustomLine = () => {
    if (!customName.trim() || !customCost) return;
    setCart([...cart, { itemId: null, name: customName.trim(), qty: Number(customQty) || 1, unit: "pcs", costPerUnit: Number(customCost) || 0 }]);
    setCustomName(""); setCustomQty(1); setCustomCost("");
  };
  const removeLine = (idx) => setCart(cart.filter((_, i) => i !== idx));

  const total = cart.reduce((s, c) => s + c.costPerUnit * c.qty, 0);

  const resetForm = () => {
    setSupplierId(""); setCart([]); setNote(""); setShowForm(false);
  };

  const submitPO = () => {
    if (!supplierId || cart.length === 0) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    const po = {
      id: uid("po"), code: `PO-${Date.now().toString().slice(-6)}`,
      supplierId, supplierName: supplier?.name || null,
      items: cart, total, note: note.trim(), status: "sent", ts: Date.now(),
      branchId: biz.settings?.activeBranchId || biz.branches?.[0]?.id || null,
    };
    let next = { ...biz, purchaseOrders: [po, ...purchaseOrders] };
    next = notify(next, "purchase", `Purchase order ${po.code} created for ${supplier?.name || "a supplier"} — ${currency(total)}`);
    persist(next);
    setViewingPO(po);
    resetForm();
  };

  const shareLinesFor = (po) => [
    biz.profile.name, `Purchase Order ${po.code}`, `To: ${po.supplierName || "Supplier"}`, "",
    ...po.items.map((l) => `${l.qty} ${l.unit !== "pcs" ? l.unit : "×"} ${l.name} @ ${currency(l.costPerUnit)}`), "",
    `Total: ${currency(po.total)}`, po.note ? `Note: ${po.note}` : "",
  ].filter(Boolean);

  const cancelPO = (po) => {
    persist({ ...biz, purchaseOrders: purchaseOrders.map((p) => p.id === po.id ? { ...p, status: "cancelled" } : p) });
    setViewingPO({ ...po, status: "cancelled" });
  };
  const deletePO = (po) => {
    if (!window.confirm(`Delete purchase order ${po.code}? This can't be undone.`)) return;
    persist({ ...biz, purchaseOrders: purchaseOrders.filter((p) => p.id !== po.id) });
    setViewingPO(null);
  };

  // Turns the order into real stock + a logged expense in one step — the same
  // effect a manual restock has (see ItemsPanel), just kicked off from a PO.
  const receivePO = (po) => {
    let next = { ...biz };
    let stockLinesCost = 0;
    next = {
      ...next,
      items: next.items.map((it) => {
        const line = po.items.find((l) => l.itemId === it.id);
        if (!line) return it;
        stockLinesCost += line.costPerUnit * line.qty;
        return { ...it, stock: (it.stock || 0) + line.qty, cost: line.costPerUnit };
      }),
    };
    const restockRecords = po.items.filter((l) => l.itemId).map((l) => ({
      id: uid("restock"), itemId: l.itemId, itemName: l.name, qty: l.qty, unit: l.unit || "pcs",
      costPerUnit: l.costPerUnit, totalCost: l.costPerUnit * l.qty,
      supplier: po.supplierName, supplierId: po.supplierId,
      sellPriceAtTime: (next.items.find((i) => i.id === l.itemId) || {}).price || 0,
      ts: Date.now(), branchId: po.branchId, poId: po.id,
    }));
    const customLinesCost = po.items.filter((l) => !l.itemId).reduce((s, l) => s + l.costPerUnit * l.qty, 0);
    const totalCost = stockLinesCost + customLinesCost;
    next = { ...next, restocks: [...restockRecords, ...(next.restocks || [])] };
    const exp = {
      id: uid("exp"), category: "Restocking / buying stock", amount: totalCost,
      note: `Purchase order ${po.code}${po.supplierName ? " from " + po.supplierName : ""}`,
      branchId: po.branchId, ts: Date.now(), poId: po.id,
    };
    next = { ...next, expenses: [exp, ...next.expenses] };
    next = { ...next, purchaseOrders: next.purchaseOrders.map((p) => p.id === po.id ? { ...p, status: "received", receivedAt: Date.now() } : p) };
    next = notify(next, "stock", `Purchase order ${po.code} received — ${currency(totalCost)} added to stock and expenses`);
    persist(next);
    setViewingPO({ ...po, status: "received" });
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title="Purchase Orders" />
        {suppliers.length > 0 && (
          <button style={styles.addBtn} onClick={() => (showForm ? resetForm() : setShowForm(true))}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New order</>}
          </button>
        )}
      </div>
      <p style={styles.helperText}>Send a formal order to a supplier before goods arrive, then mark it received to add the stock and log the cost in one step.</p>

      {suppliers.length === 0 ? (
        <Callout icon={Truck} tone="warn">
          Add a supplier first, then come back here to send them an order.
          <button style={styles.calloutLink} onClick={() => setTab("suppliers")}>Go to Suppliers</button>
        </Callout>
      ) : showForm && (
        <div style={styles.formCard}>
          <select style={styles.textInput} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div style={styles.formRow}>
            <select style={{ ...styles.textInputHalf, minWidth: 0 }} value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); setCostPerUnit(biz.items.find((i) => i.id === e.target.value)?.cost ? String(biz.items.find((i) => i.id === e.target.value).cost) : ""); }}>
              <option value="">Select {category.itemLabel.toLowerCase()}…</option>
              {biz.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input style={styles.qtyInput} type="number" min="0" step="any" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div style={styles.formRow}>
            <input style={styles.textInputHalf} type="number" placeholder="Cost per unit (MWK)" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
            <button style={styles.smallAddBtn} onClick={addToCart}>Add</button>
          </div>

          <div style={styles.miniLabel}>Or add a one-off line (e.g. packaging, transport)</div>
          <div style={styles.formRow}>
            <input style={styles.textInputHalf} placeholder="Description" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <input style={{ ...styles.textInputHalf, maxWidth: 70 }} type="number" placeholder="Qty" value={customQty} onChange={(e) => setCustomQty(e.target.value)} />
            <input style={{ ...styles.textInputHalf, maxWidth: 110 }} type="number" placeholder="Cost" value={customCost} onChange={(e) => setCustomCost(e.target.value)} />
            <button style={styles.smallAddBtn} onClick={addCustomLine}>Add</button>
          </div>

          {cart.length > 0 && (
            <div style={styles.cartBox}>
              {cart.map((c, idx) => (
                <div key={idx} style={styles.cartRow}>
                  <span>{c.qty} {c.unit !== "pcs" ? c.unit : "×"} {c.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={styles.mono}>{currency(c.costPerUnit * c.qty)}</span>
                    <button type="button" style={{ ...styles.iconBtn, padding: 0 }} onClick={() => removeLine(idx)}><X size={13} /></button>
                  </span>
                </div>
              ))}
              <div style={styles.cartTotalRow}><span>Total</span><span style={styles.mono}>{currency(total)}</span></div>
            </div>
          )}

          <textarea style={styles.textArea} rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

          <button style={{ ...styles.primaryBtnSmall, opacity: (supplierId && cart.length) ? 1 : 0.4 }} disabled={!supplierId || !cart.length} onClick={submitPO}>
            <Check size={16} /> Save purchase order
          </button>
        </div>
      )}

      {branchPOs.length === 0 ? (
        <EmptyState text="No purchase orders yet." icon={PackageCheck} />
      ) : (
        <div style={styles.list}>
          {branchPOs.map((po) => (
            <button key={po.id} className="lift-card" style={styles.listRowClickable} onClick={() => setViewingPO(po)}>
              <div>
                <div style={styles.listRowTitle}>{po.code} — {po.supplierName || "Unknown supplier"}</div>
                <div style={styles.listRowSub}>{po.items.map((l) => l.name).join(", ")} · {new Date(po.ts).toLocaleDateString()}</div>
              </div>
              <div style={styles.listRowRight}>
                <div style={styles.mono}>{currency(po.total)}</div>
                <POStatusBadge po={po} />
              </div>
            </button>
          ))}
        </div>
      )}

      {viewingPO && (
        <div style={styles.modalOverlay} onClick={() => setViewingPO(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.invoiceHeader}>
              <div>
                <div style={styles.invoiceBrand}>{biz.profile.name}</div>
                <div style={styles.invoiceMeta}>Purchase Order {viewingPO.code}</div>
                <div style={styles.invoiceMeta}>To: {viewingPO.supplierName || "Unknown supplier"} · {new Date(viewingPO.ts).toLocaleDateString()}</div>
              </div>
              <button style={styles.iconBtn} onClick={() => setViewingPO(null)}><X size={18} /></button>
            </div>
            <div style={styles.invoiceItems}>
              {viewingPO.items.map((l, idx) => (
                <div key={idx} style={styles.invoiceItemRow}>
                  <span>{l.qty} {l.unit !== "pcs" ? l.unit : "×"} {l.name}</span>
                  <span style={styles.mono}>{currency(l.costPerUnit * l.qty)}</span>
                </div>
              ))}
            </div>
            <div style={styles.invoiceTotalRow}><span>Total</span><span style={styles.mono}>{currency(viewingPO.total)}</span></div>
            {viewingPO.note && <p style={{ ...styles.helperText, marginTop: 10 }}>{viewingPO.note}</p>}
            <div style={styles.invoiceStatus}><POStatusBadge po={viewingPO} /></div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{ ...styles.printBtn, flex: 1 }} onClick={() => window.print()}><Printer size={15} /> Print</button>
              <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }}
                onClick={() => shareText(`Purchase Order ${viewingPO.code}`, shareLinesFor(viewingPO).join("\n"))}>
                <Share2 size={15} /> Share
              </button>
            </div>

            {viewingPO.status === "sent" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={styles.primaryBtnSmall} onClick={() => receivePO(viewingPO)}><PackageCheck size={16} /> Mark received</button>
                <button style={{ ...styles.printBtn, flex: 1, background: "none", border: "1px solid var(--line)", color: "var(--ink)", marginTop: 0 }} onClick={() => cancelPO(viewingPO)}>Cancel order</button>
              </div>
            )}
            {viewingPO.status === "received" && (
              <Callout icon={Check} tone="info">Stock and expenses have been updated from this order.</Callout>
            )}
            {viewingPO.status !== "received" && (
              <button style={{ ...styles.logoutBtn, marginTop: 8 }} onClick={() => deletePO(viewingPO)}><Trash2 size={15} /> Delete order</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DAILY ACTIVITY (calendar-style log, owner only)
   ========================================================= */
function isSameDay(ts, dateObj) {
  const d = new Date(ts);
  return d.getFullYear() === dateObj.getFullYear() && d.getMonth() === dateObj.getMonth() && d.getDate() === dateObj.getDate();
}
function toDateInputValue(d) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
// Monday-start week boundaries for a given date.
function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function endOfWeek(d) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
function inRange(ts, start, end) {
  return ts >= start.getTime() && ts <= end.getTime();
}
// Summarizes orders + expenses for a business (optionally branch-filtered) within [start,end].
function periodSummary(biz, start, end) {
  const orders = filterByBranch(biz.orders, biz.settings?.activeBranchId).filter((o) => inRange(o.ts, start, end));
  const expenses = filterByBranch(biz.expenses || [], biz.settings?.activeBranchId).filter((e) => inRange(e.ts, start, end));
  return {
    orders, expenses,
    revenue: orders.reduce((s, o) => s + o.total, 0),
    spent: expenses.reduce((s, e) => s + e.amount, 0),
  };
}
// Start/end of the Nth period back from now, for a given granularity — offset 0 is the
// current (in-progress) period, 1 is the one before that, and so on. Used to build the
// growth trend on the dashboard: revenue this period vs the same period before it.
function periodBoundsFor(kind, offset) {
  const now = new Date();
  if (kind === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - offset * 7);
    return [startOfWeek(d), endOfWeek(d)];
  }
  if (kind === "month" || kind === "all") {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)];
  }
  // "today" — a day back per offset
  const d = new Date(now);
  d.setDate(d.getDate() - offset);
  return [new Date(d.getFullYear(), d.getMonth(), d.getDate()), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)];
}
// Percent change from a previous value to a current one. null when there's nothing to
// compare against (previous period had zero revenue) — shown as "New" rather than a number.
function percentChange(current, previous) {
  if (!previous) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function ActivityPanel({ biz, category, setTab }) {
  const [view, setView] = useState("daily"); // daily | weekly | monthly
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const isToday = isSameDay(selectedDate.getTime(), today);
  const isYesterday = isSameDay(selectedDate.getTime(), yesterday);

  const dayOrders = filterByBranch(biz.orders, biz.settings?.activeBranchId).filter((o) => isSameDay(o.ts, selectedDate));
  const dayExpenses = filterByBranch(biz.expenses || [], biz.settings?.activeBranchId).filter((e) => isSameDay(e.ts, selectedDate));
  const revenue = dayOrders.reduce((s, o) => s + o.total, 0);
  const spent = dayExpenses.reduce((s, e) => s + e.amount, 0);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const isThisWeek = inRange(today.getTime(), weekStart, weekEnd);
  const week = periodSummary(biz, weekStart, weekEnd);
  // Per-day breakdown within the selected week, so daily records visibly "accumulate" into the week.
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const s = periodSummary(biz, d, new Date(new Date(d).setHours(23, 59, 59, 999)));
    return { date: d, ...s };
  });

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
  const isThisMonth = today.getFullYear() === selectedDate.getFullYear() && today.getMonth() === selectedDate.getMonth();
  const month = periodSummary(biz, monthStart, monthEnd);
  // Per-week breakdown within the selected month, so weekly totals visibly "accumulate" into the month.
  const monthWeeks = [];
  { let cursor = startOfWeek(monthStart);
    while (cursor <= monthEnd) {
      const wEnd = endOfWeek(cursor);
      const clampedStart = cursor < monthStart ? monthStart : cursor;
      const clampedEnd = wEnd > monthEnd ? monthEnd : wEnd;
      monthWeeks.push({ start: cursor, end: wEnd, ...periodSummary(biz, clampedStart, clampedEnd) });
      cursor = new Date(wEnd); cursor.setDate(cursor.getDate() + 1);
    }
  }

  const shiftDay = (delta) => { const d = new Date(selectedDate); d.setDate(d.getDate() + delta); setSelectedDate(d); };
  const shiftWeek = (delta) => { const d = new Date(selectedDate); d.setDate(d.getDate() + delta * 7); setSelectedDate(d); };
  const shiftMonth = (delta) => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + delta); setSelectedDate(d); };

  const fmtShort = (d) => d.toLocaleDateString("default", { month: "short", day: "numeric" });

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Activity" />
      <p style={styles.helperText}>Every sale and expense is logged automatically — daily records roll up into weekly, and weekly into monthly.</p>

      <div style={styles.segmentedRow}>
        {[["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([id, label]) => (
          <button key={id} style={{ ...styles.segmentBtn, ...(view === id ? styles.segmentBtnActive : {}) }} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

      {view === "daily" && (
        <>
          <div style={styles.dateNavRow}>
            <button style={styles.dateNavArrow} onClick={() => shiftDay(-1)}>‹</button>
            <div style={styles.dateNavCenter}>
              <div style={styles.dateNavLabel}>
                {isToday ? "Today" : isYesterday ? "Yesterday" : selectedDate.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}
              </div>
              <input type="date" style={styles.dateInput} value={toDateInputValue(selectedDate)} max={toDateInputValue(today)}
                onChange={(e) => { if (e.target.value) setSelectedDate(new Date(e.target.value + "T12:00:00")); }} />
            </div>
            <button style={styles.dateNavArrow} onClick={() => shiftDay(1)} disabled={isToday}>›</button>
          </div>

          <div style={styles.statGrid}>
            <StatCard label="Money in" value={currency(revenue)} />
            <StatCard label="Money out" value={currency(spent)} />
          </div>

          <SectionTitle title={category.orderNounPlural} small />
          {dayOrders.length === 0 ? (
            <EmptyState text={`No ${category.orderNounPlural.toLowerCase()} logged on this day.`} icon={Receipt} />
          ) : (
            <div style={styles.list}>
              {dayOrders.map((o) => (
                <div key={o.id} style={styles.listRow}>
                  <div>
                    <div style={styles.listRowTitle}>{o.customerName || "Walk-in"}</div>
                    <div style={styles.listRowSub}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} · {new Date(o.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div style={styles.mono}>{currency(o.total)}</div>
                </div>
              ))}
            </div>
          )}

          <SectionTitle title="Expenses" small />
          {dayExpenses.length === 0 ? (
            <EmptyState text="No expenses logged on this day." icon={TrendingDown} />
          ) : (
            <div style={styles.list}>
              {dayExpenses.map((e) => (
                <div key={e.id} style={styles.listRow}>
                  <div>
                    <div style={styles.listRowTitle}>{e.category}</div>
                    <div style={styles.listRowSub}>{e.note ? `${e.note} · ` : ""}{new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div style={styles.mono}>−{currency(e.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "weekly" && (
        <>
          <div style={styles.dateNavRow}>
            <button style={styles.dateNavArrow} onClick={() => shiftWeek(-1)}>‹</button>
            <div style={styles.dateNavCenter}>
              <div style={styles.dateNavLabel}>{isThisWeek ? "This week" : `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`}</div>
            </div>
            <button style={styles.dateNavArrow} onClick={() => shiftWeek(1)} disabled={isThisWeek}>›</button>
          </div>

          <div style={styles.statGrid}>
            <StatCard label="Money in" value={currency(week.revenue)} />
            <StatCard label="Money out" value={currency(week.spent)} />
          </div>

          <SectionTitle title="Day by day" small />
          <div style={styles.list}>
            {weekDays.map((d) => (
              <button key={d.date.toISOString()} className="lift-card" style={styles.listRowClickable}
                onClick={() => { setSelectedDate(d.date); setView("daily"); }}>
                <div>
                  <div style={styles.listRowTitle}>{d.date.toLocaleDateString("default", { weekday: "long" })}</div>
                  <div style={styles.listRowSub}>{fmtShort(d.date)} · {d.orders.length} {category.orderNounPlural.toLowerCase()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={styles.mono}>{currency(d.revenue)}</div>
                  {d.spent > 0 && <div style={{ ...styles.mono, fontSize: 11.5, color: "var(--ink-faint)" }}>−{currency(d.spent)}</div>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {view === "monthly" && (
        <>
          <div style={styles.dateNavRow}>
            <button style={styles.dateNavArrow} onClick={() => shiftMonth(-1)}>‹</button>
            <div style={styles.dateNavCenter}>
              <div style={styles.dateNavLabel}>{isThisMonth ? "This month" : selectedDate.toLocaleDateString("default", { month: "long", year: "numeric" })}</div>
            </div>
            <button style={styles.dateNavArrow} onClick={() => shiftMonth(1)} disabled={isThisMonth}>›</button>
          </div>

          <div style={styles.statGrid}>
            <StatCard label="Money in" value={currency(month.revenue)} />
            <StatCard label="Money out" value={currency(month.spent)} />
          </div>

          <SectionTitle title="Week by week" small />
          <div style={styles.list}>
            {monthWeeks.map((w, i) => (
              <button key={i} className="lift-card" style={styles.listRowClickable}
                onClick={() => { setSelectedDate(w.start < monthStart ? monthStart : w.start); setView("weekly"); }}>
                <div>
                  <div style={styles.listRowTitle}>Week {i + 1}</div>
                  <div style={styles.listRowSub}>{fmtShort(w.start < monthStart ? monthStart : w.start)} – {fmtShort(w.end > monthEnd ? monthEnd : w.end)} · {w.orders.length} {category.orderNounPlural.toLowerCase()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={styles.mono}>{currency(w.revenue)}</div>
                  {w.spent > 0 && <div style={{ ...styles.mono, fontSize: 11.5, color: "var(--ink-faint)" }}>−{currency(w.spent)}</div>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   CALENDAR / SCHEDULING VIEW
   A month-grid view of what's happening on each day — bookings for Service
   businesses, rent due-dates for Property businesses, and a general sales-by-day
   view for everyone else. Built entirely from data that already exists (orders,
   and each property's due-day), so no new booking system is needed underneath.
   ========================================================= */
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0 = Sunday
  const leadingBlanks = (firstDow + 6) % 7; // Monday-start offset
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalendarPanel({ biz, category, persist, setTab }) {
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newNoteText, setNewNoteText] = useState("");
  const today = new Date();
  const isPropertyBiz = category.id === "property";
  const isServiceBiz = category.id === "service";

  const branchOrders = filterByBranch(biz.orders, biz.settings?.activeBranchId);
  const properties = itemsForBranch(biz.items, biz.settings?.activeBranchId).filter((i) => i.meta);
  const calendarNotes = biz.calendarNotes || [];

  const shiftMonth = (delta) => { const d = new Date(monthDate); d.setMonth(d.getMonth() + delta); setMonthDate(d); };
  const isCurrentMonth = monthDate.getFullYear() === today.getFullYear() && monthDate.getMonth() === today.getMonth();

  // Rent-due marker for a given day, for property businesses: which occupied properties
  // have their due-day on this date, and whether that month's rent has been logged for them.
  const propertiesDueOn = (date) => {
    if (!isPropertyBiz) return [];
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthOrders = branchOrders.filter((o) => inRange(o.ts, monthStart, monthEnd));
    const paidItemIds = new Set(monthOrders.flatMap((o) => (o.items || []).map((it) => it.itemId)).filter(Boolean));
    return properties
      .filter((p) => (p.dueDay || 1) === date.getDate())
      .map((p) => ({ property: p, paid: paidItemIds.has(p.id) }));
  };

  const ordersOn = (date) => branchOrders.filter((o) => isSameDay(o.ts, date));
  const notesOn = (date) => calendarNotes.filter((n) => n.date === toDateInputValue(date));

  const cells = buildMonthGrid(monthDate);
  const selectedProperties = propertiesDueOn(selectedDate);
  const selectedOrders = ordersOn(selectedDate);
  const selectedNotes = notesOn(selectedDate).sort((a, b) => b.ts - a.ts);

  const addNote = () => {
    if (!newNoteText.trim()) return;
    const note = { id: uid("cnote"), date: toDateInputValue(selectedDate), text: newNoteText.trim(), ts: Date.now() };
    persist({ ...biz, calendarNotes: [note, ...calendarNotes] });
    setNewNoteText("");
  };
  const removeNote = (id) => {
    persist({ ...biz, calendarNotes: calendarNotes.filter((n) => n.id !== id) });
  };

  const cs = {
    weekHeader: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 },
    weekHeaderCell: { textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" },
    grid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 18 },
    cell: { aspectRatio: "1", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 2, position: "relative", fontFamily: "inherit" },
    cellEmpty: { aspectRatio: "1", background: "none", border: "none" },
    cellToday: { border: "1.5px solid var(--accent)" },
    cellSelected: { background: "var(--accent-soft)", borderColor: "var(--accent)" },
    cellNum: { fontSize: 12.5, fontWeight: 600, color: "var(--ink)" },
    cellDot: { width: 5, height: 5, borderRadius: "50%", marginTop: 2 },
    cellDotRow: { display: "flex", gap: 3, marginTop: 2 },
  };

  const dotColorForDay = (date) => {
    if (isPropertyBiz) {
      const due = propertiesDueOn(date);
      if (!due.length) return null;
      return due.some((d) => !d.paid) ? "#B23A2E" : "#22A06B";
    }
    const orders = ordersOn(date);
    return orders.length ? "var(--accent)" : null;
  };

  return (
    <div style={styles.panel}>
      <SectionTitle title="Calendar" />
      <p style={styles.helperText}>
        {isServiceBiz ? `A day-by-day view of your ${category.orderNounPlural.toLowerCase()} — dated sales already show up here automatically.`
          : isPropertyBiz ? "Rent due-dates for every occupied property, month by month — green means paid, red means still owing."
          : `A day-by-day view of your ${category.orderNounPlural.toLowerCase()}.`}
      </p>

      <div style={styles.dateNavRow}>
        <button style={styles.dateNavArrow} onClick={() => shiftMonth(-1)}>‹</button>
        <div style={styles.dateNavCenter}>
          <div style={styles.dateNavLabel}>{isCurrentMonth ? "This month" : monthDate.toLocaleDateString("default", { month: "long", year: "numeric" })}</div>
        </div>
        <button style={styles.dateNavArrow} onClick={() => shiftMonth(1)}>›</button>
      </div>

      <div style={cs.weekHeader}>
        {WEEKDAY_LABELS.map((w) => <div key={w} style={cs.weekHeaderCell}>{w}</div>)}
      </div>
      <div style={cs.grid}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} style={cs.cellEmpty} />;
          const isToday = isSameDay(today.getTime(), date);
          const isSelected = isSameDay(selectedDate.getTime(), date);
          const dot = dotColorForDay(date);
          const hasNote = notesOn(date).length > 0;
          return (
            <button key={i} style={{ ...cs.cell, ...(isToday ? cs.cellToday : {}), ...(isSelected ? cs.cellSelected : {}) }}
              onClick={() => setSelectedDate(date)}>
              <span style={cs.cellNum}>{date.getDate()}</span>
              <div style={cs.cellDotRow}>
                {dot && <span style={{ ...cs.cellDot, background: dot }} />}
                {hasNote && <span style={{ ...cs.cellDot, background: "#B8862F" }} />}
              </div>
            </button>
          );
        })}
      </div>

      <SectionTitle title={selectedDate.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })} small />

      {isPropertyBiz ? (
        selectedProperties.length === 0 ? (
          <EmptyState text="No rent due on this date." icon={CalendarClock} />
        ) : (
          <div style={styles.list}>
            {selectedProperties.map(({ property, paid }) => (
              <div key={property.id} style={styles.listRow}>
                <div>
                  <div style={styles.listRowTitle}>{property.name}</div>
                  <div style={styles.listRowSub}>Tenant: {property.meta} · {currency(property.price)}/month</div>
                </div>
                <span style={{ ...styles.badge, background: paid ? "var(--accent-soft)" : "rgba(178,58,46,0.12)", color: paid ? "var(--accent)" : "#B23A2E" }}>
                  {paid ? "Paid" : "Due"}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        selectedOrders.length === 0 ? (
          <EmptyState text={`No ${category.orderNounPlural.toLowerCase()} on this date.`} icon={isServiceBiz ? CalendarClock : Receipt} />
        ) : (
          <div style={styles.list}>
            {selectedOrders.map((o) => (
              <div key={o.id} style={styles.listRow}>
                <div>
                  <div style={styles.listRowTitle}>{o.customerName || "Walk-in"}</div>
                  <div style={styles.listRowSub}>{o.quickSale ? (o.items[0]?.name || "Quick sale") : o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</div>
                </div>
                <div style={styles.mono}>{currency(o.total)}</div>
              </div>
            ))}
          </div>
        )
      )}

      {isServiceBiz && (
        <p style={{ ...styles.helperText, marginTop: 12 }}>
          To schedule a future {category.orderNoun.toLowerCase()}, create it from the {category.orderNounPlural} tab and set its date ahead — it'll appear here on that day.
        </p>
      )}

      <SectionTitle title="Your notes" small />
      <p style={styles.helperText}>Write yourself a reminder for this day — a planned sale, a restock, anything.</p>
      {selectedNotes.length > 0 && (
        <div style={styles.list}>
          {selectedNotes.map((n) => (
            <div key={n.id} style={styles.listRow}>
              <div style={{ flex: 1 }}><div style={styles.listRowTitle}>{n.text}</div></div>
              <button style={styles.iconBtn} onClick={() => removeNote(n.id)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ ...styles.formRow, marginTop: selectedNotes.length ? 10 : 0 }}>
        <input style={{ ...styles.textInput, flex: 1, marginBottom: 0 }} placeholder="Add a note for this day…"
          value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }} />
        <button style={styles.smallAddBtn} onClick={addNote}>Add</button>
      </div>
    </div>
  );
}

/* =========================================================
   REMINDERS — daily follow-ups: appointments & overdue payments.
   Sending is always a manual tap (wa.me / sms: links) — nothing goes
   out without the owner reviewing the message and tapping Send.
   ========================================================= */
function RemindersPanel({ biz, category, persist }) {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const isServiceBiz = category.id === "service";
  const branchOrders = filterByBranch(biz.orders, biz.settings?.activeBranchId);
  const reminders = biz.reminders || {}; // { [key]: timestamp } — what's already been sent

  // Appointments due a reminder: bookings dated tomorrow. This app treats a
  // future-dated booking (Orders tab, dated ahead) as the scheduled appointment.
  const upcomingAppointments = isServiceBiz
    ? branchOrders.filter((o) => isSameDay(o.ts, tomorrow) && !o.refundedAmount)
    : [];

  // Group outstanding credit balances by customer so each person gets one
  // reminder rather than one per sale.
  const owedByCustomer = {};
  branchOrders.filter((o) => o.paymentStatus === "credit").forEach((o) => {
    const name = (o.customerName || "").trim();
    if (!name) return;
    if (!owedByCustomer[name]) owedByCustomer[name] = { name, total: 0 };
    owedByCustomer[name].total += o.total;
  });
  const debtors = Object.values(owedByCustomer).sort((a, b) => b.total - a.total);

  const [drafts, setDrafts] = useState({});
  const draftFor = (key, fallback) => (drafts[key] !== undefined ? drafts[key] : fallback);
  const setDraft = (key, val) => setDrafts((d) => ({ ...d, [key]: val }));

  const defaultApptMessage = (o) =>
    `Hi ${o.customerName || "there"}, reminder: you have ${article(category.orderNoun.toLowerCase())} ${category.orderNoun.toLowerCase()} tomorrow (${tomorrow.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}) with ${biz.profile.name}.`;
  const defaultDebtMessage = (d) =>
    `Hi ${d.name}, this is a reminder that you owe ${currency(d.total)} to ${biz.profile.name}. Please pay when you're able — thank you!`;

  const markSent = (key) => persist({ ...biz, reminders: { ...reminders, [key]: Date.now() } });

  const sendRow = (key, name, message, method) => {
    const phone = findCustomerPhone(biz, name);
    if (phone) {
      window.open(method === "sms" ? smsLink(phone, message) : waLink(phone, message), "_blank");
    } else {
      shareText(`Message for ${name || "customer"}`, message);
    }
    markSent(key);
  };

  const notificationSettings = biz.notificationSettings || {};
  const toggleEmailSetting = (key) => persist({ ...biz, notificationSettings: { ...notificationSettings, [key]: !(notificationSettings[key] !== false) } });

  const sentLabel = (sentAt) => sentAt ? `Sent ${new Date(sentAt).toLocaleDateString() === today.toLocaleDateString() ? "today" : new Date(sentAt).toLocaleDateString()} at ${new Date(sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : null;

  const ReminderRow = ({ rowKey, title, sub, message, onChange, sentAt, onSend }) => (
    <div style={{ ...styles.formCard, marginBottom: 10 }}>
      <div style={styles.listRowTitle}>{title}</div>
      <div style={styles.listRowSub}>{sub}</div>
      <textarea style={{ ...styles.textArea, marginTop: 8, minHeight: 64 }} value={message} onChange={(e) => onChange(e.target.value)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button style={{ ...styles.primaryBtnSmall, width: "auto", padding: "9px 14px" }} onClick={() => onSend("wa")}>
          <MessageCircle size={15} /> Send on WhatsApp
        </button>
        <button style={{ ...styles.primaryBtnSmall, width: "auto", padding: "9px 14px", background: "var(--surface)", color: "var(--ink-soft)", border: "1px solid var(--line)" }} onClick={() => onSend("sms")}>
          <Phone size={15} /> SMS
        </button>
        {sentAt && <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{sentLabel(sentAt)} — tap again to resend</span>}
      </div>
    </div>
  );

  return (
    <div style={styles.panel}>
      <SectionTitle title="Reminders" />
      <p style={styles.helperText}>
        Today's follow-ups — appointments to confirm and payments to chase. Edit any message before sending; nothing goes out until you tap Send inside WhatsApp or Messages.
      </p>

      {isServiceBiz && (
        <>
          <SectionTitle title={`Tomorrow's ${category.orderNounPlural.toLowerCase()}`} small />
          {upcomingAppointments.length === 0 ? (
            <EmptyState text={`No ${category.orderNounPlural.toLowerCase()} scheduled for tomorrow yet.`} icon={CalendarClock} />
          ) : (
            <div style={styles.list}>
              {upcomingAppointments.map((o) => {
                const key = `appt_${o.id}`;
                const message = draftFor(key, defaultApptMessage(o));
                const phone = findCustomerPhone(biz, o.customerName);
                return (
                  <ReminderRow key={o.id} rowKey={key}
                    title={o.customerName || "Walk-in"}
                    sub={`${new Date(o.ts).toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" })}${phone ? ` · ${phone}` : " · No phone on file — will use your device's share sheet instead"}`}
                    message={message} onChange={(v) => setDraft(key, v)}
                    sentAt={reminders[key]}
                    onSend={(method) => sendRow(key, o.customerName, message, method)} />
                );
              })}
            </div>
          )}
        </>
      )}

      <SectionTitle title="Overdue payments" small />
      {debtors.length === 0 ? (
        <EmptyState text="No one owes you money right now." icon={HandCoins} />
      ) : (
        <div style={styles.list}>
          {debtors.map((d) => {
            const key = `debt_${d.name}_${toDateInputValue(today)}`;
            const message = draftFor(key, defaultDebtMessage(d));
            const phone = findCustomerPhone(biz, d.name);
            return (
              <ReminderRow key={d.name} rowKey={key}
                title={d.name}
                sub={`Owes ${currency(d.total)}${phone ? ` · ${phone}` : " · No phone on file — will use your device's share sheet instead"}`}
                message={message} onChange={(v) => setDraft(key, v)}
                sentAt={reminders[key]}
                onSend={(method) => sendRow(key, d.name, message, method)} />
            );
          })}
        </div>
      )}

      <SectionTitle title="Automatic email notifications" small />
      <p style={styles.helperText}>These go to your account email with no action needed from you — turn either off any time.</p>
      <button style={styles.themeRow} onClick={() => toggleEmailSetting("subscriptionEmails")}>
        <div><div style={styles.listRowTitle}>Subscription renewal & payment emails</div><div style={styles.listRowSub}>Renewal reminders and payment receipts for your own plan</div></div>
        <div style={{ ...styles.switchTrack, background: notificationSettings.subscriptionEmails !== false ? "var(--accent)" : "var(--line)" }}>
          <div style={{ ...styles.switchThumb, transform: notificationSettings.subscriptionEmails !== false ? "translateX(18px)" : "translateX(0)" }} />
        </div>
      </button>
      <button style={styles.themeRow} onClick={() => toggleEmailSetting("reportEmails")}>
        <div><div style={styles.listRowTitle}>Weekly & monthly performance report</div><div style={styles.listRowSub}>Sales, profit, best-seller and top customer, by email</div></div>
        <div style={{ ...styles.switchTrack, background: notificationSettings.reportEmails !== false ? "var(--accent)" : "var(--line)" }}>
          <div style={{ ...styles.switchThumb, transform: notificationSettings.reportEmails !== false ? "translateX(18px)" : "translateX(0)" }} />
        </div>
      </button>
    </div>
  );
}

/* =========================================================
   REPORTS (owner only)
   ========================================================= */
function ReportsPanel({ biz, category, setTab }) {
  const now = new Date();
  const thisMonthOrders = filterByBranch(biz.orders, biz.settings?.activeBranchId).filter((o) => {
    const d = new Date(o.ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthExpensesRaw = filterByBranch(biz.expenses || [], biz.settings?.activeBranchId).filter((e) => {
    const d = new Date(e.ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  // Salary/wage/loan payments logged under Staff & HR also create an expense entry (so they show up
  // in Expenses and per-branch totals) — excluded here so they aren't counted twice against Payroll below.
  const thisMonthExpenses = thisMonthExpensesRaw.filter((e) => !e.payrollRecordId);

  const revenue = thisMonthOrders.reduce((s, o) => s + o.total, 0); // selling price / money in
  const cogs = thisMonthOrders.reduce((s, o) => { // buying cost of what was sold
    return s + o.items.reduce((s2, it) => {
      const item = biz.items.find((i) => i.id === it.itemId);
      return s2 + (item?.cost || 0) * it.qty;
    }, 0);
  }, 0);
  const payrollCost = biz.employees.reduce((s, e) => s + (e.hourlyRate || 0) * (e.hoursThisMonth || 0), 0);
  const expensesTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const damagesTotal = thisMonthExpenses.filter((e) => e.category === "Damages / loss").reduce((s, e) => s + e.amount, 0);

  const moneyIn = revenue;
  const moneyOut = cogs + payrollCost + expensesTotal;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - payrollCost - expensesTotal;

  const expenseByCategory = {};
  thisMonthExpenses.forEach((e) => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  const salesByItem = {};
  thisMonthOrders.forEach((o) => o.items.forEach((it) => {
    if (!salesByItem[it.name]) salesByItem[it.name] = { qty: 0, unit: it.unit || biz.items.find((i) => i.id === it.itemId)?.unit || "pcs" };
    salesByItem[it.name].qty += it.qty;
  }));
  const topItems = Object.entries(salesByItem).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);

  const byCustomer = {};
  thisMonthOrders.forEach((o) => {
    const key = o.customerName || "Walk-in";
    if (key === "Walk-in") return; // walk-ins aren't a "customer" to rank
    byCustomer[key] = (byCustomer[key] || 0) + o.total;
  });
  const topCustomers = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const taxCollected = thisMonthOrders.reduce((s, o) => s + (o.taxAmount || 0), 0);
  const refundsTotal = thisMonthExpenses.filter((e) => e.category === "Refunds / returns").reduce((s, e) => s + e.amount, 0);

  const byEmployee = {};
  thisMonthOrders.forEach((o) => {
    const emp = biz.employees.find((e) => e.id === o.employeeId);
    const key = emp?.name || "Unknown";
    byEmployee[key] = (byEmployee[key] || 0) + o.total;
  });

  const byPaymentType = {};
  thisMonthOrders.forEach((o) => {
    const key = o.paymentStatus === "credit" ? "On credit" : (o.paymentMethod || "Cash");
    byPaymentType[key] = (byPaymentType[key] || 0) + o.total;
  });

  // Category comes from the item at time of sale; itemId lets us fall back to the
  // item's current category for older orders saved before categories existed.
  const byCategory = {};
  thisMonthOrders.forEach((o) => o.items.forEach((it) => {
    const cat = it.category || biz.items.find((i) => i.id === it.itemId)?.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + it.price * it.qty;
  }));

  const detailedOrderCount = thisMonthOrders.filter((o) => !o.quickSale).length;
  const quickOrderCount = thisMonthOrders.filter((o) => o.quickSale).length;
  const isTotalsMode = biz.profile?.recordingMode === "totals";

  // ---------------- Performance overview (visual summary above the detailed report) ----------------
  const CATEGORY_PALETTE = ["#1449B0", "#22A06B", "#9D6FE8", "#E0A63A", "#B23B3B", "#0E7C7B", "#8A6D00", "#7A4FBF", "#2E6FE0", "#D97706"];
  const categorySlices = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }));

  // Revenue + order count for each of the last 6 months, for the trend line and the
  // "orders by month" bars — periodSummary already scopes to the active branch.
  const sixMonthTrend = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;
    const [start, end] = periodBoundsFor("month", offset);
    const summary = periodSummary(biz, start, end);
    return { label: start.toLocaleDateString("default", { month: "short" }), revenue: summary.revenue, orders: summary.orders.length };
  });
  const maxMonthlyOrders = Math.max(...sixMonthTrend.map((m) => m.orders), 1);

  // New customers this month = anyone whose earliest-ever order falls in the current month.
  const firstOrderByCustomer = {};
  filterByBranch(biz.orders, biz.settings?.activeBranchId).forEach((o) => {
    const name = o.customerName;
    if (!name || name === "Walk-in") return;
    if (!firstOrderByCustomer[name] || o.ts < firstOrderByCustomer[name]) firstOrderByCustomer[name] = o.ts;
  });
  const monthStartTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const newCustomersCount = Object.values(firstOrderByCustomer).filter((ts) => ts >= monthStartTs).length;

  // "Sales by branch" only makes sense with more than one branch — otherwise fall back to
  // top customers, which is meaningful for every business type.
  const hasBranches = (biz.branches || []).length > 1;
  const branchSlices = hasBranches ? (() => {
    const monthEndTs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const totals = {};
    (biz.orders || []).filter((o) => o.ts >= monthStartTs && o.ts <= monthEndTs).forEach((o) => {
      const name = biz.branches.find((b) => b.id === o.branchId)?.name || "Unassigned";
      totals[name] = (totals[name] || 0) + o.total;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  })() : [];

  const reportInsights = (() => {
    const list = [];
    const growth = percentChange(revenue, sixMonthTrend[4]?.revenue || 0); // last month = second-to-last point
    if (growth !== null) list.push(`Sales are ${growth >= 0 ? "up" : "down"} ${Math.abs(Math.round(growth))}% from last month.`);
    if (categorySlices[0]) list.push(`${categorySlices[0].label} is your top-selling category, at ${currency(categorySlices[0].value)}.`);
    if (topCustomers[0]) list.push(`${topCustomers[0][0]} is your top ${category.customerNoun.toLowerCase()} this month, at ${currency(topCustomers[0][1])}.`);
    if (newCustomersCount > 0) list.push(`${newCustomersCount} new ${category.customerNounPlural.toLowerCase()} this month — worth following up to turn them into regulars.`);
    if (damagesTotal > 0) list.push(`${currency(damagesTotal)} lost to damages this month — worth a closer look.`);
    return list.slice(0, 4);
  })();

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      [`${biz.profile.name} — Report for ${now.toLocaleString("default", { month: "long", year: "numeric" })}`],
      [],
      ["Money coming in (sales revenue)", revenue],
      ["Money going out (total)", moneyOut],
      ["  Buying cost / cost of goods sold", cogs],
      ["  Payroll", payrollCost],
      ["  Other expenses", expensesTotal],
      ["    of which damages / loss", damagesTotal],
      [],
      ["Gross profit (revenue − buying cost)", grossProfit],
      ["Net profit (gross profit − payroll − expenses)", netProfit],
      [],
      [`${category.orderNounPlural} this month`, thisMonthOrders.length],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const ordersSheet = XLSX.utils.json_to_sheet(thisMonthOrders.map((o) => ({
      Date: new Date(o.ts).toLocaleDateString(),
      Customer: o.customerName || "Walk-in",
      Items: o.items.map((i) => `${i.qty}x ${i.name}`).join(", "),
      Subtotal: o.subtotal ?? o.total,
      Discount: o.discountAmount || 0,
      Tax: o.taxAmount || 0,
      Total: o.total,
      "Payment method": o.paymentMethod || "",
      Status: o.status,
    })));
    XLSX.utils.book_append_sheet(wb, ordersSheet, category.orderNounPlural.slice(0, 31));

    const expensesSheet = XLSX.utils.json_to_sheet(thisMonthExpenses.map((e) => ({
      Date: new Date(e.ts).toLocaleDateString(),
      Category: e.category,
      Amount: e.amount,
      Note: e.note || "",
    })));
    XLSX.utils.book_append_sheet(wb, expensesSheet, "Expenses");

    const itemsSheet = XLSX.utils.json_to_sheet(biz.items.map((i) => ({
      Name: i.name,
      Category: i.category || "",
      Unit: category.hasStock ? (i.unit || "pcs") : "",
      "Selling price": i.price,
      "Buying cost": i.cost || 0,
      Margin: i.price - (i.cost || 0),
      ...(category.hasStock ? { Stock: i.stock } : {}),
    })));
    XLSX.utils.book_append_sheet(wb, itemsSheet, category.itemLabelPlural.slice(0, 31));

    const restocksSheet = XLSX.utils.json_to_sheet(
      filterByBranch(biz.restocks || [], biz.settings?.activeBranchId).map((r) => ({
        Item: r.itemName,
        Qty: r.qty,
        Unit: r.unit,
        "Cost per unit": r.costPerUnit,
        "Total cost": r.totalCost,
        Supplier: r.supplier || "",
        Date: new Date(r.ts).toLocaleDateString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, restocksSheet, "Restocking log");

    const byCategorySheet = XLSX.utils.json_to_sheet(
      Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ Category: cat, Sales: amt }))
    );
    XLSX.utils.book_append_sheet(wb, byCategorySheet, "Sales by category");

    const byPaymentSheet = XLSX.utils.json_to_sheet(
      Object.entries(byPaymentType).sort((a, b) => b[1] - a[1]).map(([m, amt]) => ({ "Payment type": m, Sales: amt }))
    );
    XLSX.utils.book_append_sheet(wb, byPaymentSheet, "Sales by payment type");

    const quotesSheet = XLSX.utils.json_to_sheet(
      (biz.quotes || []).map((q) => ({
        Code: q.code, Customer: q.customerName || "", Total: q.total, Status: q.status,
        Created: new Date(q.ts).toLocaleDateString(), "Valid until": new Date(q.validUntil).toLocaleDateString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, quotesSheet, "Quotes");

    const filename = `${biz.profile.name.replace(/[^a-z0-9]/gi, "_")}_Report_${now.toLocaleString("default", { month: "short" })}_${now.getFullYear()}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title={`Report — ${now.toLocaleString("default", { month: "long" })}`} />
        <button style={styles.addBtn} onClick={exportExcel}>
          <Download size={15} /> Excel
        </button>
      </div>

      {isTotalsMode && quickOrderCount > 0 && (
        <Callout icon={BarChart3} tone="info">
          You're set up to record daily totals — {quickOrderCount} of {thisMonthOrders.length} {category.orderNounPlural.toLowerCase()} this month {quickOrderCount === 1 ? "was" : "were"} logged as a total rather than itemized, so item- and category-level detail below only reflects the {detailedOrderCount} that were itemized. Change this anytime in Settings.
        </Callout>
      )}

      <SectionTitle title="Performance overview" small />
      <div style={styles.statGrid} className="stat-grid">
        <StatCard label="Total sales" value={currency(revenue)} icon={Wallet} tint="linear-gradient(135deg, #22A06B 0%, #146C43 100%)" />
        <StatCard label="Net profit" value={currency(netProfit)} icon={TrendingUp} tint="linear-gradient(135deg, #2E6FE0 0%, #10399E 100%)" />
        <StatCard label={category.orderNounPlural} value={String(thisMonthOrders.length)} icon={Receipt} tint="linear-gradient(135deg, #9D6FE8 0%, #6432B8 100%)" />
        <StatCard label={`New ${category.customerNounPlural.toLowerCase()}`} value={String(newCustomersCount)} icon={Users} tint="linear-gradient(135deg, #E0A63A 0%, #A6690F 100%)" />
      </div>

      {sixMonthTrend.some((m) => m.revenue > 0) && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeader}>Sales trend — last 6 months</div>
          <GrowthLineChart points={sixMonthTrend.map((m) => ({ label: m.label, value: m.revenue }))} />
        </div>
      )}

      {(categorySlices.length > 0 || branchSlices.length > 0 || topCustomers.length > 0) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {categorySlices.length > 0 && (
            <div className="lift-card" style={{ ...styles.trendCard, flex: "1 1 260px" }}>
              <div style={styles.trendHeader}>Sales by category</div>
              <div style={styles.donutRow}>
                <DonutChart slices={categorySlices} />
                <div style={{ ...styles.paymentBreakdownList, flex: 1 }}>
                  {categorySlices.slice(0, 5).map((s) => (
                    <div key={s.label} style={styles.paymentBreakdownRow}>
                      <span style={styles.trendLegendItem}><span style={{ ...styles.trendLegendDot, background: s.color }} />{s.label}</span>
                      <span style={styles.mono}>{currency(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasBranches && branchSlices.length > 0 ? (
            <div className="lift-card" style={{ ...styles.trendCard, flex: "1 1 260px" }}>
              <div style={styles.trendHeader}>Sales by branch</div>
              <BarListChart data={branchSlices} />
            </div>
          ) : topCustomers.length > 0 ? (
            <div className="lift-card" style={{ ...styles.trendCard, flex: "1 1 260px" }}>
              <div style={styles.trendHeader}>Top {category.customerNounPlural.toLowerCase()}</div>
              <BarListChart data={topCustomers.map(([name, amt]) => ({ label: name, value: amt }))} />
            </div>
          ) : null}
        </div>
      )}

      {sixMonthTrend.some((m) => m.orders > 0) && (
        <div className="lift-card" style={styles.trendCard}>
          <div style={styles.trendHeader}>{category.orderNounPlural} by month</div>
          <div style={styles.trendBars}>
            {sixMonthTrend.map((m, i) => (
              <div key={i} style={styles.trendBarCol}>
                <div style={styles.trendBarTrack}>
                  <div style={styles.trendBarPair}>
                    <div style={{ ...styles.trendBarFill, height: `${Math.max(4, (m.orders / maxMonthlyOrders) * 100)}%` }} title={String(m.orders)} />
                  </div>
                </div>
                <div style={styles.trendBarLabel}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportInsights.length > 0 && (
        <div className="lift-card" style={{ ...styles.trendCard, background: "linear-gradient(135deg, rgba(20,73,176,0.06), rgba(20,73,176,0.02))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Lightbulb size={15} color="var(--accent)" />
            <div style={{ ...styles.trendHeader, marginBottom: 0 }}>Insights & recommendations</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reportInsights.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)" }}>
                <CheckCircle2 size={15} color="#22A06B" style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionTitle title="Sales summary" small />
      <div style={styles.statGrid}>
        <StatCard label={`${category.orderNounPlural} this month`} value={String(thisMonthOrders.length)} />
        <StatCard label="Total sales" value={currency(revenue)} />
        <StatCard label="Average sale" value={currency(thisMonthOrders.length ? Math.round(revenue / thisMonthOrders.length) : 0)} />
        {isTotalsMode && <StatCard label="Logged as daily totals" value={String(quickOrderCount)} />}
      </div>

      <SectionTitle title="Cash flow" small />
      <div style={styles.statGrid}>
        <StatCard label="Money coming in" value={currency(moneyIn)} />
        <StatCard label="Money going out" value={currency(moneyOut)} />
      </div>

      <SectionTitle title="Profitability" small />
      <div style={styles.statGrid}>
        <StatCard label="Gross profit" value={currency(grossProfit)} />
        <StatCard label="Net profit" value={currency(netProfit)} />
      </div>
      <div style={styles.statGrid}>
        <StatCard label="Buying cost (COGS)" value={currency(cogs)} />
        <StatCard label="Selling revenue" value={currency(revenue)} />
        <StatCard label="Payroll" value={currency(payrollCost)} />
        <StatCard label="Damages / loss" value={currency(damagesTotal)} />
      </div>
      {refundsTotal > 0 && (
        <div style={styles.statGrid}>
          <StatCard label="Refunds / returns" value={currency(refundsTotal)} />
        </div>
      )}

      <SectionTitle title="Tax" small />
      <div style={styles.statGrid}>
        <StatCard label="VAT / tax collected this month" value={currency(taxCollected)} />
      </div>
      {biz.settings?.taxRate > 0
        ? <p style={{ ...styles.helperText, marginTop: -10 }}>Based on the {biz.settings.taxRate}% tax rate applied to sales, set in the Price calculator.</p>
        : <p style={{ ...styles.helperText, marginTop: -10 }}>No tax rate is currently set — go to the Price calculator to set one if you need to charge and track VAT.</p>}

      {Object.keys(expenseByCategory).length > 0 && (
        <>
          <SectionTitle title="Expenses by category" small />
          <div style={styles.list}>
            {Object.entries(expenseByCategory).map(([cat, amt]) => (
              <div key={cat} style={styles.listRow}>
                <div style={styles.listRowTitle}>{cat}</div>
                <div style={styles.mono}>{currency(amt)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle title="Sales by payment type" small />
      {Object.keys(byPaymentType).length === 0 ? <EmptyState text="No activity yet this month." icon={Wallet} /> : (
        <div style={styles.list}>
          {Object.entries(byPaymentType).sort((a, b) => b[1] - a[1]).map(([method, amt]) => (
            <div key={method} style={styles.listRow}>
              <div style={styles.listRowTitle}>{method}</div>
              <div style={styles.mono}>{currency(amt)}</div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle title="Sales by category" small />
      {Object.keys(byCategory).length === 0 ? (
        <EmptyState
          text={isTotalsMode
            ? `No categorized sales yet. Daily totals don't break down by category — itemize a ${category.orderNoun.toLowerCase()} to see this fill in.`
            : `No activity yet this month. Add categories to your ${category.itemLabelPlural.toLowerCase()} to see this here.`}
          icon={Package}
        />
      ) : (
        <div style={styles.list}>
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <div key={cat} style={styles.listRow}>
              <div style={styles.listRowTitle}>{cat}</div>
              <div style={styles.mono}>{currency(amt)}</div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle title={`Top ${category.itemLabelPlural.toLowerCase()}`} small />
      {topItems.length === 0 ? (
        <EmptyState
          text={isTotalsMode ? `No itemized sales yet this month — daily totals don't track individual ${category.itemLabelPlural.toLowerCase()}.` : "No activity yet this month."}
          icon={BarChart3}
        />
      ) : (
        <div style={styles.list}>
          {topItems.map(([name, data]) => (
            <div key={name} style={styles.listRow}>
              <div style={styles.listRowTitle}>{name}</div>
              <div style={styles.mono}>{data.qty} {unitLabel(data.unit, data.qty !== 1)} sold</div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle title={`${category.orderNounPlural} by staff`} small />
      {Object.keys(byEmployee).length === 0 ? <EmptyState text="No activity yet this month." icon={Users} /> : (
        <div style={styles.list}>
          {Object.entries(byEmployee).map(([name, total]) => (
            <div key={name} style={styles.listRow}>
              <div style={styles.listRowTitle}>{name}</div>
              <div style={styles.mono}>{currency(total)}</div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle title={`Top ${category.customerNounPlural.toLowerCase()}`} small />
      {topCustomers.length === 0 ? (
        <EmptyState text={`No named ${category.customerNounPlural.toLowerCase()} recorded yet this month — walk-ins without a name aren't ranked here.`} icon={Users} />
      ) : (
        <div style={styles.list}>
          {topCustomers.map(([name, total]) => (
            <div key={name} style={styles.listRow}>
              <div style={styles.listRowTitle}>{name}</div>
              <div style={styles.mono}>{currency(total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ACCOUNTING (paid add-on)
   ========================================================= */
function AccountingPanel({ biz, category, persist, setTab }) {
  const now = new Date();
  const branchOrdersAll = filterByBranch(biz.orders, biz.settings?.activeBranchId);
  const branchExpensesAll = filterByBranch(biz.expenses, biz.settings?.activeBranchId);
  const thisMonthOrders = branchOrdersAll.filter((o) => {
    const d = new Date(o.ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthExpensesRaw = branchExpensesAll.filter((e) => {
    const d = new Date(e.ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  // Salary/wage/loan payments logged under Staff & HR also create an expense entry (so they show up
  // in Expenses, Cash on hand, and per-branch totals) — excluded here so Net Profit doesn't double-count
  // them against the Payroll figure below, which is worked out from salary/hourly rate/pay records directly.
  const thisMonthExpenses = thisMonthExpensesRaw.filter((e) => !e.payrollRecordId);
  const revenue = thisMonthOrders.reduce((s, o) => s + o.total, 0);
  const cogs = thisMonthOrders.reduce((s, o) => s + o.items.reduce((si, it) => {
    const found = biz.items.find((i) => i.id === it.itemId);
    return si + (found?.cost || 0) * it.qty;
  }, 0), 0);
  const grossProfit = revenue - cogs;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthPayRecords = (emp) => (emp.payRecords || []).filter((r) => r.date?.startsWith(monthKey));
  const salariedPayroll = biz.employees.reduce((s, e) => s + (e.salary || 0), 0);
  const hourlyPayroll = biz.employees.reduce((s, e) => s + (e.hourlyRate || 0) * (e.hoursThisMonth || 0), 0);
  const wagesPaidThisMonth = biz.employees.reduce((s, e) => s + thisMonthPayRecords(e).filter((r) => r.type === "wage").reduce((x, r) => x + r.amount, 0), 0);
  const loansGivenThisMonth = biz.employees.reduce((s, e) => s + thisMonthPayRecords(e).filter((r) => r.type === "loan").reduce((x, r) => x + r.amount, 0), 0);
  const totalOutstandingLoans = biz.employees.reduce((s, e) => {
    const recs = e.payRecords || [];
    const loaned = recs.filter((r) => r.type === "loan").reduce((x, r) => x + r.amount, 0);
    const repaid = recs.filter((r) => r.type === "loan_repayment").reduce((x, r) => x + r.amount, 0);
    return s + Math.max(0, loaned - repaid);
  }, 0);
  const payrollCost = salariedPayroll + hourlyPayroll + wagesPaidThisMonth;
  const totalExpenses = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - payrollCost - totalExpenses;

  const creditOrders = branchOrdersAll.filter((o) => o.paymentStatus === "credit");
  const totalOwed = creditOrders.reduce((s, o) => s + o.total, 0);
  const owedByCustomer = {};
  creditOrders.forEach((o) => {
    const name = o.customerName || "Walk-in";
    owedByCustomer[name] = (owedByCustomer[name] || 0) + o.total;
  });

  const allTimeRevenue = branchOrdersAll.filter((o) => o.paymentStatus !== "credit").reduce((s, o) => s + o.total, 0);
  const allTimeExpenses = branchExpensesAll.reduce((s, e) => s + e.amount, 0);
  const cashOnHand = allTimeRevenue - allTimeExpenses;
  const inventoryValue = category.hasStock
    ? biz.items.reduce((s, i) => s + (i.cost || 0) * (i.stock || 0), 0)
    : 0;
  const totalAssets = cashOnHand + inventoryValue + totalOwed;

  const settleOrder = (orderId) => {
    const order = biz.orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = {
      ...biz,
      orders: biz.orders.map((o) => o.id === orderId ? { ...o, paymentStatus: "paid" } : o),
    };
    persist({
      ...next,
      notifications: [{ id: uid("note"), type: "payment", message: `Payment of ${currency(order.total)} received${order.customerName ? " from " + order.customerName : ""} (credit settled)`, ts: Date.now(), read: false }, ...next.notifications],
    });
  };

  // Sends a friendly payment reminder through the phone's own share sheet (WhatsApp, SMS,
  // whatever the person picks) — same mechanism already used for receipts and customer notes.
  const remindCustomer = (order) => {
    const lines = [
      `Hi ${order.customerName || "there"}, this is ${biz.profile.name}.`,
      `Friendly reminder: you have an outstanding balance of ${currency(order.total)} from ${new Date(order.ts).toLocaleDateString()}.`,
      `Kindly settle at your earliest convenience — thank you!`,
    ];
    shareText(`Payment reminder — ${order.customerName || "Customer"}`, lines.join("\n"));
    persist({ ...biz, orders: biz.orders.map((o) => o.id === order.id ? { ...o, lastReminderAt: Date.now() } : o) });
  };

  const ledger = [
    ...branchOrdersAll.filter((o) => o.paymentStatus !== "credit").map((o) => ({ id: o.id, ts: o.ts, label: o.customerName || "Walk-in sale", amount: o.total })),
    ...branchExpensesAll.map((e) => ({ id: e.id, ts: e.ts, label: e.category, amount: -e.amount })),
  ].sort((a, b) => b.ts - a.ts);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ledgerSheet = XLSX.utils.json_to_sheet(ledger.map((l) => ({
      Date: new Date(l.ts).toLocaleDateString(),
      Description: l.label,
      Amount: l.amount,
    })));
    XLSX.utils.book_append_sheet(wb, ledgerSheet, "Ledger");

    const receivablesSheet = XLSX.utils.json_to_sheet(Object.entries(owedByCustomer).map(([name, amt]) => ({
      Customer: name,
      "Amount owed": amt,
    })));
    XLSX.utils.book_append_sheet(wb, receivablesSheet, "Receivables");

    const balanceSheet = XLSX.utils.json_to_sheet([
      { Item: "Cash on hand", Amount: cashOnHand },
      { Item: "Inventory value", Amount: inventoryValue },
      { Item: "Accounts receivable", Amount: totalOwed },
      { Item: "Total assets", Amount: totalAssets },
    ]);
    XLSX.utils.book_append_sheet(wb, balanceSheet, "Balance sheet");

    const filename = `${biz.profile.name.replace(/[^a-z0-9]/gi, "_")}_Accounting_${now.toLocaleString("default", { month: "short" })}_${now.getFullYear()}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <div style={styles.panelHeader}>
        <SectionTitle title="Accounting" />
        <button style={styles.addBtn} onClick={exportExcel}>
          <Download size={15} /> Excel
        </button>
      </div>

      <SectionTitle title="Profit & loss — this month" small />
      <div style={styles.statGrid}>
        <StatCard label="Revenue" value={currency(revenue)} />
        <StatCard label="Cost of goods (COGS)" value={currency(cogs)} />
        <StatCard label="Gross profit" value={currency(grossProfit)} />
        <StatCard label="Operating expenses" value={currency(totalExpenses)} />
        <StatCard label="Payroll" value={currency(payrollCost)} />
        <StatCard label="Net profit" value={currency(netProfit)} />
      </div>
      <p style={styles.helperText}>Want the day-by-day breakdown? <button style={styles.textLinkBtn} onClick={() => setTab("reports")}>Open Reports</button></p>

      <SectionTitle title="Payroll & loans — this month" small />
      <div style={styles.statGrid}>
        <StatCard label="Salaries" value={currency(salariedPayroll)} />
        <StatCard label="Hourly wages" value={currency(hourlyPayroll + wagesPaidThisMonth)} />
        <StatCard label="Loans given" value={currency(loansGivenThisMonth)} />
        <StatCard label="Loans outstanding" value={currency(totalOutstandingLoans)} />
      </div>
      <p style={styles.helperText}>Managed per employee under <button style={styles.textLinkBtn} onClick={() => setTab("employees")}>Staff & HR</button></p>

      <SectionTitle title="Accounts receivable" small />
      <div style={styles.statGrid}>
        <StatCard label="Total outstanding" value={currency(totalOwed)} />
        <StatCard label="Customers owing" value={Object.keys(owedByCustomer).length} />
      </div>
      {creditOrders.length === 0 ? (
        <EmptyState text="No credit sales outstanding. Select 'On credit' as the payment method on a sale to track it here." icon={HandCoins} />
      ) : (
        <div style={styles.list}>
          {creditOrders.map((o) => (
            <div key={o.id} style={styles.listRow}>
              <div>
                <div style={styles.listRowTitle}>{o.customerName || "Walk-in"}</div>
                <div style={styles.listRowSub}>
                  {new Date(o.ts).toLocaleDateString()}
                  {o.lastReminderAt ? ` · Reminded ${new Date(o.lastReminderAt).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={styles.mono}>{currency(o.total)}</span>
                <button style={styles.iconBtn} title="Send payment reminder" onClick={() => remindCustomer(o)}><MessageCircle size={15} /></button>
                <button style={styles.smallAddBtn} onClick={() => settleOrder(o.id)}>Mark paid</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle title="Balance sheet snapshot" small />
      <div style={styles.statGrid}>
        <StatCard label="Cash on hand" value={currency(cashOnHand)} />
        {category.hasStock && <StatCard label="Inventory value" value={currency(inventoryValue)} />}
        <StatCard label="Accounts receivable" value={currency(totalOwed)} />
        <StatCard label="Total assets" value={currency(totalAssets)} />
      </div>
      <p style={styles.helperText}>This is a simplified snapshot for a small business — it doesn't yet track loans or other liabilities.</p>

      <SectionTitle title="Ledger" small />
      {ledger.length === 0 ? (
        <EmptyState text="Sales and expenses will appear here together, newest first." icon={BookOpen} />
      ) : (
        <div style={styles.list}>
          {ledger.slice(0, 30).map((l) => (
            <div key={l.id} style={styles.listRow}>
              <div>
                <div style={styles.listRowTitle}>{l.label}</div>
                <div style={styles.listRowSub}>{new Date(l.ts).toLocaleDateString()}</div>
              </div>
              <span style={{ ...styles.mono, color: l.amount < 0 ? "#B3261E" : "inherit" }}>
                {l.amount < 0 ? "−" : "+"}{currency(Math.abs(l.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PAYWALL (shown when a package isn't unlocked)
   ========================================================= */
function PaywallScreen({ message, setTab }) {
  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <EmptyState text={message || "This isn't included on your current plan."} icon={Lock} />
      <button style={styles.primaryBtnSmall} onClick={() => setTab("billing")}>
        <Wallet size={16} /> View plans & upgrade
      </button>
    </div>
  );
}

/* =========================================================
   BILLING / PACKAGES (placeholder — needs a real payment gateway)
   ========================================================= */
function BillingPanel({ biz, persist, setTab }) {
  const trialActive = isTrialActive(biz.profile);
  const daysLeft = trialDaysLeft(biz.profile);
  const currentTierId = TIERS[biz.profile.tier] ? biz.profile.tier : "starter";
  const currentTier = TIERS[currentTierId];
  const branchesInUse = biz.branches.length;
  const staffInUse = biz.employees.length;

  const currentAddonActive = currentTierId === "starter" && !!biz.profile.accountingAddon;
  const currentTotal = currentTier.price + (currentAddonActive ? ACCOUNTING_ADDON_PRICE : 0);

  // Requesting a change is staged locally first — nothing switches on until PayChangu
  // confirms the payment (see the PayChangu completion handler in the main App component).
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTierId, setReqTierId] = useState(currentTierId);
  const [reqAddon, setReqAddon] = useState(currentAddonActive);
  const [reqProDuration, setReqProDuration] = useState("month"); // month | 3month — only matters for Pro

  const reqTier = TIERS[reqTierId];
  const requestedTotal = reqTierId === "pro" && reqProDuration === "3month"
    ? reqTier.price3Month
    : reqTier.price + (reqTierId === "starter" && reqAddon ? ACCOUNTING_ADDON_PRICE : 0);
  const hasChange = reqTierId !== currentTierId || (reqTierId === "starter" && reqAddon !== currentAddonActive) || (reqTierId === "pro" && reqProDuration === "3month");

  const openRequestForm = () => {
    setReqTierId(currentTierId);
    setReqAddon(currentAddonActive);
    setReqProDuration("month");
    setShowRequestForm(true);
  };

  const [payingViaPayChangu, setPayingViaPayChangu] = useState(false);
  // Downgrading is always allowed — nothing gets deleted. If the new plan has less room than
  // what's already in use, the oldest branches/staff up to the new limit stay active and the
  // rest lock automatically (unselectable, read-only) until they upgrade again.
  const willLockBranches = reqTier.branchLimit < branchesInUse ? branchesInUse - reqTier.branchLimit : 0;
  const willLockStaff = reqTier.seatLimit < staffInUse ? staffInUse - reqTier.seatLimit : 0;
  const payWithPayChangu = async () => {
    setPayingViaPayChangu(true);
    const description = `Plan — ${reqTier.name}${reqTierId === "pro" && reqProDuration === "3month" ? " (3 months)" : "/month"}${reqTierId === "starter" && reqAddon ? " + Accounting add-on" : ""}`;
    const result = await startPayChanguCheckout({
      amount: requestedTotal,
      businessName: biz.profile.name,
      description,
      pendingRecord: {
        type: "billing",
        requested: { tier: reqTierId, accountingAddon: reqTierId === "starter" ? reqAddon : false, proDuration: reqTierId === "pro" ? reqProDuration : "month" },
        total: requestedTotal,
      },
    });
    if (!result.ok) { alert(result.error); setPayingViaPayChangu(false); }
  };

  const pastRequests = biz.billingRequests || [];

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Packages & billing" />

      <SectionTitle title="Your current plan" small />
      <div style={styles.formCard}>
        <div style={styles.listRowTitle}>{currentTier.name} — {currency(currentTotal)}/month</div>
        <div style={styles.listRowSub}>
          {currentTier.branchLimit === Infinity ? "Unlimited" : currentTier.branchLimit} branch{currentTier.branchLimit !== 1 ? "es" : ""} · {currentTier.seatLimit === Infinity ? "unlimited" : currentTier.seatLimit} staff login{currentTier.seatLimit !== 1 ? "s" : ""}
          {currentAddonActive ? " · Accounting add-on" : ""}
          {currentTierId === "pro" ? " · 1 additional business included free" : ""}
        </div>
        {biz.profile.subscriptionExpiresAt && (
          <div style={{ ...styles.listRowSub, marginTop: 4 }}>
            {biz.profile.subscriptionExpiresAt < Date.now() ? "Expired on " : "Renews on "}
            {new Date(biz.profile.subscriptionExpiresAt).toLocaleDateString("default", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      {trialActive && (
        <Callout icon={Wallet}>
          You're on your free 7-day trial — every plan's features are unlocked. {daysLeft} day{daysLeft !== 1 ? "s" : ""} left.
        </Callout>
      )}

      {!showRequestForm ? (
        <button style={styles.primaryBtnSmall} onClick={openRequestForm}>
          <Plus size={16} /> Change plan
        </button>
      ) : (
        <div style={styles.formCard}>
          <div style={styles.staffFormSectionLabel}>Choose a plan</div>

          <div style={styles.staffSizeGrid}>
            {Object.values(TIERS).map((t) => {
              const active = reqTierId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setReqTierId(t.id)}
                  style={{
                    ...styles.staffSizeCard,
                    borderColor: active ? "var(--accent, #1B4332)" : "var(--line)",
                    background: active ? "var(--accent-soft, #E3EFE7)" : "var(--surface)",
                  }}
                >
                  <div>{t.name} — {currency(t.price)}/month{t.price3Month ? ` (or ${currency(t.price3Month)}/3 months)` : ""}{t.id === currentTierId ? " · Current plan" : ""}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
                </button>
              );
            })}
          </div>

          {reqTierId === "starter" && (
            <label style={{ ...styles.permissionRow, marginTop: 4 }}>
              <input type="checkbox" checked={reqAddon} onChange={(e) => setReqAddon(e.target.checked)} />
              <div>
                <div style={styles.listRowTitle}>Add Accounting — +{currency(ACCOUNTING_ADDON_PRICE)}/month</div>
                <div style={styles.listRowSub}>Profit & loss, ledger, receivables, and a balance sheet — without upgrading to Growth.</div>
              </div>
            </label>
          )}

          {reqTierId === "pro" && (
            <>
              <div style={{ ...styles.staffFormSectionLabel, marginTop: 12 }}>Billing period</div>
              <div style={styles.paymentMethodRow}>
                <button style={{ ...styles.paymentChip, ...(reqProDuration === "month" ? styles.paymentChipActive : {}) }} onClick={() => setReqProDuration("month")}>
                  {currency(TIERS.pro.price)}/month
                </button>
                <button style={{ ...styles.paymentChip, ...(reqProDuration === "3month" ? styles.paymentChipActive : {}) }} onClick={() => setReqProDuration("3month")}>
                  {currency(TIERS.pro.price3Month)}/3 months
                </button>
              </div>
            </>
          )}

          <div style={{ ...styles.formCard, marginTop: 12 }}>
            <div style={styles.listRowTitle}>New total: {currency(requestedTotal)}{reqTierId === "pro" && reqProDuration === "3month" ? " for 3 months" : "/month"}</div>
            {!hasChange && <div style={styles.listRowSub}>This matches what you already have.</div>}
          </div>

          {(willLockBranches > 0 || willLockStaff > 0) && (
            <Callout icon={Lock} tone="warn">
              This plan has room for {reqTier.branchLimit === Infinity ? "unlimited" : reqTier.branchLimit} branch{reqTier.branchLimit !== 1 ? "es" : ""} and {reqTier.seatLimit === Infinity ? "unlimited" : reqTier.seatLimit} staff login{reqTier.seatLimit !== 1 ? "s" : ""}.
              {willLockBranches > 0 && ` ${willLockBranches} of your branches`}
              {willLockBranches > 0 && willLockStaff > 0 && " and"}
              {willLockStaff > 0 && ` ${willLockStaff} staff login${willLockStaff !== 1 ? "s" : ""}`}
              {" "}will be locked (kept, but not selectable) until you upgrade again — nothing is deleted.
            </Callout>
          )}

          {hasChange && (
            <>
              <button style={{ ...styles.primaryBtnSmall, opacity: payingViaPayChangu ? 0.6 : 1, marginTop: 4 }} disabled={payingViaPayChangu} onClick={payWithPayChangu}>
                <Wallet size={16} /> {payingViaPayChangu ? "Opening PayChangu…" : `Pay ${currency(requestedTotal)} with PayChangu`}
              </button>
              <p style={styles.helperText}>You'll be sent to PayChangu to complete payment — your plan updates automatically the moment it's confirmed.</p>
            </>
          )}
          <button style={styles.logoutBtn} onClick={() => setShowRequestForm(false)}><X size={15} /> Cancel</button>
        </div>
      )}

      {pastRequests.length > 0 && (
        <>
          <SectionTitle title="History" small />
          <div style={styles.list}>
            {pastRequests.map((r) => (
              <div key={r.id} style={styles.listRow}>
                <div>
                  <div style={styles.listRowTitle}>{currency(r.total)} — {r.status}</div>
                  <div style={styles.listRowSub}>{new Date(r.confirmedAt || r.ts).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={styles.helperText}>Payments are confirmed automatically through PayChangu — no waiting on manual approval.</p>
    </div>
  );
}

/* =========================================================
   BUSINESSES (multi-business accounts — owner only)
   ========================================================= */
function BusinessesPanel({ myBusinesses, biz, switchBusiness, switchingBusiness, setTab, createAndEnterBusiness }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(CATEGORIES[0].id);
  const [creating, setCreating] = useState(false);

  // Pro includes 1 additional business free (2 total under one login) — everyone else,
  // and any business beyond that free one, pays the standalone monthly price.
  const freeAllowance = freeExtraBusinessesFor(biz);
  const extraBusinessesSoFar = Math.max(0, myBusinesses.length - 1);
  const nextOneIsFree = extraBusinessesSoFar < freeAllowance;

  const startAddBusiness = async () => {
    if (!newName.trim() || !newCategoryId) return;
    setCreating(true);
    const shortId = await generateBusinessIdRemote();
    if (nextOneIsFree) {
      const result = await createAndEnterBusiness(shortId, newName.trim(), newCategoryId);
      setCreating(false);
      if (!result.ok) { alert(result.error); return; }
      setShowAddForm(false); setNewName("");
      return;
    }
    const result = await startPayChanguCheckout({
      amount: ADDITIONAL_BUSINESS_PRICE,
      businessName: newName.trim(),
      description: `New business — ${newName.trim()}`,
      pendingRecord: { type: "new-business", shortId, name: newName.trim(), categoryId: newCategoryId },
    });
    if (!result.ok) { alert(result.error); setCreating(false); }
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Businesses" />
      <p style={styles.helperText}>
        Every business under this login.{nextOneIsFree
          ? " Your Pro plan includes one additional business free — add it below."
          : ` Add another for ${currency(ADDITIONAL_BUSINESS_PRICE)}/month.`}
      </p>

      <SectionTitle title="Your businesses" small />
      <div style={styles.list}>
        {myBusinesses.map((b) => {
          const isActive = biz.profile.businessId === b.shortId;
          const cat = CATEGORIES.find((c) => c.id === b.categoryId);
          return (
            <div key={b.uuid} style={styles.listRow}>
              <div>
                <div style={styles.listRowTitle}>{b.name}{isActive ? " (active)" : ""}</div>
                <div style={styles.listRowSub}>{cat?.name || b.categoryId} · {b.shortId}</div>
              </div>
              {!isActive && (
                <button style={styles.smallAddBtn} disabled={switchingBusiness} onClick={() => switchBusiness(b.uuid)}>
                  {switchingBusiness ? "Switching…" : "Switch here"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!showAddForm ? (
        <button style={{ ...styles.primaryBtnSmall, marginTop: 16 }} onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> Add a business
        </button>
      ) : (
        <div style={{ ...styles.formCard, marginTop: 16 }}>
          <p style={styles.helperText}>
            A new business, fully separate from your others — its own items, sales, staff, and branches.{" "}
            {nextOneIsFree ? "Included free on your Pro plan." : `${currency(ADDITIONAL_BUSINESS_PRICE)}/month, paid via PayChangu.`}
          </p>
          <input style={styles.textInput} placeholder="Business name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <select style={styles.textInput} value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button style={{ ...styles.primaryBtnSmall, opacity: (newName.trim() && !creating) ? 1 : 0.5 }} disabled={!newName.trim() || creating} onClick={startAddBusiness}>
            {nextOneIsFree ? <Check size={16} /> : <Wallet size={16} />}
            {creating ? "Creating…" : nextOneIsFree ? "Add business (free on Pro)" : `Pay ${currency(ADDITIONAL_BUSINESS_PRICE)} with PayChangu`}
          </button>
          <button style={{ ...styles.logoutBtn, marginTop: 8 }} onClick={() => setShowAddForm(false)}><X size={15} /> Cancel</button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PERSONAL / FAMILY BUDGET (owner only)
   Entirely separate from the business's own numbers — this is the owner's own
   money. Supports multiple named budgets (e.g. "Personal", "Family"), each with
   its own editable categories, a monthly plan, and logged actual spending —
   plus a simple year-so-far rollup so you can see how a category trends over
   the year, not just one month.
   ========================================================= */
const BUDGET_CATEGORY_PRESETS = ["Food & Groceries", "Rent / Housing", "Transport", "Utilities", "School fees", "Healthcare", "Entertainment", "Savings", "Other"];

function budgetMonthEntries(budget, date) {
  return (budget.entries || []).filter((e) => {
    const d = new Date(e.ts);
    return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
  });
}
function budgetTotals(budget, date) {
  const entries = budgetMonthEntries(budget, date);
  const spentByCat = {};
  entries.forEach((e) => { spentByCat[e.categoryId] = (spentByCat[e.categoryId] || 0) + e.amount; });
  const totalPlanned = (budget.categories || []).reduce((s, c) => s + (c.planned || 0), 0);
  const totalSpent = entries.reduce((s, e) => s + e.amount, 0);
  return { spentByCat, totalPlanned, totalSpent };
}

function BudgetPanel({ biz, persist, notify, setTab }) {
  const budgets = biz.personalBudgets || [];
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCats, setNewCats] = useState([]); // [{ name, planned }] — draft categories before the budget is created
  const [catNameInput, setCatNameInput] = useState("");
  const [catPlannedInput, setCatPlannedInput] = useState("");

  const selected = budgets.find((b) => b.id === selectedId);

  const addPresetCat = (name) => {
    if (newCats.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setNewCats([...newCats, { name, planned: "" }]);
  };
  const addCustomCat = () => {
    const clean = catNameInput.trim();
    if (!clean) return;
    if (newCats.some((c) => c.name.toLowerCase() === clean.toLowerCase())) { setCatNameInput(""); return; }
    setNewCats([...newCats, { name: clean, planned: catPlannedInput }]);
    setCatNameInput(""); setCatPlannedInput("");
  };
  const removeDraftCat = (name) => setNewCats(newCats.filter((c) => c.name !== name));
  const setDraftCatPlanned = (name, val) => setNewCats(newCats.map((c) => c.name === name ? { ...c, planned: val } : c));

  const createBudget = () => {
    if (!newName.trim() || newCats.length === 0) return;
    const budget = {
      id: uid("bud"), name: newName.trim(), ts: Date.now(),
      categories: newCats.map((c) => ({ id: uid("bcat"), name: c.name, planned: Number(c.planned) || 0 })),
      entries: [],
    };
    persist({ ...biz, personalBudgets: [budget, ...budgets] });
    setNewName(""); setNewCats([]); setShowCreate(false);
    setSelectedId(budget.id);
  };

  const removeBudget = (id) => {
    const b = budgets.find((x) => x.id === id);
    if (!window.confirm(`Delete "${b?.name || "this budget"}"? All its categories and logged spending will be gone for good.`)) return;
    persist({ ...biz, personalBudgets: budgets.filter((b) => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  if (selected) {
    return <BudgetDetail biz={biz} persist={persist} notify={notify} budget={selected} onBack={() => setSelectedId(null)} onDelete={() => removeBudget(selected.id)} />;
  }

  const now = new Date();

  return (
    <div style={styles.panel}>
      <SectionTitle title="Budget" />
      <p style={styles.helperText}>Your own money, kept separate from the business — track personal or family spending against a plan you set. Nothing here affects your business reports.</p>

      <div style={styles.panelHeader}>
        <SectionTitle title="Your budgets" small />
        <button style={styles.addBtn} onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New budget</>}
        </button>
      </div>

      {showCreate && (
        <div style={styles.formCard}>
          <input style={styles.textInput} placeholder="Budget name (e.g. Personal, Family)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div style={styles.miniLabel}>Categories</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {BUDGET_CATEGORY_PRESETS.filter((p) => !newCats.some((c) => c.name === p)).map((p) => (
              <button key={p} type="button" style={{ ...styles.paymentChip, flex: "none" }} onClick={() => addPresetCat(p)}>+ {p}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...styles.textInput, marginBottom: 0 }} placeholder="Custom category…" value={catNameInput}
              onChange={(e) => setCatNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCat(); } }} />
            <button type="button" style={styles.smallAddBtn} onClick={addCustomCat}>Add</button>
          </div>

          {newCats.length > 0 && (
            <div style={styles.cartBox}>
              {newCats.map((c) => (
                <div key={c.name} style={styles.cartRow}>
                  <span>{c.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" placeholder="Planned/month" style={{ ...styles.textInputHalf, maxWidth: 110, padding: "6px 8px" }}
                      value={c.planned} onChange={(e) => setDraftCatPlanned(c.name, e.target.value)} />
                    <button type="button" style={{ ...styles.iconBtn, padding: 0 }} onClick={() => removeDraftCat(c.name)}><X size={13} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <button style={{ ...styles.primaryBtnSmall, opacity: (newName.trim() && newCats.length) ? 1 : 0.4 }}
            disabled={!newName.trim() || !newCats.length} onClick={createBudget}>
            <Check size={16} /> Create budget
          </button>
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState text="Create a budget above — personal, family, whatever you like — and start tracking planned vs actual spending." icon={PiggyBank} />
      ) : (
        <div style={styles.list}>
          {budgets.map((b) => {
            const { totalPlanned, totalSpent } = budgetTotals(b, now);
            const pct = totalPlanned > 0 ? Math.min(100, Math.round((totalSpent / totalPlanned) * 100)) : 0;
            const over = totalPlanned > 0 && totalSpent > totalPlanned;
            return (
              <button key={b.id} className="lift-card" style={styles.listRowClickable} onClick={() => setSelectedId(b.id)}>
                <div style={{ flex: 1 }}>
                  <div style={styles.listRowTitle}>{b.name}</div>
                  <div style={styles.listRowSub}>{b.categories.length} categor{b.categories.length !== 1 ? "ies" : "y"} · {currency(totalSpent)} of {currency(totalPlanned)} this month</div>
                  <div style={{ height: 6, background: "var(--bg)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: over ? "#B23A2E" : "var(--accent)", borderRadius: 4 }} />
                  </div>
                </div>
                <ChevronRight size={16} color="var(--ink-faint)" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BudgetDetail({ biz, persist, notify, budget, onBack, onDelete }) {
  const budgets = biz.personalBudgets || [];
  const [monthDate, setMonthDate] = useState(new Date());
  const [view, setView] = useState("month"); // month | year
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ categoryId: budget.categories[0]?.id || "", amount: "", note: "", date: toDateInputValue(new Date()) });
  const [showManageCats, setShowManageCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatPlanned, setNewCatPlanned] = useState("");
  const today = new Date();

  const updateBudget = (patch) => {
    persist({ ...biz, personalBudgets: budgets.map((b) => b.id === budget.id ? { ...b, ...patch } : b) });
  };

  const shiftMonth = (delta) => { const d = new Date(monthDate); d.setMonth(d.getMonth() + delta); setMonthDate(d); };
  const isCurrentMonth = monthDate.getFullYear() === today.getFullYear() && monthDate.getMonth() === today.getMonth();

  const { spentByCat, totalPlanned, totalSpent } = budgetTotals(budget, monthDate);

  const addEntry = () => {
    if (!entryForm.categoryId || !entryForm.amount) return;
    const amount = Number(entryForm.amount) || 0;
    const entry = { id: uid("bentry"), categoryId: entryForm.categoryId, amount, note: entryForm.note.trim(), ts: new Date(entryForm.date + "T12:00:00").getTime() };
    const cat = budget.categories.find((c) => c.id === entryForm.categoryId);
    const entryDate = new Date(entry.ts);
    const priorSpent = budgetMonthEntries(budget, entryDate).filter((e) => e.categoryId === entryForm.categoryId).reduce((s, e) => s + e.amount, 0);
    const newSpent = priorSpent + amount;
    let nextBiz = { ...biz, personalBudgets: budgets.map((b) => b.id === budget.id ? { ...b, entries: [entry, ...(b.entries || [])] } : b) };
    // Only fires the moment spending first crosses the plan for that category/month —
    // not on every entry after, so it doesn't spam the Alerts tab.
    if (notify && cat && cat.planned > 0 && priorSpent <= cat.planned && newSpent > cat.planned) {
      nextBiz = notify(nextBiz, "budget", `Budget alert — "${cat.name}" in ${budget.name} is now over its planned ${currency(cat.planned)}/month (spent ${currency(newSpent)} this month).`);
    }
    persist(nextBiz);
    setEntryForm({ categoryId: entryForm.categoryId, amount: "", note: "", date: toDateInputValue(new Date()) });
    setShowAddEntry(false);
  };
  const removeEntry = (id) => {
    if (!window.confirm("Remove this logged spending entry?")) return;
    updateBudget({ entries: (budget.entries || []).filter((e) => e.id !== id) });
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const cat = { id: uid("bcat"), name: newCatName.trim(), planned: Number(newCatPlanned) || 0 };
    updateBudget({ categories: [...budget.categories, cat] });
    setNewCatName(""); setNewCatPlanned("");
  };
  const removeCategory = (id) => {
    const cat = budget.categories.find((c) => c.id === id);
    if (!window.confirm(`Remove "${cat?.name || "this category"}"? Any spending already logged under it will be removed too.`)) return;
    updateBudget({ categories: budget.categories.filter((c) => c.id !== id), entries: (budget.entries || []).filter((e) => e.categoryId !== id) });
  };
  const setCategoryPlanned = (id, val) => {
    updateBudget({ categories: budget.categories.map((c) => c.id === id ? { ...c, planned: Number(val) || 0 } : c) });
  };

  // Year so far: every entry logged this calendar year, compared against the plan
  // multiplied by however many months have elapsed (including the current one).
  const monthsElapsed = today.getMonth() + 1;
  const yearEntries = (budget.entries || []).filter((e) => new Date(e.ts).getFullYear() === today.getFullYear());
  const yearSpentByCat = {};
  yearEntries.forEach((e) => { yearSpentByCat[e.categoryId] = (yearSpentByCat[e.categoryId] || 0) + e.amount; });
  const yearTotalSpent = yearEntries.reduce((s, e) => s + e.amount, 0);
  const yearTotalPlanned = totalPlanned * monthsElapsed;

  const monthEntries = budgetMonthEntries(budget, monthDate).sort((a, b) => b.ts - a.ts);

  const [aiAdvice, setAiAdvice] = useState("");
  const [aiAdviceBusy, setAiAdviceBusy] = useState(false);
  const [aiAdviceError, setAiAdviceError] = useState("");

  const getAiAdvice = async () => {
    setAiAdviceBusy(true); setAiAdviceError(""); setAiAdvice("");
    const result = await callAiAssist("budget_advice", {
      budgetName: budget.name,
      categories: budget.categories.map((c) => ({ name: c.name, planned: c.planned, spent: spentByCat[c.id] || 0 })),
    });
    setAiAdviceBusy(false);
    if (!result.ok) { setAiAdviceError(result.error); return; }
    setAiAdvice(result.data.text || "");
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={onBack} label="Budgets" />
      <div style={styles.panelHeader}>
        <SectionTitle title={budget.name} />
        <button style={styles.addBtn} onClick={() => setShowAddEntry((s) => !s)}>
          {showAddEntry ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Log spending</>}
        </button>
      </div>

      <div style={styles.segmentedRow}>
        <button style={{ ...styles.segmentBtn, ...(view === "month" ? styles.segmentBtnActive : {}) }} onClick={() => setView("month")}>This month</button>
        <button style={{ ...styles.segmentBtn, ...(view === "year" ? styles.segmentBtnActive : {}) }} onClick={() => setView("year")}>Year so far</button>
      </div>

      {view === "month" && (
        <div style={styles.dateNavRow}>
          <button style={styles.dateNavArrow} onClick={() => shiftMonth(-1)}>‹</button>
          <div style={styles.dateNavCenter}>
            <div style={styles.dateNavLabel}>{isCurrentMonth ? "This month" : monthDate.toLocaleDateString("default", { month: "long", year: "numeric" })}</div>
          </div>
          <button style={styles.dateNavArrow} onClick={() => shiftMonth(1)} disabled={isCurrentMonth}>›</button>
        </div>
      )}

      {showAddEntry && (
        <div style={styles.formCard}>
          <select style={styles.textInput} value={entryForm.categoryId} onChange={(e) => setEntryForm((f) => ({ ...f, categoryId: e.target.value }))}>
            {budget.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input style={styles.textInput} type="number" placeholder="Amount (MWK)" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} />
          <label style={styles.listRowSub}>Date</label>
          <input style={{ ...styles.textInput, marginTop: 6 }} type="date" max={toDateInputValue(today)} value={entryForm.date}
            onChange={(e) => e.target.value && setEntryForm((f) => ({ ...f, date: e.target.value }))} />
          <input style={styles.textInput} placeholder="Note (optional)" value={entryForm.note} onChange={(e) => setEntryForm((f) => ({ ...f, note: e.target.value }))} />
          <button style={styles.primaryBtnSmall} onClick={addEntry}><Check size={16} /> Save</button>
        </div>
      )}

      <div style={styles.statGrid}>
        <StatCard label={view === "month" ? "Planned this month" : "Planned so far this year"} value={currency(view === "month" ? totalPlanned : yearTotalPlanned)} />
        <StatCard label="Actual spent" value={currency(view === "month" ? totalSpent : yearTotalSpent)} />
      </div>

      <button style={{ ...styles.smallAddBtn, marginBottom: 12 }} disabled={aiAdviceBusy} onClick={getAiAdvice}>
        <Sparkles size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> {aiAdviceBusy ? "Thinking…" : "Get AI advice on this budget"}
      </button>
      {aiAdviceError && <div style={styles.authError}>{aiAdviceError}</div>}
      {aiAdvice && <Callout icon={Sparkles} tone="info">{aiAdvice}</Callout>}

      <SectionTitle title="By category" small />
      <div style={styles.list}>
        {budget.categories.map((c) => {
          const spent = view === "month" ? (spentByCat[c.id] || 0) : (yearSpentByCat[c.id] || 0);
          const planned = view === "month" ? c.planned : c.planned * monthsElapsed;
          const pct = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : (spent > 0 ? 100 : 0);
          const over = planned > 0 && spent > planned;
          return (
            <div key={c.id} style={styles.formCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={styles.listRowTitle}>{c.name}</div>
                <div style={{ ...styles.mono, color: over ? "#B23A2E" : "inherit" }}>{currency(spent)} / {currency(planned)}</div>
              </div>
              <div style={{ height: 7, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: over ? "#B23A2E" : "var(--accent)", borderRadius: 4 }} />
              </div>
              {over && <div style={{ fontSize: 11.5, color: "#B23A2E", marginTop: 4, fontWeight: 600 }}>Over by {currency(spent - planned)}</div>}
            </div>
          );
        })}
      </div>

      {view === "month" && (
        <>
          <SectionTitle title="Logged this month" small />
          {monthEntries.length === 0 ? (
            <EmptyState text="Nothing logged yet this month." icon={Wallet} />
          ) : (
            <div style={styles.list}>
              {monthEntries.map((e) => {
                const cat = budget.categories.find((c) => c.id === e.categoryId);
                return (
                  <div key={e.id} style={styles.listRow}>
                    <div>
                      <div style={styles.listRowTitle}>{cat?.name || "Uncategorized"}</div>
                      <div style={styles.listRowSub}>{e.note ? `${e.note} · ` : ""}{new Date(e.ts).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={styles.mono}>{currency(e.amount)}</span>
                      <button style={styles.iconBtn} onClick={() => removeEntry(e.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <button type="button" style={styles.textLinkBtn} onClick={() => setShowManageCats((s) => !s)}>
        {showManageCats ? "Hide" : "Manage"} categories
      </button>
      {showManageCats && (
        <div style={{ ...styles.formCard, marginTop: 10 }}>
          {budget.categories.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13.5 }}>{c.name}</span>
              <input type="number" style={{ ...styles.textInputHalf, maxWidth: 110, padding: "8px 10px" }} value={c.planned}
                onChange={(e) => setCategoryPlanned(c.id, e.target.value)} placeholder="Planned/month" />
              <button style={styles.iconBtn} onClick={() => removeCategory(c.id)}><Trash2 size={15} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input style={{ ...styles.textInput, marginBottom: 0 }} placeholder="New category…" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            <input type="number" style={{ ...styles.textInputHalf, maxWidth: 110 }} placeholder="Planned" value={newCatPlanned} onChange={(e) => setNewCatPlanned(e.target.value)} />
            <button style={styles.smallAddBtn} onClick={addCategory}>Add</button>
          </div>
        </div>
      )}

      <button style={{ ...styles.logoutBtn, marginTop: 16 }} onClick={onDelete}><Trash2 size={15} /> Delete this budget</button>
    </div>
  );
}

/* =========================================================
   ALERTS / NOTIFICATIONS
   ========================================================= */
function AlertsPanel({ biz, persist }) {
  const markAllRead = () => {
    persist({ ...biz, notifications: biz.notifications.map((n) => ({ ...n, read: true })) });
  };
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <SectionTitle title="Alerts" />
        {biz.notifications.some((n) => !n.read) && (
          <button style={styles.textLinkBtn} onClick={markAllRead}>Mark all read</button>
        )}
      </div>
      {biz.notifications.length === 0 ? (
        <EmptyState text="You'll see payment confirmations and stock alerts here as they happen." icon={Bell} />
      ) : (
        <div style={styles.list}>
          {biz.notifications.map((n) => (
            <div key={n.id} style={{ ...styles.listRow, opacity: n.read ? 0.55 : 1 }}>
              <Bell size={15} color="var(--accent)" style={{ marginTop: 2 }} />
              <div style={{ marginLeft: 10 }}>
                <div style={styles.listRowTitle}>{n.message}</div>
                <div style={styles.listRowSub}>{new Date(n.ts).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MARKETING (placeholder — needs external services)
   ========================================================= */
function MarketingPanel({ biz, category, setTab }) {
  const branding = biz.profile.branding || {};
  const [productId, setProductId] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [description, setDescription] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [priceUnit, setPriceUnit] = useState("");
  const [features, setFeatures] = useState(["", "", ""]);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const canvasRef = useRef(null);

  const [aiRequest, setAiRequest] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const [ideas, setIdeas] = useState([]);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [ideasError, setIdeasError] = useState("");

  const applyProduct = (id) => {
    setProductId(id);
    const item = biz.items.find((i) => i.id === id);
    if (item) {
      setHeadline(item.name);
      setPriceLabel(currency(item.price).replace("MWK ", "K"));
      setPriceUnit(category.hasStock && item.unit && item.unit !== "pcs" ? `per ${item.unit}` : "each");
    }
  };

  const onPhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataUrl(file);
    setPhotoDataUrl(await resizeDataUrl(raw, 900));
  };
  const setFeature = (idx, val) => setFeatures((f) => f.map((x, i) => (i === idx ? val : x)));

  // Sends a short plain-English request (e.g. "simple flyer for rice bags", "detailed
  // flyer with selling points") to the shared AI helper, and fills the form from what
  // comes back. The price stays under your control — AI only writes the wording.
  const generateWithAI = async () => {
    if (!aiRequest.trim()) return;
    setAiBusy(true); setAiError("");
    const result = await callAiAssist("flyer", {
      request: aiRequest.trim(),
      businessType: category.name,
      productName: headline || biz.items.find((i) => i.id === productId)?.name || "",
    });
    setAiBusy(false);
    if (!result.ok) { setAiError(result.error); return; }
    if (result.data.headline) setHeadline(result.data.headline);
    if (result.data.subheadline) setSubheadline(result.data.subheadline);
    if (result.data.description) setDescription(result.data.description);
    if (Array.isArray(result.data.features)) setFeatures([result.data.features[0] || "", result.data.features[1] || "", result.data.features[2] || ""]);
  };

  const suggestIdeas = async () => {
    setIdeasBusy(true); setIdeasError("");
    const result = await callAiAssist("content_ideas", { businessType: category.businessSubtypeName || category.name, businessName: biz.profile.name });
    setIdeasBusy(false);
    if (!result.ok) { setIdeasError(result.error); return; }
    setIdeas(Array.isArray(result.data.ideas) ? result.data.ideas : []);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    drawFlyer(canvasRef.current, {
      businessName: biz.profile.name,
      tagline: biz.profile.businessSubtypeName || category.name,
      logoSrc: branding.logo,
      headline: headline || `Your ${category.itemLabel.toLowerCase()}`,
      subheadline, description, priceLabel, priceUnit, features,
      photoSrc: photoDataUrl,
      phone: biz.profile.phone, location: biz.profile.location,
      color: branding.primaryColor || category.theme.accent,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, subheadline, description, priceLabel, priceUnit, features, photoDataUrl, biz.profile.name, biz.profile.phone, biz.profile.location]);

  const downloadFlyer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${(biz.profile.name || "flyer").replace(/[^a-z0-9]/gi, "_")}_flyer.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareFlyer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const file = new File([blob], "flyer.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: headline || "Flyer" });
          return;
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
      downloadFlyer();
      alert("Your device can't share images directly from here — the flyer has been downloaded instead. Attach it from your photos/downloads to WhatsApp or Facebook.");
    }, "image/png");
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Marketing" />
      <p style={styles.helperText}>Build a flyer using your logo, brand color, and a product's details, then share it straight to WhatsApp or Facebook.</p>

      <div style={styles.formCard}>
        <div style={styles.miniLabel}>Ask AI to write it for you (optional)</div>
        <textarea style={styles.textArea} rows={2} placeholder='e.g. "simple flyer for rice bags" or "detailed flyer with selling points and price"'
          value={aiRequest} onChange={(e) => setAiRequest(e.target.value)} />
        <button style={{ ...styles.primaryBtnSmall, opacity: aiRequest.trim() ? 1 : 0.5 }} disabled={!aiRequest.trim() || aiBusy} onClick={generateWithAI}>
          <Sparkles size={16} /> {aiBusy ? "Writing…" : "Generate with AI"}
        </button>
        {aiError && <div style={styles.authError}>{aiError}</div>}
      </div>

      <div style={styles.formCard}>
        {biz.items.length > 0 && (
          <select style={styles.textInput} value={productId} onChange={(e) => applyProduct(e.target.value)}>
            <option value="">Start from a {category.itemLabel.toLowerCase()}… (optional)</option>
            {biz.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        )}
        <input style={styles.textInput} placeholder="Headline (e.g. Fresh Tomato Seedlings)" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <input style={styles.textInput} placeholder="Short banner text (optional, e.g. Tengeru Select)" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
        <textarea style={styles.textArea} rows={2} placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div style={styles.formRow}>
          <input style={styles.textInputHalf} placeholder="Price (e.g. K50)" value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} />
          <input style={styles.textInputHalf} placeholder="Unit (e.g. each, per kg)" value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} />
        </div>
        <div style={styles.miniLabel}>Selling points (up to 3)</div>
        {features.map((f, i) => (
          <input key={i} style={styles.textInput} placeholder={`Selling point ${i + 1}`} value={f} onChange={(e) => setFeature(i, e.target.value)} />
        ))}
        <div style={styles.miniLabel}>Photo (optional)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          {photoDataUrl && <img src={photoDataUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid var(--line)" }} />}
          <label style={{ ...styles.smallAddBtn, display: "inline-block" }}>
            {photoDataUrl ? "Change photo" : "Upload photo"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onPhotoFile} />
          </label>
        </div>
        {(!biz.profile.phone || !biz.profile.location) && (
          <p style={{ ...styles.helperText, marginTop: 12, marginBottom: 0 }}>Tip: add your phone number and location in Settings so they show on the flyer.</p>
        )}
      </div>

      <SectionTitle title="Preview" small />
      <div style={{ background: "var(--bg)", borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", justifyContent: "center" }}>
        <canvas ref={canvasRef} style={{ width: "100%", maxWidth: 320, borderRadius: 10, boxShadow: "0 10px 30px rgba(16,24,40,0.15)" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...styles.primaryBtnSmall, flex: 1 }} onClick={downloadFlyer}><Download size={16} /> Download</button>
        <button style={{ ...styles.printBtn, flex: 1, marginTop: 0 }} onClick={shareFlyer}><Share2 size={15} /> Share</button>
      </div>

      <SectionTitle title="Content ideas" small />
      <p style={styles.helperText}>A handful of quick post ideas for WhatsApp Status or Facebook, based on your business — tap Share to send one straight out.</p>
      <button style={{ ...styles.primaryBtnSmall, marginBottom: 12 }} disabled={ideasBusy} onClick={suggestIdeas}>
        <Sparkles size={16} /> {ideasBusy ? "Thinking…" : ideas.length ? "Suggest new ideas" : "Suggest post ideas"}
      </button>
      {ideasError && <div style={styles.authError}>{ideasError}</div>}
      {ideas.length > 0 && (
        <div style={styles.list}>
          {ideas.map((idea, i) => (
            <div key={i} style={styles.listRow}>
              <div style={{ flex: 1 }}><div style={styles.listRowTitle}>{idea}</div></div>
              <button style={styles.iconBtn} title="Share" onClick={() => shareText("Post idea", idea)}><Share2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CALCULATOR / TAX & DISCOUNT TOOL
   ========================================================= */
function CalculatorPanel({ biz, persist, setTab }) {
  const [amount, setAmount] = useState("");
  const [taxRate, setTaxRate] = useState(String(biz.settings?.taxRate || 0));
  const [discountRate, setDiscountRate] = useState(String(biz.settings?.discountRate || 0));

  const base = Number(amount) || 0;
  const discountAmt = base * (Number(discountRate) / 100 || 0);
  const taxAmt = (base - discountAmt) * (Number(taxRate) / 100 || 0);
  const finalTotal = base - discountAmt + taxAmt;

  const applyAsDefault = () => {
    persist({ ...biz, settings: { ...biz.settings, taxRate: Number(taxRate) || 0, discountRate: Number(discountRate) || 0 } });
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Price calculator" />
      <p style={styles.helperText}>Work out a total with tax and discount, or set these as the default applied to every new order.</p>

      <div style={styles.formCard}>
        <input style={styles.textInput} type="number" placeholder="Amount (MWK)"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div style={styles.formRow}>
          <div style={{ flex: 1 }}>
            <div style={styles.miniLabel}>Discount %</div>
            <input style={styles.textInputHalf} type="number" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.miniLabel}>Tax %</div>
            <input style={styles.textInputHalf} type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
        </div>

        <div style={styles.cartBox}>
          <div style={styles.cartRow}><span>Subtotal</span><span style={styles.mono}>{currency(base)}</span></div>
          <div style={styles.cartRow}><span>Discount</span><span style={styles.mono}>−{currency(discountAmt)}</span></div>
          <div style={styles.cartRow}><span>Tax</span><span style={styles.mono}>+{currency(taxAmt)}</span></div>
          <div style={styles.cartTotalRow}><span>Total</span><span style={styles.mono}>{currency(finalTotal)}</span></div>
        </div>

        <button style={styles.primaryBtnSmall} onClick={applyAsDefault}>
          <Check size={16} /> Set as default tax &amp; discount rules
        </button>
      </div>

      {biz.settings?.taxRate > 0 || biz.settings?.discountRate > 0 ? (
        <Callout icon={Calculator} tone="info">
          Every new {biz.profile.categoryId === "service" ? "booking" : "order"} currently applies {biz.settings.taxRate}% tax
          {biz.settings.discountRate > 0 ? ` and a ${biz.settings.discountRate}% discount above ${currency(biz.settings.discountThreshold || 0)}` : ""}.
        </Callout>
      ) : null}
    </div>
  );
}

/* =========================================================
   DOCUMENT GENERATOR (letters, offers, apologies)
   ========================================================= */
const LETTER_TEMPLATES = [
  { id: "recommendation", label: "Recommendation letter", forWhom: "employee",
    body: (biz, emp, extra) => `To Whom It May Concern,

I am writing to recommend ${emp?.name || "[Employee Name]"}, who has worked with ${biz.profile.name} ${["owner", "full", "manager"].includes(emp?.role) ? "as part of management" : `as a ${emp ? "team member" : "[Role]"}`}.

${extra || "During their time with us, they have shown strong commitment, reliability, and a positive attitude toward their work."}

Please feel free to reach out if you require further information.

Sincerely,
[Manager Name]
${biz.profile.name}` },
  { id: "offer", label: "Job offer letter", forWhom: "employee",
    body: (biz, emp, extra) => `Dear ${emp?.name || "[Candidate Name]"},

We are pleased to offer you a position at ${biz.profile.name}.

${extra || "Please find the role details and start date to be confirmed. We look forward to having you join the team."}

Kindly confirm your acceptance at your earliest convenience.

Warm regards,
[Manager Name]
${biz.profile.name}` },
  { id: "apology", label: "Apology letter (to a client)", forWhom: "customer",
    body: (biz, cust, extra) => `Dear ${cust?.name || "[Client Name]"},

We sincerely apologize for the inconvenience you experienced with your recent order from ${biz.profile.name}.

${extra || "We take this seriously and are taking steps to make sure it doesn't happen again. We value your business and hope to serve you better going forward."}

Thank you for your patience and understanding.

Sincerely,
${biz.profile.name}` },
  { id: "warning", label: "Warning letter", forWhom: "employee",
    body: (biz, emp, extra) => `Dear ${emp?.name || "[Employee Name]"},

This letter serves as a formal warning regarding ${extra || "[describe the issue]"}.

We expect this matter to be addressed immediately. Please treat this as a serious notice.

Regards,
[Manager Name]
${biz.profile.name}` },
  { id: "lease", label: "Lease / Rental agreement", forWhom: "customer",
    body: (biz, tenant, extra, property) => `RENTAL AGREEMENT

This agreement is made between ${biz.profile.name} ("the Landlord") and ${tenant?.name || "[Tenant Name]"} ("the Tenant").

Property: ${property?.name || "[Property Name/Address]"}
Monthly rent: ${property?.price ? currency(property.price) : "[Monthly Rent Amount]"}

${extra || "The Tenant agrees to pay the monthly rent on or before the 1st of each month. The Tenant agrees to keep the property in good condition and report any damages promptly. Either party may terminate this agreement with 30 days' written notice."}

Signed,

_____________________          _____________________
Landlord                        Tenant

${biz.profile.name}` },
];

function DocumentsPanel({ biz, category, persist, setTab, canEditBranding = true }) {
  const [templateId, setTemplateId] = useState(category?.id === "property" ? "lease" : LETTER_TEMPLATES[0].id);
  const template = LETTER_TEMPLATES.find((t) => t.id === templateId);
  const [personId, setPersonId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [extra, setExtra] = useState("");
  const [preview, setPreview] = useState(null);
  const [showBranding, setShowBranding] = useState(false);
  const [signatureMode, setSignatureMode] = useState("draw");
  const [colorHint, setColorHint] = useState(null);

  const branding = biz.profile.branding || {};
  const [address, setAddress] = useState(branding.address || "");
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || "#1449B0");

  const people = template.forWhom === "employee" ? biz.employees : biz.customers;
  const isLeaseTemplate = templateId === "lease";

  const [aiDraftInput, setAiDraftInput] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftError, setAiDraftError] = useState("");

  // Drafts just the middle section of the letter (the "extra" text below) from a short
  // description of the situation — the rest of the template (names, business name,
  // signature) stays exactly as it already works.
  const draftWithAI = async () => {
    if (!aiDraftInput.trim()) return;
    setAiDrafting(true); setAiDraftError("");
    const result = await callAiAssist("letter", `Letter type: ${template.label}. Situation: ${aiDraftInput.trim()}`);
    setAiDrafting(false);
    if (!result.ok) { setAiDraftError(result.error); return; }
    setExtra(result.data.text || "");
  };

  // "Describe what you need" mode — skips templates entirely. AI writes the full letter
  // (greeting through sign-off) from one prompt; you only add logo/signature after, via
  // the branding section above, same as any other document.
  const [mode, setMode] = useState("template"); // template | prompt
  const [fullPrompt, setFullPrompt] = useState("");
  const [fullDraftText, setFullDraftText] = useState("");
  const [fullDrafting, setFullDrafting] = useState(false);
  const [fullDraftError, setFullDraftError] = useState("");

  const draftFullLetter = async () => {
    if (!fullPrompt.trim()) return;
    setFullDrafting(true); setFullDraftError(""); setFullDraftText("");
    const result = await callAiAssist("full_letter", fullPrompt.trim());
    setFullDrafting(false);
    if (!result.ok) { setFullDraftError(result.error); return; }
    setFullDraftText(result.data.text || "");
  };

  const generateFromPrompt = () => {
    if (!fullDraftText.trim()) return;
    const doc = { id: uid("doc"), templateId: "custom", templateLabel: "AI-generated letter", personName: "—", text: fullDraftText.trim(), ts: Date.now() };
    persist({ ...biz, documents: [doc, ...biz.documents] });
    setPreview(doc);
    setFullPrompt(""); setFullDraftText("");
  };

  const generate = () => {
    const person = people.find((p) => p.id === personId);
    const property = isLeaseTemplate ? biz.items.find((i) => i.id === propertyId) : null;
    const text = template.body(biz, person, extra.trim(), property);
    const doc = { id: uid("doc"), templateId, templateLabel: template.label, personName: person?.name || "Unnamed", text, ts: Date.now() };
    persist({ ...biz, documents: [doc, ...biz.documents] });
    setPreview(doc);
  };

  const saveBranding = (patch) => {
    persist({ ...biz, profile: { ...biz.profile, branding: { ...biz.profile.branding, ...patch } } });
  };

  const onLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataUrl(file);
    saveBranding({ logo: await resizeDataUrl(raw, 240) });
  };

  const onSignatureFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataUrl(file);
    saveBranding({ signature: await resizeDataUrl(raw, 320) });
  };

  const onSampleDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataUrl(file);
    const color = await extractDominantColor(raw);
    if (color) setColorHint(color);
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Documents" />
      <p style={styles.helperText}>Generate a letter using your business name and the selected person's details.</p>

      <div style={styles.formCard}>
        {canEditBranding && (
        <button type="button" style={styles.themeRow} onClick={() => setShowBranding((s) => !s)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {branding.logo
              ? <img src={branding.logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
              : <FileText size={18} color="var(--accent)" />}
            <span style={styles.listRowTitle}>Branding</span>
          </div>
          <ChevronRight size={16} style={{ transform: showBranding ? "rotate(90deg)" : "none" }} />
        </button>
        )}

        {showBranding && canEditBranding && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={styles.listRowSub}>Logo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                {branding.logo && <img src={branding.logo} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />}
                <label style={{ ...styles.smallAddBtn, display: "inline-block" }}>
                  Upload logo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={onLogoFile} />
                </label>
              </div>
            </div>

            <div>
              <div style={styles.listRowSub}>Brand color</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 40, height: 32, border: "none", background: "none" }} />
                <span style={styles.mono}>{primaryColor}</span>
              </div>
              {colorHint && (
                <button type="button" style={styles.textLinkBtn} onClick={() => setPrimaryColor(colorHint)}>
                  Use color picked up from your sample ({colorHint})
                </button>
              )}
            </div>

            <div>
              <div style={styles.listRowSub}>Business address (shown on documents)</div>
              <textarea style={{ ...styles.textArea, marginTop: 6, marginBottom: 0 }} rows={2}
                value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, town, region" />
            </div>

            <div>
              <div style={styles.listRowSub}>Signature</div>
              {branding.signature && (
                <img src={branding.signature} alt="" style={{ height: 50, marginTop: 6, marginBottom: 8, background: "#fff", borderRadius: 6, border: "1px solid var(--line)", display: "block" }} />
              )}
              <div style={styles.paymentMethodRow}>
                <button type="button" style={{ ...styles.paymentChip, ...(signatureMode === "draw" ? styles.paymentChipActive : {}) }} onClick={() => setSignatureMode("draw")}>Draw it</button>
                <button type="button" style={{ ...styles.paymentChip, ...(signatureMode === "upload" ? styles.paymentChipActive : {}) }} onClick={() => setSignatureMode("upload")}>Upload image</button>
              </div>
              <div style={{ marginTop: 10 }}>
                {signatureMode === "draw" ? (
                  <SignaturePad onSave={(dataUrl) => saveBranding({ signature: dataUrl })} />
                ) : (
                  <label style={{ ...styles.smallAddBtn, display: "inline-block" }}>
                    Choose image
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={onSignatureFile} />
                  </label>
                )}
              </div>
            </div>

            <button style={styles.primaryBtnSmall} onClick={() => saveBranding({ address: address.trim(), primaryColor })}>
              <Check size={16} /> Save address & color
            </button>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <div style={styles.listRowSub}>Have an example document — old letterhead, invoice, receipt?</div>
              <label style={{ ...styles.smallAddBtn, display: "inline-block", marginTop: 8 }}>
                Upload example document
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={onSampleDoc} />
              </label>
              <p style={styles.helperText}>This can pick out a brand color from it for you. Automatically pulling out the logo, signature, and address from a photo needs an AI step — that'll connect once the backend is built. For now, add those individually above.</p>
            </div>
          </div>
        )}

        <div style={styles.segmentedRow}>
          <button style={{ ...styles.segmentBtn, ...(mode === "template" ? styles.segmentBtnActive : {}) }} onClick={() => setMode("template")}>Use a template</button>
          <button style={{ ...styles.segmentBtn, ...(mode === "prompt" ? styles.segmentBtnActive : {}) }} onClick={() => setMode("prompt")}>Describe what you need</button>
        </div>

        {mode === "template" ? (
          <>
            <select style={styles.textInput} value={templateId} onChange={(e) => { setTemplateId(e.target.value); setPersonId(""); }}>
              {LETTER_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select style={styles.textInput} value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Select {template.forWhom === "employee" ? "employee" : category.customerNoun.toLowerCase()}…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {isLeaseTemplate && (
              <select style={styles.textInput} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Select property…</option>
                {itemsForBranch(biz.items, biz.settings?.activeBranchId).map((i) => (
                  <option key={i.id} value={i.id}>{i.name} — {currency(i.price)}/month</option>
                ))}
              </select>
            )}

            <div style={styles.miniLabel}>Ask AI to draft this section (optional)</div>
            <div style={styles.formRow}>
              <input style={{ ...styles.textInput, flex: 1, marginBottom: 0 }} placeholder="Describe the situation…" value={aiDraftInput} onChange={(e) => setAiDraftInput(e.target.value)} />
              <button style={styles.smallAddBtn} disabled={!aiDraftInput.trim() || aiDrafting} onClick={draftWithAI}>
                {aiDrafting ? "…" : "Draft"}
              </button>
            </div>
            {aiDraftError && <div style={styles.authError}>{aiDraftError}</div>}

            <textarea style={styles.textArea} placeholder={isLeaseTemplate ? "Add specific lease terms (optional) — deposit amount, lease length, house rules…" : "Add specific details (optional) — reason, dates, performance notes…"}
              value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} />
            <button style={styles.primaryBtnSmall} onClick={generate}>
              <FileText size={16} /> Generate letter
            </button>
          </>
        ) : (
          <>
            <p style={styles.helperText}>Write a short prompt describing what you need — who it's for, what it's about, any key details. AI writes the full letter; you just add your logo and signature above.</p>
            <textarea style={styles.textArea} rows={4} placeholder='e.g. "A recommendation letter for Grace, who worked as our cashier for 2 years, always punctual and great with customers"'
              value={fullPrompt} onChange={(e) => setFullPrompt(e.target.value)} />
            <button style={{ ...styles.primaryBtnSmall, opacity: fullPrompt.trim() ? 1 : 0.5 }} disabled={!fullPrompt.trim() || fullDrafting} onClick={draftFullLetter}>
              <Sparkles size={16} /> {fullDrafting ? "Writing…" : "Generate with AI"}
            </button>
            {fullDraftError && <div style={styles.authError}>{fullDraftError}</div>}

            {fullDraftText && (
              <>
                <div style={{ ...styles.miniLabel, marginTop: 14 }}>Review and edit before saving</div>
                <textarea style={{ ...styles.textArea, minHeight: 160 }} value={fullDraftText} onChange={(e) => setFullDraftText(e.target.value)} rows={8} />
                <button style={styles.primaryBtnSmall} onClick={generateFromPrompt}>
                  <Check size={16} /> Use this letter
                </button>
              </>
            )}
          </>
        )}
      </div>

      {biz.documents.length > 0 && (
        <>
          <SectionTitle title="Previously generated" small />
          <div style={styles.list}>
            {biz.documents.map((d) => (
              <button key={d.id} className="lift-card" style={styles.listRowClickable} onClick={() => setPreview(d)}>
                <div>
                  <div style={styles.listRowTitle}>{d.templateLabel}</div>
                  <div style={styles.listRowSub}>{d.personName} · {new Date(d.ts).toLocaleDateString()}</div>
                </div>
                <ChevronRight size={16} color="var(--ink-faint)" />
              </button>
            ))}
          </div>
        </>
      )}

      {preview && (
        <div style={styles.modalOverlay} onClick={() => setPreview(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...styles.invoiceHeader, borderBottomColor: branding.primaryColor || undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {branding.logo && <img src={branding.logo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />}
                <div>
                  <div style={{ ...styles.invoiceBrand, color: branding.primaryColor || undefined }}>{biz.profile.name}</div>
                  {branding.address && <div style={styles.invoiceMeta}>{branding.address}</div>}
                </div>
              </div>
              <button style={styles.iconBtn} onClick={() => setPreview(null)}><X size={18} /></button>
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, marginBottom: 8, color: branding.primaryColor || undefined }}>{preview.templateLabel}</div>
            <pre style={styles.letterText}>{preview.text}</pre>
            {branding.signature && (
              <div style={{ marginTop: 14 }}>
                <img src={branding.signature} alt="Signature" style={{ height: 50, background: "#fff" }} />
                <div style={styles.invoiceMeta}>Authorized signature</div>
              </div>
            )}
            <button style={styles.printBtn} onClick={() => window.print()}>
              <Printer size={15} /> Print / save as PDF
            </button>
            <button style={{ ...styles.printBtn, background: "none", border: "1px solid var(--line)", color: "var(--ink)" }}
              onClick={() => shareText(preview.templateLabel, preview.text)}>
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignaturePad({ onSave }) {
  const canvasRef = React.useRef(null);
  const drawingRef = React.useRef(false);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const start = (e) => {
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#101828";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const end = () => { drawingRef.current = false; };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };
  const save = () => onSave(canvasRef.current.toDataURL("image/png"));

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={300}
        height={120}
        style={{ width: "100%", height: 120, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, touchAction: "none" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" style={styles.smallAddBtn} onClick={clear}>Clear</button>
        <button type="button" style={styles.primaryBtnSmall} onClick={save}><Check size={16} /> Save signature</button>
      </div>
    </div>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */
/* =========================================================
   INTEGRATIONS
   ========================================================= */
function IntegrationsPanel({ setTab }) {
  const options = [
    { name: "Mobile money (Airtel Money / TNM Mpamba)", desc: "Auto-confirm payments instead of marking sales paid manually.", icon: Wallet },
    { name: "WhatsApp Business", desc: "Send receipts and order updates straight to customers' WhatsApp.", icon: MessageCircle },
    { name: "Accounting software (QuickBooks, Xero)", desc: "Sync your ledger so you don't enter numbers twice.", icon: BookOpen },
    { name: "SMS gateway", desc: "Low-stock and payment alerts sent by text, not just in-app.", icon: Bell },
  ];
  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("overview")} label="Overview" />
      <SectionTitle title="Integrations" />
      <Callout icon={Puzzle}>
        None of these are connected yet — this needs a real backend to talk to outside services securely, which is the next phase for this app. Listed here so you can see what's planned.
      </Callout>
      <div style={styles.list}>
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <div key={o.name} style={styles.listRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={styles.moreIconWrap}>
                  <Icon size={17} color="var(--accent)" />
                </div>
                <div>
                  <div style={styles.listRowTitle}>{o.name}</div>
                  <div style={styles.listRowSub}>{o.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   HELP
   ========================================================= */
function HelpPanel({ setTab }) {
  const faqs = [
    { q: "How do I add a new item or product?", a: `Go to ${"the Items tab"} and tap the + button. Fill in the name, price, and stock if you track it.` },
    { q: "How do I add a staff member?", a: "Go to Staff & HR (under More on phones, or the sidebar on desktop) and tap Add staff. You can assign them a role and a branch." },
    { q: "Why can't I see Accounting, Documents, or Staff & HR?", a: "Those are part of the Growth and Pro plans. Check Packages & Billing to upgrade, or see if your free trial is still active. On Starter, you can also add Accounting on its own for a smaller monthly add-on." },
    { q: "How do I give a customer a price quote before they buy?", a: "Use the Quotes & Estimates tab — build the quote from your items (or one-off lines like delivery), share it, then convert it to a real sale once they accept." },
    { q: "How do I see my bookings or rent due-dates on a calendar?", a: "Open the Calendar tab. Service businesses see bookings by day; Property businesses see rent due-dates, marked paid or overdue." },
    { q: "Where is my data stored?", a: "Right now, everything is saved on this device only, in this browser. It won't appear if you open the app on a different phone or computer — a real backend (coming later) will fix that." },
  ];
  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("overview")} label="Overview" />
      <SectionTitle title="Help" />
      <div style={styles.list}>
        {faqs.map((f, i) => (
          <div key={i} style={styles.listRow}>
            <div>
              <div style={styles.listRowTitle}>{f.q}</div>
              <div style={styles.listRowSub}>{f.a}</div>
            </div>
          </div>
        ))}
      </div>
      <SectionTitle title="Contact" small />
      <div style={styles.list}>
        <div style={styles.listRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={styles.moreIconWrap}><Phone size={17} color="var(--accent)" /></div>
            <div style={styles.listRowTitle}>Support line — add your business number here</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ biz, category, persist, setTab, onLogout, account }) {
  const [name, setName] = useState(biz.profile.name);
  const [categoryId, setCategoryId] = useState(biz.profile.categoryId);
  const [phone, setPhone] = useState(biz.profile.phone || "");
  const [location, setLocation] = useState(biz.profile.location || "");
  const [discountThreshold, setDiscountThreshold] = useState(String(biz.settings?.discountThreshold || ""));
  const [newCategoryTag, setNewCategoryTag] = useState("");
  const bizCategories = biz.categories || [];

  const saveProfile = () => {
    persist({ ...biz, profile: { ...biz.profile, name: name.trim() || biz.profile.name, categoryId, phone: phone.trim(), location: location.trim(), logoInitial: (name.trim() || biz.profile.name)[0]?.toUpperCase() } });
  };

  const setRecordingMode = (mode) => {
    persist({ ...biz, profile: { ...biz.profile, recordingMode: mode } });
  };

  const addBizCategory = () => {
    const clean = newCategoryTag.trim();
    if (!clean) return;
    if (bizCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) { setNewCategoryTag(""); return; }
    persist({ ...biz, categories: [...bizCategories, clean] });
    setNewCategoryTag("");
  };

  const removeBizCategory = (c) => {
    persist({ ...biz, categories: bizCategories.filter((x) => x !== c) });
  };

  const toggleTheme = () => {
    persist({ ...biz, settings: { ...biz.settings, theme: biz.settings.theme === "dark" ? "light" : "dark" } });
  };

  const saveDiscountThreshold = () => {
    persist({ ...biz, settings: { ...biz.settings, discountThreshold: Number(discountThreshold) || 0 } });
  };

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Settings" />

      <SectionTitle title="Account" small />
      <div style={styles.formCard}>
        <div style={styles.accountEmailRow}>
          <Mail size={15} color="var(--ink-faint)" />
          <span>{account?.email}</span>
        </div>
        {biz.profile.businessId && (
          <div style={styles.accountEmailRow}>
            <ShieldCheck size={15} color="var(--ink-faint)" />
            <span>Business ID: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{biz.profile.businessId}</span></span>
          </div>
        )}
        <div style={styles.seatMeter}>
          Plan: {tierOf(biz).name}
          {biz.profile.tier === "starter" && biz.profile.accountingAddon ? " + Accounting" : ""}
          {" — "}{tierOf(biz).seatLimit === Infinity ? "unlimited" : tierOf(biz).seatLimit} staff seat{tierOf(biz).seatLimit !== 1 ? "s" : ""}, {tierOf(biz).branchLimit === Infinity ? "unlimited" : tierOf(biz).branchLimit} branch{tierOf(biz).branchLimit !== 1 ? "es" : ""}
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}><LogOut size={15} /> Log out</button>
      </div>

      <SectionTitle title="Business profile" small />
      <div style={styles.formCard}>
        <input style={styles.textInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" />
        <select style={styles.textInput} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input style={styles.textInput} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone / WhatsApp number" />
        <input style={styles.textInput} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location / town" />
        <button style={styles.primaryBtnSmall} onClick={saveProfile}><Check size={16} /> Save profile</button>
      </div>

      <SectionTitle title="Sales recording" small />
      <div style={styles.formCard}>
        <p style={styles.helperText}>Choose how {category.orderNounPlural.toLowerCase()} get logged by default. You can still switch mode on any individual sale.</p>
        <div style={styles.staffSizeGrid}>
          {RECORDING_MODE_OPTIONS.map((opt) => {
            const active = (biz.profile.recordingMode || "detailed") === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setRecordingMode(opt.id)}
                style={{
                  ...styles.staffSizeCard,
                  borderColor: active ? "var(--accent, #1B4332)" : "var(--line)",
                  background: active ? "var(--accent-soft, #E3EFE7)" : "var(--surface)",
                }}
              >
                <div>{opt.label}{active ? " · Active" : ""}</div>
                <div style={{ fontSize: 12.5, fontWeight: 400, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.4 }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>

        <div style={styles.miniLabel}>Your {category.itemLabelPlural.toLowerCase()} categories</div>
        {bizCategories.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {bizCategories.map((c) => (
              <span key={c} style={{ ...styles.paymentChip, ...styles.paymentChipActive, flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
                {c}
                <button type="button" onClick={() => removeBizCategory(c)} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0 }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...styles.textInput, marginBottom: 0 }} placeholder="Add a category…"
            value={newCategoryTag} onChange={(e) => setNewCategoryTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBizCategory(); } }} />
          <button type="button" style={styles.smallAddBtn} onClick={addBizCategory}>Add</button>
        </div>
      </div>

      <SectionTitle title="Appearance" small />
      <button style={styles.themeRow} onClick={toggleTheme}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {biz.settings.theme === "dark" ? <Moon size={18} color="var(--accent)" /> : <Sun size={18} color="var(--accent)" />}
          <span style={styles.listRowTitle}>{biz.settings.theme === "dark" ? "Dark mode" : "Light mode"}</span>
        </div>
        <div style={{ ...styles.switchTrack, background: biz.settings.theme === "dark" ? "var(--accent)" : "var(--line)" }}>
          <div style={{ ...styles.switchThumb, transform: biz.settings.theme === "dark" ? "translateX(18px)" : "translateX(0)" }} />
        </div>
      </button>

      <SectionTitle title="Discount rule" small />
      <div style={styles.formCard}>
        <p style={styles.helperText}>Discount % is set from the Price calculator. Set the minimum order amount it applies from below.</p>
        <input style={styles.textInput} type="number" placeholder="Minimum order amount for discount (MWK)"
          value={discountThreshold} onChange={(e) => setDiscountThreshold(e.target.value)} />
        <button style={styles.primaryBtnSmall} onClick={saveDiscountThreshold}><Check size={16} /> Save</button>
      </div>
    </div>
  );
}

/* =========================================================
   MORE (Employees, Customers, Marketing, Reports on mobile)
   ========================================================= */
function MorePanel({ isOwner, isManager, currentEmployee, category, setTab }) {
  const has = (moduleId) => isOwner || isManager || hasModuleAccess(currentEmployee, moduleId);

  // Grouped by what the information actually is, not alphabetically — each group gets
  // its own color so the eye can tell sections apart at a glance instead of one long list.
  const groups = [
    {
      title: "Sales & customers",
      color: "#1B4332",
      rows: [
        { id: "quotes", label: "Quotes & Estimates", icon: ClipboardList, desc: "Give a formal price before a sale, then convert it once accepted", show: true },
        { id: "reminders", label: "Reminders", icon: MessageCircle, desc: "Today's follow-ups — appointments to confirm, payments to chase", show: true },
        { id: "calendar", label: "Calendar", icon: CalendarClock, desc: category.id === "property" ? "Rent due-dates, paid vs overdue, month by month" : `Your ${category.orderNounPlural.toLowerCase()} laid out day by day`, show: true },
        { id: "customers", label: category.customerNounPlural, icon: Users, desc: `Everyone who's had ${article(category.orderNoun)} ${category.orderNoun.toLowerCase()} with you`, show: true },
        { id: "calculator", label: "Price calculator", icon: Calculator, desc: "Work out tax & discount, set defaults", show: true },
      ],
    },
    {
      title: "Daily records",
      color: "#0F3A8C",
      rows: [
        { id: "activity", label: "Activity", icon: CalendarDays, desc: "Daily, weekly & monthly sales and expenses", show: has("reports") },
        { id: "expenses", label: "Expenses", icon: TrendingDown, desc: "Buying costs, damages/loss, money going out", show: has("reports") },
        { id: "suppliers", label: "Suppliers", icon: Truck, desc: "Contacts and running spend for who you restock from", show: has("reports") },
        { id: "purchaseOrders", label: "Purchase Orders", icon: PackageCheck, desc: "Send an order to a supplier before goods arrive", show: has("reports") },
      ],
    },
    {
      title: "Personal",
      color: "#0E7C7B",
      rows: [
        { id: "budget", label: "Budget", icon: PiggyBank, desc: "Your own personal or family budget — kept separate from the business", show: isOwner },
      ],
    },
    {
      title: "Money & accounting",
      color: "#8A6D00",
      rows: [
        { id: "accounting", label: "Accounting", icon: BookOpen, desc: "Profit & loss, ledger, receivables, balance sheet", show: has("accounting") },
        { id: "reports", label: "Reports", icon: BarChart3, desc: "Cash flow, gross & net profit, Excel export", show: has("reports") },
        { id: "billing", label: "Packages & billing", icon: Wallet, desc: "Manage your plan and paid add-ons", show: isOwner },
        { id: "businesses", label: "Businesses", icon: Building2, desc: "Switch between businesses, or add another one", show: isOwner },
      ],
    },
    {
      title: "People & locations",
      color: "#7A4FBF",
      rows: [
        { id: "employees", label: "Staff & HR", icon: ShieldCheck, desc: "Employee records, payroll, system access", show: has("hr") },
        { id: "branches", label: "Branches", icon: Store, desc: "Manage locations and see each one's performance", show: isOwner || has("branches") },
      ],
    },
    {
      title: "Growth",
      color: "#B23A2E",
      rows: [
        { id: "documents", label: "Documents", icon: FileText, desc: "Generate letters — offers, apologies, warnings", show: has("marketing") },
      ],
    },
    {
      title: "Business",
      color: "#3D3630",
      rows: [
        { id: "settings", label: "Settings", icon: Settings, desc: "Business profile, theme, discount rules", show: isOwner },
        { id: "help", label: "Help", icon: HelpCircle, desc: "FAQs and how to get support", show: true },
      ],
    },
  ].map((g) => ({ ...g, rows: g.rows.filter((r) => r.show) })).filter((g) => g.rows.length > 0);

  return (
    <div style={styles.panel}>
      <SectionTitle title="More" />
      {groups.map((g) => (
        <div key={g.title} style={{ marginBottom: 22 }}>
          <div style={styles.moreGroupTitleRow}>
            <span style={{ ...styles.moreGroupDot, background: g.color }} />
            <span style={styles.moreGroupTitle}>{g.title}</span>
          </div>
          <div style={styles.list}>
            {g.rows.map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.id} className="lift-card" style={styles.listRowClickable} onClick={() => setTab(r.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...styles.moreIconWrap, background: `${g.color}1A` }}>
                      <Icon size={17} color={g.color} />
                    </div>
                    <div>
                      <div style={styles.listRowTitle}>{r.label}</div>
                      <div style={styles.listRowSub}>{r.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--ink-faint)" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   BOTTOM NAV
   ========================================================= */
function BottomNav({ tab, setTab, isOwner, unread, category }) {
  const items = [
    { id: "overview", label: "Home", icon: BarChart3 },
    { id: "items", label: category.itemLabelPlural, icon: Package },
    { id: "orders", label: category.orderNounPlural, icon: Receipt },
    { id: "alerts", label: "Alerts", icon: Bell, badge: unread },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];
  const activeSet = {
    more: ["more", "employees", "branches", "customers", "reports", "accounting", "marketing", "documents", "billing", "settings", "calculator", "expenses", "activity", "integrations", "help", "quotes", "calendar", "reminders", "suppliers", "businesses", "budget", "purchaseOrders"],
  };
  return (
    <div style={styles.bottomNav} className="app-bottom-nav">
      {items.map((it) => {
        const Icon = it.icon;
        const active = activeSet.more.includes(tab) ? it.id === "more" : tab === it.id;
        return (
          <button key={it.id} style={styles.navBtn} onClick={() => setTab(it.id)}>
            <div style={{ position: "relative" }}>
              <Icon size={20} color={active ? "var(--accent)" : "var(--ink-faint)"} />
              {it.badge > 0 && <span style={styles.navBadge} />}
            </div>
            <span style={{ ...styles.navLabel, color: active ? "var(--accent)" : "var(--ink-faint)" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   STYLES / TOKENS
   ========================================================= */
const fontImports = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
  html, body {
    max-width: 100%;
    overflow-x: hidden;
  }
  :root {
    --ink: #101828;
    --ink-soft: #475467;
    --ink-faint: #8C97A8;
    --surface: #FFFFFF;
    --bg: #EEF3FB;
    --line: #D6E0F0;
    --accent: #1449B0;
    --accent-soft: #E5EDFB;
    --gold: #0F3A8C;
    --gold-soft: #DCE7F9;
    --sidebar-bg: #14181F;
    --sidebar-ink-faint: #8A93A6;
  }
  .app-shell { max-width: 480px; margin: 0 auto; flex-direction: column; }
  .app-sidebar { display: none; }
  .app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .lift-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .lift-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,24,40,0.10) !important; }
  .sidebar-item-btn:hover { background: rgba(255,255,255,0.06); color: #fff !important; }
  .primary-btn-smart:hover { filter: brightness(1.06); box-shadow: 0 6px 18px rgba(20,73,176,0.32) !important; }

  @media (min-width: 900px) {
    .app-shell {
      max-width: 1180px;
      flex-direction: row !important;
      margin: 20px auto;
      min-height: calc(100vh - 40px);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(16,24,40,0.10);
    }
    .app-sidebar { display: flex !important; }
    .app-bottom-nav { display: none !important; }
    .app-body { padding-bottom: 24px !important; }
    .stat-grid { grid-template-columns: repeat(4, 1fr) !important; }
  }
`;

const styles = {
  appShell: { fontFamily: "'Inter', sans-serif", background: "var(--bg)", minHeight: "100vh", display: "flex", color: "var(--ink)" },
  loadingScreen: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg, #EFEAE0)" },
  loadingMark: { fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 700, color: "#1B4332" },

  onboardShell: { fontFamily: "'Inter', sans-serif", background: "var(--bg)", minHeight: "100vh", maxWidth: 480, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  onboardMark: { fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 700, color: "var(--accent)", letterSpacing: -0.5 },
  onboardSub: { fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "var(--ink-faint)", marginTop: 2, marginBottom: 36 },
  onboardCard: { width: "100%" },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--gold)", fontWeight: 600, marginBottom: 10 },
  h1: { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, lineHeight: 1.25, margin: "0 0 16px 0", color: "var(--ink)" },
  helperText: { fontSize: 14, color: "var(--ink-soft)", marginBottom: 20, marginTop: -8 },
  helperBanner: { fontSize: 13, color: "var(--ink-soft)", background: "var(--surface-soft, rgba(120,120,120,0.08))", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, lineHeight: 1.4 },
  dateNavRow: { display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, boxShadow: "0 2px 8px rgba(28,27,23,0.05)" },
  segmentedRow: { display: "flex", gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 4, marginBottom: 14 },
  segmentBtn: { flex: 1, padding: "8px 0", borderRadius: 9, border: "none", background: "none", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit" },
  segmentBtnActive: { background: "var(--accent-soft)", color: "var(--accent)" },
  activitiesCard: { display: "block", width: "100%", textAlign: "left", background: "linear-gradient(135deg, var(--surface) 0%, var(--accent-soft) 220%)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, boxShadow: "0 4px 16px rgba(16,24,40,0.07)", cursor: "pointer", fontFamily: "inherit" },
  activitiesRow: { display: "flex", justifyContent: "space-between", gap: 8 },
  activitiesCol: { flex: 1 },
  activitiesLabel: { fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600 },
  activitiesValue: { fontSize: 15, fontWeight: 700, color: "var(--ink)" },
  activitiesFooter: { display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--accent)", fontWeight: 600, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" },
  dateNavArrow: { width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", fontSize: 18, color: "var(--ink)", cursor: "pointer", flexShrink: 0 },
  dateNavCenter: { flex: 1, textAlign: "center", position: "relative" },
  dateNavLabel: { fontSize: 14, fontWeight: 700, color: "var(--ink)", fontFamily: "'Fraunces', serif" },
  dateInput: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" },

  textInput: { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 15, fontFamily: "inherit", marginBottom: 12, color: "var(--ink)" },
  textInputHalf: { flex: 1, boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 14, fontFamily: "inherit", color: "var(--ink)" },
  qtyInput: { width: 56, boxSizing: "border-box", padding: "12px 8px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 14, fontFamily: "inherit", textAlign: "center" },
  formRow: { display: "flex", gap: 8, marginBottom: 12 },

  primaryBtn: { width: "100%", padding: "15px 18px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, var(--accent) 0%, var(--gold) 220%)", color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", marginTop: 8, boxShadow: "0 4px 14px rgba(20,73,176,0.22)" },
  secondaryBtn: { width: "100%", padding: "15px 18px", borderRadius: 12, border: "1px solid var(--line)", background: "none", color: "var(--ink)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginTop: 10 },
  authFieldWrap: { display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "13px 14px", background: "var(--surface)", marginBottom: 12 },
  authField: { flex: 1, border: "none", outline: "none", background: "none", fontSize: 15, fontFamily: "inherit", color: "var(--ink)" },
  authError: { fontSize: 12.5, color: "#B23A2E", marginBottom: 8, fontWeight: 600 },
  businessIdCard: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 600, letterSpacing: 1, textAlign: "center", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line)", borderRadius: 14, padding: "22px 16px", margin: "18px 0 22px" },
  primaryBtnSmall: { width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" },
  smallAddBtn: { padding: "0 16px", borderRadius: 10, border: "none", background: "var(--gold)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  payrollLine: { display: "block", marginTop: 8, fontSize: 12, color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", textAlign: "left" },
  payHoursInput: { width: 130, boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, fontFamily: "inherit", color: "var(--ink)" },
  seatMeter: { fontSize: 12, color: "var(--ink-faint)", fontWeight: 600, marginBottom: 14 },
  stepperRow: { display: "flex", alignItems: "center", gap: 12, margin: "8px 0" },
  stepperValue: { fontSize: 14, fontWeight: 700, minWidth: 140, textAlign: "center" },
  accountEmailRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink)", fontWeight: 600, marginBottom: 10 },
  logoutBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "none", color: "#B23A2E", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  categoryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  categoryCard: { border: "1.5px solid var(--line)", borderRadius: 14, padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 8px rgba(28,27,23,0.05)", transition: "box-shadow 0.15s" },
  categoryIconWrap: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" },
  categoryName: { fontSize: 14, fontWeight: 600, color: "var(--ink)", fontFamily: "'Fraunces', serif" },
  categoryExamples: { fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.3 },

  progressTrack: { display: "flex", gap: 6, width: "100%", marginBottom: 32 },
  progressSeg: { flex: 1, height: 4, borderRadius: 4, transition: "background 0.2s" },
  stepNavRow: { display: "flex", alignItems: "center", gap: 14, marginTop: 8 },
  backTextBtn: { border: "none", background: "none", color: "var(--ink-faint)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "12px 4px" },
  primaryBtnInline: { flex: 1, padding: "15px 18px", borderRadius: 12, border: "none", background: "var(--accent, #1B4332)", color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" },

  staffSizeGrid: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  staffSizeCard: { border: "1.5px solid var(--line)", borderRadius: 12, padding: "16px 18px", textAlign: "left", fontSize: 15, fontWeight: 600, color: "var(--ink)", cursor: "pointer", boxShadow: "0 2px 8px rgba(28,27,23,0.05)" },

  buildingScreen: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, width: "100%" },
  buildingMark: { width: 64, height: 64, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 26, marginBottom: 24, boxShadow: "0 10px 28px rgba(0,0,0,0.18)" },
  buildingTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 28, textAlign: "center" },
  buildingSteps: { width: "100%", display: "flex", flexDirection: "column", gap: 16 },
  buildingStepRow: { display: "flex", alignItems: "center", gap: 12, transition: "opacity 0.3s" },
  buildingStepIcon: { width: 22, height: 22, borderRadius: "50%", background: "var(--accent, #1B4332)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  buildingSpinner: { width: 8, height: 8, borderRadius: "50%", background: "#fff" },
  buildingStepLabel: { fontSize: 13.5, color: "var(--ink-soft)" },

  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--surface)", borderBottom: "1px solid var(--line)", boxShadow: "0 3px 14px rgba(16,24,40,0.06)", position: "relative", zIndex: 5 },
  topBarLeft: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { width: 36, height: 36, borderRadius: 9, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 16, boxShadow: "0 3px 8px rgba(0,0,0,0.18)" },
  logoImg: { width: 36, height: 36, borderRadius: 9, objectFit: "cover", boxShadow: "0 3px 8px rgba(0,0,0,0.18)" },
  branchSelect: { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", fontFamily: "inherit", maxWidth: 110 },
  branchLockedTag: { display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  branchAssignSelect: { fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", border: "none", borderRadius: 8, padding: "5px 8px", fontFamily: "inherit", marginTop: 6 },
  staffRowHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  staffDetails: { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 },
  staffDetailLine: { fontSize: 12.5, color: "var(--ink-soft)" },
  staffFormSectionLabel: { fontSize: 12, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  permissionGrid: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 4 },
  permissionRow: { display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer" },
  bizName: { fontSize: 14.5, fontWeight: 700, color: "var(--ink)", fontFamily: "'Fraunces', serif" },
  bizCategory: { fontSize: 11.5, color: "var(--ink-faint)" },
  roleChip: { display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 20, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--ink)" },
  roleDropdown: { position: "absolute", right: 0, top: "110%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", zIndex: 10, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
  roleDropdownItem: { display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "none", fontSize: 13, cursor: "pointer", color: "var(--ink)" },

  body: { flex: 1, overflowY: "auto", paddingBottom: 110 },
  panel: { padding: "20px 18px 8px 18px" },
  backRow: { display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--ink-faint)", fontSize: 13, fontWeight: 600, padding: "0 0 14px 0", cursor: "pointer", fontFamily: "inherit" },
  panelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, marginBottom: 14, color: "var(--ink)" },
  sectionTitleSmall: { fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, margin: "24px 0 10px 0", color: "var(--ink)" },

  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },
  trendCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 10px 16px", marginBottom: 18, boxShadow: "0 4px 16px rgba(16,24,40,0.07)" },
  trendHeader: { fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  trendHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  trendLegend: { display: "flex", gap: 12, marginBottom: 12 },
  trendLegendInline: { display: "flex", gap: 10 },
  trendLegendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 },
  trendLegendDot: { width: 8, height: 8, borderRadius: 4, display: "inline-block" },
  trendBars: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 90, gap: 6 },
  trendBarCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" },
  trendBarTrack: { flex: 1, width: "100%", display: "flex", alignItems: "flex-end", background: "var(--bg)", borderRadius: 5, overflow: "hidden", padding: "0 2px" },
  trendBarPair: { flex: 1, height: "100%", display: "flex", alignItems: "flex-end", gap: 3 },
  trendBarFill: { flex: 1, background: "var(--accent)", borderRadius: "4px 4px 0 0", minHeight: 3, transition: "height 0.3s" },
  trendBarFillOut: { flex: 1, background: "var(--ink-faint)", borderRadius: "4px 4px 0 0", minHeight: 0, transition: "height 0.3s" },
  trendBarLabel: { fontSize: 10, color: "var(--ink-faint)", fontWeight: 600 },
  paymentBreakdownBar: { display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 12, background: "var(--bg)" },
  paymentBreakdownList: { display: "flex", flexDirection: "column", gap: 8 },
  paymentBreakdownRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  donutRow: { display: "flex", alignItems: "center", gap: 18 },
  statCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px rgba(28,27,23,0.05)" },
  statValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 19, fontWeight: 500, color: "var(--accent)" },
  statLabel: { fontSize: 12, color: "var(--ink-faint)", marginTop: 2 },
  statCardColored: { borderRadius: 12, padding: "14px 16px", boxShadow: "0 6px 18px rgba(16,24,40,0.20)", color: "#fff", position: "relative", overflow: "hidden" },
  statCardColoredIconWrap: { width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" },
  statCardColoredValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 600, color: "#fff" },
  statCardColoredLabel: { fontSize: 11.5, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 600 },

  sidebar: { background: "linear-gradient(180deg, #181D27 0%, #0F1218 100%)", flexDirection: "column", width: 240, flexShrink: 0, color: "#fff", boxShadow: "4px 0 24px rgba(0,0,0,0.18)" },
  sidebarBrand: { display: "flex", alignItems: "center", gap: 10, padding: "22px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  sidebarBizName: { fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Fraunces', serif" },
  sidebarBizCategory: { fontSize: 11, color: "var(--sidebar-ink-faint)" },
  sidebarScroll: { flex: 1, overflowY: "auto", padding: "14px 10px 20px 10px" },
  sidebarGroup: { marginBottom: 18 },
  sidebarGroupTitle: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--sidebar-ink-faint)", padding: "0 10px", marginBottom: 8, opacity: 0.7 },
  sidebarItem: { position: "relative", display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, border: "none", background: "none", color: "var(--sidebar-ink-faint)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background 0.15s, color 0.15s" },
  sidebarItemActive: { background: "linear-gradient(90deg, var(--accent) 0%, var(--gold) 160%)", color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.28)" },
  sidebarBadge: { position: "absolute", top: 8, right: 10, width: 6, height: 6, borderRadius: "50%", background: "#E5555A", boxShadow: "0 0 0 3px rgba(229,85,90,0.25)" },

  quickRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  quickAction: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 8px 8px", borderRadius: 24, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", fontSize: 12.5, color: "var(--ink)", fontFamily: "inherit", boxShadow: "0 1px 6px rgba(28,27,23,0.04)", whiteSpace: "nowrap" },
  quickActionIconWrap: { width: 28, height: 28, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  quickActionLabel: { fontWeight: 600 },

  callout: { display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, marginBottom: 16, lineHeight: 1.4 },
  calloutWarn: { background: "var(--gold-soft)", color: "#8A6D00" },
  calloutLink: { display: "block", marginTop: 4, fontWeight: 600, background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", fontSize: 13 },

  list: { display: "flex", flexDirection: "column", gap: 8 },
  listRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 2px 10px rgba(16,24,40,0.06)" },
  listRowClickable: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 10px rgba(16,24,40,0.06)" },
  listRowTitle: { fontSize: 14, fontWeight: 600, color: "var(--ink)" },
  listRowSub: { fontSize: 12, color: "var(--ink-faint)", marginTop: 2 },
  listRowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  lowStockText: { color: "#B23A2E", fontWeight: 600 },
  mono: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "var(--ink)" },
  badge: { fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.4 },

  emptyState: { padding: "28px 20px", textAlign: "center", background: "var(--surface)", border: "1.5px dashed var(--line)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  moreIconWrap: { width: 34, height: 34, borderRadius: 10, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  moreGroupTitleRow: { display: "flex", alignItems: "center", gap: 7, marginBottom: 10 },
  moreGroupDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  moreGroupTitle: { fontSize: 12, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 0.5 },
  emptyStateIconWrap: { width: 44, height: 44, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" },
  emptyStateText: { color: "var(--ink-faint)", fontSize: 13, lineHeight: 1.5, maxWidth: 240 },

  addBtn: { display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 20, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  formCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: "0 2px 10px rgba(28,27,23,0.05)" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 },
  searchInput: { flex: 1, border: "none", background: "none", outline: "none", fontSize: 13.5, color: "var(--ink)", fontFamily: "inherit" },
  paymentMethodRow: { display: "flex", gap: 8, marginBottom: 12 },
  paymentChip: { flex: 1, padding: "10px 8px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit" },
  paymentChipActive: { border: "1.5px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" },
  miniLabel: { fontSize: 11, color: "var(--ink-faint)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 },
  textArea: { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 14, fontFamily: "inherit", marginBottom: 12, color: "var(--ink)", resize: "vertical" },
  letterText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", background: "var(--bg)", padding: 16, borderRadius: 10, color: "var(--ink)", maxHeight: "50vh", overflowY: "auto" },
  themeRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", marginBottom: 16, cursor: "pointer", fontFamily: "inherit" },
  switchTrack: { width: 38, height: 22, borderRadius: 20, position: "relative", transition: "background 0.15s" },
  switchThumb: { position: "absolute", top: 2, left: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "transform 0.15s" },
  iconBtn: { border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 4 },
  textLinkBtn: { border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },

  cartBox: { background: "var(--bg)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 },
  cartRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" },
  cartTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(28,27,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  modalCard: { background: "var(--surface)", borderRadius: 16, padding: 22, width: "100%", maxWidth: 360, fontFamily: "'Inter', sans-serif", boxShadow: "0 20px 50px rgba(0,0,0,0.28)", maxHeight: "90vh", overflowY: "auto" },
  invoiceHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--line)" },
  invoiceBrand: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: "var(--accent)" },
  invoiceMeta: { fontSize: 11.5, color: "var(--ink-faint)" },
  invoiceCustomer: { fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 },
  invoiceItems: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  invoiceItemRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5 },
  invoiceTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, borderTop: "1px solid var(--line)", paddingTop: 10, color: "var(--accent)" },
  invoiceStatus: { marginTop: 12, display: "flex", alignItems: "center", gap: 8 },
  invoicePaymentTag: { fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 600 },
  printBtn: { marginTop: 16, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "none", color: "var(--ink-soft)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "8px 4px 12px 4px", boxShadow: "0 -4px 16px rgba(28,27,23,0.06)" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0" },
  navLabel: { fontSize: 10.5, fontWeight: 600 },
  navBadge: { position: "absolute", top: -2, right: -4, width: 7, height: 7, borderRadius: "50%", background: "#B23A2E" },
};
