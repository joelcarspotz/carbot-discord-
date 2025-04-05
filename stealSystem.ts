import { Client, Message, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ButtonInteraction, ComponentType, CollectorFilter, MessageActionRowComponentBuilder, Collection, TextChannel } from "discord.js";
import { IStorage } from "../storage";
import { safelySendMessage } from "../utils/discordHelpers";
import { generateRandomCar } from "../utils/carGenerator";
import { CAR_RARITIES, InsertCar } from "@shared/schema";
import { realCarData } from '../data/carData';
import { CarData } from '../../shared/types';

// Helper function to convert rarity string to CAR_RARITIES key
function rarityToKey(rarity: string): keyof typeof CAR_RARITIES {
  switch(rarity.toLowerCase()) {
    case "common": return "COMMON";
    case "uncommon": return "UNCOMMON";
    case "rare": return "RARE";
    case "epic": return "EPIC";
    case "legendary": return "LEGENDARY";
    case "mythic": return "MYTHIC";
    default: return "COMMON";
  }
}

// Setup steal system
export function setupStealSystem(client: Client) {
  console.log("Steal system initialized");
}

// Helper function to generate random cars for stealing
function generateRandomTargetCars() {
  // Organize cars by rarity
  const carsByRarity = {
    common: realCarData.filter(car => car.rarity === "Common"),
    uncommon: realCarData.filter(car => car.rarity === "Uncommon"),
    rare: realCarData.filter(car => car.rarity === "Rare"),
    epic: realCarData.filter(car => car.rarity === "Epic"),
    legendary: realCarData.filter(car => car.rarity === "Legendary"),
    mythic: realCarData.filter(car => car.rarity === "Mythic")
  };

  // Function to select one car with weighted probability
  function selectRandomCarByRarity() {
    // Making mythic cars extremely rare for steal command
    const rarityProbabilities = [
      { rarity: "common", chance: 36 },
      { rarity: "uncommon", chance: 32 },
      { rarity: "rare", chance: 20 },
      { rarity: "epic", chance: 8 },
      { rarity: "legendary", chance: 3 },
      { rarity: "mythic", chance: 1 }  // Only 1% chance to see a mythic car in steal
    ];

    // Generate a random number between 1-100
    const roll = Math.floor(Math.random() * 100) + 1;

    // Determine which rarity was rolled
    let cumulativeChance = 0;
    let selectedRarity = "common"; // Default

    for (const rarityProb of rarityProbabilities) {
      cumulativeChance += rarityProb.chance;
      if (roll <= cumulativeChance) {
        selectedRarity = rarityProb.rarity;
        break;
      }
    }

    // Select a random car from the chosen rarity
    const carsInRarity = carsByRarity[selectedRarity as keyof typeof carsByRarity];
    const randomIndex = Math.floor(Math.random() * carsInRarity.length);
    return carsInRarity[randomIndex];
  }

  // Select 3 cars with appropriate rarity distribution
  const selectedCars = [];
  const usedCarNames = new Set<string>();

  while (selectedCars.length < 3) {
    const selectedCar = selectRandomCarByRarity();
    // Make sure we don't offer the same car twice
    if (!usedCarNames.has(selectedCar.name)) {
      usedCarNames.add(selectedCar.name);
      selectedCars.push(selectedCar);
    }
  }

  return selectedCars;
}

// Generate a speed-based number challenge
function generateSpeedChallenge(carRarity: string = "common") {
  // Determine number length based on rarity (4-8)
  let codeLength = 4; // Default for common cars

  // Make longer codes for rarer cars
  switch(carRarity.toLowerCase()) {
    case "common":
      codeLength = 4;
      break;
    case "uncommon":
      codeLength = 4;
      break;
    case "rare":
      codeLength = 5;
      break;
    case "epic":
      codeLength = 6;
      break;
    case "legendary":
      codeLength = 7;
      break;
    case "mythic":
      codeLength = 8;
      break;
    default:
      codeLength = 4;
  }

  // Generate a random code
  let secretCode = "";
  for (let i = 0; i < codeLength; i++) {
    secretCode += Math.floor(Math.random() * 10).toString();
  }

  // Determine time limit based on code length (shorter code = less time)
  const timeLimit = 8 - (codeLength - 4) * 0.5; // Reduced time to make it more challenging

  return {
    secretCode,
    timeLimit,
    codeLength
  };
}

// Format the speed challenge display
function getSpeedChallengeDisplay(challenge: { secretCode: string, timeLimit: number, codeLength: number }) {
  return "```\n" +
    "🔐 Security Code: " + challenge.secretCode + "\n" +
    "⏱️ Time Limit: " + challenge.timeLimit + " seconds\n" +
    "Type the code exactly as shown above!\n" +
    "```";
}

