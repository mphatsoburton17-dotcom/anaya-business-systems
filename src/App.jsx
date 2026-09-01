import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Store, Scissors, Coffee, Wrench, Package, Users, Receipt,
  BarChart3, Bell, Megaphone, Settings, Plus, X, Check,
  ChevronRight, LogOut, ShieldCheck, AlertTriangle, Trash2, MoreHorizontal,
  Moon, Sun, Calculator, FileText, Printer, TrendingDown, TrendingUp, Download, Search as SearchIcon,
  CalendarDays, Lock, Mail, BookOpen, Wallet, HandCoins, Puzzle, HelpCircle, Phone, MessageCircle,
  Sparkles, Building2, Smartphone, Layers, Pencil, Share2,
  ShoppingCart, Shirt, Hammer, Sofa, Pill, Wheat, GraduationCap, UtensilsCrossed, Cookie, Beer, Car
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const EXPENSE_CATEGORIES = [
  "Restocking / buying stock", "Rent", "Utilities", "Transport",
  "Damages / loss", "Repairs & maintenance", "Marketing",
  "Salaries & wages", "Staff loans / advances", "Other",
];

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
   Pricing model: a flat base plan (1 branch, 1 login), plus staff seats and branches bought as
   add-ons. Buying several at once automatically finds the cheapest combination (a "bundle" of a
   few units costs less per-unit than buying them one at a time) — the owner never has to think
   about which deal to pick, the total just works out fair. Bundle prices start a little low on
   purpose; raise SEAT_BUNDLE_PRICE / BRANCH_BUNDLE_PRICE later once people are used to the product. */
