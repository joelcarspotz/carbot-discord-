import { pgTable, text, serial, integer, boolean, timestamp, json, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Car rarity definitions with chance percentages and value multipliers
export const CAR_RARITIES = {
  COMMON: { name: "Common", chance: 0.25, valueMultiplier: 1, color: "#a5a5a5" },
  UNCOMMON: { name: "Uncommon", chance: 0.25, valueMultiplier: 1.5, color: "#55aa55" },
  RARE: { name: "Rare", chance: 0.25, valueMultiplier: 2, color: "#5555ff" },
  EPIC: { name: "Epic", chance: 0.15, valueMultiplier: 3, color: "#aa00aa" },
  LEGENDARY: { name: "Legendary", chance: 0.07, valueMultiplier: 5, color: "#ffaa00" },
  MYTHIC: { name: "Mythic", chance: 0.03, valueMultiplier: 10, color: "#ff5555" }
};

// Part types for car customization
export const PART_TYPES = {
  ENGINE: { 
    name: "Engine",
    affects: ["speed", "acceleration"],
    description: "Improves overall speed and acceleration"
  },
  TURBO: { 
    name: "Turbo",
    affects: ["acceleration", "boost"],
    description: "Increases acceleration and boost capacity"
  },
  TIRES: { 
    name: "Tires",
    affects: ["handling", "acceleration"],
    description: "Enhances grip and cornering ability"
  },
  BRAKES: { 
    name: "Brakes",
    affects: ["handling"],
    description: "Improves stopping power and cornering control"
  },
  SUSPENSION: { 
    name: "Suspension",
    affects: ["handling", "speed"],
    description: "Stabilizes the car for better cornering and top speed"
  },
  NOS: { 
    name: "NOS",
    affects: ["boost"],
    description: "Adds extra burst of speed when activated"
  },
  TRANSMISSION: { 
    name: "Transmission",
    affects: ["acceleration", "speed"],
    description: "Optimizes power transfer for better acceleration and top speed"
  },
  WEIGHT_REDUCTION: { 
    name: "Weight Reduction",
    affects: ["acceleration", "handling", "speed"],
    description: "Reduces overall weight for better performance"
  }
};

// Visual customization types
export const VISUAL_TYPES = {
  PAINT_JOB: {
    name: "Paint Job",
    description: "Custom paint finish for your car"
  },
  DECALS: {
    name: "Decals",
    description: "Graphics and stickers for your car's exterior"
  },
  WHEELS: {
    name: "Wheels",
    description: "Custom rims and wheel designs"
  },
  NEON: {
    name: "Neon",
    description: "Undercarriage lighting effects"
  },
  SPOILER: {
    name: "Spoiler",
    description: "Rear wing or spoiler modifications"
  },
  EXHAUST: {
    name: "Exhaust",
    description: "Custom exhaust system"
  },
  BODY_KIT: {
    name: "Body Kit",
    description: "Full body modification package"
  }
};

// Weather conditions for races
export const WEATHER_CONDITIONS = {
  CLEAR: {
    name: "Clear",
    description: "Perfect racing conditions with good visibility and dry track",
    effects: {
      speed: 1.0,
      acceleration: 1.0,
      handling: 1.0
    }
  },
  RAIN: {
    name: "Rain",
    description: "Wet conditions reduce traction and visibility",
    effects: {
      speed: 0.9,
      acceleration: 0.85,
      handling: 0.7
    }
  },
  SNOW: {
    name: "Snow",
    description: "Slippery conditions severely impact handling and acceleration",
    effects: {
      speed: 0.7,
      acceleration: 0.6,
      handling: 0.5
    }
  },
  FOG: {
    name: "Fog",
    description: "Reduced visibility affects racing line precision",
    effects: {
      speed: 0.8,
      acceleration: 0.9,
      handling: 0.85
    }
  },
  NIGHT: {
    name: "Night",
    description: "Darkness creates challenging visibility conditions",
    effects: {
      speed: 0.9,
      acceleration: 0.95,
      handling: 0.85
    }
  },
  HEAT: {
    name: "Heat Wave",
    description: "Extreme heat affects engine efficiency",
    effects: {
      speed: 0.85,
      acceleration: 0.8,
      handling: 0.95
    }
  }
};

// Track types
export const TRACK_TYPES = {
  CIRCUIT: {
    name: "Circuit",
    description: "Professional race track with multiple turns",
    focus: "handling"
  },
  STREET: {
    name: "Street",
    description: "Urban course with tight corners and traffic elements",
    focus: "handling" 
  },
  DRAG: {
    name: "Drag Strip",
    description: "Straight line quarter-mile race",
    focus: "acceleration"
  },
  HIGHWAY: {
    name: "Highway",
    description: "Long stretches of open road",
    focus: "speed"
  },
  DRIFT: {
    name: "Drift Course",
    description: "Technical course designed for controlled sliding",
    focus: "handling"
  },
  OFFROAD: {
    name: "Off-road",
    description: "Rugged terrain with varied surfaces",
    focus: "handling"
  },
  MOUNTAIN: {
    name: "Mountain Pass",
    description: "Winding roads with elevation changes",
    focus: "handling"
  }
};

// Key definitions with costs and rarity influence
export const CAR_KEYS = {
  STANDARD: { 
    name: "Standard Key", 
    price: 5000,
    description: "A standard key with better chances for everyday sports cars.",
    dropRate: 70.0, // Percentage chance to get from races
    rarityBoosts: {
      COMMON: 2.0,      // Basic sports cars like Focus RS, Golf R
      UNCOMMON: 1.5,    // Entry performance like WRX STI, Civic Type R
      RARE: 1.0,        // Mid-tier like BMW M4, Audi RS7
      EPIC: 0.3,        // High-end like Ferrari F8, McLaren 720S
      LEGENDARY: 0.1,   // Ultra-luxury like Rolls Royce
      MYTHIC: 0.05      // Hypercars like Bugatti
    }
  },
  PREMIUM: { 
    name: "Premium Key", 
    price: 15000,
    description: "A premium key focused on high-performance sports cars.",
    dropRate: 20.0, // Percentage chance to get from races
    rarityBoosts: {
      COMMON: 3.5,
      UNCOMMON: 2.0,
      RARE: 1.5,        // Better chances for M4, RS7
      EPIC: 1.0,        // Decent shot at supercars
      LEGENDARY: 0.5,   // Small chance at ultra-luxury
      MYTHIC: 0.1       // Tiny chance at hypercars
    }
  },
  LEGENDARY: { 
    name: "Legendary Key", 
    price: 35000,
    description: "A legendary key with high chances for exotic supercars.",
    dropRate: 9.0, // Percentage chance to get from races
    rarityBoosts: {
      COMMON: 0.1,
      UNCOMMON: 0.2,
      RARE: 1.0,
      EPIC: 3.0,        // High chance for supercars
      LEGENDARY: 2.5,   // Good chance for ultra-luxury
      MYTHIC: 1.0       // Better shot at hypercars
    }
  },
  MYTHIC: { 
    name: "Mythic Key", 
    price: 75000,
    description: "A mythic key focused on the rarest hypercars and F1.",
    dropRate: 1.0, // Percentage chance to get from races
    rarityBoosts: {
      COMMON: 0.0,
      UNCOMMON: 0.0,
      RARE: 0.5,
      EPIC: 1.0,
      LEGENDARY: 3.0,   // High chance for ultra-luxury
      MYTHIC: 5.0       // Best chance at hypercars
    }
  }
};

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  balance: integer("balance").notNull().default(1000),
  activeCarId: integer("active_car_id"),
  lastStealAttempt: timestamp("last_steal_attempt"),
  lastRace: timestamp("last_race"),
  lastDaily: timestamp("last_daily"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  discordId: true,
  username: true,
  balance: true,
  activeCarId: true,
  lastStealAttempt: true,
  lastRace: true,
  lastDaily: true,
});

