import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Kind, LogData, Profile } from "./types";

/* ------------------------------------------------------------------ *
 * Storage. Two backends behind one interface:
 *  - Supabase (real accounts, data synced across devices) when the
 *    VITE_SUPABASE_* env vars are set.
 *  - Demo mode: everything in this browser's localStorage.
 * Everything is one table of rows: (user, kind, key) → JSON data.
 * ------------------------------------------------------------------ */

export interface Store {
  mode: "demo" | "cloud";
  loadProfile(): Promise<Profile | null>;
  saveProfile(p: Profile): Promise<void>;
  loadLogs(): Promise<LogData>;
  put(kind: Kind, key: string, data: unknown): Promise<void>;
  remove(kind: Kind, key: string): Promise<void>;
  clearLogs(): Promise<void>;
}

const clean = (v: unknown) => String(v ?? "").trim().replace(/^["']|["']$/g, "").trim();

/** Accepts common copy/paste variants of the project URL and returns https://<ref>.supabase.co. */
export function normalizeSupabaseUrl(raw: string): string {
  let v = clean(raw);
  if (!v) return "";
  const dash = v.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1].toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    return new URL(v).origin;
  } catch {
    return "";
  }
}

/** Returns a plain-English problem with the configured values, or "" if they look fine. */
export function checkConfig(rawUrl: string, rawKey: string): string {
  const u = clean(rawUrl);
  const k = clean(rawKey);
  if (!u && !k) return "";
  if (!u) return "VITE_SUPABASE_URL is missing in Vercel.";
  if (!k) return "VITE_SUPABASE_ANON_KEY is missing in Vercel.";
  if (/^(sb_|eyJ)/.test(u) || /^https?:|supabase\.co/i.test(k))
    return "The two values look swapped: VITE_SUPABASE_URL should be the https://….supabase.co address and VITE_SUPABASE_ANON_KEY the long key.";
  if (/^sb_secret_/.test(k)) return "VITE_SUPABASE_ANON_KEY is the secret key. Use the publishable (or anon public) key instead, and rotate the secret key in Supabase.";
  if (/^eyJ/.test(k)) {
    try {
      if (JSON.parse(atob(k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role")
        return "VITE_SUPABASE_ANON_KEY is the service_role key. Use the anon public key instead, and rotate the service_role key in Supabase.";
    } catch {
      /* not a JWT we can read; let Supabase judge it */
    }
  } else if (!/^sb_publishable_/.test(k)) return "VITE_SUPABASE_ANON_KEY doesn't look like a Supabase key (it should start with sb_publishable_ or eyJ).";
  const n = normalizeSupabaseUrl(u);
  if (!n) return `VITE_SUPABASE_URL "${u}" isn't a web address. It should look like https://abcdefgh.supabase.co`;
  if (!/\.supabase\.co$/i.test(new URL(n).hostname)) return `VITE_SUPABASE_URL "${u}" should look like https://abcdefgh.supabase.co (from Supabase → Project Settings → Data API).`;
  return "";
}

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "");
const rawKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");

export let configError = checkConfig(rawUrl, rawKey);
let client: SupabaseClient | null = null;
if (!configError && clean(rawUrl) && clean(rawKey)) {
  try {
    client = createClient(normalizeSupabaseUrl(rawUrl), clean(rawKey));
  } catch (e) {
    configError = "Couldn't connect to Supabase: " + (e as Error).message;
  }
}
export const supabase: SupabaseClient | null = client;

const empty = (): LogData => ({ days: {}, sessions: {}, tests: {} });

/* ---------- Demo (localStorage) ---------- */

const LS = "traininghub:v1";
function readLS(): { profile: Profile | null; logs: LogData } {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable */
  }
  return { profile: null, logs: empty() };
}
function writeLS(v: { profile: Profile | null; logs: LogData }) {
  try {
    localStorage.setItem(LS, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export const demoStore: Store = {
  mode: "demo",
  async loadProfile() {
    return readLS().profile;
  },
  async saveProfile(p) {
    const v = readLS();
    v.profile = p;
    writeLS(v);
  },
  async loadLogs() {
    return { ...empty(), ...readLS().logs };
  },
  async put(kind, key, data) {
    const v = readLS();
    (v.logs[kind] as Record<string, unknown>)[key] = data;
    writeLS(v);
  },
  async remove(kind, key) {
    const v = readLS();
    delete v.logs[kind][key];
    writeLS(v);
  },
  async clearLogs() {
    const v = readLS();
    v.logs = empty();
    writeLS(v);
  },
};

/* ---------- Cloud (Supabase) ---------- */

export function cloudStore(sb: SupabaseClient, userId: string): Store {
  const table = () => sb.from("entries");
  const check = (error: { message: string } | null) => {
    if (error) throw new Error(error.message);
  };
  return {
    mode: "cloud",
    async loadProfile() {
      const { data, error } = await table().select("data").eq("user_id", userId).eq("kind", "profile").eq("key", "main").maybeSingle();
      check(error);
      return (data?.data as Profile) ?? null;
    },
    async saveProfile(p) {
      const { error } = await table().upsert({ user_id: userId, kind: "profile", key: "main", data: p, updated_at: new Date().toISOString() });
      check(error);
    },
    async loadLogs() {
      const out = empty();
      const { data, error } = await table().select("kind,key,data").eq("user_id", userId).neq("kind", "profile");
      check(error);
      (data ?? []).forEach((r: { kind: Kind; key: string; data: unknown }) => {
        if (out[r.kind]) (out[r.kind] as Record<string, unknown>)[r.key] = r.data;
      });
      return out;
    },
    async put(kind, key, data) {
      const { error } = await table().upsert({ user_id: userId, kind, key, data, updated_at: new Date().toISOString() });
      check(error);
    },
    async remove(kind, key) {
      const { error } = await table().delete().eq("user_id", userId).eq("kind", kind).eq("key", key);
      check(error);
    },
    async clearLogs() {
      const { error } = await table().delete().eq("user_id", userId).neq("kind", "profile");
      check(error);
    },
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