const TRIAL_DAYS = 30;
const BASE_PLAN_PRICE = 20000; // MWK / month — 1 branch, 1 login (the owner), all core features
const SEAT_UNIT_PRICE = 5000;      // MWK / month, per extra staff login bought individually
const SEAT_BUNDLE_SIZE = 4;
const SEAT_BUNDLE_PRICE = 15000;   // MWK / month, per group of 4 extra seats (introductory price)
const BRANCH_UNIT_PRICE = 10000;   // MWK / month, per extra branch bought individually
const BRANCH_BUNDLE_SIZE = 3;
const BRANCH_BUNDLE_PRICE = 25000; // MWK / month, per group of 3 extra branches (introductory price)
function seatAddonCost(extraSeats) {
  const n = Math.max(0, extraSeats || 0);
  const bundles = Math.floor(n / SEAT_BUNDLE_SIZE);
  const remainder = n % SEAT_BUNDLE_SIZE;
  return bundles * SEAT_BUNDLE_PRICE + remainder * SEAT_UNIT_PRICE;
}
function branchAddonCost(extraBranches) {
  const n = Math.max(0, extraBranches || 0);
  const bundles = Math.floor(n / BRANCH_BUNDLE_SIZE);
  const remainder = n % BRANCH_BUNDLE_SIZE;
  return bundles * BRANCH_BUNDLE_PRICE + remainder * BRANCH_UNIT_PRICE;
}
const PACKAGES = {
  accounting: {
    id: "accounting",
    name: "Accounting",
    price: 10000,
    desc: "Profit & loss, full ledger, accounts receivable, and a balance sheet snapshot.",
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 10000,
    desc: "Marketing tools (flyers, broadcasts, content calendar) and auto-generated documents.",
  },
};
// Where a business sends money to pay for Anaya itself (not a payment gateway — just your own
// receiving details). Edit these to your real ones before going live. Businesses attach a
// screenshot of their transfer as proof, then confirm with you directly (e.g. on WhatsApp)
// before switching their request to active — there's no shared server here to auto-verify it.
const ANAYA_PAYMENT_INFO = {
  bankName: "Standard Bank",
  accountName: "Mphatso Burton",
  accountNumber: "9100007700099",
  airtelMoneyNumber: "0991896521",
  tnmMpambaNumber: "0880140865",
  whatsapp: "0991896521",
};
function daysSince(ts) {
  return (Date.now() - (ts || 0)) / 86400000;
}
function isTrialActive(profile) {
  return daysSince(profile.createdAt) < TRIAL_DAYS;
}
function trialDaysLeft(profile) {
  return Math.max(0, Math.ceil(TRIAL_DAYS - daysSince(profile.createdAt)));
}
function hasPackage(biz, packageId) {
  return isTrialActive(biz.profile) || !!biz.profile.packages?.[packageId];
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
      extraSeats: Math.max(0, details.extraSeats || 0),
      extraBranches: Math.max(0, details.extraBranches || 0),
      packages: { accounting: !!details.packages?.accounting, growth: !!details.packages?.growth },
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
    employees: [
      { id: uid("emp"), name: ownerName ? `${ownerName} (Owner)` : "You (Owner)", role: "owner", pin: "0000" },
    ],
    notifications: [],
    documents: [],
    expenses: [],
    restocks: [], // stock-in / purchase history: what was bought from suppliers, at what cost
    billingRequests: [], // "I've paid, here's proof" submissions — see BillingPanel
    settings: { theme: "light", taxRate: 0, discountRate: 0, activeBranchId: null },
  };
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState(null);
  const [account, setAccount] = useState(null); // { email }
  const [authMode, setAuthMode] = useState("landing"); // landing | login | register
  const [session, setSession] = useState(null); // employee id currently "logged in"
  const [tab, setTab] = useState("overview");

  const loadFromSession = useCallback(async (authSession) => {
    if (!authSession) { setBiz(null); setAccount(null); setSession(null); return; }
    const biz_ = await fetchBizForUser(authSession.user.id);
    if (!biz_) { setBiz(null); setAccount(null); setSession(null); return; }
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
      expenses: (biz_.expenses || []).map((e) => ({ branchId: defaultBranchId, ...e })),
      orders: (biz_.orders || []).map((o) => ({ branchId: defaultBranchId, ...o })),
      branches,
      settings: { theme: "light", taxRate: 0, discountRate: 0, activeBranchId: null, ...biz_.settings },
      profile: {
        recordingMode: "detailed",
        ...biz_.profile,
        extraSeats: biz_.profile.extraSeats ?? Math.max(0, (biz_.profile.seatLimit ?? SEAT_LIMITS[biz_.profile.staffSize] ?? 1) - 1),
        extraBranches: biz_.profile.extraBranches ?? Math.max(0, branches.length - 1),
        packages: { accounting: false, growth: false, ...biz_.profile.packages },
        branding: { logo: null, primaryColor: "", secondaryColor: "", address: biz_.profile?.location || "", signature: null, ...biz_.profile?.branding },
      },
    });
    setBiz(migrated);
    setAccount({ email: authSession.user.email, userId: authSession.user.id });
    setSession(migrated.employees[0]?.id || null);
    if (JSON.stringify(migrated) !== JSON.stringify(biz_)) persistBizForUser(authSession.user.id, migrated);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (active) await loadFromSession(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
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

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingMark}>A</div>
      </div>
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
          <ItemsPanel biz={biz} category={category} persist={persist} notify={notify} isOwner={isStaffView} />
        )}
        {tab === "orders" && (
          <OrdersPanel biz={biz} category={category} persist={persist} notify={notify} currentEmployee={currentEmployee} />
        )}
        {tab === "customers" && (
          <CustomersPanel biz={biz} category={category} persist={persist} isOwner={isStaffView} setTab={setTab} />
        )}
        {tab === "employees" && (isOwner || isManager || hasModuleAccess(currentEmployee, "hr")) && (
          <EmployeesPanel biz={biz} category={category} persist={persist} setTab={setTab} currentEmployee={currentEmployee} />
        )}
        {tab === "branches" && (isOwner || hasModuleAccess(currentEmployee, "branches")) && (
          <BranchesPanel biz={biz} category={category} persist={persist} setTab={setTab} currentEmployee={currentEmployee} />
        )}
        {tab === "reports" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          <ReportsPanel biz={biz} category={category} setTab={setTab} />
        )}
        {tab === "expenses" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          <ExpensesPanel biz={biz} persist={persist} setTab={setTab} currentEmployee={currentEmployee} />
        )}
        {tab === "activity" && (isOwner || isManager || hasModuleAccess(currentEmployee, "reports")) && (
          <ActivityPanel biz={biz} category={category} setTab={setTab} />
        )}
        {tab === "alerts" && (
          <AlertsPanel biz={biz} persist={persist} />
        )}
        {tab === "marketing" && (isOwner || isManager || hasModuleAccess(currentEmployee, "marketing")) && (
          hasPackage(biz, "growth")
            ? <MarketingPanel setTab={setTab} />
            : <PaywallScreen packageId="growth" setTab={setTab} />
        )}
        {tab === "documents" && (isOwner || isManager || hasModuleAccess(currentEmployee, "marketing")) && (
          hasPackage(biz, "growth")
            ? <DocumentsPanel biz={biz} category={category} persist={persist} setTab={setTab} canEditBranding={isOwner} />
            : <PaywallScreen packageId="growth" setTab={setTab} />
        )}
        {tab === "accounting" && (isOwner || isManager || hasModuleAccess(currentEmployee, "accounting")) && (
          hasPackage(biz, "accounting")
            ? <AccountingPanel biz={biz} category={category} persist={persist} setTab={setTab} />
            : <PaywallScreen packageId="accounting" setTab={setTab} />
        )}
        {tab === "billing" && isOwner && (
          <BillingPanel biz={biz} persist={persist} setTab={setTab} />
        )}
        {tab === "calculator" && (
          <CalculatorPanel biz={biz} persist={persist} setTab={setTab} />
        )}
        {tab === "settings" && isOwner && (
          <SettingsPanel biz={biz} category={category} persist={persist} setTab={setTab} onLogout={handleLogout} account={account} />
        )}
        {tab === "integrations" && isOwner && (
          <IntegrationsPanel setTab={setTab} />
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
            <div style={s.eyebrowPill}><Sparkles size={13} /> Free for 30 days — every tool unlocked</div>
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
            <h2 style={s.h2}>Pay for exactly what you run.</h2>
            <p style={s.sectionLead}>One base plan, plus only the branches and staff logins you actually need. Every plan starts with a free first month, every tool unlocked.</p>
          </Reveal>

          <Reveal>
            <div style={{ ...s.card, marginBottom: 20, borderColor: BRAND.accent, borderWidth: 2 }}>
              <div style={s.featureTitle}>Base plan — {currency(BASE_PLAN_PRICE)}/month</div>
              <div style={s.featureDesc}>1 branch, 1 login (you). Sales, inventory, invoicing, expenses, staff, and reports — the full core system, nothing held back.</div>
            </div>
          </Reveal>

          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Reveal>
              <div style={s.card}>
                <div style={s.featureIconWrap}><Users size={22} color={BRAND.accent} /></div>
                <div style={s.featureTitle}>Extra staff logins</div>
                <div style={s.featureDesc}>{currency(SEAT_UNIT_PRICE)}/month each, or {currency(SEAT_BUNDLE_PRICE)} for a group of {SEAT_BUNDLE_SIZE} — whichever combination is cheapest is applied automatically as you add people.</div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div style={s.card}>
                <div style={s.featureIconWrap}><Store size={22} color={BRAND.accent} /></div>
                <div style={s.featureTitle}>Extra branches</div>
                <div style={s.featureDesc}>{currency(BRANCH_UNIT_PRICE)}/month each, or {currency(BRANCH_BUNDLE_PRICE)} for a group of {BRANCH_BUNDLE_SIZE} — same automatic best-price combination.</div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div style={{ ...s.sectionLabel, marginTop: 10 }}>Optional add-ons</div>
          </Reveal>
          <div className="lp-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {Object.values(PACKAGES).map((pkg, i) => (
              <Reveal key={pkg.id} delay={i * 100}>
                <div style={s.card}>
                  <div style={s.featureTitle}>{pkg.name} — {currency(pkg.price)}/month</div>
                  <div style={s.featureDesc}>{pkg.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ background: BRAND.accentSoft, borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 10, color: BRAND.accent, fontWeight: 700, fontSize: 14.5 }}>
              <Sparkles size={17} /> Free for your first 30 days on any combination above — no card needed to start.
            </div>
          </Reveal>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ padding: "80px 0" }}>
        <Reveal>
          <div style={{ ...s.wrap, textAlign: "center" }}>
            <h2 style={{ ...s.h2, fontSize: 38 }}>Start running your business on real numbers.</h2>
            <p style={{ ...s.sectionLead, margin: "0 auto 30px" }}>Free for 30 days, every tool unlocked. No card needed to start.</p>
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

