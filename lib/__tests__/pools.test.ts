import { describe, it, expect, vi } from "vitest";
import {
  isMember,
  partitionPools,
  joinPool,
  generateInviteCode,
  createPrivatePool,
  type PoolWithMembers,
} from "@/lib/pools";

const makePool = (overrides: Partial<PoolWithMembers> & { id: number }): PoolWithMembers => ({
  id: overrides.id,
  name: overrides.name ?? `Pool ${overrides.id}`,
  is_public: overrides.is_public ?? false,
  invite_code: overrides.invite_code ?? null,
  created_by: overrides.created_by ?? null,
  season_id: overrides.season_id ?? 1,
  created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
  pool_members: overrides.pool_members ?? [],
});

describe("isMember", () => {
  it("returns true when userId is in pool_members", () => {
    const pool = makePool({ id: 1, pool_members: [{ user_id: "user-1" }] });
    expect(isMember(pool, "user-1")).toBe(true);
  });

  it("returns false when pool_members is empty", () => {
    const pool = makePool({ id: 2, pool_members: [] });
    expect(isMember(pool, "user-1")).toBe(false);
  });

  it("returns false when userId is not in pool_members", () => {
    const pool = makePool({ id: 3, pool_members: [{ user_id: "user-2" }] });
    expect(isMember(pool, "user-1")).toBe(false);
  });
});

describe("partitionPools", () => {
  it("puts a public pool in publicPools regardless of membership", () => {
    const pool = makePool({ id: 1, is_public: true, pool_members: [] });
    const { publicPools, myPrivatePools } = partitionPools([pool], "user-1");
    expect(publicPools).toHaveLength(1);
    expect(myPrivatePools).toHaveLength(0);
  });

  it("puts a private pool where user is a member in myPrivatePools", () => {
    const pool = makePool({
      id: 2,
      is_public: false,
      pool_members: [{ user_id: "user-1" }],
    });
    const { publicPools, myPrivatePools } = partitionPools([pool], "user-1");
    expect(publicPools).toHaveLength(0);
    expect(myPrivatePools).toHaveLength(1);
  });

  it("excludes private pools where user is not a member", () => {
    const pool = makePool({
      id: 3,
      is_public: false,
      pool_members: [{ user_id: "user-2" }],
    });
    const { publicPools, myPrivatePools } = partitionPools([pool], "user-1");
    expect(publicPools).toHaveLength(0);
    expect(myPrivatePools).toHaveLength(0);
  });

  it("handles an empty pools list", () => {
    const { publicPools, myPrivatePools } = partitionPools([], "user-1");
    expect(publicPools).toHaveLength(0);
    expect(myPrivatePools).toHaveLength(0);
  });

  it("a joined public pool appears only in publicPools, not myPrivatePools", () => {
    const pool = makePool({
      id: 4,
      is_public: true,
      pool_members: [{ user_id: "user-1" }],
    });
    const { publicPools, myPrivatePools } = partitionPools([pool], "user-1");
    expect(publicPools).toHaveLength(1);
    expect(myPrivatePools).toHaveLength(0);
  });
});

describe("generateInviteCode", () => {
  it("returns a string of length 6", () => {
    expect(generateInviteCode()).toHaveLength(6);
  });

  it("only contains chars from [A-Z0-9]", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("two calls return different values", () => {
    const a = generateInviteCode();
    const b = generateInviteCode();
    // probabilistic — extremely unlikely to collide
    expect(a).not.toBe(b);
  });
});

describe("createPrivatePool", () => {
  it('inserts pool and returns { status: "created", pool }', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 42, name: "My Pool", invite_code: "ABC123" },
          error: null,
        }),
      }),
    });
    const supabase = { from: () => ({ insert }) } as any;
    const result = await createPrivatePool(supabase, "My Pool", 1, "user-abc");
    expect(result).toEqual({
      status: "created",
      pool: { id: 42, name: "My Pool", invite_code: "ABC123" },
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Pool",
        season_id: 1,
        is_public: false,
        created_by: "user-abc",
      })
    );
  });

  it('returns { status: "error" } on DB error', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "db fail" } }),
      }),
    });
    const supabase = { from: () => ({ insert }) } as any;
    const result = await createPrivatePool(supabase, "My Pool", 1, "user-abc");
    expect(result).toEqual({ status: "error", message: "db fail" });
  });
});

describe("joinPool", () => {
  it('inserts pool_member and returns { status: "joined" }', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: () => ({ insert }) } as any;
    const result = await joinPool(supabase, 1, "user-abc");
    expect(result).toEqual({ status: "joined" });
    expect(insert).toHaveBeenCalledWith({ pool_id: 1, user_id: "user-abc" });
  });

  it('returns { status: "already_member" } on unique constraint violation (23505)', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    const supabase = { from: () => ({ insert }) } as any;
    const result = await joinPool(supabase, 1, "user-abc");
    expect(result).toEqual({ status: "already_member" });
  });

  it('returns { status: "error" } on unexpected DB error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "XXXXX", message: "oops" } });
    const supabase = { from: () => ({ insert }) } as any;
    const result = await joinPool(supabase, 1, "user-abc");
    expect(result).toEqual({ status: "error", message: "oops" });
  });
});
