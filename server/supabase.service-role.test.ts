import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const integrationTest = supabaseUrl && serviceRoleKey ? it : it.skip;

describe("Supabase service-role configuration", () => {
  integrationTest("authorizes a lightweight Auth Admin request", async () => {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`,
      {
        headers: {
          apikey: serviceRoleKey!,
          Authorization: `Bearer ${serviceRoleKey!}`,
        },
      },
    );

    expect(response.ok).toBe(true);
    const payload = await response.json() as { users?: unknown[] };
    expect(Array.isArray(payload.users)).toBe(true);
  });
});
