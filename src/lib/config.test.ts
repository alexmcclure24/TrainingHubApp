import { describe, expect, it } from "vitest";
import { checkConfig, normalizeSupabaseUrl } from "./store";

const KEY = "sb_publishable_abc123";
describe("Supabase config", () => {
  it("fixes common URL paste mistakes", () => {
    expect(normalizeSupabaseUrl("abcdefgh.supabase.co")).toBe("https://abcdefgh.supabase.co");
    expect(normalizeSupabaseUrl(" https://abcdefgh.supabase.co/ ")).toBe("https://abcdefgh.supabase.co");
    expect(normalizeSupabaseUrl("https://abcdefgh.supabase.co/rest/v1/")).toBe("https://abcdefgh.supabase.co");
    expect(normalizeSupabaseUrl("https://supabase.com/dashboard/project/abcdefgh/settings/api")).toBe("https://abcdefgh.supabase.co");
  });
  it("accepts good values and empty (demo mode)", () => {
    expect(checkConfig("abcdefgh.supabase.co", KEY)).toBe("");
    expect(checkConfig("", "")).toBe("");
  });
  it("explains bad values", () => {
    expect(checkConfig("", KEY)).toMatch(/URL is missing/);
    expect(checkConfig(KEY, "https://abcdefgh.supabase.co")).toMatch(/swapped/);
    expect(checkConfig("https://abcdefgh.supabase.co", "sb_secret_x")).toMatch(/secret key/);
    expect(checkConfig("https://example.com", KEY)).toMatch(/should look like/);
  });
});
