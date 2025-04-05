import { ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, Message, ButtonInteraction, Collection } from "discord.js";
import { IStorage } from "../storage";
import { CAR_RARITIES } from "../../shared/schema";
import { safelySendMessage } from "../utils/discordHelpers";

// Utility functions
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateDriftScore(car: any, playerTime: number, targetTime: number): number {
  // Calculate base score based on how close the player was to the target time
  const timeDifference = Math.abs(playerTime - targetTime);
  const timeAccuracy = Math.max(0, 1 - (timeDifference / targetTime));
  
  // Car handling has the biggest impact on drift score
  const handlingFactor = car.handling / 100;
  
  // Boost also helps with maintaining drift
  const boostFactor = car.boost / 200;
  
  // Calculate final score (0-1000)
  const baseScore = timeAccuracy * 700;
  const carBonus = (handlingFactor * 200) + (boostFactor * 100);
  
  return Math.round(baseScore + carBonus);
}

function determineSlotmachineReward(slots: string[]): { multiplier: number, message: string } {
  // All symbols match - jackpot!
  if (slots[0] === slots[1] && slots[1] === slots[2]) {
    switch (slots[0]) {
      case "🔷": return { multiplier: 2, message: "All blue diamonds! 2x your bet!" };
      case "🍒": return { multiplier: 3, message: "Cherry jackpot! 3x your bet!" };
      case "🏎️": return { multiplier: 5, message: "Racing car jackpot! 5x your bet!" };
      case "💰": return { multiplier: 7, message: "Money bags! 7x your bet!" };
      case "👑": return { multiplier: 10, message: "Crown jackpot! 10x your bet!" };
      default: return { multiplier: 2, message: "Triple match! 2x your bet!" };
    }
  }
  
  // Two matching symbols
  if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
    return { multiplier: 1.5, message: "Two matching symbols! 1.5x your bet!" };
  }
  
  // No matches
  return { multiplier: 0, message: "No matches. Better luck next time!" };
}

function calculateDragRacePerformance(car: any): {
  reactionTime: number;
  quarterMileTime: number;
  maxSpeed: number;
  description: string;
} {
  // Base quarter mile time (in seconds) influenced by car stats
  // Formula creates a range between 8-16 seconds for most cars
  const baseTime = 20 - ((car.speed * 0.4) + (car.acceleration * 0.6)) / 10;
  
  // Reaction time is primarily based on car's boost (0.2-0.5 seconds)
  // Better boost = faster reaction time
  const reactionTime = 0.5 - (car.boost / 400);
  
  // Add some randomness to the quarter mile time (±5%)
  const randomFactor = 0.95 + (Math.random() * 0.1);
  const quarterMileTime = baseTime * randomFactor;
  
  // Calculate approximate top speed at end of quarter mile (mph)
  // Formula approximates realistic speeds based on car performance
  const maxSpeed = 80 + (car.speed * 0.8) + (car.acceleration * 0.2);
  
  // Generate description based on performance
  let description = "";
  if (quarterMileTime < 8) {
    description = "LIGHTNING FAST! Your car shot down the strip like a bullet!";
  } else if (quarterMileTime < 10) {
    description = "VERY QUICK! Your car dominated the quarter-mile!";
  } else if (quarterMileTime < 12) {
    description = "RESPECTABLE! Your car put in a solid performance!";
  } else if (quarterMileTime < 14) {
    description = "AVERAGE! Your car completed the race at a normal pace.";
  } else {
    description = "SLUGGISH! Your car struggled to gain momentum.";
  }
  
  return {
    reactionTime: Math.round(reactionTime * 100) / 100, // Round to 2 decimal places
    quarterMileTime: Math.round(quarterMileTime * 100) / 100, // Round to 2 decimal places
    maxSpeed: Math.round(maxSpeed),
    description
  };
}