// The main steal command
export const stealCommand = {
  name: "steal",
  description: "Attempt to steal a car",
  cooldown: 10,
  guildOnly: true,
  async execute(message: Message, args: string[], storage: IStorage) {
    const user = await storage.getUserByDiscordId(message.author.id);

    if (!user) {
      return message.reply("You need to register first! Use `!register` to create an account.");
    }

    // Check cooldown (1 minute)
    if (user.lastStealAttempt) {
      const cooldownMinutes = 1;
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const timeSinceLastAttempt = Date.now() - new Date(user.lastStealAttempt).getTime();

      if (timeSinceLastAttempt < cooldownMs) {
        const remainingMs = cooldownMs - timeSinceLastAttempt;
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        return message.reply(`Steal cooldown active. Try again in ${remainingSeconds} seconds.`);
      }
    }

    // Generate 3 random cars to choose from
    const targetCars = generateRandomTargetCars();

    // Create selection buttons
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('steal_1')
          .setLabel('1')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('steal_2')
          .setLabel('2')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('steal_3')
          .setLabel('3')
          .setStyle(ButtonStyle.Primary)
      );

    // Create the selection embed with car info
    const selectionEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle("Which car do you want to steal?")
      .setDescription(
        `1️⃣ ${targetCars[0].name} (${targetCars[0].rarity})\n` +
        `2️⃣ ${targetCars[1].name} (${targetCars[1].rarity})\n` +
        `3️⃣ ${targetCars[2].name} (${targetCars[2].rarity})`
      );

    const selectionMessage = await safelySendMessage(message.channel, {
      embeds: [selectionEmbed],
      components: [row]
    });

    if (!selectionMessage) {
      return await safelySendMessage(message.channel, 'There was an error starting the steal command. Please try again.');
    }

    // Set up collector for button interactions
    const filter: CollectorFilter<any> = i => {
      return i.user.id === message.author.id && i.customId.startsWith('steal_');
    };

    try {
      const selection = await selectionMessage.awaitMessageComponent({ 
        filter, 
        time: 30000,
        componentType: ComponentType.Button 
      });

      // Get the selected car index (0-2)
      const selectedIndex = parseInt(selection.customId.split('_')[1]) - 1;
      const selectedCar = targetCars[selectedIndex];

      // Get car rarity directly from the selectedCar object
      const carRarity = selectedCar.rarity.toLowerCase();

      // Generate the speed challenge based on car rarity
      const speedChallenge = generateSpeedChallenge(carRarity);

      // Update user's last steal attempt timestamp
      await storage.updateUser(user.id, { lastStealAttempt: new Date() });

      // Add help button
      const helpRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('speed_help')
            .setLabel('How to break the security')
            .setStyle(ButtonStyle.Secondary)
        );

      // Create the speed challenge embed
      const challengeEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`${selectedCar.name}`)
        .setDescription(
          `You need to type the security code to break in!\n` +
          `You have ${speedChallenge.timeLimit} seconds to type the code.\n\n` +
          getSpeedChallengeDisplay(speedChallenge)
        );

      await selection.update({
        embeds: [challengeEmbed],
        components: [helpRow]
      });

      // Set the challenge start time
      const challengeStartTime = Date.now();
      const timeLimit = speedChallenge.timeLimit * 1000; // Convert to milliseconds

      // Create a message collector to collect user attempts
      const messageFilter = (m: Message) => m.author.id === message.author.id;

      // Check if the channel is a text channel
      if (!message.channel || !('createMessageCollector' in message.channel)) {
        await safelySendMessage(message.channel, 'Error: This command can only be used in text channels.');
        return;
      }

      const messageCollector = message.channel.createMessageCollector({
        filter: messageFilter,
        time: timeLimit
      });

      // Also create a button collector for the help button
      const buttonFilter: CollectorFilter<any> = i => {
        return i.user.id === message.author.id && i.customId === 'speed_help';
      };

      const buttonCollector = selection.message.createMessageComponentCollector({
        filter: buttonFilter,
        time: timeLimit
      });

      buttonCollector.on('collect', async (interaction: ButtonInteraction) => {
        await interaction.reply({
          content: "**How to break the car security:**\n" +
                   "1. You need to type the security code exactly as shown.\n" +
                   "2. Type quickly before the time runs out!\n" +
                   "3. Rarer cars have longer codes and less time.\n" +
                   "4. Common/Uncommon: 4 digits (8 seconds)\n" +
                   "5. Rare: 5 digits (7.5 seconds)\n" +
                   "6. Epic: 6 digits (7 seconds)\n" +
                   "7. Legendary: 7 digits (6.5 seconds)\n" +
                   "8. Mythic: 8 digits (6 seconds)",
          ephemeral: true
        });
      });

      // Variable to track if the challenge has been completed successfully
      let success = false;

      messageCollector.on('collect', (m: Message) => {
        // Check if the message matches the secret code
        if (m.content === speedChallenge.secretCode) {
          success = true;
          messageCollector.stop('success');
        }
      });

      messageCollector.on('end', async (collected, reason) => {
        // Disable the help button
        const disabledHelpRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('speed_help')
              .setLabel('How to break the security')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

        if (reason === 'success') {
          // Successfully picked the lock!
          // Create the car using the selected car's existing data
          const stolenCar: InsertCar = {
            userId: user.id,
            name: selectedCar.name,
            type: selectedCar.type,
            rarity: selectedCar.rarity,
            speed: selectedCar.speed,
            acceleration: selectedCar.acceleration,
            handling: selectedCar.handling,
            boost: selectedCar.boost,
            value: selectedCar.value,
            acquired: new Date()
          };

          const newCar = await storage.createCar(stolenCar);

          // Create steal attempt record
          await storage.createStealAttempt({
            thiefId: user.id,
            targetId: 0, // No specific target
            success: true,
            carId: newCar.id,
            fine: null
          });

          // Create activity log
          await storage.createActivityLog({
            type: "car_stolen",
            userId: user.id,
            details: { 
              carId: newCar.id,
              carName: newCar.name,
              targetCarName: selectedCar.name
            }
          });

          // Get rarity emoji
          let rarityEmoji;
          switch(newCar.rarity) {
            case "Common": rarityEmoji = "🟢"; break;
            case "Uncommon": rarityEmoji = "🔵"; break;
            case "Rare": rarityEmoji = "🟣"; break;
            case "Epic": rarityEmoji = "🟠"; break;
            case "Legendary": rarityEmoji = "🟡"; break;
            default: rarityEmoji = "⚪";
          }

          // Send success message
          const successEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("🔓 Theft Successful!")
            .setDescription(`You successfully broke into the ${selectedCar.name} and stole a car!`)
            .addFields(
              { 
                name: `${rarityEmoji} ${newCar.rarity} ${newCar.name}`,
                value: `Type: ${newCar.type}\nSpeed: ${newCar.speed}/100\nAcceleration: ${newCar.acceleration}/100\nHandling: ${newCar.handling}/100\nBoost: ${newCar.boost}/100\nValue: ₵${newCar.value.toLocaleString()}`
              }
            )
            .setFooter({ text: "Check your garage with !garage" });

          await selection.message.edit({
            embeds: [successEmbed],
            components: [disabledHelpRow]
          });

        } else {
          // Failed to break in
          // Calculate fine (reduced from 5000 to 2500)
          const fine = 2500;

          // Apply fine
          await storage.updateUser(user.id, { balance: user.balance - fine });

          // Create transaction record for the fine
          await storage.createTransaction({
            userId: user.id,
            type: "steal_fine",
            amount: -fine,
            description: "Fine for failed car theft"
          });

          // Create steal attempt record
          await storage.createStealAttempt({
            thiefId: user.id,
            targetId: 0, // No specific target
            success: false,
            carId: null,
            fine: fine
          });

          // Create activity log
          await storage.createActivityLog({
            type: "steal_failed",
            userId: user.id,
            details: { 
              fine,
              targetCarName: selectedCar.name
            }
          });

          // Send failure message
          const failureEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("🚨 Theft Failed!")
            .setDescription(`You failed to break into the ${selectedCar.name} and got caught!\nThe car's security system was too complex.`)
            .addFields(
              { 
                name: "Fine",
                value: `You were fined ₵${fine.toLocaleString()}\nNew Balance: ₵${(user.balance - fine).toLocaleString()}`
              }
            )
            .setFooter({ text: "Try again in 1 minute" });

          await selection.message.edit({
            embeds: [failureEmbed],
            components: [disabledHelpRow]
          });
        }
      });

    } catch (error: any) {
      // Handle timeout or errors
      if (error?.code === 'INTERACTION_COLLECTOR_ERROR') {
        await safelySendMessage(message.channel, 'The car selection timed out. Please try again.');
      } else {
        console.error("Error in steal command:", error);
        await safelySendMessage(message.channel, 'There was an error executing this command.');
      }
    }
  }
};

// Export the steal commands array
export function stealCommands() {
  return [
    stealCommand
  ];
}
