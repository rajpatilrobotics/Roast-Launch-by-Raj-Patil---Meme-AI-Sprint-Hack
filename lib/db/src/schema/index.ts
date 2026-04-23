import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const activityHistoryTable = pgTable("activity_history", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  type: text("type").notNull(),
  coinName: text("coin_name").notNull(),
  score: integer("score"),
  verdict: text("verdict"),
  result: jsonb("result").notNull(),
  remixOfId: integer("remix_of_id"),
  remixOfUser: text("remix_of_user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertActivitySchema = createInsertSchema(activityHistoryTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityHistoryTable.$inferSelect;

export const reactionsTable = pgTable("reactions", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  userName: text("user_name").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  userName: text("user_name").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coinVotesTable = pgTable("coin_votes", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  userName: text("user_name").notNull(),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  coinIdea: text("coin_idea").notNull(),
  coinName: text("coin_name"),
  ticker: text("ticker"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyBattlesTable = pgTable("daily_battles", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  coinAId: integer("coin_a_id").notNull(),
  coinBId: integer("coin_b_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyBattleVotesTable = pgTable("daily_battle_votes", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull(),
  userName: text("user_name").notNull(),
  side: text("side").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyChallengeCompletionsTable = pgTable("daily_challenge_completions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  userName: text("user_name").notNull(),
  activityId: integer("activity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presenceTable = pgTable("presence", {
  userName: text("user_name").primaryKey(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

export const liveBattleRoomsTable = pgTable("live_battle_rooms", {
  id: serial("id").primaryKey(),
  hostUser: text("host_user").notNull(),
  opponentUser: text("opponent_user").notNull(),
  status: text("status").notNull(),
  hostCoin: jsonb("host_coin"),
  opponentCoin: jsonb("opponent_coin"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
});

export const battleRequestsTable = pgTable("battle_requests", {
  id: serial("id").primaryKey(),
  fromUser: text("from_user").notNull(),
  toUser: text("to_user").notNull(),
  status: text("status").notNull(),
  fromCoin: jsonb("from_coin").notNull(),
  toCoin: jsonb("to_coin"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friendshipsTable = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userA: text("user_a").notNull(),
  userB: text("user_b").notNull(),
  status: text("status").notNull(),
  requestedBy: text("requested_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const dmMessagesTable = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  userA: text("user_a").notNull(),
  userB: text("user_b").notNull(),
  fromUser: text("from_user").notNull(),
  body: text("body").notNull(),
  readByOther: integer("read_by_other").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
