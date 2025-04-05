import { Client, Message, Collection, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ButtonInteraction, TextChannel, DMChannel, NewsChannel } from "discord.js";
import { IStorage } from "../storage";
import { Car } from "@shared/schema";
import { rollForRarity } from "../utils/carGenerator";

// In-memory storage for active race challenges
const activeRaceChallenges = new Map();

// Setup race system
export function setupRaceSystem(client: Client, cooldowns: Collection<string, Collection<string, number>>) {
  // Clear expired race challenges every 5 minutes
  setInterval(() => {
    const now = Date.now();
    activeRaceChallenges.forEach((challenge, id) => {
      if (now > challenge.expiresAt) {
        activeRaceChallenges.delete(id);
      }
    });
  }, 5 * 60 * 1000);
  
  console.log("Race system initialized");
}

// Race command
export const raceCommand = {
  name: "race",
  description: "Challenge another user to a race or race solo against AI",
  usage: "[@user] <bet_amount> [track_type] [--solo]",
  args: true,
  cooldown: 30,
  async execute(message: Message, args: string[], storage: IStorage) {
    const user = await storage.getUserByDiscordId(message.author.id);
    
    if (!user) {
      return message.reply("You need to register first! Use `!register` to create an account.");
    }
    
    // Check if challenger has an active car
    if (!user.activeCarId) {
      return message.reply("You need to set an active car first! Use `!setactive <car_id>` to set your racing car.");
    }
    
    // Get active car
    const activeCar = await storage.getCar(user.activeCarId);
    
    if (!activeCar) {
      return message.reply("Your active car was not found. Please set a new active car with `!setactive <car_id>`.");
    }
    
    // Check arguments to determine race type
    let hasAIArg = args.some(arg => arg.toLowerCase() === "ai");
    let hasSoloFlag = args.some(arg => arg.toLowerCase() === "--solo" || arg.toLowerCase() === "-s");
    // Initialize as solo race if AI or solo flags are in the arguments
    let isSoloRace = hasAIArg || hasSoloFlag;
    
    let targetUser = null;
    let opponent = null;
    let betIndex = 0;
    
    if (!isSoloRace) {
      // Parse opponent
      targetUser = message.mentions.users.first();
      
      if (!targetUser) {
        return message.reply("You need to mention a user to race against or use `--solo` or `AI` for a solo race! Usage: `!race @user <bet_amount> [track_type]` or `!race <bet_amount> [track_type] --solo` or `!race AI <bet_amount> [track_type]`");
      }
      
      if (targetUser.id === message.author.id) {
        return message.reply("You can't race against yourself! Use `--solo` or `AI` for a solo race.");
      }
      
      // Special case for AI opponents - set to solo race
      if (targetUser.bot || targetUser.id === 'AI') {
        isSoloRace = true;
      }
      
      // Check if opponent is registered
      opponent = await storage.getUserByDiscordId(targetUser.id);
      
      if (!opponent) {
        return message.reply("That user hasn't registered yet!");
      }
      
      // Check if opponent has an active car
      if (!opponent.activeCarId) {
        return message.reply("Your opponent doesn't have an active car set!");
      }
      
      betIndex = 1; // For PvP races, bet amount is the second argument
    } else {
      betIndex = 0; // For solo races, bet amount is the first argument
    }
    
    // Parse bet amount
    const betArg = args.find(arg => !arg.startsWith("@") && !arg.startsWith("-") && 
                             !["street", "circuit", "drag", "offroad", "drift"].includes(arg.toLowerCase()));
    
    if (!betArg) {
      return message.reply(`Please specify a bet amount! Usage: ${isSoloRace ? 
        "`!race <bet_amount> [track_type] --solo`" : 
        "`!race @user <bet_amount> [track_type]`"}`);
    }
    
    const betAmount = parseInt(betArg.replace(/\D/g, ''));
    
    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("Please provide a valid bet amount!");
    }
    
    // Check minimum bet
    const minBet = 100;
    if (betAmount < minBet) {
      return message.reply(`The minimum bet amount is ₵${minBet}!`);
    }
    
    // Check if challenger has enough balance
    if (user.balance < betAmount) {
      return message.reply(`You don't have enough money for that bet! Your balance: ₵${user.balance.toLocaleString()}`);
    }
    
    // For PvP races, check opponent's balance
    if (!isSoloRace && opponent) {
      if (opponent.balance < betAmount) {
        return message.reply(`Your opponent doesn't have enough money for that bet!`);
      }
    }
    
    // Parse track type
    const validTrackTypes = ["street", "circuit", "drag", "offroad", "drift"];
    let trackType = args.find(arg => validTrackTypes.includes(arg.toLowerCase())) || "street";
    trackType = trackType.toLowerCase();
    
    if (!validTrackTypes.includes(trackType)) {
      trackType = "street";
    }
    
    // Check if this is a solo race
    if (isSoloRace) {
      // Generate AI opponent car
      const aiCarRarity = rollForRarity();
      const aiCar: Car = {
        id: -1, // Use a negative ID to indicate it's an AI car
        userId: -1,
        name: `AI ${aiCarRarity} Challenger`,
        type: "AI",
        rarity: aiCarRarity,
        speed: Math.min(Math.floor(activeCar.speed * (Math.random() * 0.4 + 0.8)), 100), // 80-120% of player's car stats
        acceleration: Math.min(Math.floor(activeCar.acceleration * (Math.random() * 0.4 + 0.8)), 100),
        handling: Math.min(Math.floor(activeCar.handling * (Math.random() * 0.4 + 0.8)), 100),
        boost: Math.min(Math.floor(activeCar.boost * (Math.random() * 0.4 + 0.8)), 100),
        value: 0,
        image: null,
        acquired: new Date()
      };
      
      // Deduct bet amount from the user
      await storage.updateUser(user.id, { balance: user.balance - betAmount });
      
      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: "solo_race_bet",
        amount: -betAmount,
        description: `Solo race bet on ${trackType} track`
      });
      
      // Calculate race results
      const raceResults = calculateRaceResults(activeCar, aiCar, trackType);
      
      // Create race in database
      const race = await storage.createRace({
        challenger: user.id,
        opponent: null, // No real opponent
        challengerCarId: activeCar.id,
        opponentCarId: null,
        bet: betAmount,
        trackType: trackType,
        status: "completed"
      });
      
      // Update race with results immediately after creation
      await storage.updateRace(race.id, {
        winner: raceResults.winner === 'challenger' ? user.id : null,
        raceData: raceResults,
        completedAt: new Date()
      });
      
      // If player won, give them the winnings
      if (raceResults.winner === 'challenger') {
        // Player wins 1.8x the bet amount in solo races (increased from 1.5x)
        const winnings = Math.floor(betAmount * 1.8);
        
        await storage.updateUser(user.id, { balance: user.balance - betAmount + winnings });
        
        // Create transaction record for winnings
        await storage.createTransaction({
          userId: user.id,
          type: "solo_race_win",
          amount: winnings,
          description: `Solo race winnings on ${trackType} track`
        });
        
        // Create activity log
        await storage.createActivityLog({
          type: "solo_race_completed",
          userId: user.id,
          details: { 
            raceId: race.id,
            bet: betAmount,
            winnings: winnings,
            trackType: trackType,
            won: true
          }
        });
        
        // Increased chance to earn a key after winning a race (8% from 5%)
        const keyChance = Math.random();
        if (keyChance <= 0.08) {
          // Determine which key to give based on probabilities
          let keyType = "STANDARD";
          const keyRoll = Math.random();
          
          if (keyRoll < 0.70) {
            keyType = "STANDARD";
          } else if (keyRoll < 0.90) {
            keyType = "PREMIUM";
          } else if (keyRoll < 0.99) {
            keyType = "LEGENDARY";
          } else {
            keyType = "MYTHIC";
          }
          
          // Check if user already has this key type
          const existingKey = await storage.getUserKey(user.id, keyType);
          
          if (existingKey) {
            // Increment quantity if they already have this key
            await storage.updateUserKey(existingKey.id, { quantity: existingKey.quantity + 1 });
          } else {
            // Create new key entry if they don't have it yet
            await storage.addUserKey({
              userId: user.id,
              keyType,
              quantity: 1
            });
          }
          
          // Create activity log for key earned
          await storage.createActivityLog({
            userId: user.id,
            type: "KEY_EARNED",
            details: { keyType, source: "RACE_WIN", track: trackType }
          });
          
          // Send message about earned key
          (message.channel as TextChannel).send(`🔑 **${user.username}** found a **${keyType.toLowerCase()} key** after the race! Use \`!keys\` to see your keys and \`!usekey ${keyType.toLowerCase()}\` to use it.`);
        }
        
        // Send success message with more details
        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("🏁 Solo Race Victory!")
          .setDescription(`You won a solo race on the ${trackType} track!`)
          .addFields(
            { name: "Your Car", value: `${activeCar.name} (${activeCar.rarity})`, inline: true },
            { name: "AI Opponent", value: `${aiCar.name}`, inline: true },
            { name: "Your Time", value: `${raceResults.challengerTime}s`, inline: true },
            { name: "AI Time", value: `${raceResults.opponentTime}s`, inline: true },
            { name: "Time Difference", value: `${raceResults.timeDifference}s`, inline: true },
            { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
            { name: "Winnings", value: `₵${winnings.toLocaleString()}`, inline: true },
            { name: "New Balance", value: `₵${(user.balance - betAmount + winnings).toLocaleString()}`, inline: true },
            { name: "Track Type", value: trackType.charAt(0).toUpperCase() + trackType.slice(1), inline: true }
          )
          .setFooter({ text: "Race events are shown below" });
        
        // Add race events to embed
        if (raceResults.events && raceResults.events.length > 0) {
          let eventsText = '';
          
          for (const event of raceResults.events) {
            eventsText += `• ${event.description}\n`;
          }
          
          successEmbed.addFields({ name: "Race Events", value: eventsText });
        }
        
        return (message.channel as TextChannel).send({ embeds: [successEmbed] });
      } else {
        // Player lost - Better experience with partial refund
        // Return 20% of the bet to soften the loss
        const refundAmount = Math.floor(betAmount * 0.2);
        await storage.updateUser(user.id, { balance: user.balance - betAmount + refundAmount });
        
        // Create transaction record for the refund
        if (refundAmount > 0) {
          await storage.createTransaction({
            userId: user.id,
            type: "solo_race_refund",
            amount: refundAmount,
            description: `Partial refund from solo race on ${trackType} track`
          });
        }
        
        // Create activity log
        await storage.createActivityLog({
          type: "solo_race_completed",
          userId: user.id,
          details: { 
            raceId: race.id,
            bet: betAmount,
            refund: refundAmount,
            netLoss: betAmount - refundAmount,
            trackType: trackType,
            won: false
          }
        });
        
        // Send failure message with more details
        const failureEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("🏁 Solo Race Defeat")
          .setDescription(`You lost a solo race on the ${trackType} track! You received a partial refund of ₵${refundAmount.toLocaleString()}.`)
          .addFields(
            { name: "Your Car", value: `${activeCar.name} (${activeCar.rarity})`, inline: true },
            { name: "AI Opponent", value: `${aiCar.name}`, inline: true },
            { name: "Your Time", value: `${raceResults.challengerTime}s`, inline: true },
            { name: "AI Time", value: `${raceResults.opponentTime}s`, inline: true },
            { name: "Time Difference", value: `${raceResults.timeDifference}s`, inline: true },
            { name: "Bet Lost", value: `₵${(betAmount - refundAmount).toLocaleString()}`, inline: true },
            { name: "Refund", value: `₵${refundAmount.toLocaleString()}`, inline: true },
            { name: "New Balance", value: `₵${(user.balance - betAmount + refundAmount).toLocaleString()}`, inline: true },
            { name: "Track Type", value: trackType.charAt(0).toUpperCase() + trackType.slice(1), inline: true }
          )
          .setFooter({ text: "Better luck next time!" });
        
        // Add race events to embed
        if (raceResults.events && raceResults.events.length > 0) {
          let eventsText = '';
          
          for (const event of raceResults.events) {
            eventsText += `• ${event.description}\n`;
          }
          
          failureEmbed.addFields({ name: "Race Events", value: eventsText });
        }
        
        // Small chance (3%) to get a consolation key even when losing
        const consolationKeyChance = Math.random();
        if (consolationKeyChance <= 0.03) {
          // Only standard keys as consolation
          const keyType = "STANDARD";
          
          // Check if user already has this key type
          const existingKey = await storage.getUserKey(user.id, keyType);
          
          if (existingKey) {
            // Increment quantity if they already have this key
            await storage.updateUserKey(existingKey.id, { quantity: existingKey.quantity + 1 });
          } else {
            // Create new key entry if they don't have it yet
            await storage.addUserKey({
              userId: user.id,
              keyType,
              quantity: 1
            });
          }
          
          // Create activity log for key earned
          await storage.createActivityLog({
            userId: user.id,
            type: "KEY_EARNED",
            details: { keyType, source: "RACE_CONSOLATION", track: trackType }
          });
          
          // Send message about consolation key
          (message.channel as TextChannel).send(`🔑 Despite losing, **${user.username}** found a **standard key** as consolation! Use \`!keys\` to see your keys and \`!usekey standard\` to use it.`);
        }
        
        return (message.channel as TextChannel).send({ embeds: [failureEmbed] });
      }
    }
    
    // Create race challenge with expiry time (2 minutes)
    const expiresAt = Date.now() + 2 * 60 * 1000;
    
    const challenge = {
      challenger: user,
      opponent: opponent,
      challengerCar: activeCar,
      bet: betAmount,
      trackType,
      expiresAt,
      channelId: message.channelId
    };
    
    // Make sure opponent exists before proceeding
    if (!opponent) {
      return message.reply("There was an issue with your opponent's profile. Race cancelled.");
    }
    
    const challengeId = `${user.id}-${opponent.id}-${Date.now()}`;
    activeRaceChallenges.set(challengeId, challenge);
    
    // Create buttons for accept/decline
    const acceptButton = new ButtonBuilder()
      .setCustomId(`accept_race_${challengeId}`)
      .setLabel('Accept Race')
      .setStyle(ButtonStyle.Primary);
    
    const declineButton = new ButtonBuilder()
      .setCustomId(`decline_race_${challengeId}`)
      .setLabel('Decline Race')
      .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(acceptButton, declineButton);
    
    // Create challenge embed
    const challengeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🏁 Race Challenge")
      .setDescription(`${message.author} has challenged ${targetUser} to a race!`)
      .addFields(
        { name: "Bet Amount", value: `₵${betAmount.toLocaleString()}`, inline: true },
        { name: "Track Type", value: trackType.charAt(0).toUpperCase() + trackType.slice(1), inline: true },
        { name: "Expires", value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: true },
        { name: `${message.author.username}'s Car`, value: `${activeCar.name} (${activeCar.rarity})`, inline: true }
      )
      .setFooter({ text: "Use the buttons below to accept or decline this challenge" });
    
    const sentMessage = await (message.channel as TextChannel).send({ 
      embeds: [challengeEmbed],
      components: [row]
    });
    
    // Handle button interactions
    const collector = sentMessage.createMessageComponentCollector({ 
      componentType: ComponentType.Button,
      time: 2 * 60 * 1000
    });
    
    collector.on('collect', async (interaction: ButtonInteraction) => {
      // Only the challenged user can interact with the buttons
      if (targetUser && interaction.user.id !== targetUser.id) {
        return interaction.reply({ 
          content: "Only the challenged user can respond to this race invitation!",
          ephemeral: true
        });
      }
      
      const challenge = activeRaceChallenges.get(challengeId);
      
      if (!challenge) {
        return interaction.reply({
          content: "This race challenge has expired or was already handled.",
          ephemeral: true
        });
      }
      
      // Get fresh data
      const challenger = await storage.getUser(challenge.challenger.id);
      const opponent = await storage.getUser(challenge.opponent.id);
      
      // Handle accept race
      if (interaction.customId === `accept_race_${challengeId}`) {
        // Check again if both users have enough balance
        if (challenger!.balance < betAmount) {
          activeRaceChallenges.delete(challengeId);
          await interaction.update({ 
            content: "The challenger doesn't have enough money for this bet anymore!",
            components: []
          });
          return;
        }
        
        if (opponent!.balance < betAmount) {
          activeRaceChallenges.delete(challengeId);
          await interaction.update({ 
            content: "You don't have enough money for this bet!",
            components: []
          });
          return;
        }
        
        // Get opponent's active car
        const opponentCar = await storage.getCar(opponent!.activeCarId!);
        
        if (!opponentCar) {
          activeRaceChallenges.delete(challengeId);
          await interaction.update({ 
            content: "Your active car was not found. Please set a new active car with `!setactive <car_id>`.",
            components: []
          });
          return;
        }
        
        // Create race in database
        const race = await storage.createRace({
          challenger: challenger!.id,
          opponent: opponent!.id,
          challengerCarId: challenge.challengerCar.id,
          opponentCarId: opponentCar.id,
          bet: betAmount,
          trackType: challenge.trackType,
          status: "in_progress",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // Race expires in 10 minutes
        });
        
        // Deduct bet amount from both users
        await storage.updateUser(challenger!.id, { balance: challenger!.balance - betAmount });
        await storage.updateUser(opponent!.id, { balance: opponent!.balance - betAmount });
        
        // Create transaction records
        await storage.createTransaction({
          userId: challenger!.id,
          type: "race_bet",
          amount: -betAmount,
          description: `Race bet against ${opponent!.username}`
        });
        
        await storage.createTransaction({
          userId: opponent!.id,
          type: "race_bet",
          amount: -betAmount,
          description: `Race bet against ${challenger!.username}`
        });
        
        // Create activity log
        await storage.createActivityLog({
          type: "race_started",
          userId: challenger!.id,
          targetId: opponent!.id,
          details: { 
            raceId: race.id,
            bet: betAmount,
            trackType: challenge.trackType
          }
        });
        
        // Calculate race results
        const raceResults = calculateRaceResults(
          challenge.challengerCar,
          opponentCar,
          challenge.trackType
        );
        
        // Update race with results
        const winner = raceResults.winner === 'challenger' ? challenger!.id : opponent!.id;
        await storage.updateRace(race.id, {
          status: "completed",
          winner,
          completedAt: new Date(),
          raceData: raceResults
        });
        
        // Award winnings to the winner
        const winningUser = winner === challenger!.id ? challenger! : opponent!;
        const winnings = betAmount * 2;
        
        await storage.updateUser(winner, { balance: winningUser.balance + winnings });
        
        // Create transaction record for winnings
        await storage.createTransaction({
          userId: winner,
          type: "race_win",
          amount: winnings,
          description: `Race winnings against ${winner === challenger!.id ? opponent!.username : challenger!.username}`
        });
        
        // Create activity log for race completion
        await storage.createActivityLog({
          type: "race_completed",
          userId: winner,
          targetId: winner === challenger!.id ? opponent!.id : challenger!.id,
          details: { 
            raceId: race.id,
            winnings,
            winner
          }
        });
        
        // 5% chance to earn a key after winning a PvP race
        const keyChance = Math.random();
        if (keyChance <= 0.05) {
          const winningUser = winner === challenger!.id ? challenger! : opponent!;
          
          // Determine which key to give based on probabilities
          let keyType = "STANDARD";
          const keyRoll = Math.random();
          
          if (keyRoll < 0.65) {
            keyType = "STANDARD";
          } else if (keyRoll < 0.90) {
            keyType = "PREMIUM";
          } else if (keyRoll < 0.98) {
            keyType = "LEGENDARY";
          } else {
            keyType = "MYTHIC";
          }
          
          // Check if user already has this key type
          const existingKey = await storage.getUserKey(winner, keyType);
          
          if (existingKey) {
            // Increment quantity if they already have this key
            await storage.updateUserKey(existingKey.id, { quantity: existingKey.quantity + 1 });
          } else {
            // Create new key entry if they don't have it yet
            await storage.addUserKey({
              userId: winner,
              keyType,
              quantity: 1
            });
          }
          
          // Create activity log for key earned
          await storage.createActivityLog({
            userId: winner,
            type: "KEY_EARNED",
            details: { keyType, source: "RACE_WIN", track: challenge.trackType }
          });
          
          // Send message about earned key - will be added to the race results message
          (message.channel as TextChannel).send(`🔑 **${winningUser.username}** found a **${keyType.toLowerCase()} key** after the race! Use \`!keys\` to see your keys and \`!usekey ${keyType.toLowerCase()}\` to use it.`);
        }
        
        // Send race results
        const resultsEmbed = createRaceResultsEmbed(
          challenger!,
          opponent!,
          challenge.challengerCar,
          opponentCar,
          raceResults,
          betAmount
        );
        
        await interaction.update({ 
          embeds: [resultsEmbed],
          components: []
        });
        
        // Remove from active challenges
        activeRaceChallenges.delete(challengeId);
      }
      // Handle decline race
      else if (interaction.customId === `decline_race_${challengeId}`) {
        activeRaceChallenges.delete(challengeId);
        
        await interaction.update({ 
          content: `${interaction.user} declined the race challenge.`,
          embeds: [],
          components: []
        });
      }
    });
    
    // Handle expiry
    collector.on('end', (collected: Collection<string, ButtonInteraction>) => {
      if (collected.size === 0 && activeRaceChallenges.has(challengeId)) {
        activeRaceChallenges.delete(challengeId);
        
        sentMessage.edit({ 
          content: "This race challenge has expired.",
          components: []
        });
      }
    });
  }
};