function AuthGate({ onRegister, onLogin, onEnter }) {
  const [screen, setScreen] = useState("landing"); // landing | login | register-creds | register-onboard
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState(""); // login screen: email OR business ID
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null); // { businessId, business, email }

  const normalizedEmail = email.trim().toLowerCase();

  const goRegisterCreds = () => { setError(""); setScreen("register-creds"); };
  const goLogin = () => { setError(""); setScreen("login"); };
  const goLanding = () => { setError(""); setScreen("landing"); };

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
          {error && <div style={styles.authError}>{error}</div>}
          <button className="primary-btn-smart" style={{ ...styles.primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submitLogin}>
            {busy ? "Logging in…" : "Log in"} <ChevronRight size={18} />
          </button>
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
  const [branchCount, setBranchCount] = useState(1);
  const [staffCount, setStaffCount] = useState(1);
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
        extraSeats: staffCount - 1, extraBranches: branchCount - 1,
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
          <h1 style={styles.h1}>Build your plan</h1>
          <p style={styles.helperText}>Your first month is completely free on any plan — change any of this later in Packages & billing.</p>

          <div style={styles.formCard}>
            <div style={styles.listRowTitle}>How many branches?</div>
            <div style={styles.listRowSub}>1 is included in the base plan. Extra branches: {BRANCH_UNIT_PRICE.toLocaleString()} each, or {BRANCH_BUNDLE_PRICE.toLocaleString()} per {BRANCH_BUNDLE_SIZE} — cheapest combination applied automatically.</div>
            <div style={styles.stepperRow}>
              <button style={styles.iconBtn} onClick={() => setBranchCount((n) => Math.max(1, n - 1))} disabled={branchCount <= 1}><X size={15} /></button>
              <span style={styles.stepperValue}>{branchCount} branch{branchCount !== 1 ? "es" : ""}</span>
              <button style={styles.iconBtn} onClick={() => setBranchCount((n) => n + 1)}><Plus size={15} /></button>
            </div>
          </div>

          <div style={styles.formCard}>
            <div style={styles.listRowTitle}>How many staff logins (including you)?</div>
            <div style={styles.listRowSub}>1 is included in the base plan. Extra logins: {SEAT_UNIT_PRICE.toLocaleString()} each, or {SEAT_BUNDLE_PRICE.toLocaleString()} per {SEAT_BUNDLE_SIZE} — cheapest combination applied automatically.</div>
            <div style={styles.stepperRow}>
              <button style={styles.iconBtn} onClick={() => setStaffCount((n) => Math.max(1, n - 1))} disabled={staffCount <= 1}><X size={15} /></button>
              <span style={styles.stepperValue}>{staffCount} login{staffCount !== 1 ? "s" : ""}</span>
              <button style={styles.iconBtn} onClick={() => setStaffCount((n) => n + 1)}><Plus size={15} /></button>
            </div>
          </div>

          <div style={styles.formCard}>
            <div style={styles.listRowTitle}>{currency(BASE_PLAN_PRICE + branchAddonCost(branchCount - 1) + seatAddonCost(staffCount - 1))}/month</div>
            <div style={styles.listRowSub}>
              Base {currency(BASE_PLAN_PRICE)} + branches {currency(branchAddonCost(branchCount - 1))} + staff {currency(seatAddonCost(staffCount - 1))}
            </div>
            <div style={styles.listRowSub}>Free for your first 30 days — nothing is charged today. You can add accounting or marketing tools anytime after signing up.</div>
          </div>

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
            <BuildingStep done={setupPhase > 2} active={setupPhase === 2} label={staffCount <= 1 ? "Setting up your owner account" : "Setting up staff roles & permissions"} />
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
    persist({ ...biz, settings: { ...biz.settings, activeBranchId: id } });
  };

  const closeSwitcher = () => {
    setShowSwitch(false);
    setPendingSwitchId(null);
    setSwitchPassword("");
    setSwitchError("");
  };

  const attemptSwitch = (emp) => {
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
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                    style={styles.roleDropdownItem}
                    onClick={() => attemptSwitch(e)}
                  >
                    {e.name} · {roleLabel(e.role, category)}{e.branchPassword ? " 🔒" : ""}
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
      ],
    },
    {
      title: "Sales & customers",
      rows: [
        { id: "orders", label: category.orderNounPlural, icon: Receipt, show: true },
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
        { id: "marketing", label: "Marketing", icon: Megaphone, show: canSee("marketing") },
        { id: "documents", label: "Documents", icon: FileText, show: canSee("marketing") },
      ],
    },
    {
      title: "Business",
      rows: [
        { id: "billing", label: "Packages & billing", icon: Wallet, show: isOwner },
        { id: "integrations", label: "Integrations", icon: Puzzle, show: isOwner },
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
   ITEMS (Products / Services)
   ========================================================= */
function ItemsPanel({ biz, category, persist, notify, isOwner }) {
  const isPharmacy = biz.profile?.businessSubtypeId === "pharmacy";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", cost: "", stock: "", meta: "", itemCategory: "", unit: "pcs", expiryDate: "", batchNumber: "", requiresPrescription: false });
  const [query, setQuery] = useState("");
  const [newTag, setNewTag] = useState("");
  const [restockingId, setRestockingId] = useState(null); // item id currently showing the restock form
  const [restockForm, setRestockForm] = useState({ qty: "", costPerUnit: "", supplier: "", logExpense: true });
  const bizCategories = biz.categories || [];

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
    };
    let next = { ...biz, items: [item, ...biz.items] };
    persist(next);
    setForm({ name: "", price: "", cost: "", stock: "", meta: "", itemCategory: "", unit: "pcs", expiryDate: "", batchNumber: "", requiresPrescription: false });
    setShowForm(false);
  };

  const removeItem = (id) => {
    persist({ ...biz, items: biz.items.filter((i) => i.id !== id) });
  };

  const openRestock = (item) => {
    setRestockingId(item.id);
    setRestockForm({ qty: "", costPerUnit: item.cost ? String(item.cost) : "", supplier: "", logExpense: true });
  };

  const submitRestock = (item) => {
    const qty = Number(restockForm.qty);
    const costPerUnit = Number(restockForm.costPerUnit);
    if (!qty || qty <= 0 || !costPerUnit || costPerUnit < 0) return;
    const totalCost = Math.round(qty * costPerUnit);
    const record = {
      id: uid("restock"),
      itemId: item.id,
      itemName: item.name,
      qty,
      unit: item.unit || "pcs",
      costPerUnit,
      totalCost,
      supplier: restockForm.supplier.trim() || null,
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
    setRestockForm({ qty: "", costPerUnit: "", supplier: "", logExpense: true });
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
            </>
          )}

          <div style={styles.formRow}>
            <input style={styles.textInputHalf} type="number" placeholder={category.hasStock ? `Price per ${form.unit || "pcs"} (MWK)` : (category.id === "property" ? "Monthly rent (MWK)" : "Price (MWK)")}
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input style={styles.textInputHalf} type="number" placeholder={category.hasStock ? `Buying cost per ${form.unit || "pcs"} (optional)` : "Cost (optional)"}
              value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
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
                        {"  ·  "}{item.meta ? `Tenant: ${item.meta}` : "Vacant"}
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
                  </div>
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
                  <input style={styles.textInput} placeholder="Supplier / wholesaler (optional)"
                    value={restockForm.supplier} onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })} />
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
  const [cart, setCart] = useState([]);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [formError, setFormError] = useState("");
  const [saleDate, setSaleDate] = useState(toDateInputValue(new Date()));
  const [editingOrderId, setEditingOrderId] = useState(null);
  const today = new Date();

  const selectedUnit = biz.items.find((i) => i.id === selectedItemId)?.unit || "pcs";

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
                <select style={styles.textInputHalf} value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); setQty(1); }}>
                  <option value="">Select {category.itemLabel.toLowerCase()}…</option>
                  {itemsForBranch(biz.items, biz.settings?.activeBranchId).map((i) => (
                    <option key={i.id} value={i.id}>{i.name} — {currency(i.price)}{category.hasStock && i.unit && i.unit !== "pcs" ? `/${i.unit}` : ""}</option>
                  ))}
                </select>
                <input style={styles.qtyInput} type="number" min="0" step={selectedUnit !== "pcs" ? "any" : "1"}
                  placeholder={selectedUnit !== "pcs" ? selectedUnit : ""} value={qty} onChange={(e) => setQty(e.target.value)} />
                <button style={styles.smallAddBtn} onClick={addToCart}>Add</button>
              </div>

              {cart.length > 0 && (
                <div style={styles.cartBox}>
                  {cart.map((c, idx) => (
                    <div key={idx} style={styles.cartRow}>
                      <span>{c.qty} {c.unit && c.unit !== "pcs" ? c.unit : "×"} {c.name}</span>
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
            {["Cash", "PayChangu", ...(hasPackage(biz, "accounting") ? ["On credit"] : [])].map((m) => (
              <button key={m}
                style={{ ...styles.paymentChip, ...(paymentMethod === m ? styles.paymentChipActive : {}) }}
                onClick={() => setPaymentMethod(m)}>
                {m}
              </button>
            ))}
          </div>
          {paymentMethod === "PayChangu" && (
            <p style={styles.helperText}>Covers mobile money (Airtel Money, TNM Mpamba), bank transfer, and card — the customer picks their channel with PayChangu.</p>
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
                {o.paymentStatus === "credit"
                  ? <span style={{ ...styles.badge, background: "var(--gold-soft)", color: "#8A6D00" }}>Owing</span>
                  : <StatusBadge status={o.status} category={category} />}
              </div>
            </button>
          ))}
        </div>
      )}

      {invoiceOrder && <InvoiceModal order={invoiceOrder} biz={biz} category={category} onClose={() => setInvoiceOrder(null)} onEdit={() => startEdit(invoiceOrder)} />}
    </div>
  );
}

