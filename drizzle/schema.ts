import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const systemModules = mysqlTable("system_modules", {
  id: int("id").autoincrement().primaryKey(),
  moduleKey: varchar("moduleKey", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["running", "stopped", "error", "optimizing"]).default("stopped").notNull(),
  cpuUsage: decimal("cpuUsage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  memoryUsage: decimal("memoryUsage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemModule = typeof systemModules.$inferSelect;
export type InsertSystemModule = typeof systemModules.$inferInsert;

export const eventLogs = mysqlTable("event_logs", {
  id: int("id").autoincrement().primaryKey(),
  level: mysqlEnum("level", ["INFO", "WARN", "CRITICAL", "SUCCESS"]).default("INFO").notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = typeof eventLogs.$inferInsert;

export const tradeRecords = mysqlTable("trade_records", {
  id: int("id").autoincrement().primaryKey(),
  assetPair: varchar("assetPair", { length: 32 }).notNull(),
  action: mysqlEnum("action", ["BUY", "SELL", "ARBITRAGE", "STAKE"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  price: decimal("price", { precision: 18, scale: 4 }).notNull(),
  profit: decimal("profit", { precision: 18, scale: 4 }).default("0.0000").notNull(),
  status: mysqlEnum("status", ["COMPLETED", "PENDING", "FAILED"]).default("COMPLETED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TradeRecord = typeof tradeRecords.$inferSelect;
export type InsertTradeRecord = typeof tradeRecords.$inferInsert;

export const governanceProposals = mysqlTable("governance_proposals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  creator: varchar("creator", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "PASSED", "REJECTED", "EXECUTED"]).default("ACTIVE").notNull(),
  votesFor: int("votesFor").default(0).notNull(),
  votesAgainst: int("votesAgainst").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GovernanceProposal = typeof governanceProposals.$inferSelect;
export type InsertGovernanceProposal = typeof governanceProposals.$inferInsert;

export const securityAlerts = mysqlTable("security_alerts", {
  id: int("id").autoincrement().primaryKey(),
  severity: mysqlEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM").notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description").notNull(),
  resolved: int("resolved").default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = typeof securityAlerts.$inferInsert;

export const aiSessions = mysqlTable("ai_sessions", {
  id: int("id").autoincrement().primaryKey(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  recommendations: json("recommendations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiSession = typeof aiSessions.$inferSelect;
export type InsertAiSession = typeof aiSessions.$inferInsert;