// Join race command
export const joinRaceCommand = {
  name: "join",
  description: "Join an open race",
  usage: "<race_id>",
  args: true,
  cooldown: 10,
  async execute(message: Message, args: string[], storage: IStorage) {
    const user = await storage.getUserByDiscordId(message.author.id);
    
    if (!user) {
      return message.reply("You need to register first! Use `!register` to create an account.");
    }
    
    // Check if user has an active car
    if (!user.activeCarId) {
      return message.reply("You need to set an active car first! Use `!setactive <car_id>` to set your racing car.");
    }
    
    // Get active car
    const activeCar = await storage.getCar(user.activeCarId);
    
    if (!activeCar) {
      return message.reply("Your active car was not found. Please set a new active car with `!setactive <car_id>`.");
    }
    
    // Parse race ID
    const raceId = parseInt(args[0]);
    
    if (isNaN(raceId)) {
      return message.reply("Please provide a valid race ID!");
    }
    
    // Get race
    const race = await storage.getRace(raceId);
    
    if (!race) {
      return message.reply("Race not found! Use `!races` to see active races.");
    }
    
    if (race.status !== "pending") {
      return message.reply("This race is no longer open for joining!");
    }
    
    if (race.challenger === user.id) {
      return message.reply("You can't join your own race!");
    }
    
    if (race.opponent) {
      return message.reply("This race already has an opponent!");
    }
    
    // Check if user has enough balance
    if (user.balance < race.bet) {
      return message.reply(`You don't have enough money for this race! The bet is ₵${race.bet.toLocaleString()} but your balance is only ₵${user.balance.toLocaleString()}.`);
    }
    
    // Get challenger
    const challenger = await storage.getUser(race.challenger);
    
    if (!challenger) {
      return message.reply("Could not find the race challenger!");
    }
    
    // Get challenger's car
    const challengerCar = await storage.getCar(race.challengerCarId);
    
    if (!challengerCar) {
      return message.reply("The challenger's car was not found!");
    }
    
    // Update race
    await storage.updateRace(race.id, {
      opponent: user.id,
      opponentCarId: activeCar.id,
      status: "in_progress"
    });
    
    // Deduct bet amount from both users
    await storage.updateUser(user.id, { balance: user.balance - race.bet });
    
    // Create transaction record
    await storage.createTransaction({
      userId: user.id,
      type: "race_bet",
      amount: -race.bet,
      description: `Race bet against ${challenger.username}`
    });
    
    // Create activity log
    await storage.createActivityLog({
      type: "race_joined",
      userId: user.id,
      targetId: race.challenger,
      details: { 
        raceId: race.id, 
        bet: race.bet 
      }
    });
    
    // Calculate race results
    const raceResults = calculateRaceResults(
      challengerCar,
      activeCar,
      race.trackType
    );
    
    // Update race with results
    const winner = raceResults.winner === 'challenger' ? challenger.id : user.id;
    await storage.updateRace(race.id, {
      status: "completed",
      winner,
      completedAt: new Date(),
      raceData: raceResults
    });
    
    // Award winnings to the winner
    const winningUser = winner === challenger.id ? challenger : user;
    const winnings = race.bet * 2;
    
    await storage.updateUser(winner, { balance: winningUser.balance + winnings });
    
    // Create transaction record for winnings
    await storage.createTransaction({
      userId: winner,
      type: "race_win",
      amount: winnings,
      description: `Race winnings against ${winner === challenger.id ? user.username : challenger.username}`
    });
    
    // Create activity log for race completion
    await storage.createActivityLog({
      type: "race_completed",
      userId: winner,
      targetId: winner === challenger.id ? user.id : challenger.id,
      details: { 
        raceId: race.id,
        winnings,
        winner
      }
    });
    
    // 5% chance to earn a key after winning a race
    const keyChance = Math.random();
    if (keyChance <= 0.05) {
      const winningUser = winner === challenger.id ? challenger : user;
      
      // Determine which key to give based on probabilities
      let keyType = "STANDARD";
      const keyRoll = Math.random();
      
      if (keyRoll < 0.65) {
        keyType = "STANDARD";
      } else if (keyRoll < 0.90) {
        keyType = "PREMIUM";
      } else if (keyRoll < 0.98) {
        keyType = "LEGENDARY";
      } else {
        keyType = "MYTHIC";
      }
      
      // Check if user already has this key type
      const existingKey = await storage.getUserKey(winner, keyType);
      
      if (existingKey) {
        // Increment quantity if they already have this key
        await storage.updateUserKey(existingKey.id, { quantity: existingKey.quantity + 1 });
      } else {
        // Create new key entry if they don't have it yet
        await storage.addUserKey({
          userId: winner,
          keyType,
          quantity: 1
        });
      }
      
      // Create activity log for key earned
      await storage.createActivityLog({
        userId: winner,
        type: "KEY_EARNED",
        details: { keyType, source: "RACE_WIN", track: race.trackType }
      });
      
      // Send message about earned key
      (message.channel as TextChannel).send(`🔑 **${winningUser.username}** found a **${keyType.toLowerCase()} key** after the race! Use \`!keys\` to see your keys and \`!usekey ${keyType.toLowerCase()}\` to use it.`);
    }
    
    // Send race results
    const resultsEmbed = createRaceResultsEmbed(
      challenger,
      user,
      challengerCar,
      activeCar,
      raceResults,
      race.bet
    );
    
    (message.channel as TextChannel).send({ embeds: [resultsEmbed] });
  }
};

