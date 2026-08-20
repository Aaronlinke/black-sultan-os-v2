import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type TestUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "user" | "admin"): TrpcContext {
  const user: TestUser = {
    id: role === "admin" ? 1 : 2,
    openId: `${role}-open-id`,
    email: `${role}@example.com`,
    name: role === "admin" ? "Black Sultan Admin" : "Read Only Operator",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("blackSultan admin controls", () => {
  it("allows the public preview to read system status without a session", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => undefined } as TrpcContext["res"],
    });
    const status = await caller.blackSultan.getStatus();

    expect(status.systemHealth).toBe("OPTIMAL");
    expect(status.totalModules).toBeGreaterThanOrEqual(45);
  });

  it("rejects module control for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(
      caller.blackSultan.toggleModule({ moduleKey: "telemetry", status: "stopped" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects governance votes for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(
      caller.blackSultan.voteProposal({ id: 1, vote: "for" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects critical-event notifications for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(
      caller.blackSultan.raiseCriticalEvent({
        kind: "anomaly_detected",
        title: "Test anomaly",
        description: "Test event must remain admin-only.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects watchdogs checks for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(
      caller.blackSultan.checkSystemTriggers(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an authenticated admin to read system status without a database connection", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const status = await caller.blackSultan.getStatus();

    expect(status.systemHealth).toBe("OPTIMAL");
    expect(status.totalModules).toBeGreaterThanOrEqual(45);
    expect(["LOW", "MEDIUM", "CRITICAL"]).toContain(status.riskLevel);
  });
});
