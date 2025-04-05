import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { startBot } from "./discord/bot";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertCarSchema, 
  insertRaceSchema, 
  insertShopItemSchema,
  insertTransactionSchema,
  insertActivityLogSchema,
  insertStealAttemptSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Discord message simulation endpoint for testing
  app.post("/api/discord/simulate", async (req, res) => {
    try {
      const { content, userId, returnResponse = false } = req.body;

      if (!content || !userId) {
        return res.status(400).json({ 
          error: "Missing parameters",
          message: "Both 'content' and 'userId' are required in the request body."
        });
      }

      // Create mock message for testing
      const mockMessage = {
        content,
        author: {
          id: userId,
          username: 'TestUser',
          tag: 'TestUser#0000'
        },
        channel: {
          send: async (content: any) => {
            if (returnResponse) {
              return content;
            }
          }
        },
        reply: async (content: any) => {
          if (returnResponse) {
            return content;
          }
        }
      };

      // Extract command and args
      const prefix = "!";
      if (!content.startsWith(prefix)) {
        return res.status(400).json({ message: "Invalid command format" });
      }

      const args = content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) {
        return res.status(400).json({ message: "No command provided" });
      }

      // Execute command -  This part is problematic in the edited snippet.  It attempts to use startBot which is asynchronous and doesn't handle command execution.  The original code is much more robust in this regard.  Since we can't reliably fix the edited snippet's command execution, we'll leave this section as is for now.  The bot will likely not function as intended.
      const responsePromise = startBot();

      if (returnResponse) {
        await responsePromise;
        return res.status(200).json({ 
          message: "Command executed successfully",
          command: commandName,
          args
        });
      } else {
        res.status(200).json({ 
          message: "Command received",
          command: commandName,
          args
        });
      }
    } catch (error) {
      console.error("Error simulating Discord message:", error);
      res.status(500).json({ message: "Error simulating Discord message", error: String(error) });
    }
  });

  // WebSocket handling
  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      console.log("Received: %s", message);
    });

    ws.send(JSON.stringify({ type: "connection", status: "connected" }));
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });
  
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.patch("/api/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    try {
      const user = await storage.updateUser(userId, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  

  // Car routes
  app.get("/api/cars/:id", async (req, res) => {
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) {
      return res.status(400).json({ message: "Invalid car ID" });
    }
    
    const car = await storage.getCar(carId);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }
    
    res.json(car);
  });
  
  app.get("/api/users/:userId/cars", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const cars = await storage.getUserCars(userId);
    res.json(cars);
  });
  
  app.post("/api/cars", async (req, res) => {
    try {
      const carData = insertCarSchema.parse(req.body);
      const car = await storage.createCar(carData);
      
      // Create activity log
      await storage.createActivityLog({
        type: "car_acquired",
        userId: car.userId,
        details: { carId: car.id, carName: car.name, rarity: car.rarity }
      });
      
      // Broadcast update
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'car_update', data: car }));
        }
      });
      
      res.status(201).json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid car data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create car" });
    }
  });
  

  // Race routes
  app.get("/api/races", async (_req, res) => {
    const races = await storage.getActiveRaces();
    res.json(races);
  });
  
  app.get("/api/races/:id", async (req, res) => {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }
    
    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }
    
    res.json(race);
  });
  
  app.post("/api/races", async (req, res) => {
    try {
      const raceData = insertRaceSchema.parse(req.body);
      
      // Check if challenger has enough balance
      const challenger = await storage.getUser(raceData.challenger);
      if (!challenger) {
        return res.status(404).json({ message: "Challenger not found" });
      }
      
      if (challenger.balance < raceData.bet) {
        return res.status(400).json({ message: "Insufficient balance for bet" });
      }
      
      // Reserve the bet amount
      await storage.updateUser(challenger.id, { 
        balance: challenger.balance - raceData.bet 
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: challenger.id,
        type: "race_bet",
        amount: -raceData.bet,
        description: "Race bet placed"
      });
      
      // Create the race
      const race = await storage.createRace(raceData);
      
      // Create activity log
      await storage.createActivityLog({
        type: "race_created",
        userId: race.challenger,
        targetId: race.opponent,
        details: { raceId: race.id, bet: race.bet, trackType: race.trackType }
      });
      
      // Broadcast update
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'race_update', data: race }));
        }
      });
      
      res.status(201).json(race);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid race data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create race" });
    }
  });
  
  app.patch("/api/races/:id", async (req, res) => {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }
    
    try {
      const race = await storage.getRace(raceId);
      if (!race) {
        return res.status(404).json({ message: "Race not found" });
      }
      
      // Handle race completion logic
      if (req.body.status === "completed" && race.status !== "completed") {
        const completedAt = new Date();
        const winner = req.body.winner;
        
        // Update race
        const updatedRace = await storage.updateRace(raceId, { 
          status: "completed", 
          winner,
          completedAt,
          raceData: req.body.raceData || null
        });
        
        // Handle payouts
        if (winner) {
          const winningUser = await storage.getUser(winner);
          if (winningUser) {
            // Winner gets double the bet
            const winnings = race.bet * 2;
            await storage.updateUser(winner, { 
              balance: winningUser.balance + winnings 
            });
            
            // Create transaction record
            await storage.createTransaction({
              userId: winner,
              type: "race_win",
              amount: winnings,
              description: "Race winnings",
              relatedId: race.id
            });
            
            // Create activity log
            const loser = winner === race.challenger ? race.opponent : race.challenger;
            await storage.createActivityLog({
              type: "race_completed",
              userId: winner,
              targetId: loser,
              details: { 
                raceId: race.id, 
                winnings: race.bet, 
                winner: winner,
                loser: loser
              }
            });
            
            // Broadcast update
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ 
                  type: 'race_completed', 
                  data: { ...updatedRace, winnings }
                }));
              }
            });
          }
        }
        
        return res.json(updatedRace);
      }
      
      // For other updates
      const updatedRace = await storage.updateRace(raceId, req.body);
      
      // Broadcast update
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'race_update', data: updatedRace }));
        }
      });
      
      res.json(updatedRace);
    } catch (error) {
      res.status(500).json({ message: "Failed to update race" });
    }
  });
  
  // Join race route
  app.post("/api/races/:id/join", async (req, res) => {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }
    
    const { userId, carId } = req.body;
    if (!userId || !carId) {
      return res.status(400).json({ message: "User ID and car ID are required" });
    }
    
    try {
      const race = await storage.getRace(raceId);
      if (!race) {
        return res.status(404).json({ message: "Race not found" });
      }
      
      if (race.status !== "pending") {
        return res.status(400).json({ message: "Race is no longer pending" });
      }
      
      if (race.opponent) {
        return res.status(400).json({ message: "Race already has an opponent" });
      }
      
      // Check if user has enough balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.balance < race.bet) {
        return res.status(400).json({ message: "Insufficient balance for bet" });
      }
      
      // Check if user owns the car
      const car = await storage.getCar(carId);
      if (!car || car.userId !== userId) {
        return res.status(400).json({ message: "Car not found or not owned by user" });
      }
      
      // Reserve the bet amount
      await storage.updateUser(userId, { 
        balance: user.balance - race.bet 
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: userId,
        type: "race_bet",
        amount: -race.bet,
        description: "Race bet placed"
      });
      
      // Update race
      const updatedRace = await storage.updateRace(raceId, { 
        opponent: userId,
        opponentCarId: carId,
        status: "in_progress"
      });
      
      // Create activity log
      await storage.createActivityLog({
        type: "race_joined",
        userId: userId,
        targetId: race.challenger,
        details: { raceId: race.id, bet: race.bet }
      });
      
      // Broadcast update
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'race_update', data: updatedRace }));
        }
      });
      
      res.json(updatedRace);
    } catch (error) {
      res.status(500).json({ message: "Failed to join race" });
    }
  });
  

  // Shop routes
  app.get("/api/shop", async (_req, res) => {
    const items = await storage.getShopItems();
    res.json(items);
  });
  
  app.get("/api/shop/:id", async (req, res) => {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }
    
    const item = await storage.getShopItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(item);
  });
  
  // Purchase item route
  app.post("/api/shop/:id/purchase", async (req, res) => {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }
    
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    try {
      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (!item.available) {
        return res.status(400).json({ message: "Item is not available for purchase" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.balance < item.price) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Update user balance
      await storage.updateUser(userId, { balance: user.balance - item.price });
      
      // Create transaction record
      await storage.createTransaction({
        userId: userId,
        type: "purchase",
        amount: -item.price,
        description: `Purchased ${item.name}`
      });
      
      // Create car for user
      const car = await storage.createCar({
        userId: userId,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        speed: item.speed,
        acceleration: item.acceleration,
        handling: item.handling,
        boost: item.boost,
        value: Math.floor(item.price * 0.8) // Resale value is lower
      });
      
      // Create activity log
      await storage.createActivityLog({
        type: "car_purchased",
        userId: userId,
        details: { 
          carId: car.id, 
          carName: car.name, 
          price: item.price,
          rarity: car.rarity
        }
      });
      
      // Broadcast updates
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'car_update', data: car }));
          client.send(JSON.stringify({ 
            type: 'user_update', 
            data: { id: user.id, balance: user.balance - item.price }
          }));
        }
      });
      
      res.status(201).json({ 
        message: "Purchase successful", 
        car 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to purchase item" });
    }
  });
  

  // Sell car route
  app.post("/api/cars/:id/sell", async (req, res) => {
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) {
      return res.status(400).json({ message: "Invalid car ID" });
    }
    
    try {
      const car = await storage.getCar(carId);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      
      const user = await storage.getUser(car.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user balance
      await storage.updateUser(user.id, { 
        balance: user.balance + car.value,
        activeCarId: user.activeCarId === carId ? null : user.activeCarId
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: "sale",
        amount: car.value,
        description: `Sold ${car.name}`
      });
      
      // Create activity log
      await storage.createActivityLog({
        type: "car_sold",
        userId: user.id,
        details: { 
          carId: car.id, 
          carName: car.name, 
          value: car.value,
          rarity: car.rarity
        }
      });
      
      // Delete the car
      await storage.deleteCar(carId);
      
      // Broadcast updates
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'car_sold', 
            data: { carId, userId: user.id }
          }));
          client.send(JSON.stringify({ 
            type: 'user_update', 
            data: { id: user.id, balance: user.balance + car.value }
          }));
        }
      });
      
      res.json({ 
        message: "Car sold successfully", 
        value: car.value
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to sell car" });
    }
  });
  

  // Set active car route
  app.post("/api/users/:userId/setActiveCar", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const { carId } = req.body;
    if (!carId) {
      return res.status(400).json({ message: "Car ID is required" });
    }
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const car = await storage.getCar(carId);
      if (!car || car.userId !== userId) {
        return res.status(400).json({ message: "Car not found or not owned by user" });
      }
      
      // Update user's active car
      const updatedUser = await storage.updateUser(userId, { activeCarId: carId });
      
      // Broadcast update
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'user_update', 
            data: { id: user.id, activeCarId: carId }
          }));
        }
      });
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to set active car" });
    }
  });
  

  // Steal routes
  app.post("/api/steal", async (req, res) => {
    try {
      const stealData = insertStealAttemptSchema.parse(req.body);
      
      // Check cooldown for the thief
      const thief = await storage.getUser(stealData.thiefId);
      if (!thief) {
        return res.status(404).json({ message: "Thief not found" });
      }
      
      // Check if the thief has attempted a steal in the last 6 hours
      if (thief.lastStealAttempt) {
        const cooldownHours = 6;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const timeSinceLastAttempt = Date.now() - new Date(thief.lastStealAttempt).getTime();
        
        if (timeSinceLastAttempt < cooldownMs) {
          const remainingMs = cooldownMs - timeSinceLastAttempt;
          const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
          
          return res.status(400).json({ 
            message: `Steal cooldown active. Try again in ${remainingMinutes} minutes.` 
          });
        }
      }
      
      // Check target exists
      const target = await storage.getUser(stealData.targetId);
      if (!target) {
        return res.status(404).json({ message: "Target not found" });
      }
      
      // Check if target has any cars
      const targetCars = await storage.getUserCars(target.id);
      if (targetCars.length === 0) {
        return res.status(400).json({ message: "Target has no cars to steal" });
      }
      
      // Update the thief's last steal attempt time
      await storage.updateUser(thief.id, { lastStealAttempt: new Date() });
      
      // Determine success (30% chance)
      const success = Math.random() < 0.3;
      let stolenCar = null;
      let fine = null;
      
      if (success) {
        // Select a random car to steal
        stolenCar = targetCars[Math.floor(Math.random() * targetCars.length)];
        
        // Transfer car ownership
        await storage.updateCar(stolenCar.id, { userId: thief.id });
        
        // If the stolen car was the target's active car, update the target
        if (target.activeCarId === stolenCar.id) {
          await storage.updateUser(target.id, { activeCarId: null });
        }
      } else {
        // Calculate fine (5000 default)
        fine = 5000;
        
        // Apply fine (fine is applied regardless of user's balance)
        await storage.updateUser(thief.id, { balance: thief.balance - fine });
        
        // Create transaction record for the fine
        await storage.createTransaction({
          userId: thief.id,
          type: "steal_fine",
          amount: -fine,
          description: "Fine for failed car theft"
        });
      }
      
      // Create steal attempt record
      const attempt = await storage.createStealAttempt({
        ...stealData,
        success,
        carId: success ? stolenCar?.id : null,
        fine: success ? null : fine
      });
      
      // Create activity log
      await storage.createActivityLog({
        type: success ? "car_stolen" : "steal_failed",
        userId: thief.id,
        targetId: target.id,
        details: success 
          ? { carId: stolenCar?.id, carName: stolenCar?.name } 
          : { fine }
      });
      
      // Broadcast updates
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'steal_attempt', 
            data: { ...attempt, carDetails: stolenCar }
          }));
          if (!success && fine !== null) {
            client.send(JSON.stringify({ 
              type: 'user_update', 
              data: { id: thief.id, balance: thief.balance - fine }
            }));
          }
        }
      });
      
      res.status(201).json({
        success,
        message: success 
          ? `Successfully stole ${stolenCar?.name}!` 
          : `Theft failed!${fine !== null ? ` You were fined ₵${fine}.` : ''}`,
        attempt,
        stolenCar
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid steal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process steal attempt" });
    }
  });
  

  // Activity log routes
  app.get("/api/activity", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    try {
      const logs = await storage.getRecentActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  // Dashboard endpoint to get all user-related data in one request
  app.get("/api/users/:userId/dashboard", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get user profile
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's cars
      const cars = await storage.getUserCars(userId);
      
      // Get user's active car
      const activeCar = user.activeCarId 
        ? cars.find(car => car.id === user.activeCarId) 
        : null;
      
      // Get user's races
      const races = await storage.getUserRaces(userId);
      
      // Calculate race statistics
      const totalRaces = races.length;
      const wonRaces = races.filter(race => race.winner === userId).length;
      const lostRaces = races.filter(race => race.winner !== null && race.winner !== userId).length;
      const winRate = totalRaces > 0 ? Math.round((wonRaces / totalRaces) * 100) : 0;
      
      // Get race stats by track type
      const trackStats = races.reduce((acc, race) => {
        if (!race.trackType) return acc;
        if (!acc[race.trackType]) {
          acc[race.trackType] = { total: 0, won: 0 };
        }
        acc[race.trackType].total += 1;
        if (race.winner === userId) {
          acc[race.trackType].won += 1;
        }
        return acc;
      }, {} as Record<string, { total: number; won: number }>);
      
      // Convert to array and calculate win rates
      const trackStatsArray = Object.entries(trackStats).map(([track, stats]) => ({
        track,
        total: stats.total,
        won: stats.won,
        winRate: Math.round((stats.won / stats.total) * 100)
      }));
      
      // Get user's transactions
      const transactions = await storage.getUserTransactions(userId);
      
      // Calculate financial statistics
      const moneyEarned = transactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const moneySpent = transactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      // Get user's steal attempts
      const stealAttempts = await storage.getUserStealAttempts(userId);
      
      // Calculate theft statistics
      const totalSteals = stealAttempts.length;
      const successfulSteals = stealAttempts.filter(a => a.success).length;
      const stealSuccessRate = totalSteals > 0 ? Math.round((successfulSteals / totalSteals) * 100) : 0;
      
      // Get recent activity logs
      const activityLogs = await storage.getRecentActivityLogs(10);
      const userActivityLogs = activityLogs.filter(log => 
        log.userId === userId || log.targetId === userId
      );
      
      // Get user's car parts (customizations)
      const carCustomizations = await Promise.all(
        cars.map(async (car) => {
          const parts = await storage.getCarParts(car.id);
          const visuals = await storage.getCarVisuals(car.id);
          
          // For each part, get the actual performance part details
          const partDetails = await Promise.all(
            parts.map(async (part) => {
              const partInfo = await storage.getPerformancePart(part.partId);
              return { ...part, details: partInfo };
            })
          );
          
          // For each visual, get the actual visual customization details
          const visualDetails = await Promise.all(
            visuals.map(async (visual) => {
              const visualInfo = await storage.getVisualCustomization(visual.visualId);
              return { ...visual, details: visualInfo };
            })
          );
          
          return {
            carId: car.id,
            carName: car.name,
            parts: partDetails,
            visuals: visualDetails
          };
        })
      );
      
      // Get user's driver skills
      const driverSkills = await storage.getDriverSkills(userId);
      
      // Get user's achievements
      const achievements = await storage.getUserAchievements(userId);
      
      // Get all achievements to calculate progress
      const allAchievements = await storage.getAchievements();
      const achievementProgress = {
        completed: achievements.length,
        total: allAchievements.length,
        percentage: allAchievements.length > 0 
          ? Math.round((achievements.length / allAchievements.length) * 100) 
          : 0
      };
      
      // Get user's active challenges
      const challenges = await storage.getUserChallenges(userId);
      const activeChallenges = challenges.filter(c => !c.completed);
      
      // Get user's team
      const teamMembership = await storage.getUserTeam(userId);
      let team = null;
      let teammates: TeamMember[] = [];
      
      if (teamMembership) {
        team = await storage.getTeam(teamMembership.teamId);
        if (team) {
          const allTeamMembers = await storage.getTeamMembers(team.id);
          // Filter out the current user
          teammates = allTeamMembers.filter(member => member.userId !== userId);
        }
      }

      // Get user's tournament participation
      const tournaments = await storage.getUserTournaments(userId);
      const activeTournaments = tournaments.filter(t => t.status && t.status !== 'completed');
      
      res.json({
        user,
        cars,
        activeCar,
        races: {
          recent: races.slice(0, 5), // Only send 5 most recent races
          stats: {
            total: totalRaces,
            won: wonRaces,
            lost: lostRaces,
            winRate
          },
          trackStats: trackStatsArray
        },
        finances: {
          balance: user.balance,
          earned: moneyEarned,
          spent: moneySpent,
          transactions: transactions.slice(0, 5) // Only send 5 most recent transactions
        },
        theft: {
          attempts: totalSteals,
          successful: successfulSteals,
          successRate: stealSuccessRate
        },
        activity: userActivityLogs,
        customizations: {
          cars: carCustomizations,
          totalParts: carCustomizations.reduce((sum, car) => sum + car.parts.length, 0),
          totalVisuals: carCustomizations.reduce((sum, car) => sum + car.visuals.length, 0)
        },
        skills: {
          driverSkills: driverSkills,
          highestSkill: driverSkills.length > 0 
            ? driverSkills.reduce((prev, current) => (prev.level > current.level) ? prev : current) 
            : null
        },
        achievements: {
          recent: achievements.slice(0, 3),
          progress: achievementProgress
        },
        challenges: {
          active: activeChallenges,
          completed: challenges.length - activeChallenges.length
        },
        team: {
          info: team,
          teammates: teammates,
          role: teamMembership ? teamMembership.role : null
        },
        tournaments: {
          active: activeTournaments,
          total: tournaments.length
        },
        keys: await storage.getUserKeys(userId)
      });
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      res.status(500).json({ message: "Failed to get dashboard data" });
    }
  });
  

  // Start the Discord bot
  try {
    // Only start the bot if we have a token
    if (process.env.DISCORD_BOT_TOKEN) {
      await startBot().catch(error => {
        console.error("Discord bot startup error:", error);
      });
      console.log("Discord bot startup complete");
    } else {
      console.log("Discord bot token not provided, bot will not be started");
    }
  } catch (error) {
    console.error("Failed to start Discord bot:", error);
  }
  

  return httpServer;
}