// Helper functions
function calculateRaceResults(challengerCar: Car, opponentCar: Car, trackType: string) {
  // Base scores derived from car stats
  let challengerScore = 0;
  let opponentScore = 0;
  
  // Different track types emphasize different car stats
  switch (trackType.toLowerCase()) {
    case 'drag':
      // Drag races prioritize speed and acceleration
      challengerScore = (challengerCar.speed * 0.6) + (challengerCar.acceleration * 0.4);
      opponentScore = (opponentCar.speed * 0.6) + (opponentCar.acceleration * 0.4);
      break;
    
    case 'circuit':
      // Circuit races balance all stats with emphasis on handling
      challengerScore = (challengerCar.speed * 0.25) + (challengerCar.acceleration * 0.25) + 
                        (challengerCar.handling * 0.35) + (challengerCar.boost * 0.15);
      opponentScore = (opponentCar.speed * 0.25) + (opponentCar.acceleration * 0.25) + 
                      (opponentCar.handling * 0.35) + (opponentCar.boost * 0.15);
      break;
    
    case 'drift':
      // Drift races prioritize handling and boost
      challengerScore = (challengerCar.speed * 0.1) + (challengerCar.acceleration * 0.2) + 
                        (challengerCar.handling * 0.5) + (challengerCar.boost * 0.2);
      opponentScore = (opponentCar.speed * 0.1) + (opponentCar.acceleration * 0.2) + 
                      (opponentCar.handling * 0.5) + (opponentCar.boost * 0.2);
      break;
    
    case 'offroad':
      // Offroad races prioritize handling and boost
      challengerScore = (challengerCar.speed * 0.15) + (challengerCar.acceleration * 0.25) + 
                        (challengerCar.handling * 0.3) + (challengerCar.boost * 0.3);
      opponentScore = (opponentCar.speed * 0.15) + (opponentCar.acceleration * 0.25) + 
                      (opponentCar.handling * 0.3) + (opponentCar.boost * 0.3);
      break;
    
    case 'street':
    default:
      // Street races balance all stats
      challengerScore = (challengerCar.speed * 0.3) + (challengerCar.acceleration * 0.3) + 
                        (challengerCar.handling * 0.2) + (challengerCar.boost * 0.2);
      opponentScore = (opponentCar.speed * 0.3) + (opponentCar.acceleration * 0.3) + 
                      (opponentCar.handling * 0.2) + (opponentCar.boost * 0.2);
      break;
  }
  
  // Add random factor (up to 20% variance)
  const randomFactor = 0.2;
  challengerScore *= (1 + (Math.random() * randomFactor) - (randomFactor / 2));
  opponentScore *= (1 + (Math.random() * randomFactor) - (randomFactor / 2));
  
  // Calculate finishing times (in seconds, lower is better)
  // Base time of 60 seconds minus stat advantage
  const challengerTime = 60 - (challengerScore / 10);
  const opponentTime = 60 - (opponentScore / 10);
  
  // Generate race events (3-5 random events during the race)
  const events = [];
  const numEvents = Math.floor(Math.random() * 3) + 3;
  const eventTypes = ['overtake', 'boost', 'drift', 'shortcut', 'error'];
  
  for (let i = 0; i < numEvents; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const timestamp = Math.floor(Math.random() * 50) + 5; // Event happens between 5-55 seconds
    const isChallenger = Math.random() > 0.5;
    
    events.push({
      type: eventType,
      timestamp,
      driver: isChallenger ? 'challenger' : 'opponent',
      description: generateEventDescription(eventType, isChallenger ? 'challenger' : 'opponent')
    });
  }
  
  // Sort events by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);
  
  // Determine winner
  const winner = challengerTime <= opponentTime ? 'challenger' : 'opponent';
  const timeDifference = Math.abs(challengerTime - opponentTime).toFixed(2);
  
  return {
    winner,
    challengerTime,
    opponentTime,
    timeDifference,
    events,
    trackType
  };
}