function InvoiceModal({ order, biz, category, onClose, onEdit }) {
  const branding = biz.profile.branding || {};
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
    ].filter(Boolean);
    shareText(`Receipt — ${biz.profile.name}`, lines.join("\n"));
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
        </div>
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
      </div>
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
    name: "", position: "", role: "sales", permissions: [], hourlyRate: "", branchId: "",
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

  const seatLimit = 1 + (biz.profile.extraSeats || 0);
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
      name: emp.name, position: emp.position || "", role: emp.role, permissions: emp.permissions || [], hourlyRate: String(emp.hourlyRate || ""), branchId: emp.branchId || "",
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
        <span>{biz.employees.length} of {seatLimit} staff accounts used</span>
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
                  {ACCESS_MODULES.map((m) => (
                    <label key={m.id} style={styles.permissionRow}>
                      <input type="checkbox" checked={form.permissions.includes(m.id)} onChange={() => togglePermission(m.id)} />
                      <div>
                        <div style={styles.listRowTitle}>{m.label}</div>
                        <div style={styles.listRowSub}>{m.desc}</div>
                      </div>
                    </label>
                  ))}
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
                  <div style={styles.listRowTitle}>{e.name}{e.position ? ` · ${e.position}` : ""}</div>
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
  const branchLimit = 1 + (biz.profile.extraBranches || 0);
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
function ExpensesPanel({ biz, persist, setTab, currentEmployee }) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(toDateInputValue(new Date()));
  const today = new Date();

  const branchExpenses = filterByBranch(biz.expenses, biz.settings?.activeBranchId);

  const activeBranch = biz.branches?.find((b) => b.id === biz.settings?.activeBranchId);
  const isLocked = !!(activeBranch?.assignedEmployeeId && activeBranch.assignedEmployeeId !== currentEmployee?.id);
  const lockedByName = isLocked ? biz.employees.find((e) => e.id === activeBranch.assignedEmployeeId)?.name : null;

  const addExpense = () => {
    if (isLocked) return;
    if (!amount || Number(amount) <= 0) return;
    const ts = new Date((expenseDate || toDateInputValue(new Date())) + "T12:00:00").getTime();
    const exp = { id: uid("exp"), category, amount: Number(amount), note: note.trim(), branchId: biz.settings?.activeBranchId || biz.branches?.[0]?.id || null, ts };
    persist({ ...biz, expenses: [exp, ...biz.expenses] });
    setAmount(""); setNote(""); setExpenseDate(toDateInputValue(new Date())); setShowForm(false);
  };

  const removeExpense = (id) => {
    if (isLocked) return;
    persist({ ...biz, expenses: biz.expenses.filter((e) => e.id !== id) });
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
        {!isLocked && (
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

      <div style={styles.statGrid}>
        <StatCard label="Spent this month" value={currency(totalThisMonth)} />
        <StatCard label="Damages / loss" value={currency(damagesThisMonth)} />
      </div>

      {showForm && !isLocked && (
        <div style={styles.formCard}>
          <select style={styles.textInput} value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <div style={styles.listRowSub}>{e.note ? `${e.note} · ` : ""}{new Date(e.ts).toLocaleDateString()}{e.payrollRecordId ? " · via Staff & HR" : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={styles.mono}>−{currency(e.amount)}</span>
                {!e.payrollRecordId && !isLocked && <button style={styles.iconBtn} onClick={() => removeExpense(e.id)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
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
                <div style={styles.listRowSub}>{new Date(o.ts).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={styles.mono}>{currency(o.total)}</span>
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
function PaywallScreen({ packageId, setTab }) {
  const pkg = PACKAGES[packageId];
  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <EmptyState text={`${pkg.name} is a paid add-on — ${currency(pkg.price)}/month.`} icon={Lock} />
      <p style={styles.helperText}>{pkg.desc}</p>
      <button style={styles.primaryBtnSmall} onClick={() => setTab("billing")}>
        <Wallet size={16} /> View packages & activate
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
  const extraSeats = biz.profile.extraSeats || 0;
  const extraBranches = biz.profile.extraBranches || 0;
  const branchesInUse = biz.branches.length;
  const activePackages = biz.profile.packages || {};

  const currentTotal = BASE_PLAN_PRICE + seatAddonCost(extraSeats) + branchAddonCost(extraBranches)
    + Object.values(PACKAGES).reduce((s, p) => s + (activePackages[p.id] ? p.price : 0), 0);

  // Requesting a change is staged locally first — nothing is switched on until a request is
  // submitted with proof of payment, and then confirmed. No self-activation anymore.
  const [reqSeats, setReqSeats] = useState(1 + extraSeats);
  const [reqBranches, setReqBranches] = useState(1 + extraBranches);
  const [reqPackages, setReqPackages] = useState({ ...activePackages });
  const [screenshot, setScreenshot] = useState(null);
  const [note, setNote] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  const requestedTotal = BASE_PLAN_PRICE + seatAddonCost(reqSeats - 1) + branchAddonCost(reqBranches - 1)
    + Object.values(PACKAGES).reduce((s, p) => s + (reqPackages[p.id] ? p.price : 0), 0);
  const hasChange = reqSeats !== (1 + extraSeats) || reqBranches !== (1 + extraBranches)
    || Object.values(PACKAGES).some((p) => !!reqPackages[p.id] !== !!activePackages[p.id]);

  const toggleReqPackage = (id) => setReqPackages((p) => ({ ...p, [id]: !p[id] }));

  const onScreenshotFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataUrl(file);
    setScreenshot(await resizeDataUrl(raw, 800));
  };

  const whatsappHref = () => {
    const text = `Hi Anaya, I'd like to pay for a plan change.\nBusiness: ${biz.profile.name} (${biz.profile.businessId || "no ID yet"})\nRequesting: ${reqSeats} staff login(s), ${reqBranches} branch(es)${Object.values(PACKAGES).filter((p) => reqPackages[p.id]).map((p) => `, ${p.name}`).join("")}\nNew total: ${currency(requestedTotal)}/month\n(Attaching my payment screenshot separately.)`;
    const digits = (ANAYA_PAYMENT_INFO.whatsapp || "").replace(/[^\d]/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const submitRequest = () => {
    if (!screenshot) return;
    const request = {
      id: uid("billreq"), ts: Date.now(), status: "pending",
      requested: { extraSeats: reqSeats - 1, extraBranches: reqBranches - 1, packages: { ...reqPackages } },
      total: requestedTotal, note: note.trim(), screenshot,
    };
    persist({ ...biz, billingRequests: [request, ...(biz.billingRequests || [])] });
    setNote(""); setScreenshot(null); setShowRequestForm(false);
  };

  // Once Anaya has actually confirmed your payment (by WhatsApp, call, etc.), come back here
  // and switch it on — there's no shared server yet to verify this automatically.
  const confirmRequest = (req) => {
    persist({
      ...biz,
      profile: { ...biz.profile, extraSeats: req.requested.extraSeats, extraBranches: req.requested.extraBranches, packages: { ...biz.profile.packages, ...req.requested.packages } },
      billingRequests: biz.billingRequests.map((r) => r.id === req.id ? { ...r, status: "confirmed", confirmedAt: Date.now() } : r),
    });
  };

  const cancelRequest = (id) => {
    persist({ ...biz, billingRequests: biz.billingRequests.filter((r) => r.id !== id) });
  };

  const pendingRequests = (biz.billingRequests || []).filter((r) => r.status === "pending");
  const pastRequests = (biz.billingRequests || []).filter((r) => r.status !== "pending");

  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Packages & billing" />

      <SectionTitle title="Your current plan" small />
      <div style={styles.formCard}>
        <div style={styles.listRowTitle}>{currency(currentTotal)}/month</div>
        <div style={styles.listRowSub}>
          {1 + extraSeats} staff login{extraSeats !== 0 ? "s" : ""} · {1 + extraBranches} branch{extraBranches !== 0 ? "es" : ""}
          {Object.values(PACKAGES).filter((p) => activePackages[p.id]).map((p) => ` · ${p.name}`).join("")}
        </div>
      </div>

      {trialActive && (
        <Callout icon={Wallet}>
          You're on your free trial — every add-on below is unlocked. {daysLeft} day{daysLeft !== 1 ? "s" : ""} left.
        </Callout>
      )}

      {!showRequestForm ? (
        <button style={styles.primaryBtnSmall} onClick={() => { setReqSeats(1 + extraSeats); setReqBranches(1 + extraBranches); setReqPackages({ ...activePackages }); setShowRequestForm(true); }}>
          <Plus size={16} /> Request a plan change
        </button>
      ) : (
        <div style={styles.formCard}>
          <div style={styles.staffFormSectionLabel}>What do you want?</div>

          <div style={styles.listRowSub}>Staff logins — {SEAT_UNIT_PRICE.toLocaleString()} each, or {SEAT_BUNDLE_PRICE.toLocaleString()} per {SEAT_BUNDLE_SIZE}, cheapest combination applied automatically.</div>
          <div style={styles.stepperRow}>
            <button style={styles.iconBtn} onClick={() => setReqSeats((n) => Math.max(1, n - 1))} disabled={reqSeats <= 1}><X size={15} /></button>
            <span style={styles.stepperValue}>{reqSeats} login{reqSeats !== 1 ? "s" : ""}</span>
            <button style={styles.iconBtn} onClick={() => setReqSeats((n) => n + 1)}><Plus size={15} /></button>
          </div>

          <div style={{ ...styles.listRowSub, marginTop: 10 }}>Branches — {BRANCH_UNIT_PRICE.toLocaleString()} each, or {BRANCH_BUNDLE_PRICE.toLocaleString()} per {BRANCH_BUNDLE_SIZE}, cheapest combination applied automatically.</div>
          <div style={styles.stepperRow}>
            <button style={styles.iconBtn} onClick={() => setReqBranches((n) => Math.max(1, n - 1))} disabled={reqBranches <= branchesInUse}><X size={15} /></button>
            <span style={styles.stepperValue}>{reqBranches} branch{reqBranches !== 1 ? "es" : ""}</span>
            <button style={styles.iconBtn} onClick={() => setReqBranches((n) => n + 1)}><Plus size={15} /></button>
          </div>

          <div style={{ ...styles.staffFormSectionLabel, marginTop: 12 }}>Add-ons</div>
          {Object.values(PACKAGES).map((pkg) => (
            <label key={pkg.id} style={styles.permissionRow}>
              <input type="checkbox" checked={!!reqPackages[pkg.id]} onChange={() => toggleReqPackage(pkg.id)} />
              <div>
                <div style={styles.listRowTitle}>{pkg.name} — {currency(pkg.price)}/month</div>
                <div style={styles.listRowSub}>{pkg.desc}</div>
              </div>
            </label>
          ))}

          <div style={{ ...styles.formCard, marginTop: 12 }}>
            <div style={styles.listRowTitle}>New total: {currency(requestedTotal)}/month</div>
            {!hasChange && <div style={styles.listRowSub}>This matches what you already have.</div>}
          </div>

          {hasChange && (
            <>
              <div style={{ ...styles.staffFormSectionLabel, marginTop: 14 }}>Send payment to</div>
              <div style={styles.listRowSub}>Bank: {ANAYA_PAYMENT_INFO.bankName} · {ANAYA_PAYMENT_INFO.accountName} · {ANAYA_PAYMENT_INFO.accountNumber}</div>
              <div style={styles.listRowSub}>Airtel Money: {ANAYA_PAYMENT_INFO.airtelMoneyNumber}</div>
              <div style={styles.listRowSub}>TNM Mpamba: {ANAYA_PAYMENT_INFO.tnmMpambaNumber}</div>

              <div style={{ ...styles.staffFormSectionLabel, marginTop: 14 }}>Proof of payment</div>
              <p style={styles.helperText}>Attach a screenshot of the transfer, then send it to Anaya on WhatsApp so it can actually be checked — this app doesn't have a shared server yet, so a screenshot saved only here can't be seen from our side.</p>
              <input type="file" accept="image/*" onChange={onScreenshotFile} />
              {screenshot && <img src={screenshot} alt="Payment proof" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8 }} />}
              <input style={styles.textInput} placeholder="Note (optional) — e.g. paid via Airtel Money at 3pm" value={note} onChange={(e) => setNote(e.target.value)} />

              <a href={whatsappHref()} target="_blank" rel="noreferrer" style={{ ...styles.primaryBtnSmall, textDecoration: "none", justifyContent: "center", marginTop: 8 }}>
                <MessageCircle size={16} /> Message Anaya on WhatsApp
              </a>
              <button style={{ ...styles.primaryBtnSmall, opacity: screenshot ? 1 : 0.5, marginTop: 8 }} disabled={!screenshot} onClick={submitRequest}>
                <Check size={16} /> Submit request
              </button>
            </>
          )}
          <button style={styles.logoutBtn} onClick={() => setShowRequestForm(false)}><X size={15} /> Cancel</button>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <>
          <SectionTitle title="Pending" small />
          <div style={styles.list}>
            {pendingRequests.map((r) => (
              <div key={r.id} style={styles.formCard}>
                <div style={styles.listRowTitle}>{currency(r.total)}/month requested</div>
                <div style={styles.listRowSub}>
                  {1 + r.requested.extraSeats} login{r.requested.extraSeats !== 0 ? "s" : ""} · {1 + r.requested.extraBranches} branch{r.requested.extraBranches !== 0 ? "es" : ""}
                  {Object.values(PACKAGES).filter((p) => r.requested.packages[p.id]).map((p) => ` · ${p.name}`).join("")}
                </div>
                {r.note && <div style={styles.listRowSub}>Note: {r.note}</div>}
                <img src={r.screenshot} alt="Payment proof" style={{ maxWidth: "100%", borderRadius: 10, margin: "8px 0" }} />
                <p style={styles.helperText}>Once Anaya has confirmed your payment (WhatsApp, call, etc.), tap below to switch it on.</p>
                <button style={styles.primaryBtnSmall} onClick={() => confirmRequest(r)}><Check size={16} /> Anaya confirmed — activate now</button>
                <button style={styles.logoutBtn} onClick={() => cancelRequest(r.id)}><X size={15} /> Cancel request</button>
              </div>
            ))}
          </div>
        </>
      )}

      {pastRequests.length > 0 && (
        <>
          <SectionTitle title="History" small />
          <div style={styles.list}>
            {pastRequests.map((r) => (
              <div key={r.id} style={styles.listRow}>
                <div>
                  <div style={styles.listRowTitle}>{currency(r.total)}/month — {r.status}</div>
                  <div style={styles.listRowSub}>{new Date(r.confirmedAt || r.ts).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={styles.helperText}>This is a manual, honesty-based flow for now — everything stays in your own device's storage. A shared backend to verify payments automatically is a good next step once the business grows.</p>
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
function MarketingPanel({ setTab }) {
  return (
    <div style={styles.panel}>
      <BackRow onBack={() => setTab("more")} label="More" />
      <SectionTitle title="Marketing" />
      <Callout icon={Megaphone} tone="info">
        This is where flyer generation and a content calendar will live. You'll generate the content here,
        then share it yourself to WhatsApp, Facebook, or wherever you like — the Share button already
        works this way on Receipts and Documents.
      </Callout>
      <div style={styles.list}>
        <div style={styles.listRow}>
          <div>
            <div style={styles.listRowTitle}>Flyer generator</div>
            <div style={styles.listRowSub}>Template-based flyers (logo, colors, product, price) work with no extra setup. Nicer AI-generated visuals need an image-generation API connected once the backend is built.</div>
          </div>
        </div>
        <div style={styles.listRow}>
          <div>
            <div style={styles.listRowTitle}>Share to WhatsApp / Facebook</div>
            <div style={styles.listRowSub}>Uses your phone's own share sheet — no account setup, no approval process. Tap Share, pick the app.</div>
          </div>
        </div>
        <div style={styles.listRow}>
          <div>
            <div style={styles.listRowTitle}>Content calendar</div>
            <div style={styles.listRowSub}>Plan what to post and when — coming soon.</div>
          </div>
        </div>
      </div>
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
];

function DocumentsPanel({ biz, category, persist, setTab, canEditBranding = true }) {
  const [templateId, setTemplateId] = useState(LETTER_TEMPLATES[0].id);
  const template = LETTER_TEMPLATES.find((t) => t.id === templateId);
  const [personId, setPersonId] = useState("");
  const [extra, setExtra] = useState("");
  const [preview, setPreview] = useState(null);
  const [showBranding, setShowBranding] = useState(false);
  const [signatureMode, setSignatureMode] = useState("draw");
  const [colorHint, setColorHint] = useState(null);

  const branding = biz.profile.branding || {};
  const [address, setAddress] = useState(branding.address || "");
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || "#1449B0");

  const people = template.forWhom === "employee" ? biz.employees : biz.customers;

  const generate = () => {
    const person = people.find((p) => p.id === personId);
    const text = template.body(biz, person, extra.trim());
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

        <select style={styles.textInput} value={templateId} onChange={(e) => { setTemplateId(e.target.value); setPersonId(""); }}>
          {LETTER_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select style={styles.textInput} value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">Select {template.forWhom === "employee" ? "employee" : category.customerNoun.toLowerCase()}…</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <textarea style={styles.textArea} placeholder="Add specific details (optional) — reason, dates, performance notes…"
          value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} />
        <button style={styles.primaryBtnSmall} onClick={generate}>
          <FileText size={16} /> Generate letter
        </button>
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
    { q: "Why can't I see Accounting or Marketing?", a: "Those are paid add-ons. Check Packages & Billing to activate them, or see if your free trial is still active." },
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
        <div style={styles.seatMeter}>Plan: {1 + (biz.profile.extraSeats || 0)} staff seat{(1 + (biz.profile.extraSeats || 0)) !== 1 ? "s" : ""}, {1 + (biz.profile.extraBranches || 0)} branch{(1 + (biz.profile.extraBranches || 0)) !== 1 ? "es" : ""}</div>
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
      ],
    },
    {
      title: "Money & accounting",
      color: "#8A6D00",
      rows: [
        { id: "accounting", label: "Accounting", icon: BookOpen, desc: "Profit & loss, ledger, receivables, balance sheet", show: has("accounting") },
        { id: "reports", label: "Reports", icon: BarChart3, desc: "Cash flow, gross & net profit, Excel export", show: has("reports") },
        { id: "billing", label: "Packages & billing", icon: Wallet, desc: "Manage your plan and paid add-ons", show: isOwner },
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
        { id: "marketing", label: "Marketing", icon: Megaphone, desc: "Flyers, broadcasts, content calendar", show: has("marketing") },
        { id: "documents", label: "Documents", icon: FileText, desc: "Generate letters — offers, apologies, warnings", show: has("marketing") },
      ],
    },
    {
      title: "Business",
      color: "#3D3630",
      rows: [
        { id: "settings", label: "Settings", icon: Settings, desc: "Business profile, theme, discount rules", show: isOwner },
        { id: "integrations", label: "Integrations", icon: Puzzle, desc: "Mobile money, WhatsApp, accounting sync (coming soon)", show: isOwner },
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
    more: ["more", "employees", "branches", "customers", "reports", "accounting", "marketing", "documents", "billing", "settings", "calculator", "expenses", "activity", "integrations", "help"],
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
  modalCard: { background: "var(--surface)", borderRadius: 16, padding: 22, width: "100%", maxWidth: 360, fontFamily: "'Inter', sans-serif", boxShadow: "0 20px 50px rgba(0,0,0,0.28)" },
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