// Mini-games commands
export function minigameCommands() {
  return [
    // Drift Challenge mini-game
    {
      name: "drift",
      aliases: ["driftchallenge"],
      description: "Test your car's handling in a drift challenge",
      usage: "[bet amount]",
      cooldown: 30,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Check if user has an active car
        if (!user.activeCarId) {
          return message.reply("You need to set an active car first! Use `!setactive <car_id>` to select a car.");
        }
        
        // Get the user's active car
        const car = await storage.getCar(user.activeCarId);
        if (!car) {
          return message.reply("Your active car couldn't be found. Please set another car with `!setactive <car_id>`.");
        }
        
        // Parse bet amount
        let betAmount = 1000; // Default bet
        if (args.length > 0) {
          const parsedBet = parseInt(args[0]);
          if (isNaN(parsedBet) || parsedBet < 1000) {
            return message.reply("Please provide a valid bet amount (minimum 1,000 credits).");
          }
          betAmount = parsedBet;
        }
        
        // Check if user has enough balance
        if (user.balance < betAmount) {
          return message.reply(`You don't have enough credits for this bet. Your balance: ₵${user.balance.toLocaleString()}`);
        }
        
        // Generate a random target time between 3 and 8 seconds
        const targetTime = (getRandomInt(30, 80) / 10); // 3.0 to 8.0 seconds
        
        // Create the challenge embed
        const driftEmbed = new EmbedBuilder()
          .setColor("#FF5555")
          .setTitle("🏎️ Drift Challenge")
          .setDescription(`Test your timing skills in this drift challenge!`)
          .addFields(
            { name: "Your Car", value: `${car.name} (${car.rarity})`, inline: true },
            { name: "Handling", value: `${car.handling}/100`, inline: true },
            { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
            { name: "Challenge", value: `You need to hit the **DRIFT** button, then hit the **STOP** button as close as possible to **${targetTime} seconds**.` },
            { name: "Status", value: "Press the DRIFT button when you're ready!" }
          )
          .setFooter({ text: `The better your timing and the higher your car's handling, the better your score!` });
        
        // Create the drift button
        const driftButton = new ButtonBuilder()
          .setCustomId("drift_start")
          .setLabel("DRIFT!")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🏎️");
        
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(driftButton);
        
        // Send the message with the button
        const response = await safelySendMessage(message.channel, {
          embeds: [driftEmbed],
          components: [actionRow]
        });
        
        if (!response) {
          return message.reply("There was an error setting up the drift challenge. Please try again later.");
        }
        
        // Create the button collector
        const filter = (i: any) => {
          return i.user.id === message.author.id && i.customId.startsWith("drift_");
        };
        
        const collector = response.createMessageComponentCollector({
          filter: filter as any,
          time: 30000 // 30 seconds timeout
        });
        
        let startTime: number;
        let driftInProgress = false;
        
        collector.on("collect", async (interaction: ButtonInteraction) => {
          try {
            await interaction.deferUpdate();
            
            if (interaction.customId === "drift_start" && !driftInProgress) {
              // Start the drift
              startTime = Date.now();
              driftInProgress = true;
              
              // Update the embed
              driftEmbed.setFields(
                { name: "Your Car", value: `${car.name} (${car.rarity})`, inline: true },
                { name: "Handling", value: `${car.handling}/100`, inline: true },
                { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
                { name: "Challenge", value: `Target time: **${targetTime} seconds**` },
                { name: "Status", value: "**DRIFTING!** Hit the STOP button as close as possible to the target time!" }
              );
              
              // Replace the button with a stop button
              const stopButton = new ButtonBuilder()
                .setCustomId("drift_stop")
                .setLabel("STOP!")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🛑");
              
              const newActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(stopButton);
              
              if (response) {
                await safelySendMessage(message.channel, {
                  embeds: [driftEmbed],
                  components: [newActionRow]
                }, response.id);
              }
              
            } else if (interaction.customId === "drift_stop" && driftInProgress) {
              // Stop the drift and calculate time
              const endTime = Date.now();
              const elapsedTimeMs = endTime - startTime;
              const elapsedTime = elapsedTimeMs / 1000; // Convert to seconds
              
              // Calculate score
              const score = calculateDriftScore(car, elapsedTime, targetTime);
              
              // Determine winnings based on score
              let winnings = 0;
              let resultMessage = "";
              
              if (score >= 900) {
                // Perfect drift - 3x bet
                winnings = betAmount * 3;
                resultMessage = "PERFECT DRIFT! Your timing was exceptional! You won 3x your bet!";
              } else if (score >= 800) {
                // Great drift - 2x bet
                winnings = betAmount * 2;
                resultMessage = "AMAZING DRIFT! Your timing was amazing! You won 2x your bet!";
              } else if (score >= 700) {
                // Good drift - 1.5x bet
                winnings = Math.floor(betAmount * 1.5);
                resultMessage = "GREAT DRIFT! Your timing was great! You won 1.5x your bet!";
              } else if (score >= 500) {
                // Decent drift - 1x bet (break even)
                winnings = betAmount;
                resultMessage = "GOOD DRIFT! Your timing was good enough to break even.";
              } else {
                // Failed drift - lose bet
                winnings = 0;
                resultMessage = "Your drift was out of control. You lost your bet.";
              }
              
              // Update user balance
              if (winnings > 0) {
                await storage.updateUser(user.id, {
                  balance: user.balance - betAmount + winnings
                });
                
                // Create transaction record for the win
                await storage.createTransaction({
                  userId: user.id,
                  type: "minigame_win",
                  amount: winnings - betAmount, // Net winnings
                  description: `Drift Challenge: Won ₵${(winnings - betAmount).toLocaleString()} with a score of ${score}`
                });
              } else {
                // Update user balance (loss)
                await storage.updateUser(user.id, {
                  balance: user.balance - betAmount
                });
                
                // Create transaction record for the loss
                await storage.createTransaction({
                  userId: user.id,
                  type: "minigame_loss",
                  amount: -betAmount, // Negative for loss
                  description: `Drift Challenge: Lost ₵${betAmount.toLocaleString()} with a score of ${score}`
                });
              }
              
              // Create activity log
              await storage.createActivityLog({
                type: "minigame_played",
                userId: user.id,
                details: {
                  game: "drift_challenge",
                  score: score,
                  targetTime: targetTime,
                  actualTime: elapsedTime,
                  bet: betAmount,
                  winnings: winnings
                }
              });
              
              // Update the embed with results
              driftEmbed.setFields(
                { name: "Your Car", value: `${car.name} (${car.rarity})`, inline: true },
                { name: "Your Time", value: `${elapsedTime.toFixed(2)}s (Target: ${targetTime}s)`, inline: true },
                { name: "Score", value: `${score}/1000`, inline: true },
                { name: "Result", value: resultMessage },
                { name: "Winnings", value: winnings > 0 ? `+₵${(winnings - betAmount).toLocaleString()}` : `-₵${betAmount.toLocaleString()}` }
              );
              
              if (winnings > 0) {
                driftEmbed.setColor("#00FF00"); // Green for win
              } else {
                driftEmbed.setColor("#FF0000"); // Red for loss
              }
              
              // Disable buttons for the final message
              if (response) {
                await safelySendMessage(message.channel, {
                  embeds: [driftEmbed],
                  components: []
                }, response.id);
              }
              
              // Stop the collector
              collector.stop();
            }
          } catch (error) {
            console.error("Error in drift challenge:", error);
            message.reply("An error occurred while processing your drift challenge. Please try again later.");
            collector.stop();
          }
        });
        
        collector.on("end", (collected: Collection<string, ButtonInteraction>, reason: string) => {
          if (reason === "time" && !driftInProgress) {
            // If the user didn't start the drift within the time limit
            if (response) {
              safelySendMessage(message.channel, "Drift challenge cancelled due to inactivity.", response.id);
            }
          } else if (reason === "time" && driftInProgress) {
            // If the user started but didn't stop the drift
            if (response) {
              safelySendMessage(message.channel, {
                embeds: [
                  new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("🏎️ Drift Challenge Failed")
                    .setDescription("You crashed your car by drifting too long! You lost your bet.")
                ],
                components: []
              }, response.id);
            }
            
            // Deduct the bet amount
            storage.updateUser(user.id, {
              balance: user.balance - betAmount
            });
            
            // Create transaction record for the loss
            storage.createTransaction({
              userId: user.id,
              type: "minigame_loss",
              amount: -betAmount,
              description: "Drift Challenge: Lost by timeout"
            });
            
            // Create activity log
            storage.createActivityLog({
              type: "minigame_played",
              userId: user.id,
              details: {
                game: "drift_challenge",
                result: "timeout",
                bet: betAmount,
                winnings: 0
              }
            });
          }
        });
      }
    },
    
    // Slotmachine mini-game
    {
      name: "slotmachine",
      aliases: ["slots", "slot"],
      description: "Try your luck at the slot machine",
      usage: "<bet amount>",
      args: true,
      cooldown: 10,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Parse bet amount
        if (!args[0]) {
          return message.reply("Please specify a bet amount. Usage: `!slotmachine <bet amount>`");
        }
        
        let betAmount = parseInt(args[0]);
        
        if (isNaN(betAmount) || betAmount < 500) {
          return message.reply("Please provide a valid bet amount (minimum 500 credits).");
        }
        
        // Check if user has enough balance
        if (user.balance < betAmount) {
          return message.reply(`You don't have enough credits for this bet. Your balance: ₵${user.balance.toLocaleString()}`);
        }
        
        // Slot machine symbols (in order of increasing value)
        const symbols = ["🔷", "🍒", "🏎️", "💰", "👑"];
        
        // Create initial embed
        const slotEmbed = new EmbedBuilder()
          .setColor("#FFAC33")
          .setTitle("🎰 Slot Machine")
          .setDescription(`${message.author.username} is trying their luck!`)
          .addFields(
            { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
            { name: "Current Balance", value: `₵${user.balance.toLocaleString()}`, inline: true },
            { name: "Slots", value: "❓ | ❓ | ❓" },
            { name: "Status", value: "Spinning..." }
          )
          .setFooter({ text: "Press the SPIN button to try your luck!" });
        
        // Create spin button
        const spinButton = new ButtonBuilder()
          .setCustomId("slot_spin")
          .setLabel("SPIN!")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎰");
        
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(spinButton);
        
        // Send the message with the button
        const response = await safelySendMessage(message.channel, {
          embeds: [slotEmbed],
          components: [actionRow]
        });
        
        if (!response) {
          return message.reply("There was an error setting up the slot machine. Please try again later.");
        }
        
        // Create the button collector
        const filter = (i: any) => {
          return i.user.id === message.author.id && i.customId === "slot_spin";
        };
        
        const collector = response.createMessageComponentCollector({
          filter: filter as any,
          time: 15000, // 15 seconds timeout
          max: 1 // Only one spin allowed
        });
        
        collector.on("collect", async (interaction: ButtonInteraction) => {
          try {
            await interaction.deferUpdate();
            
            // First deduct the bet amount
            await storage.updateUser(user.id, {
              balance: user.balance - betAmount
            });
            
            // Simulate spinning animation
            slotEmbed.setFields(
              { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
              { name: "Current Balance", value: `₵${(user.balance - betAmount).toLocaleString()}`, inline: true },
              { name: "Slots", value: "🎰 | 🎰 | 🎰" },
              { name: "Status", value: "Spinning..." }
            );
            
            if (response) {
              await safelySendMessage(message.channel, {
                embeds: [slotEmbed],
                components: []
              }, response.id);
            }
            
            // Wait for a short time to simulate spinning
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Determine results (random slots)
            const results = [
              symbols[Math.floor(Math.random() * symbols.length)],
              symbols[Math.floor(Math.random() * symbols.length)],
              symbols[Math.floor(Math.random() * symbols.length)]
            ];
            
            // Determine reward
            const reward = determineSlotmachineReward(results);
            
            // Calculate winnings
            const winnings = Math.floor(betAmount * reward.multiplier);
            
            // Update user balance with winnings (if any)
            if (winnings > 0) {
              await storage.updateUser(user.id, {
                balance: (user.balance - betAmount) + winnings
              });
              
              // Create transaction record for the win
              await storage.createTransaction({
                userId: user.id,
                type: "minigame_win",
                amount: winnings, // Gross winnings
                description: `Slot Machine: Won ₵${winnings.toLocaleString()}`
              });
            } else {
              // Create transaction record for the loss (already deducted above)
              await storage.createTransaction({
                userId: user.id,
                type: "minigame_loss",
                amount: -betAmount,
                description: "Slot Machine: No win"
              });
            }
            
            // Update the embed with final results
            slotEmbed.setFields(
              { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
              { name: "Results", value: `${results.join(" | ")}`, inline: true },
              { name: reward.message, value: winnings > 0 ? `You won: ₵${winnings.toLocaleString()}!` : "Better luck next time!" },
              { name: "New Balance", value: `₵${((user.balance - betAmount) + winnings).toLocaleString()}` }
            );
            
            if (winnings > 0) {
              slotEmbed.setColor("#00FF00"); // Green for win
              slotEmbed.setTitle("🎰 Slot Machine - WIN!");
            } else {
              slotEmbed.setColor("#FF0000"); // Red for loss
              slotEmbed.setTitle("🎰 Slot Machine - LOSS");
            }
            
            // Create activity log
            await storage.createActivityLog({
              type: "minigame_played",
              userId: user.id,
              details: {
                game: "slot_machine",
                bet: betAmount,
                results: results,
                winnings: winnings
              }
            });
            
            // Send final message
            if (response) {
              await safelySendMessage(message.channel, {
                embeds: [slotEmbed],
                components: []
              }, response.id);
            }
            
          } catch (error) {
            console.error("Error in slot machine:", error);
            message.reply("An error occurred while processing your slot machine spin. Please try again later.");
            collector.stop();
          }
        });
        
        collector.on("end", (collected: Collection<string, ButtonInteraction>, reason: string) => {
          if (reason === "time" && collected.size === 0) {
            // If the user didn't spin within the time limit
            if (response) {
              safelySendMessage(message.channel, "Slot machine cancelled due to inactivity.", response.id);
            }
          }
        });
      }
    },
    
    // Drag Race mini-game
    {
      name: "dragrace",
      aliases: ["drag", "quartermile"],
      description: "Test your car's speed and acceleration in a quarter-mile drag race",
      usage: "[bet amount]",
      cooldown: 30,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Check if user has an active car
        if (!user.activeCarId) {
          return message.reply("You need to set an active car first! Use `!setactive <car_id>` to select a car.");
        }
        
        // Get the user's active car
        const car = await storage.getCar(user.activeCarId);
        if (!car) {
          return message.reply("Your active car couldn't be found. Please set another car with `!setactive <car_id>`.");
        }
        
        // Parse bet amount
        let betAmount = 1000; // Default bet
        if (args.length > 0) {
          const parsedBet = parseInt(args[0]);
          if (isNaN(parsedBet) || parsedBet < 1000) {
            return message.reply("Please provide a valid bet amount (minimum 1,000 credits).");
          }
          betAmount = parsedBet;
        }
        
        // Check if user has enough balance
        if (user.balance < betAmount) {
          return message.reply(`You don't have enough credits for this bet. Your balance: ₵${user.balance.toLocaleString()}`);
        }
        
        // Create the introduction embed
        const dragEmbed = new EmbedBuilder()
          .setColor("#3498DB")
          .setTitle("🏁 Quarter Mile Drag Race")
          .setDescription(`Test your car's speed and acceleration!`)
          .addFields(
            { name: "Your Car", value: `${car.name} (${car.rarity})`, inline: true },
            { name: "Speed", value: `${car.speed}/100`, inline: true },
            { name: "Acceleration", value: `${car.acceleration}/100`, inline: true },
            { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
            { name: "How It Works", value: "Press the LAUNCH button when you're ready to race the quarter mile!" }
          )
          .setFooter({ text: `Better speed and acceleration means faster times and higher speeds!` });
        
        // Create the launch button
        const launchButton = new ButtonBuilder()
          .setCustomId("drag_start")
          .setLabel("LAUNCH!")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🚦");
        
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(launchButton);
        
        // Send the message with the button
        const response = await safelySendMessage(message.channel, {
          embeds: [dragEmbed],
          components: [actionRow]
        });
        
        if (!response) {
          return message.reply("There was an error setting up the drag race. Please try again later.");
        }
        
        // Create the button collector
        const collector = response.createMessageComponentCollector({
          filter: (i: any) => i.user.id === message.author.id && i.customId === "drag_start",
          time: 30000 // 30 seconds timeout
        });
        
        collector.on("collect", async (interaction: ButtonInteraction) => {
          try {
            await interaction.deferUpdate();
            
            // Calculate race performance
            const performance = calculateDragRacePerformance(car);
            
            // Create AI opponent with similar performance but slight variations
            // Opponent difficulty scales with car rarity
            const rarityMultiplier = {
              "Common": 0.85,
              "Uncommon": 0.9,
              "Rare": 0.95,
              "Epic": 1,
              "Legendary": 1.05,
              "Mythic": 1.1
            };
            
            const difficulty = rarityMultiplier[car.rarity as keyof typeof rarityMultiplier] || 1;
            
            // Opponent is 5-15% faster or slower than player
            const randomFactor = 0.85 + (Math.random() * 0.3);
            const opponentQuarterMile = performance.quarterMileTime * randomFactor * difficulty;
            const opponentReactionTime = performance.reactionTime * (0.9 + (Math.random() * 0.2));
            const opponentMaxSpeed = performance.maxSpeed * (0.95 + (Math.random() * 0.1));
            
            // Determine if player won
            const playerTotalTime = performance.reactionTime + performance.quarterMileTime;
            const opponentTotalTime = opponentReactionTime + opponentQuarterMile;
            
            const playerWon = playerTotalTime < opponentTotalTime;
            
            // Calculate winnings
            let winnings = 0;
            let resultMessage = "";
            
            if (playerWon) {
              // Award winnings based on performance
              if (performance.quarterMileTime < 9) {
                // Exceptional time
                winnings = betAmount * 3;
                resultMessage = "INCREDIBLE SPEED! Your quarter mile time was exceptional! You won 3x your bet!";
              } else if (performance.quarterMileTime < 11) {
                // Great time
                winnings = betAmount * 2;
                resultMessage = "AMAZING ACCELERATION! Your quarter mile time was impressive! You won 2x your bet!";
              } else {
                // Good time
                winnings = Math.floor(betAmount * 1.5);
                resultMessage = "GOOD RACE! You outperformed your opponent! You won 1.5x your bet!";
              }
            } else {
              // Lost race
              winnings = 0;
              resultMessage = "You lost the race! Better luck next time.";
            }
            
            // Update user balance
            if (winnings > 0) {
              await storage.updateUser(user.id, {
                balance: user.balance - betAmount + winnings
              });
              
              // Create transaction record for the win
              await storage.createTransaction({
                userId: user.id,
                type: "minigame_win",
                amount: winnings - betAmount, // Net winnings
                description: `Drag Race: Won ₵${(winnings - betAmount).toLocaleString()} with a time of ${performance.quarterMileTime.toFixed(2)}s`
              });
            } else {
              // Update user balance (loss)
              await storage.updateUser(user.id, {
                balance: user.balance - betAmount
              });
              
              // Create transaction record for the loss
              await storage.createTransaction({
                userId: user.id,
                type: "minigame_loss",
                amount: -betAmount, // Negative for loss
                description: `Drag Race: Lost ₵${betAmount.toLocaleString()} with a time of ${performance.quarterMileTime.toFixed(2)}s`
              });
            }
            
            // Create activity log
            await storage.createActivityLog({
              type: "minigame_played",
              userId: user.id,
              details: {
                game: "drag_race",
                quarterMileTime: performance.quarterMileTime,
                reactionTime: performance.reactionTime,
                maxSpeed: performance.maxSpeed,
                bet: betAmount,
                winnings: winnings > 0 ? winnings - betAmount : -betAmount
              }
            });
            
            // Update the embed with results
            dragEmbed.setFields(
              { name: "Your Car", value: `${car.name} (${car.rarity})`, inline: true },
              { name: "Reaction Time", value: `${performance.reactionTime}s`, inline: true },
              { name: "Quarter Mile", value: `${performance.quarterMileTime.toFixed(2)}s`, inline: true },
              { name: "Top Speed", value: `${performance.maxSpeed} mph`, inline: true },
              { name: "Opponent Time", value: `${opponentTotalTime.toFixed(2)}s`, inline: true },
              { name: "Performance", value: performance.description },
              { name: "Result", value: resultMessage },
              { name: "Winnings", value: winnings > 0 ? `+₵${(winnings - betAmount).toLocaleString()}` : `-₵${betAmount.toLocaleString()}` }
            );
            
            if (winnings > 0) {
              dragEmbed.setColor("#00FF00"); // Green for win
            } else {
              dragEmbed.setColor("#FF0000"); // Red for loss
            }
            
            // Display the results
            if (response) {
              await safelySendMessage(message.channel, {
                embeds: [dragEmbed],
                components: []
              }, response.id);
            }
            
            // Stop the collector
            collector.stop();
          } catch (error) {
            console.error("Error in drag race:", error);
            message.reply("An error occurred while processing your drag race. Please try again later.");
            collector.stop();
          }
        });
        
        collector.on("end", (collected: Collection<string, ButtonInteraction>, reason: string) => {
          if (reason === "time" && collected.size === 0) {
            // If the user didn't start the race within the time limit
            if (response) {
              safelySendMessage(message.channel, "Drag race cancelled due to inactivity.", response.id);
            }
          } else if (reason === "time" && collected.size > 0) {
            // If the user started but didn't complete the race
            if (response) {
              safelySendMessage(message.channel, {
                embeds: [
                  new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("🏁 Drag Race Failed")
                    .setDescription("You crashed your car at the starting line! You lost your bet.")
                ],
                components: []
              }, response.id);
            }
            
            // Deduct the bet amount
            storage.updateUser(user.id, {
              balance: user.balance - betAmount
            });
            
            // Create transaction record for the loss
            storage.createTransaction({
              userId: user.id,
              type: "minigame_loss",
              amount: -betAmount,
              description: "Drag Race: Lost by timeout"
            });
            
            // Create activity log
            storage.createActivityLog({
              type: "minigame_played",
              userId: user.id,
              details: {
                game: "drag_race",
                result: "timeout",
                bet: betAmount,
                winnings: 0
              }
            });
          }
        });
      }
    }
  ];
}

export function setupMinigameSystem() {
  console.log("Minigame system initialized");
}