function generateEventDescription(eventType: string, driver: string) {
  const driverName = driver === 'challenger' ? 'Challenger' : 'Opponent';
  
  const descriptions = {
    overtake: [
      `${driverName} executes a perfect overtake!`,
      `${driverName} finds an opening and passes!`,
      `${driverName} makes a bold move to take the lead!`
    ],
    boost: [
      `${driverName} hits the nitrous for a speed boost!`,
      `${driverName} activates boost at the perfect moment!`,
      `${driverName} accelerates with a sudden burst of speed!`
    ],
    drift: [
      `${driverName} pulls off an impressive drift through the corner!`,
      `${driverName} slides through the turn with precision!`,
      `Perfect drift by ${driverName}!`
    ],
    shortcut: [
      `${driverName} takes a risky shortcut!`,
      `${driverName} finds a hidden path to gain time!`,
      `${driverName} cuts through an alley to make up ground!`
    ],
    error: [
      `${driverName} nearly loses control on a tight corner!`,
      `${driverName} narrowly avoids hitting the barrier!`,
      `${driverName} makes a small driving error but recovers!`
    ]
  };
  
  const options = descriptions[eventType as keyof typeof descriptions] || descriptions.boost;
  return options[Math.floor(Math.random() * options.length)];
}

function createRaceResultsEmbed(challenger: any, opponent: any, challengerCar: Car, opponentCar: Car, results: any, betAmount: number) {
  const winnerName = results.winner === 'challenger' ? challenger.username : opponent.username;
  const winnerCar = results.winner === 'challenger' ? challengerCar : opponentCar;
  
  const loserName = results.winner === 'challenger' ? opponent.username : challenger.username;
  const loserCar = results.winner === 'challenger' ? opponentCar : challengerCar;
  
  // Calculate time diff display
  const challengerFinished = results.winner === 'challenger' ? '🏁' : `+${results.timeDifference}s`;
  const opponentFinished = results.winner === 'opponent' ? '🏁' : `+${results.timeDifference}s`;
  
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🏎️ Race Results")
    .setDescription(`**${winnerName}** won the race and earned **₵${(betAmount * 2).toLocaleString()}**!`)
    .addFields(
      { 
        name: `${challenger.username} (${challengerCar.name})`, 
        value: `Finish: ${challengerFinished}\nTime: ${results.challengerTime}s`, 
        inline: true 
      },
      { 
        name: `${opponent.username} (${opponentCar.name})`, 
        value: `Finish: ${opponentFinished}\nTime: ${results.opponentTime}s`, 
        inline: true 
      },
      { 
        name: "Track Type", 
        value: results.trackType.charAt(0).toUpperCase() + results.trackType.slice(1), 
        inline: true 
      }
    );
  
  // Add race highlights
  if (results.events && results.events.length > 0) {
    const highlights = results.events.map((event: any) => 
      `**${event.timestamp}s:** ${event.description}`
    ).join('\n');
    
    embed.addFields({ name: "Race Highlights", value: highlights });
  }
  
  return embed;
}

