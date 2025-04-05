import {
  users, type User, type InsertUser,
  cars, type Car, type InsertCar,
  races, type Race, type InsertRace,
  shopItems, type ShopItem, type InsertShopItem,
  transactions, type Transaction, type InsertTransaction,
  activityLogs, type ActivityLog, type InsertActivityLog,
  stealAttempts, type StealAttempt, type InsertStealAttempt,
  userKeys, type UserKey, type InsertUserKey,
  performanceParts, type PerformancePart, type InsertPerformancePart,
  carParts, type CarPart, type InsertCarPart,
  visualCustomizations, type VisualCustomization, type InsertVisualCustomization,
  carVisuals, type CarVisual, type InsertCarVisual,
  driverSkills, type DriverSkill, type InsertDriverSkill,
  tournaments, type Tournament, type InsertTournament,
  tournamentParticipants, type TournamentParticipant, type InsertTournamentParticipant,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  achievements, type Achievement, type InsertAchievement,
  userAchievements, type UserAchievement, type InsertUserAchievement,
  dailyChallenges, type DailyChallenge, type InsertDailyChallenge,
  userChallenges, type UserChallenge, type InsertUserChallenge
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lt, gte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Car operations
  getCar(id: number): Promise<Car | undefined>;
  getUserCars(userId: number): Promise<Car[]>;
  getAllCars(skip: number, limit: number): Promise<Car[]>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, data: Partial<Car>): Promise<Car | undefined>;
  deleteCar(id: number): Promise<boolean>;
  
  // Race operations
  getRace(id: number): Promise<Race | undefined>;
  getActiveRaces(): Promise<Race[]>;
  getUserRaces(userId: number): Promise<Race[]>;
  createRace(race: InsertRace): Promise<Race>;
  updateRace(id: number, data: Partial<Race>): Promise<Race | undefined>;
  
  // Shop operations
  getShopItems(): Promise<ShopItem[]>;
  getShopItem(id: number): Promise<ShopItem | undefined>;
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  updateShopItem(id: number, data: Partial<ShopItem>): Promise<ShopItem | undefined>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  
  // Activity log operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivityLogs(limit?: number): Promise<ActivityLog[]>;
  
  // Steal attempt operations
  createStealAttempt(attempt: InsertStealAttempt): Promise<StealAttempt>;
  getUserStealAttempts(userId: number): Promise<StealAttempt[]>;
  
  // User key operations
  getUserKeys(userId: number): Promise<UserKey[]>;
  getUserKey(userId: number, keyType: string): Promise<UserKey | undefined>;
  addUserKey(userKey: InsertUserKey): Promise<UserKey>;
  updateUserKey(id: number, data: Partial<UserKey>): Promise<UserKey | undefined>;
  useKey(userId: number, keyType: string): Promise<boolean>;
  
  // Performance parts operations
  getPerformanceParts(): Promise<PerformancePart[]>;
  getPerformancePart(id: number): Promise<PerformancePart | undefined>;
  createPerformancePart(part: InsertPerformancePart): Promise<PerformancePart>;
  updatePerformancePart(id: number, data: Partial<PerformancePart>): Promise<PerformancePart | undefined>;
  
  // Car parts operations
  getCarParts(carId: number): Promise<CarPart[]>;
  getCarPart(id: number): Promise<CarPart | undefined>;
  installCarPart(carPart: InsertCarPart): Promise<CarPart>;
  removeCarPart(id: number): Promise<boolean>;
  
  // Visual customizations operations
  getVisualCustomizations(): Promise<VisualCustomization[]>;
  getVisualCustomization(id: number): Promise<VisualCustomization | undefined>;
  createVisualCustomization(visual: InsertVisualCustomization): Promise<VisualCustomization>;
  updateVisualCustomization(id: number, data: Partial<VisualCustomization>): Promise<VisualCustomization | undefined>;
  
  // Car visuals operations
  getCarVisuals(carId: number): Promise<CarVisual[]>;
  getCarVisual(id: number): Promise<CarVisual | undefined>;
  installCarVisual(carVisual: InsertCarVisual): Promise<CarVisual>;
  removeCarVisual(id: number): Promise<boolean>;
  
  // Driver skills operations
  getDriverSkills(userId: number): Promise<DriverSkill[]>;
  getDriverSkill(userId: number, skillType: string): Promise<DriverSkill | undefined>;
  createDriverSkill(skill: InsertDriverSkill): Promise<DriverSkill>;
  updateDriverSkill(id: number, data: Partial<DriverSkill>): Promise<DriverSkill | undefined>;
  
  // Tournament operations
  getTournaments(status?: string): Promise<Tournament[]>;
  getTournament(id: number): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: number, data: Partial<Tournament>): Promise<Tournament | undefined>;
  
  // Tournament participants operations
  getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]>;
  getUserTournaments(userId: number): Promise<TournamentParticipant[]>;
  joinTournament(participant: InsertTournamentParticipant): Promise<TournamentParticipant>;
  updateTournamentParticipant(id: number, data: Partial<TournamentParticipant>): Promise<TournamentParticipant | undefined>;
  
  // Team operations
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, data: Partial<Team>): Promise<Team | undefined>;
  
  // Team members operations
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getUserTeam(userId: number): Promise<TeamMember | undefined>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, data: Partial<TeamMember>): Promise<TeamMember | undefined>;
  removeTeamMember(id: number): Promise<boolean>;
  
  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  getAchievement(id: number): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: number, data: Partial<Achievement>): Promise<Achievement | undefined>;
  
  // User achievements operations
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  getUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievement(id: number, data: Partial<UserAchievement>): Promise<UserAchievement | undefined>;
  
  // Daily challenge operations
  getDailyChallenges(): Promise<DailyChallenge[]>;
  getActiveDailyChallenges(): Promise<DailyChallenge[]>;
  getDailyChallenge(id: number): Promise<DailyChallenge | undefined>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  updateDailyChallenge(id: number, data: Partial<DailyChallenge>): Promise<DailyChallenge | undefined>;
  
  // User challenges operations
  getUserChallenges(userId: number): Promise<UserChallenge[]>;
  getUserChallenge(userId: number, challengeId: number): Promise<UserChallenge | undefined>;
  createUserChallenge(userChallenge: InsertUserChallenge): Promise<UserChallenge>;
  updateUserChallenge(id: number, data: Partial<UserChallenge>): Promise<UserChallenge | undefined>;
  
  // Weather operations
  applyWeatherToRace(raceId: number, weather: string): Promise<Race | undefined>;
  
  // Cooldown operations
  clearAllCooldowns(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async getCar(id: number): Promise<Car | undefined> {
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    return car;
  }

  async getUserCars(userId: number): Promise<Car[]> {
    return db.select().from(cars).where(eq(cars.userId, userId));
  }
  
  async getAllCars(skip: number, limit: number): Promise<Car[]> {
    return db.select().from(cars).limit(limit).offset(skip);
  }

  async createCar(car: InsertCar): Promise<Car> {
    const [newCar] = await db.insert(cars).values(car).returning();
    return newCar;
  }

  async updateCar(id: number, data: Partial<Car>): Promise<Car | undefined> {
    const [updatedCar] = await db.update(cars).set(data).where(eq(cars.id, id)).returning();
    return updatedCar;
  }

  async deleteCar(id: number): Promise<boolean> {
    const result = await db.delete(cars).where(eq(cars.id, id)).returning();
    return result.length > 0;
  }

  async getRace(id: number): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.id, id));
    return race;
  }

  async getActiveRaces(): Promise<Race[]> {
    return db.select().from(races).where(eq(races.status, "active"));
  }

  async getUserRaces(userId: number): Promise<Race[]> {
    return db.select().from(races).where(
      eq(races.challenger, userId)
    ).orderBy(desc(races.createdAt));
  }

  async createRace(race: InsertRace): Promise<Race> {
    const [newRace] = await db.insert(races).values(race).returning();
    return newRace;
  }

  async updateRace(id: number, data: Partial<Race>): Promise<Race | undefined> {
    const [updatedRace] = await db.update(races).set(data).where(eq(races.id, id)).returning();
    return updatedRace;
  }

  async getShopItems(): Promise<ShopItem[]> {
    return db.select().from(shopItems);
  }

  async getShopItem(id: number): Promise<ShopItem | undefined> {
    const [item] = await db.select().from(shopItems).where(eq(shopItems.id, id));
    return item;
  }

  async createShopItem(item: InsertShopItem): Promise<ShopItem> {
    const [newItem] = await db.insert(shopItems).values(item).returning();
    return newItem;
  }

  async updateShopItem(id: number, data: Partial<ShopItem>): Promise<ShopItem | undefined> {
    const [updatedItem] = await db.update(shopItems).set(data).where(eq(shopItems.id, id)).returning();
    return updatedItem;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getRecentActivityLogs(limit: number = 20): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }

  async createStealAttempt(attempt: InsertStealAttempt): Promise<StealAttempt> {
    const [newAttempt] = await db.insert(stealAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getUserStealAttempts(userId: number): Promise<StealAttempt[]> {
    return db.select().from(stealAttempts).where(eq(stealAttempts.thiefId, userId)).orderBy(desc(stealAttempts.createdAt));
  }

  async getUserKeys(userId: number): Promise<UserKey[]> {
    return db.select().from(userKeys).where(eq(userKeys.userId, userId));
  }

  async getUserKey(userId: number, keyType: string): Promise<UserKey | undefined> {
    const [key] = await db.select().from(userKeys).where(
      and(
        eq(userKeys.userId, userId),
        eq(userKeys.keyType, keyType)
      )
    );
    return key;
  }

  async addUserKey(userKey: InsertUserKey): Promise<UserKey> {
    // Check if user already has this key type
    const existingKey = await this.getUserKey(userKey.userId, userKey.keyType);
    
    if (existingKey) {
      // Update existing key
      const [updatedKey] = await db.update(userKeys)
        .set({ 
          quantity: existingKey.quantity + (userKey.quantity || 1),
          updatedAt: new Date()
        })
        .where(eq(userKeys.id, existingKey.id))
        .returning();
      return updatedKey;
    } else {
      // Create new key
      const [newKey] = await db.insert(userKeys).values({
        ...userKey,
        quantity: userKey.quantity || 1
      }).returning();
      return newKey;
    }
  }

  async updateUserKey(id: number, data: Partial<UserKey>): Promise<UserKey | undefined> {
    const [updatedKey] = await db.update(userKeys).set(data).where(eq(userKeys.id, id)).returning();
    return updatedKey;
  }

  async clearAllCooldowns(): Promise<void> {
    await db.update(users).set({
      lastStealAttempt: null,
      lastRace: null,
      lastDaily: null
    });
  }

  async useKey(userId: number, keyType: string): Promise<boolean> {
    const key = await this.getUserKey(userId, keyType);
    
    if (!key || key.quantity < 1) {
      return false;
    }
    
    if (key.quantity === 1) {
      // Delete the key if it's the last one
      await db.delete(userKeys).where(eq(userKeys.id, key.id));
    } else {
      // Decrement quantity
      await db.update(userKeys)
        .set({ 
          quantity: key.quantity - 1,
          updatedAt: new Date()
        })
        .where(eq(userKeys.id, key.id));
    }
    
    return true;
  }

  // Performance Parts operations
  async getPerformanceParts(): Promise<PerformancePart[]> {
    return db.select().from(performanceParts).where(eq(performanceParts.available, true));
  }

  async getPerformancePart(id: number): Promise<PerformancePart | undefined> {
    const [part] = await db.select().from(performanceParts).where(eq(performanceParts.id, id));
    return part;
  }

  async createPerformancePart(part: InsertPerformancePart): Promise<PerformancePart> {
    const [newPart] = await db.insert(performanceParts).values(part).returning();
    return newPart;
  }

  async updatePerformancePart(id: number, data: Partial<PerformancePart>): Promise<PerformancePart | undefined> {
    const [updatedPart] = await db.update(performanceParts).set(data).where(eq(performanceParts.id, id)).returning();
    return updatedPart;
  }

  // Car Parts operations
  async getCarParts(carId: number): Promise<CarPart[]> {
    return db.select().from(carParts).where(eq(carParts.carId, carId));
  }

  async getCarPart(id: number): Promise<CarPart | undefined> {
    const [part] = await db.select().from(carParts).where(eq(carParts.id, id));
    return part;
  }

  async installCarPart(carPart: InsertCarPart): Promise<CarPart> {
    const [newCarPart] = await db.insert(carParts).values(carPart).returning();
    return newCarPart;
  }

  async removeCarPart(id: number): Promise<boolean> {
    const result = await db.delete(carParts).where(eq(carParts.id, id)).returning();
    return result.length > 0;
  }

  // Visual Customizations operations
  async getVisualCustomizations(): Promise<VisualCustomization[]> {
    return db.select().from(visualCustomizations).where(eq(visualCustomizations.available, true));
  }

  async getVisualCustomization(id: number): Promise<VisualCustomization | undefined> {
    const [visual] = await db.select().from(visualCustomizations).where(eq(visualCustomizations.id, id));
    return visual;
  }

  async createVisualCustomization(visual: InsertVisualCustomization): Promise<VisualCustomization> {
    const [newVisual] = await db.insert(visualCustomizations).values(visual).returning();
    return newVisual;
  }

  async updateVisualCustomization(id: number, data: Partial<VisualCustomization>): Promise<VisualCustomization | undefined> {
    const [updatedVisual] = await db.update(visualCustomizations).set(data).where(eq(visualCustomizations.id, id)).returning();
    return updatedVisual;
  }

  // Car Visuals operations
  async getCarVisuals(carId: number): Promise<CarVisual[]> {
    return db.select().from(carVisuals).where(eq(carVisuals.carId, carId));
  }

  async getCarVisual(id: number): Promise<CarVisual | undefined> {
    const [visual] = await db.select().from(carVisuals).where(eq(carVisuals.id, id));
    return visual;
  }

  async installCarVisual(carVisual: InsertCarVisual): Promise<CarVisual> {
    const [newCarVisual] = await db.insert(carVisuals).values(carVisual).returning();
    return newCarVisual;
  }

  async removeCarVisual(id: number): Promise<boolean> {
    const result = await db.delete(carVisuals).where(eq(carVisuals.id, id)).returning();
    return result.length > 0;
  }

  // Driver Skills operations
  async getDriverSkills(userId: number): Promise<DriverSkill[]> {
    return db.select().from(driverSkills).where(eq(driverSkills.userId, userId));
  }

  async getDriverSkill(userId: number, skillType: string): Promise<DriverSkill | undefined> {
    const [skill] = await db.select().from(driverSkills).where(
      and(
        eq(driverSkills.userId, userId),
        eq(driverSkills.skillType, skillType)
      )
    );
    return skill;
  }

  async createDriverSkill(skill: InsertDriverSkill): Promise<DriverSkill> {
    const [newSkill] = await db.insert(driverSkills).values(skill).returning();
    return newSkill;
  }

  async updateDriverSkill(id: number, data: Partial<DriverSkill>): Promise<DriverSkill | undefined> {
    const [updatedSkill] = await db.update(driverSkills).set(data).where(eq(driverSkills.id, id)).returning();
    return updatedSkill;
  }

  // Tournament operations
  async getTournaments(status?: string): Promise<Tournament[]> {
    if (status) {
      return db.select().from(tournaments).where(eq(tournaments.status, status)).orderBy(desc(tournaments.startTime));
    }
    return db.select().from(tournaments).orderBy(desc(tournaments.startTime));
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament;
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db.insert(tournaments).values(tournament).returning();
    return newTournament;
  }

  async updateTournament(id: number, data: Partial<Tournament>): Promise<Tournament | undefined> {
    const [updatedTournament] = await db.update(tournaments).set(data).where(eq(tournaments.id, id)).returning();
    return updatedTournament;
  }

  // Tournament Participants operations
  async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    return db.select().from(tournamentParticipants).where(eq(tournamentParticipants.tournamentId, tournamentId));
  }

  async getUserTournaments(userId: number): Promise<TournamentParticipant[]> {
    return db.select().from(tournamentParticipants).where(eq(tournamentParticipants.userId, userId));
  }

  async joinTournament(participant: InsertTournamentParticipant): Promise<TournamentParticipant> {
    const [newParticipant] = await db.insert(tournamentParticipants).values(participant).returning();
    return newParticipant;
  }

  async updateTournamentParticipant(id: number, data: Partial<TournamentParticipant>): Promise<TournamentParticipant | undefined> {
    const [updatedParticipant] = await db.update(tournamentParticipants).set(data).where(eq(tournamentParticipants.id, id)).returning();
    return updatedParticipant;
  }

  // Team operations
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: number, data: Partial<Team>): Promise<Team | undefined> {
    const [updatedTeam] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updatedTeam;
  }

  // Team Members operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async getUserTeam(userId: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    return member;
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: number, data: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const [updatedMember] = await db.update(teamMembers).set(data).where(eq(teamMembers.id, id)).returning();
    return updatedMember;
  }

  async removeTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    return result.length > 0;
  }

  // Achievement operations
  async getAchievements(): Promise<Achievement[]> {
    return db.select().from(achievements);
  }

  async getAchievement(id: number): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
    return achievement;
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db.insert(achievements).values(achievement).returning();
    return newAchievement;
  }

  async updateAchievement(id: number, data: Partial<Achievement>): Promise<Achievement | undefined> {
    const [updatedAchievement] = await db.update(achievements).set(data).where(eq(achievements.id, id)).returning();
    return updatedAchievement;
  }

  // User Achievements operations
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async getUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db.select().from(userAchievements).where(
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      )
    );
    return userAchievement;
  }

  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newUserAchievement] = await db.insert(userAchievements).values(userAchievement).returning();
    return newUserAchievement;
  }

  async updateUserAchievement(id: number, data: Partial<UserAchievement>): Promise<UserAchievement | undefined> {
    const [updatedUserAchievement] = await db.update(userAchievements).set(data).where(eq(userAchievements.id, id)).returning();
    return updatedUserAchievement;
  }

  // Daily Challenge operations
  async getDailyChallenges(): Promise<DailyChallenge[]> {
    return db.select().from(dailyChallenges);
  }

  async getActiveDailyChallenges(): Promise<DailyChallenge[]> {
    const now = new Date();
    return db.select().from(dailyChallenges).where(
      gte(dailyChallenges.expiresAt, now)
    );
  }

  async getDailyChallenge(id: number): Promise<DailyChallenge | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, id));
    return challenge;
  }

  async createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const [newChallenge] = await db.insert(dailyChallenges).values(challenge).returning();
    return newChallenge;
  }

  async updateDailyChallenge(id: number, data: Partial<DailyChallenge>): Promise<DailyChallenge | undefined> {
    const [updatedChallenge] = await db.update(dailyChallenges).set(data).where(eq(dailyChallenges.id, id)).returning();
    return updatedChallenge;
  }

  // User Challenges operations
  async getUserChallenges(userId: number): Promise<UserChallenge[]> {
    return db.select().from(userChallenges).where(eq(userChallenges.userId, userId));
  }

  async getUserChallenge(userId: number, challengeId: number): Promise<UserChallenge | undefined> {
    const [userChallenge] = await db.select().from(userChallenges).where(
      and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      )
    );
    return userChallenge;
  }

  async createUserChallenge(userChallenge: InsertUserChallenge): Promise<UserChallenge> {
    const [newUserChallenge] = await db.insert(userChallenges).values(userChallenge).returning();
    return newUserChallenge;
  }

  async updateUserChallenge(id: number, data: Partial<UserChallenge>): Promise<UserChallenge | undefined> {
    const [updatedUserChallenge] = await db.update(userChallenges).set(data).where(eq(userChallenges.id, id)).returning();
    return updatedUserChallenge;
  }

  // Weather operations
  async applyWeatherToRace(raceId: number, weather: string): Promise<Race | undefined> {
    const race = await this.getRace(raceId);
    if (!race) return undefined;

    // Update race data with weather information
    const raceData = race.raceData || {};
    const updatedRaceData = {
      ...raceData,
      weather
    };

    return this.updateRace(raceId, { raceData: updatedRaceData });
  }
}

export const storage = new DatabaseStorage();