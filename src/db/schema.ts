import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// --- Better Auth tables (field names must match Better Auth's defaults) ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Application ---

export const tripStatus = pgEnum("trip_status", ["idee", "preparation", "confirme", "termine"]);
export const memberRole = pgEnum("member_role", ["owner", "editor"]);
export const bookingKind = pgEnum("booking_kind", ["vol", "train", "bus", "voiture", "logement", "autre"]);
export const bookingStatus = pgEnum("booking_status", ["option", "reserve", "annule"]);
export const itemStatus = pgEnum("item_status", ["todo", "progress", "done"]);
export const documentCategory = pgEnum("document_category", ["identite", "billets", "visa", "logement", "autre"]);
export const costCategory = pgEnum("cost_category", ["vol", "logement", "transport", "activites", "repas", "autre"]);
// How an estimated amount scales: once for the group, per traveller, per night, per day, per traveller per day.
export const costUnit = pgEnum("cost_unit", ["groupe", "personne", "nuit", "jour", "personne_jour"]);

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  // Null while the destination is still being chosen (see destinationIdeas).
  destination: text("destination"),
  coverUrl: text("cover_url"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: tripStatus("status").notNull().default("preparation"),
  // Basis for budget estimates while comparing destinations. Null: members count / length of the dates.
  travelers: integer("travelers"),
  nights: integer("nights"),
  chosenIdeaId: uuid("chosen_idea_id").references((): AnyPgColumn => destinationIdeas.id, { onDelete: "set null" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("editor"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.userId] }), index("trip_members_user_idx").on(t.userId)],
);

// One shareable link per trip; regenerating it replaces the token.
export const tripInvites = pgTable("trip_invites", {
  tripId: uuid("trip_id")
    .primaryKey()
    .references(() => trips.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

export const destinationIdeas = pgTable("destination_ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  summary: text("summary"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Rough price ranges for a destination idea, in whole euros.
export const ideaCosts = pgTable(
  "idea_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => destinationIdeas.id, { onDelete: "cascade" }),
    category: costCategory("category").notNull(),
    label: text("label"),
    minAmount: integer("min_amount").notNull(),
    maxAmount: integer("max_amount").notNull(),
    unit: costUnit("unit").notNull(),
    url: text("url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idea_costs_idea_idx").on(t.ideaId)],
);

export const ideaVotes = pgTable(
  "idea_votes",
  {
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => destinationIdeas.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.userId] })],
);

// Transports and accommodations. Times are wall-clock local times (no timezone).
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    kind: bookingKind("kind").notNull(),
    title: text("title").notNull(),
    fromPlace: text("from_place"),
    toPlace: text("to_place"),
    startAt: timestamp("start_at", { mode: "string" }),
    endAt: timestamp("end_at", { mode: "string" }),
    reference: text("reference"),
    provider: text("provider"),
    address: text("address"),
    url: text("url"),
    imageUrl: text("image_url"),
    price: text("price"),
    status: bookingStatus("status").notNull().default("reserve"),
    changeDeadline: date("change_deadline"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("bookings_trip_idx").on(t.tripId)],
);

// Human-readable log of date changes (e.g. a flight moved to another day).
export const bookingChanges = pgTable("booking_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    time: text("time"),
    title: text("title").notNull(),
    place: text("place"),
    url: text("url"),
    imageUrl: text("image_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("activities_trip_idx").on(t.tripId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: documentCategory("category").notNull().default("autre"),
    // Set when the file is the ticket or confirmation of a booking.
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("documents_trip_idx").on(t.tripId)],
);

export const checklists = pgTable("checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  checklistId: uuid("checklist_id")
    .notNull()
    .references(() => checklists.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  hint: text("hint"),
  status: itemStatus("status").notNull().default("todo"),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
});

export type Trip = typeof trips.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type IdeaCost = typeof ideaCosts.$inferSelect;