// Solo race command
export const soloRaceCommand = {
  name: "solorace",
  aliases: ["solo", "airace"],
  description: "Race against an AI opponent",
  usage: "<bet_amount> [track_type]",
  args: true,
  cooldown: 30,
  async execute(message: Message, args: string[], storage: IStorage) {
    const user = await storage.getUserByDiscordId(message.author.id);
    
    if (!user) {
      return message.reply("You need to register first! Use `!register` to create an account.");
    }
    
    // Check if user has an active car
    if (!user.activeCarId) {
      return message.reply("You need to set an active car first! Use `!setactive <car_id>` to set your racing car.");
    }
    
    // Get active car
    const activeCar = await storage.getCar(user.activeCarId);
    
    if (!activeCar) {
      return message.reply("Your active car was not found. Please set a new active car with `!setactive <car_id>`.");
    }
    
    // Parse bet amount
    const betArg = args.find(arg => !arg.startsWith("-") && 
                           !["street", "circuit", "drag", "offroad", "drift"].includes(arg.toLowerCase()));
    
    if (!betArg) {
      return message.reply("Please specify a bet amount! Usage: `!solorace <bet_amount> [track_type]`");
    }
    
    const betAmount = parseInt(betArg.replace(/\D/g, ''));
    
    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("Please provide a valid bet amount!");
    }
    
    // Check minimum bet
    const minBet = 100;
    if (betAmount < minBet) {
      return message.reply(`The minimum bet amount is ₵${minBet}!`);
    }
    
    // Check if user has enough balance
    if (user.balance < betAmount) {
      return message.reply(`You don't have enough money for that bet! Your balance: ₵${user.balance.toLocaleString()}`);
    }
    
    // Parse track type
    const validTrackTypes = ["street", "circuit", "drag", "offroad", "drift"];
    let trackType = args.find(arg => validTrackTypes.includes(arg.toLowerCase())) || "street";
    trackType = trackType.toLowerCase();
    
    if (!validTrackTypes.includes(trackType)) {
      trackType = "street";
    }
    
    // Generate AI opponent car with improved balance
    const aiCarRarity = rollForRarity();
    const aiCar: Car = {
      id: -1, // Use a negative ID to indicate it's an AI car
      userId: -1,
      name: `AI ${aiCarRarity} Challenger`,
      type: "AI",
      rarity: aiCarRarity,
      speed: Math.min(Math.floor(activeCar.speed * (Math.random() * 0.3 + 0.85)), 100), // 85-115% of player's car stats
      acceleration: Math.min(Math.floor(activeCar.acceleration * (Math.random() * 0.3 + 0.85)), 100),
      handling: Math.min(Math.floor(activeCar.handling * (Math.random() * 0.3 + 0.85)), 100),
      boost: Math.min(Math.floor(activeCar.boost * (Math.random() * 0.3 + 0.85)), 100),
      value: 0,
      image: null,
      acquired: new Date()
    };
    
    // Deduct bet amount from the user
    await storage.updateUser(user.id, { balance: user.balance - betAmount });
    
    // Create transaction record
    await storage.createTransaction({
      userId: user.id,
      type: "solo_race_bet",
      amount: -betAmount,
      description: `Solo race bet on ${trackType} track`
    });
    
    // Calculate race results
    const raceResults = calculateRaceResults(activeCar, aiCar, trackType);
    
    // Create race in database
    const race = await storage.createRace({
      challenger: user.id,
      opponent: null, // No real opponent
      challengerCarId: activeCar.id,
      opponentCarId: null,
      bet: betAmount,
      trackType: trackType,
      status: "completed"
    });
    
    // Update race with results immediately after creation
    await storage.updateRace(race.id, {
      winner: raceResults.winner === 'challenger' ? user.id : null,
      raceData: raceResults,
      completedAt: new Date()
    });
    
    // If player won, give them the winnings
    if (raceResults.winner === 'challenger') {
      // Player wins 1.8x the bet amount in solo races
      const winnings = Math.floor(betAmount * 1.8);
      
      await storage.updateUser(user.id, { balance: user.balance - betAmount + winnings });
      
      // Create transaction record for winnings
      await storage.createTransaction({
        userId: user.id,
        type: "solo_race_win",
        amount: winnings,
        description: `Solo race winnings on ${trackType} track`
      });
      
      // Create activity log
      await storage.createActivityLog({
        type: "race_win",
        userId: user.id,
        details: { 
          raceId: race.id,
          carId: activeCar.id,
          trackType,
          betAmount,
          winnings,
          opponentType: "AI"
        }
      });
      
      // Roll for key drops with improved chances
      // Solo races: 70% Standard, 20% Premium, 9% Legendary, 1% Mythic
      const keyRoll = Math.random();
      let keyType = null;
      
      if (keyRoll < 0.01) {
        keyType = "MYTHIC";
      } else if (keyRoll < 0.10) {
        keyType = "LEGENDARY";
      } else if (keyRoll < 0.30) {
        keyType = "PREMIUM";
      } else if (keyRoll < 1.0) {
        keyType = "STANDARD";
      }
      
      if (keyType) {
        // Add key to user's inventory
        await storage.addUserKey({
          userId: user.id,
          keyType,
          quantity: 1
        });
        
        // Log the key drop
        await storage.createActivityLog({
          type: "key_acquired",
          userId: user.id,
          details: { 
            keyType,
            source: "solo_race_win"
          }
        });
      }
      
      // Create race results embed for win
      const resultEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`🏆 Race Victory! | ${trackType.toUpperCase()} Track`)
        .setDescription(`You beat the AI opponent and won ₵${winnings.toLocaleString()}!`)
        .addFields(
          { name: "Your Car", value: `${activeCar.name} (${activeCar.rarity})` },
          { name: "AI Opponent", value: `${aiCar.name}` },
          { name: "Performance", value: 
            `Your Finish Time: ${Number(raceResults.challengerTime).toFixed(2)}s\n` +
            `AI Finish Time: ${Number(raceResults.opponentTime).toFixed(2)}s\n` +
            `Winning Margin: ${Math.abs(Number(raceResults.challengerTime) - Number(raceResults.opponentTime)).toFixed(2)}s`
          },
          { name: "Balance", value: `New Balance: ₵${(user.balance - betAmount + winnings).toLocaleString()}` }
        );
      
      // Add key drop info if a key was dropped
      if (keyType) {
        resultEmbed.addFields({ 
          name: "🔑 Key Drop!", 
          value: `You received a ${keyType.charAt(0) + keyType.slice(1).toLowerCase()} Key!` 
        });
      }
      
      return message.reply({ embeds: [resultEmbed] });
      
    } else {
      // Player lost
      // Create activity log
      await storage.createActivityLog({
        type: "race_loss",
        userId: user.id,
        details: { 
          raceId: race.id,
          carId: activeCar.id,
          trackType,
          betAmount,
          opponentType: "AI"
        }
      });
      
      // Create race results embed for loss
      const resultEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`😢 Race Defeat! | ${trackType.toUpperCase()} Track`)
        .setDescription(`You lost to the AI opponent and lost your bet of ₵${betAmount.toLocaleString()}.`)
        .addFields(
          { name: "Your Car", value: `${activeCar.name} (${activeCar.rarity})` },
          { name: "AI Opponent", value: `${aiCar.name}` },
          { name: "Performance", value: 
            `Your Finish Time: ${Number(raceResults.challengerTime).toFixed(2)}s\n` +
            `AI Finish Time: ${Number(raceResults.opponentTime).toFixed(2)}s\n` +
            `Losing Margin: ${Math.abs(Number(raceResults.challengerTime) - Number(raceResults.opponentTime)).toFixed(2)}s`
          },
          { name: "Balance", value: `New Balance: ₵${(user.balance - betAmount).toLocaleString()}` }
        );
      
      return message.reply({ embeds: [resultEmbed] });
    }
  }
};
