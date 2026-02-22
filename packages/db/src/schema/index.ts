import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  real,
  jsonb,
  pgEnum,
  customType,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Custom pgvector type ──────────────────────────────────────────────────────
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 768})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(Number);
  },
});

// ── Enums ─────────────────────────────────────────────────────────────────────
export const itemTypeEnum = pgEnum('item_type', ['lost', 'found']);
export const itemStatusEnum = pgEnum('item_status', ['active', 'resolved', 'expired']);
export const foundModeEnum = pgEnum('found_mode', ['left_at_location', 'keeping']);
export const matchStatusEnum = pgEnum('match_status', ['pending', 'confirmed', 'rejected']);
export const claimStatusEnum = pgEnum('claim_status', ['pending', 'approved', 'rejected']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'match_found',
  'claim_submitted',
  'claim_approved',
  'ucard_found',
  'item_resolved',
]);

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }).unique(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Items ─────────────────────────────────────────────────────────────────────
export const items = pgTable(
  'items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: itemTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    location: varchar('location', { length: 255 }),
    dateOccurred: date('date_occurred'),
    imageUrl: text('image_url'),
    imageKey: varchar('image_key', { length: 500 }),
    thumbnailUrl: text('thumbnail_url'),
    status: itemStatusEnum('status').default('active').notNull(),
    foundMode: foundModeEnum('found_mode'),
    contactEmail: varchar('contact_email', { length: 255 }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    aiMetadata: jsonb('ai_metadata').$type<{
      detectedObjects: string[];
      colors: string[];
      brand: string | null;
      condition: string;
      distinctiveFeatures: string[];
      verificationQuestion: string | null;
      verificationAnswerHash: string | null;
      confidence: number;
    }>(),
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('items_type_idx').on(table.type),
    statusIdx: index('items_status_idx').on(table.status),
    userIdx: index('items_user_idx').on(table.userId),
    locationIdx: index('items_location_idx').on(table.location),
    createdAtIdx: index('items_created_at_idx').on(table.createdAt),
  }),
);

// ── Matches ───────────────────────────────────────────────────────────────────
export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lostItemId: uuid('lost_item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
    foundItemId: uuid('found_item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
    similarityScore: real('similarity_score').notNull(),
    status: matchStatusEnum('status').default('pending').notNull(),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lostItemIdx: index('matches_lost_item_idx').on(table.lostItemId),
    foundItemIdx: index('matches_found_item_idx').on(table.foundItemId),
    scoreIdx: index('matches_score_idx').on(table.similarityScore),
  }),
);

// ── Claims ────────────────────────────────────────────────────────────────────
export const claims = pgTable('claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
  claimantId: uuid('claimant_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  verificationQuestion: text('verification_question'),
  verificationAnswerHash: text('verification_answer_hash'),
  similarityScore: real('similarity_score'),
  status: claimStatusEnum('status').default('pending').notNull(),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Claimed Items ─────────────────────────────────────────────────────────────
// Snapshot of item data when claimed; original item is deleted from items table.
export const claimedItems = pgTable(
  'claimed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    claimId: uuid('claim_id')
      .references(() => claims.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    originalItemId: uuid('original_item_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    location: varchar('location', { length: 255 }),
    dateOccurred: date('date_occurred'),
    imageUrl: text('image_url'),
    imageKey: varchar('image_key', { length: 500 }),
    thumbnailUrl: text('thumbnail_url'),
    foundMode: foundModeEnum('found_mode'),
    contactEmail: varchar('contact_email', { length: 255 }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    aiMetadata: jsonb('ai_metadata').$type<{
      detectedObjects?: string[];
      colors?: string[];
      brand?: string | null;
      condition?: string;
      distinctiveFeatures?: string[];
      verificationQuestion?: string | null;
      verificationAnswerHash?: string | null;
      confidence?: number;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    claimIdx: index('claimed_items_claim_idx').on(table.claimId),
    originalItemIdx: index('claimed_items_original_item_idx').on(table.originalItemId),
  }),
);

// ── UCard Lost Reports ────────────────────────────────────────────────────────
// Users report lost UCards with their SPIRE ID (8 digits). Stored as Argon2 hash only.
export const ucardLostReports = pgTable(
  'ucard_lost_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    spireIdHash: text('spire_id_hash').notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active | resolved
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('ucard_lost_reports_user_idx').on(table.userId),
    statusIdx: index('ucard_lost_reports_status_idx').on(table.status),
    spireHashIdx: index('ucard_lost_reports_spire_hash_idx').on(table.spireIdHash),
  }),
);

// ── UCard Recoveries ──────────────────────────────────────────────────────────
export const ucardRecoveries = pgTable('ucard_recoveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  finderId: uuid('finder_id').references(() => users.id, { onDelete: 'set null' }),
  spireIdHash: text('spire_id_hash').notNull(),
  lastNameLower: varchar('last_name_lower', { length: 255 }),
  imageKey: varchar('image_key', { length: 500 }),
  imageUrl: text('image_url'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    readIdx: index('notifications_read_idx').on(table.read),
  }),
);

// ── Refresh Tokens ────────────────────────────────────────────────────────────
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: varchar('token_hash', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  claims: many(claims),
  notifications: many(notifications),
  refreshTokens: many(refreshTokens),
  ucardLostReports: many(ucardLostReports),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, { fields: [items.userId], references: [users.id] }),
  lostMatches: many(matches, { relationName: 'lostItem' }),
  foundMatches: many(matches, { relationName: 'foundItem' }),
  claims: many(claims),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  lostItem: one(items, {
    fields: [matches.lostItemId],
    references: [items.id],
    relationName: 'lostItem',
  }),
  foundItem: one(items, {
    fields: [matches.foundItemId],
    references: [items.id],
    relationName: 'foundItem',
  }),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  item: one(items, { fields: [claims.itemId], references: [items.id] }),
  claimant: one(users, { fields: [claims.claimantId], references: [users.id] }),
  owner: one(users, { fields: [claims.ownerId], references: [users.id] }),
  claimedItem: one(claimedItems),
}));

export const claimedItemsRelations = relations(claimedItems, ({ one }) => ({
  claim: one(claims, { fields: [claimedItems.claimId], references: [claims.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const ucardLostReportsRelations = relations(ucardLostReports, ({ one }) => ({
  user: one(users, { fields: [ucardLostReports.userId], references: [users.id] }),
}));

// ── Type Exports ──────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
export type ClaimedItem = typeof claimedItems.$inferSelect;
export type NewClaimedItem = typeof claimedItems.$inferInsert;
export type UCardLostReport = typeof ucardLostReports.$inferSelect;
export type NewUCardLostReport = typeof ucardLostReports.$inferInsert;
export type UCardRecovery = typeof ucardRecoveries.$inferSelect;
export type NewUCardRecovery = typeof ucardRecoveries.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
