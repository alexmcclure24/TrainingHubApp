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

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

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