// Car schema
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  rarity: text("rarity").notNull(),
  speed: integer("speed").notNull(),
  acceleration: integer("acceleration").notNull(),
  handling: integer("handling").notNull(),
  boost: integer("boost").notNull(),
  value: integer("value").notNull(),
  image: text("image"), // Keeping for DB compatibility, but this is no longer used
  acquired: timestamp("acquired").defaultNow(),
  // Car customization options
  customName: text("custom_name"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  neonColor: text("neon_color"),
  licensePlate: text("license_plate"),
  customEmoji: text("custom_emoji"),
});

export const insertCarSchema = createInsertSchema(cars).pick({
  userId: true,
  name: true,
  type: true,
  rarity: true,
  speed: true,
  acceleration: true,
  handling: true,
  boost: true,
  value: true,
  image: true, // Keeping for DB compatibility, but this is no longer used
  acquired: true,
  customName: true,
  primaryColor: true,
  secondaryColor: true,
  neonColor: true,
  licensePlate: true,
  customEmoji: true,
});

// Race schema
export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  challenger: integer("challenger").notNull(),
  opponent: integer("opponent"),
  challengerCarId: integer("challenger_car_id").notNull(),
  opponentCarId: integer("opponent_car_id"),
  bet: integer("bet").notNull(),
  trackType: text("track_type").notNull(),
  status: text("status").notNull().default("pending"),
  winner: integer("winner"),
  raceData: json("race_data"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertRaceSchema = createInsertSchema(races).pick({
  challenger: true,
  opponent: true,
  challengerCarId: true,
  opponentCarId: true,
  bet: true,
  trackType: true,
  status: true,
  expiresAt: true,
});

// Shop item schema
export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  rarity: text("rarity").notNull(),
  speed: integer("speed").notNull(),
  acceleration: integer("acceleration").notNull(),
  handling: integer("handling").notNull(),
  boost: integer("boost").notNull(),
  price: integer("price").notNull(),
  available: boolean("available").notNull().default(true),
  image: text("image"), // Keeping for DB compatibility, but this is no longer used
});

