import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  systemModules, SystemModule, InsertSystemModule,
  eventLogs, EventLog, InsertEventLog,
  tradeRecords, TradeRecord, InsertTradeRecord,
  governanceProposals, GovernanceProposal, InsertGovernanceProposal,
  securityAlerts, SecurityAlert, InsertSecurityAlert,
  aiSessions, AiSession, InsertAiSession
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// === SYSTEM MODULES ===
export async function getSystemModules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(systemModules);
}

export async function upsertModule(mod: InsertSystemModule) {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemModules).values(mod).onDuplicateKeyUpdate({
    set: {
      status: mod.status,
      cpuUsage: mod.cpuUsage,
      memoryUsage: mod.memoryUsage,
      description: mod.description
    }
  });
}

export async function updateModuleStatus(moduleKey: string, status: "running" | "stopped" | "error" | "optimizing") {
  const db = await getDb();
  if (!db) return;
  await db.update(systemModules).set({ status }).where(eq(systemModules.moduleKey, moduleKey));
}

// === EVENT LOGS ===
export async function getEventLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(eventLogs).orderBy(desc(eventLogs.createdAt)).limit(limit);
}

export async function logSystemEvent(log: InsertEventLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(eventLogs).values(log);
}

// === TRADE RECORDS ===
export async function getTradeRecords(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tradeRecords).orderBy(desc(tradeRecords.createdAt)).limit(limit);
}

export async function addTradeRecord(trade: InsertTradeRecord) {
  const db = await getDb();
  if (!db) return;
  await db.insert(tradeRecords).values(trade);
}

// === GOVERNANCE PROPOSALS ===
export async function getProposals() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(governanceProposals).orderBy(desc(governanceProposals.createdAt));
}

export async function createProposal(prop: InsertGovernanceProposal) {
  const db = await getDb();
  if (!db) return;
  await db.insert(governanceProposals).values(prop);
}

export async function voteProposal(id: number, vote: "for" | "against") {
  const db = await getDb();
  if (!db) return;
  if (vote === "for") {
    await db.update(governanceProposals).set({ votesFor: sql`votesFor + 1` }).where(eq(governanceProposals.id, id));
  } else {
    await db.update(governanceProposals).set({ votesAgainst: sql`votesAgainst + 1` }).where(eq(governanceProposals.id, id));
  }
}

// === SECURITY ALERTS ===
export async function getSecurityAlerts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(securityAlerts).orderBy(desc(securityAlerts.createdAt));
}

export async function createSecurityAlert(alert: InsertSecurityAlert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(securityAlerts).values(alert);
}

export async function resolveSecurityAlert(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(securityAlerts).set({ resolved: 1 }).where(eq(securityAlerts.id, id));
}

// === AI SESSIONS ===
export async function saveAiSession(session: InsertAiSession) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiSessions).values(session);
}

export async function getAiSessions(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiSessions).orderBy(desc(aiSessions.createdAt)).limit(limit);
}