export const insertShopItemSchema = createInsertSchema(shopItems).pick({
  name: true,
  type: true,
  rarity: true,
  speed: true,
  acceleration: true,
  handling: true,
  boost: true,
  price: true,
  available: true,
  image: true, // Keeping for DB compatibility, but this is no longer used
});

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  amount: true,
  description: true,
  relatedId: true,
});

// Activity log schema
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  userId: integer("user_id").notNull(),
  targetId: integer("target_id"),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  type: true,
  userId: true,
  targetId: true,
  details: true,
});

// Steal attempt schema
export const stealAttempts = pgTable("steal_attempts", {
  id: serial("id").primaryKey(),
  thiefId: integer("thief_id").notNull(),
  targetId: integer("target_id").notNull(),
  success: boolean("success").notNull(),
  carId: integer("car_id"),
  fine: integer("fine"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStealAttemptSchema = createInsertSchema(stealAttempts).pick({
  thiefId: true,
  targetId: true,
  success: true,
  carId: true,
  fine: true,
});

// User keys schema
export const userKeys = pgTable("user_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keyType: text("key_type").notNull(), // Reference to CAR_KEYS
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserKeySchema = createInsertSchema(userKeys).pick({
  userId: true,
  keyType: true,
  quantity: true,
});

// Performance parts schema
export const performanceParts = pgTable("performance_parts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Reference to PART_TYPES
  tier: integer("tier").notNull().default(1), // 1-5 tiers for parts
  speedBoost: integer("speed_boost").notNull().default(0),
  accelerationBoost: integer("acceleration_boost").notNull().default(0),
  handlingBoost: integer("handling_boost").notNull().default(0),
  boostBoost: integer("boost_boost").notNull().default(0),
  price: integer("price").notNull(),
  description: text("description"),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPerformancePartSchema = createInsertSchema(performanceParts).pick({
  name: true,
  type: true,
  tier: true,
  speedBoost: true,
  accelerationBoost: true,
  handlingBoost: true,
  boostBoost: true,
  price: true,
  description: true,
  available: true,
});

// Car parts (installed parts) schema
export const carParts = pgTable("car_parts", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  partId: integer("part_id").notNull(),
  installedAt: timestamp("installed_at").defaultNow(),
});

export const insertCarPartSchema = createInsertSchema(carParts).pick({
  carId: true,
  partId: true,
});

// Visual customizations schema
export const visualCustomizations = pgTable("visual_customizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Reference to VISUAL_TYPES
  tier: integer("tier").notNull().default(1), // 1-5 tiers
  price: integer("price").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVisualCustomizationSchema = createInsertSchema(visualCustomizations).pick({
  name: true,
  type: true,
  tier: true,
  price: true,
  description: true,
  imageUrl: true,
  available: true,
});

// Car visual customizations (installed visuals) schema
export const carVisuals = pgTable("car_visuals", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  visualId: integer("visual_id").notNull(),
  installedAt: timestamp("installed_at").defaultNow(),
});

export const insertCarVisualSchema = createInsertSchema(carVisuals).pick({
  carId: true,
  visualId: true,
});

// Driver skills schema
export const driverSkills = pgTable("driver_skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  skillType: text("skill_type").notNull(), // drift, drag, circuit, etc.
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDriverSkillSchema = createInsertSchema(driverSkills).pick({
  userId: true,
  skillType: true,
  level: true,
  experience: true,
});

// Tournaments schema
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trackType: text("track_type").notNull(),
  entryFee: integer("entry_fee").notNull().default(0),
  prizePool: integer("prize_pool").notNull().default(0),
  maxParticipants: integer("max_participants").notNull(),
  status: text("status").notNull().default("upcoming"), // upcoming, active, completed
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  weather: text("weather").default("CLEAR"), // Reference to WEATHER_CONDITIONS
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).pick({
  name: true,
  description: true,
  trackType: true,
  entryFee: true,
  prizePool: true,
  maxParticipants: true,
  status: true,
  startTime: true,
  endTime: true,
  weather: true,
});

// Tournament participants schema
export const tournamentParticipants = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  userId: integer("user_id").notNull(),
  carId: integer("car_id").notNull(),
  position: integer("position"), // Final position
  bestTime: doublePrecision("best_time"), // Best lap/race time
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).pick({
  tournamentId: true,
  userId: true,
  carId: true,
  position: true,
  bestTime: true,
});

// Teams schema
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull(), // Short tag like "GTR"
  description: text("description"),
  logo: text("logo"),
  ownerId: integer("owner_id").notNull(),
  balance: integer("balance").notNull().default(0),
  maxMembers: integer("max_members").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  tag: true,
  description: true,
  logo: true,
  ownerId: true,
  balance: true,
  maxMembers: true,
});

// Team members schema
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member"), // owner, officer, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  role: true,
});

// Achievements schema
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // collection, race, drift, etc.
  requirement: jsonb("requirement").notNull(), // Dynamic requirements 
  reward: integer("reward").notNull().default(0),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  name: true,
  description: true,
  type: true,
  requirement: true,
  reward: true,
  icon: true,
});

// User achievements schema
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).pick({
  userId: true,
  achievementId: true,
  progress: true,
  completed: true,
  completedAt: true,
});

// Daily challenges schema
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // race, drift, upgrade, etc.
  requirement: jsonb("requirement").notNull(), // Dynamic requirements
  reward: integer("reward").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).pick({
  name: true,
  description: true,
  type: true,
  requirement: true,
  reward: true,
  expiresAt: true,
});

// User challenges schema
export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserChallengeSchema = createInsertSchema(userChallenges).pick({
  userId: true,
  challengeId: true,
  progress: true,
  completed: true,
  completedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;

export type Race = typeof races.$inferSelect;
export type InsertRace = z.infer<typeof insertRaceSchema>;

export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type StealAttempt = typeof stealAttempts.$inferSelect;
export type InsertStealAttempt = z.infer<typeof insertStealAttemptSchema>;

export type UserKey = typeof userKeys.$inferSelect;
export type InsertUserKey = z.infer<typeof insertUserKeySchema>;

export type PerformancePart = typeof performanceParts.$inferSelect;
export type InsertPerformancePart = z.infer<typeof insertPerformancePartSchema>;

export type CarPart = typeof carParts.$inferSelect;
export type InsertCarPart = z.infer<typeof insertCarPartSchema>;

export type VisualCustomization = typeof visualCustomizations.$inferSelect;
export type InsertVisualCustomization = z.infer<typeof insertVisualCustomizationSchema>;

export type CarVisual = typeof carVisuals.$inferSelect;
export type InsertCarVisual = z.infer<typeof insertCarVisualSchema>;

export type DriverSkill = typeof driverSkills.$inferSelect;
export type InsertDriverSkill = z.infer<typeof insertDriverSkillSchema>;

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;

export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;

export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
