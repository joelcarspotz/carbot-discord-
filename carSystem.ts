import { 
  Client, 
  Message, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageActionRowComponentBuilder,
  ButtonInteraction
} from "discord.js";
import { safelySendMessage } from "../utils/discordHelpers";
import { IStorage } from "../storage";
import { Car, CAR_KEYS, CAR_RARITIES } from "@shared/schema";
import { getRarityInfo, generateCarWithKey, generateRandomCar } from "../utils/carGenerator";

// Helper function to get color based on car rarity
function getCarRarityColor(car: Car): number {
  const colors = {
    "Common": 0x57F287,    // Green
    "Uncommon": 0x3498DB,  // Blue
    "Rare": 0x9B59B6,      // Purple
    "Epic": 0xE67E22,      // Orange
    "Legendary": 0xF1C40F  // Yellow
  };
  
  return colors[car.rarity as keyof typeof colors] || 0xFFFFFF;
}

// Evaluate a car's performance on different track types
function evaluateTrackPerformance(car: Car, trackType: string): string {
  // Calculate a score based on car stats and track type
  let score = 0;
  const totalStats = car.speed + car.acceleration + car.handling + car.boost;
  
  switch(trackType.toLowerCase()) {
    case "street":
      // Street tracks are balanced
      score = (car.speed * 0.3) + (car.acceleration * 0.3) + (car.handling * 0.25) + (car.boost * 0.15);
      break;
    case "circuit":
      // Circuit tracks favor handling and consistent speed
      score = (car.speed * 0.25) + (car.acceleration * 0.15) + (car.handling * 0.45) + (car.boost * 0.15);
      break;
    case "drag":
      // Drag races are all about speed and acceleration
      score = (car.speed * 0.45) + (car.acceleration * 0.4) + (car.handling * 0.05) + (car.boost * 0.1);
      break;
    case "offroad":
      // Off-road tracks favor handling and boost
      score = (car.speed * 0.15) + (car.acceleration * 0.2) + (car.handling * 0.3) + (car.boost * 0.35);
      break;
    case "drift":
      // Drift tracks favor handling
      score = (car.speed * 0.2) + (car.acceleration * 0.15) + (car.handling * 0.5) + (car.boost * 0.15);
      break;
    default:
      // Default balanced formula
      score = totalStats / 4;
  }
  
  // Normalize the score to a 1-10 scale, weighted by total stats
  const normalizedScore = Math.min(10, Math.max(1, Math.floor((score / 100) * 10)));
  
  // Return a visual representation
  const ratings = [
    "❌ Terrible", // 1
    "⚠️ Very Poor", // 2  
    "⚠️ Poor", // 3
    "⚠️ Below Average", // 4
    "⚡ Average", // 5
    "⚡ Above Average", // 6
    "⚡ Good", // 7
    "🔥 Very Good", // 8
    "🔥 Excellent", // 9
    "🏆 Perfect" // 10
  ];
  
  return ratings[normalizedScore - 1];
}

// Setup car system
export function setupCarSystem(client: Client) {
  // Any event listeners or setup code
  console.log("Car system initialized");
}

// Car commands
export function carCommands() {
  return [
    // Use Key command
    {
      name: "usekey",
      description: "Use a key to obtain a random car",
      usage: "<key_type>",
      args: true,
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        if (!args[0]) {
          return message.reply("Please specify which key type to use! Use `!inventory` to see your keys.");
        }
        
        const keyType = args[0].toUpperCase();
        
        // Check if key type exists
        if (!CAR_KEYS[keyType as keyof typeof CAR_KEYS]) {
          return message.reply("Invalid key type! Available key types: STANDARD, PREMIUM, LEGENDARY, MYTHIC");
        }
        
        // Check if user has this key
        const userKey = await storage.getUserKey(user.id, keyType);
        
        if (!userKey || userKey.quantity <= 0) {
          return message.reply(`You don't have any ${CAR_KEYS[keyType as keyof typeof CAR_KEYS].name} Keys! Purchase them with \`!buykey ${keyType.toLowerCase()}\``);
        }
        
        // Use the key (decrease quantity)
        const success = await storage.useKey(user.id, keyType);
        
        if (!success) {
          return message.reply("Failed to use the key. Please try again later.");
        }
        
        // Generate a car with the key
        const newCar = await storage.createCar(
          generateCarWithKey(user.id, keyType as keyof typeof CAR_KEYS)
        );
        
        // If user doesn't have an active car, set this as active
        if (!user.activeCarId) {
          await storage.updateUser(user.id, { activeCarId: newCar.id });
        }
        
        // Create activity log
        await storage.createActivityLog({
          type: "key_used",
          userId: user.id,
          details: { 
            keyType,
            keyName: CAR_KEYS[keyType as keyof typeof CAR_KEYS].name,
            carId: newCar.id,
            carName: newCar.name,
            carRarity: newCar.rarity
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
          case "Mythic": rarityEmoji = "🔴"; break;
          default: rarityEmoji = "⚪";
        }
        
        // Send confirmation with car details
        const carEmbed = new EmbedBuilder()
          .setColor(getCarRarityColor(newCar))
          .setTitle(`🎉 You obtained a new car!`)
          .setDescription(`You used a ${CAR_KEYS[keyType as keyof typeof CAR_KEYS].name} Key and got:\n**${rarityEmoji} ${newCar.rarity} ${newCar.name}**`)
          .addFields(
            { 
              name: "Car Stats",
              value: `Type: ${newCar.type}\nSpeed: ${newCar.speed}/100\nAcceleration: ${newCar.acceleration}/100\nHandling: ${newCar.handling}/100\nBoost: ${newCar.boost}/100\nValue: ₵${newCar.value.toLocaleString()}`
            }
          )
          .setFooter({ text: "Check your garage with !garage" });
        
        safelySendMessage(message.channel, { embeds: [carEmbed] });
      }
    },
    // Rarity info command
    {
      name: "rarity",
      description: "Shows information about car rarities in the game",
      cooldown: 10,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Get rarity info
        const rarityInfo = getRarityInfo();
        
        // Create embed
        const rarityEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("Car Rarity Information")
          .setDescription("Different car rarities affect the base stats and value of vehicles.")
          .setFooter({ text: "Use !car <car_id> to check the rarity of your specific car" });
          
        // Add each rarity to the embed
        rarityInfo.forEach(rarity => {
          // Convert hex color string to a number
          const colorHex = parseInt(rarity.color.replace('#', ''), 16);
          
          rarityEmbed.addFields({
            name: `${rarity.name} (${rarity.chance} chance)`,
            value: `Value multiplier: ${rarity.valueMultiplier}\nColor: ${rarity.color}`
          });
        });
        
        // Add explanation of how rarity works
        rarityEmbed.addFields({
          name: "How Rarity Works",
          value: "When you get a new car, its rarity is determined by random chance. " +
                "Higher rarity cars have better base stats and are worth more money. " +
                "The rarity affects both the performance in races and the resale value."
        });
        
        await safelySendMessage(message.channel, { embeds: [rarityEmbed] });
      }
    },
    // Track info command
    {
      name: "tracks",
      aliases: ["track"],
      description: "Shows information about the different race tracks",
      cooldown: 10,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Create embed
        const tracksEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("Race Track Types")
          .setDescription("Different tracks favor different car stats. Choose your car wisely!")
          .setFooter({ text: "Use !car <car_id> to see how your car performs on different tracks" });
          
        // Add each track type to the embed
        tracksEmbed.addFields(
          {
            name: "🏙️ Street",
            value: "**Balanced tracks** that run through city streets.\n" +
                  "Favors a balanced car with good speed and acceleration.\n" +
                  "Stat weights: Speed 30%, Acceleration 30%, Handling 25%, Boost 15%"
          },
          {
            name: "🏁 Circuit",
            value: "**Professional race tracks** with smooth surfaces and many turns.\n" +
                  "Favors cars with excellent handling and good speed.\n" +
                  "Stat weights: Speed 25%, Acceleration 15%, Handling 45%, Boost 15%"
          },
          {
            name: "🔥 Drag",
            value: "**Straight-line speed courses** for pure acceleration and top speed.\n" +
                  "Favors cars with excellent speed and acceleration.\n" +
                  "Stat weights: Speed 45%, Acceleration 40%, Handling 5%, Boost 10%"
          },
          {
            name: "🏔️ Off-road",
            value: "**Rough terrain courses** with jumps and obstacles.\n" +
                  "Favors cars with good boost and handling.\n" +
                  "Stat weights: Speed 15%, Acceleration 20%, Handling 30%, Boost 35%"
          },
          {
            name: "🌀 Drift",
            value: "**Technical courses** designed for controlled sliding.\n" +
                  "Heavily favors cars with superior handling.\n" +
                  "Stat weights: Speed 20%, Acceleration 15%, Handling 50%, Boost 15%"
          }
        );
        
        await safelySendMessage(message.channel, { embeds: [tracksEmbed] });
      }
    },
    // Garage/cars command
    {
      name: "garage",
      aliases: ["cars"],
      description: "View your car collection",
      usage: "[page]",
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Get user's cars
        const cars = await storage.getUserCars(user.id);
        
        if (cars.length === 0) {
          return message.reply("You don't have any cars in your garage! Use `!shop` to browse available cars.");
        }
        
        // Pagination
        const carsPerPage = 5;
        let currentPage = args.length ? parseInt(args[0]) : 1;
        
        if (isNaN(currentPage) || currentPage < 1) {
          currentPage = 1;
        }
        
        const maxPage = Math.ceil(cars.length / carsPerPage);
        
        if (currentPage > maxPage) {
          currentPage = maxPage;
        }
        
        // Function to display garage page
        const displayGaragePage = async (page: number) => {
          const startIndex = (page - 1) * carsPerPage;
          const displayedCars = cars.slice(startIndex, startIndex + carsPerPage);
          
          // Sort cars by rarity
          const sortedCars = [...displayedCars].sort((a, b) => {
            const rarityOrder = {
              "Common": 0,
              "Uncommon": 1,
              "Rare": 2,
              "Epic": 3,
              "Legendary": 4,
              "Mythic": 5
            };
            
            return rarityOrder[b.rarity as keyof typeof rarityOrder] - rarityOrder[a.rarity as keyof typeof rarityOrder];
          });
          
          // Create garage embed
          const garageEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${user.username}'s Garage (${cars.length} cars)`)
            .setDescription(`Page ${page}/${maxPage}`)
            .setFooter({ text: `Use the buttons below to navigate pages` });
            
          // Add each car to the embed
          sortedCars.forEach(car => {
            const isActive = car.id === user.activeCarId;
            
            const rarityColors = {
              "Common": "🟢",
              "Uncommon": "🔵",
              "Rare": "🟣",
              "Epic": "🟠",
              "Legendary": "🟡",
              "Mythic": "⚪"
            };
            
            const rarityEmoji = rarityColors[car.rarity as keyof typeof rarityColors] || "⚪";
            
            garageEmbed.addFields({
              name: `${rarityEmoji} ${car.name} ${isActive ? "(Active)" : ""}`,
              value: `Type: ${car.type} | Rarity: ${car.rarity}\n` +
                    `Stats: Speed ${car.speed} | Accel ${car.acceleration} | Handling ${car.handling} | Boost ${car.boost}\n` +
                    `Value: ₵${car.value.toLocaleString()}\n` +
                    `Car ID: ${car.id}`
            });
          });
          
          // Create navigation buttons
          const navigationRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('first_page')
                .setLabel('<<')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 1),
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
              new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`${page}/${maxPage}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === maxPage),
              new ButtonBuilder()
                .setCustomId('last_page')
                .setLabel('>>')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === maxPage)
            );
            
          return { embeds: [garageEmbed], components: [navigationRow] };
        };
        
        // Send initial message
        const initialMessage = await safelySendMessage(message.channel, await displayGaragePage(currentPage));
        
        // Create collector for button interactions
        const filter = (i: any) => {
          return i.user.id === message.author.id && 
                 ['first_page', 'prev_page', 'next_page', 'last_page'].includes(i.customId);
        };
        
        const collector = initialMessage.createMessageComponentCollector({ 
          filter, 
          time: 120000 // 2 minutes
        });
        
        collector.on('collect', async (interaction: ButtonInteraction) => {
          // Update page based on button pressed
          if (interaction.customId === 'first_page') {
            currentPage = 1;
          } else if (interaction.customId === 'prev_page') {
            currentPage--;
          } else if (interaction.customId === 'next_page') {
            currentPage++;
          } else if (interaction.customId === 'last_page') {
            currentPage = maxPage;
          }
          
          // Update message
          await interaction.update(await displayGaragePage(currentPage));
        });
        
        collector.on('end', async () => {
          // Disable buttons when collector ends
          const disabledRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('first_page')
                .setLabel('<<')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`${currentPage}/${maxPage}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('last_page')
                .setLabel('>>')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
            
          try {
            if (initialMessage) {
              await initialMessage.edit({ components: [disabledRow] });
            }
          } catch (error) {
            console.error("Failed to update message on collector end:", error);
          }
        });
      }
    },
    // Set active car command
    {
      name: "setactive",
      description: "Set your active car for racing",
      usage: "<car_id>",
      args: true,
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        const carId = parseInt(args[0]);
        
        if (isNaN(carId)) {
          return message.reply("Please provide a valid car ID! Use `!garage` to see your cars and their IDs.");
        }
        
        // Check if user owns the car
        const car = await storage.getCar(carId);
        
        if (!car || car.userId !== user.id) {
          return message.reply("You don't own a car with that ID!");
        }
        
        // Update active car
        await storage.updateUser(user.id, { activeCarId: carId });
        
        const carEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Active Car Updated")
          .setDescription(`Your active car has been set to ${car.name}!`)
          .addFields(
            { name: "Type", value: car.type, inline: true },
            { name: "Rarity", value: car.rarity, inline: true },
            { name: "Stats", value: `Speed: ${car.speed} | Accel: ${car.acceleration} | Handling: ${car.handling} | Boost: ${car.boost}` }
          );
          
        // No longer using car images
        
        await safelySendMessage(message.channel, { embeds: [carEmbed] });
      }
    },
    // Car info command
    {
      name: "car",
      description: "Get detailed information about a car",
      usage: "<car_id>",
      args: true,
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const carId = parseInt(args[0]);
        
        if (isNaN(carId)) {
          return message.reply("Please provide a valid car ID!");
        }
        
        // Get car info
        const car = await storage.getCar(carId);
        
        if (!car) {
          return message.reply("Car not found! Use `!garage` to see your cars and their IDs.");
        }
        
        // Get car owner
        const owner = await storage.getUser(car.userId);
        
        if (!owner) {
          return message.reply("Could not find the car's owner.");
        }
        
        // Check if request is from owner or for public info
        if (car.userId !== (await storage.getUserByDiscordId(message.author.id))?.id) {
          // For non-owners, show limited info
          const publicEmbed = new EmbedBuilder()
            .setColor(getCarRarityColor(car))
            .setTitle(`${car.name}`)
            .setDescription(`Owned by ${owner.username}`)
            .addFields(
              { name: "Type", value: car.type, inline: true },
              { name: "Rarity", value: car.rarity, inline: true }
            );
            
          // No longer using car images
          
          return await safelySendMessage(message.channel, { embeds: [publicEmbed] });
        }
        
        // For owners, show full info
        const privateEmbed = new EmbedBuilder()
          .setColor(getCarRarityColor(car))
          .setTitle(`${car.name}`)
          .setDescription(`Your ${car.rarity} ${car.type} car`)
          .addFields(
            { name: "Type", value: car.type, inline: true },
            { name: "Rarity", value: car.rarity, inline: true },
            { name: "Value", value: `₵${car.value.toLocaleString()}`, inline: true },
            { name: "Stats", value: 
              `Speed: ${car.speed}/100 ${"▓".repeat(Math.floor(car.speed/10))}${"░".repeat(10-Math.floor(car.speed/10))}\n` +
              `Acceleration: ${car.acceleration}/100 ${"▓".repeat(Math.floor(car.acceleration/10))}${"░".repeat(10-Math.floor(car.acceleration/10))}\n` +
              `Handling: ${car.handling}/100 ${"▓".repeat(Math.floor(car.handling/10))}${"░".repeat(10-Math.floor(car.handling/10))}\n` +
              `Boost: ${car.boost}/100 ${"▓".repeat(Math.floor(car.boost/10))}${"░".repeat(10-Math.floor(car.boost/10))}`
            },
            { name: "Track Performance", value:
              `Street: ${evaluateTrackPerformance(car, "street")}\n` +
              `Circuit: ${evaluateTrackPerformance(car, "circuit")}\n` + 
              `Drag: ${evaluateTrackPerformance(car, "drag")}\n` +
              `Off-road: ${evaluateTrackPerformance(car, "offroad")}\n` +
              `Drift: ${evaluateTrackPerformance(car, "drift")}`
            },
            { name: "Acquired", value: car.acquired ? `<t:${Math.floor(new Date(car.acquired).getTime() / 1000)}:R>` : "Unknown" }
          )
          .setFooter({ text: `Car ID: ${car.id}` });
          
        // No longer using car images
        
        await safelySendMessage(message.channel, { embeds: [privateEmbed] });
      }
    },
    // Sell car command
    {
      name: "sell",
      description: "Sell one of your cars",
      usage: "<car_id>",
      args: true,
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        const carId = parseInt(args[0]);
        
        if (isNaN(carId)) {
          return message.reply("Please provide a valid car ID! Use `!garage` to see your cars and their IDs.");
        }
        
        // Check if user owns the car
        const car = await storage.getCar(carId);
        
        if (!car || car.userId !== user.id) {
          return message.reply("You don't own a car with that ID!");
        }
        
        // Check if it's the user's only car
        const userCars = await storage.getUserCars(user.id);
        
        if (userCars.length === 1) {
          return message.reply("You cannot sell your only car!");
        }
        
        // If selling active car, update user
        if (user.activeCarId === carId) {
          // Find another car to set as active
          const newActiveCar = userCars.find(c => c.id !== carId);
          await storage.updateUser(user.id, { 
            activeCarId: newActiveCar ? newActiveCar.id : null 
          });
        }
        
        // Update user balance
        const newBalance = user.balance + car.value;
        await storage.updateUser(user.id, { balance: newBalance });
        
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
        
        // Send confirmation
        const sellEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Car Sold")
          .setDescription(`You sold your ${car.rarity} ${car.name} for ₵${car.value.toLocaleString()}!`)
          .addFields(
            { name: "New Balance", value: `₵${newBalance.toLocaleString()}` },
            { name: "Cars Remaining", value: `${userCars.length - 1}` }
          );
          
        // No longer using car images
        
        await safelySendMessage(message.channel, { embeds: [sellEmbed] });
      }
    },
    // Gift car command
    {
      name: "giftcar",
      description: "Gift a car to another user",
      usage: "<@user>",
      args: true,
      cooldown: 3600, // 1 hour cooldown
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }

        if (!args[0]) {
          return message.reply("Please mention a user to gift a car to!");
        }

        // Get target user
        const targetId = args[0].replace(/[<@!>]/g, '');
        const targetUser = await storage.getUserByDiscordId(targetId);
        
        if (!targetUser) {
          return message.reply("That user hasn't registered yet!");
        }

        if (targetUser.id === user.id) {
          return message.reply("You can't gift a car to yourself!");
        }

        // Generate a random common car
        const newCar = generateRandomCar(targetUser.id, "COMMON");
        const car = await storage.createCar(newCar);

        // If user doesn't have an active car, set this as active
        if (!targetUser.activeCarId) {
          await storage.updateUser(targetUser.id, { activeCarId: car.id });
        }

        // Create activity log
        await storage.createActivityLog({
          type: "car_gifted",
          userId: user.id,
          targetId: targetUser.id,
          details: { 
            carId: car.id,
            carName: car.name,
            carRarity: car.rarity
          }
        });

        // Send confirmation
        const giftEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("🎁 Car Gifted!")
          .setDescription(`You gifted a ${car.rarity} ${car.name} to <@${targetId}>!`)
          .addFields(
            { 
              name: "Car Stats",
              value: `Type: ${car.type}\nSpeed: ${car.speed}/100\nAcceleration: ${car.acceleration}/100\nHandling: ${car.handling}/100\nBoost: ${car.boost}/100`
            }
          );

        await safelySendMessage(message.channel, { embeds: [giftEmbed] });
      }
    },

    // Keys command - Show user's car keys
    {
      name: "keys",
      description: "View your car keys",
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Get user's keys
        const keys = await storage.getUserKeys(user.id);
        
        if (keys.length === 0) {
          return message.reply("You don't have any car keys! You can get keys by winning races or buying them from the shop.");
        }
        
        // Create keys embed
        const keysEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`${user.username}'s Car Keys`)
          .setDescription("Use these keys to unlock new cars! Each key type has a chance to give you cars of different rarities.")
          .setFooter({ text: "Use !usekey <key_type> to use a key and get a new car" });
          
        // Add each key to the embed with proper formatting
        keys.forEach(key => {
          const keyInfo = CAR_KEYS[key.keyType as keyof typeof CAR_KEYS];
          let keyColor = "⚪"; // Default color
          
          // Set key color based on rarity
          switch(key.keyType) {
            case "STANDARD":
              keyColor = "🔵";
              break;
            case "PREMIUM":
              keyColor = "🟣";
              break;
            case "LEGENDARY":
              keyColor = "🟡";
              break;
            case "MYTHIC":
              keyColor = "🔴";
              break;
          }
          
          keysEmbed.addFields({
            name: `${keyColor} ${keyInfo?.name || key.keyType} Key (${key.quantity})`,
            value: `${keyInfo?.description || "Opens a random car of varying rarity"}\nUse: \`!usekey ${key.keyType.toLowerCase()}\``
          });
        });
        
        await safelySendMessage(message.channel, { embeds: [keysEmbed] });
      }
    },
    // Use key command
    {
      name: "usekey",
      description: "Use a car key to get a new car",
      usage: "<key_type>",
      args: true,
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        const keyType = args[0].toUpperCase();
        
        // Validate key type
        if (!Object.keys(CAR_KEYS).includes(keyType)) {
          return message.reply(`Invalid key type! Available key types: ${Object.keys(CAR_KEYS).map(k => k.toLowerCase()).join(", ")}`);
        }
        
        // Check if user has the key
        const keyUsed = await storage.useKey(user.id, keyType);
        
        if (!keyUsed) {
          return message.reply(`You don't have any ${CAR_KEYS[keyType as keyof typeof CAR_KEYS]?.name || keyType} keys! Check your keys with \`!keys\`.`);
        }
        
        // Generate a car with the key
        const newCar = generateCarWithKey(user.id, keyType as keyof typeof CAR_KEYS);
        const car = await storage.createCar(newCar);
        
        // Log activity
        await storage.createActivityLog({
          userId: user.id,
          type: "CAR_KEY_USED",
          details: { keyType, carId: car.id, carName: car.name, rarity: car.rarity }
        });
        
        // Create success embed
        const successEmbed = new EmbedBuilder()
          .setColor(getCarRarityColor(car))
          .setTitle(`🔑 New Car Unlocked!`)
          .setDescription(`You used a ${CAR_KEYS[keyType as keyof typeof CAR_KEYS]?.name || keyType} Key and received a ${car.rarity} ${car.name}!`)
          .addFields(
            { name: "Type", value: car.type, inline: true },
            { name: "Rarity", value: car.rarity, inline: true },
            { name: "Value", value: `₵${car.value.toLocaleString()}`, inline: true },
            { name: "Stats", value: 
              `Speed: ${car.speed}\n` +
              `Acceleration: ${car.acceleration}\n` +
              `Handling: ${car.handling}\n` +
              `Boost: ${car.boost}\n`
            }
          )
          .setFooter({ text: `Car ID: ${car.id} - Add to your active car with !setactive ${car.id}` });
          
        // No longer using car images
        
        await safelySendMessage(message.channel, { embeds: [successEmbed] });
      }
    },
    // Key info command
    {
      name: "keyinfo",
      description: "Learn about different car keys and their chances",
      cooldown: 5,
      aliases: ["keyguide"],
      async execute(message: Message, args: string[], storage: IStorage) {
        // Create keys info embed
        const keyInfoEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("Car Keys Information")
          .setDescription("Keys are special items that unlock new cars of varying rarities. Each key type gives you different chances for rare cars.");
          
        // Add details for each key type
        Object.entries(CAR_KEYS).forEach(([keyType, keyData]) => {
          let keyColor = "⚪"; // Default color
          
          // Set key color based on rarity
          switch(keyType) {
            case "STANDARD":
              keyColor = "🔵";
              break;
            case "PREMIUM":
              keyColor = "🟣";
              break;
            case "LEGENDARY":
              keyColor = "🟡";
              break;
            case "MYTHIC":
              keyColor = "🔴";
              break;
          }
          
          // Calculate and format chances based on rarity boosts
          let rarityChances = "";
          let totalChance = 0;
          const boostMultipliers = keyData.rarityBoosts;
          
          // Calculate base chances using rarityBoosts
          const baseChances: Record<string, number> = {};
          Object.entries(CAR_RARITIES).forEach(([rarityKey, rarityData]: [string, any]) => {
            const typedRarityKey = rarityKey as keyof typeof CAR_RARITIES;
            const rarityBoost = boostMultipliers[typedRarityKey];
            const boostedChance = rarityData.chance * rarityBoost;
            baseChances[rarityKey] = boostedChance;
            totalChance += boostedChance;
          });
          
          // Normalize and format chances
          Object.entries(CAR_RARITIES).forEach(([rarityKey, rarityData]: [string, any]) => {
            const normalizedChance = (baseChances[rarityKey] / totalChance) * 100;
            rarityChances += `${rarityData.name}: ${normalizedChance.toFixed(1)}%\n`;
          });
          
          keyInfoEmbed.addFields({
            name: `${keyColor} ${keyData.name} (₵${keyData.price.toLocaleString()})`,
            value: `${keyData.description}\n\n**Rarity Chances:**\n${rarityChances}`
          });
        });
        
        // Add guide on how to get keys
        keyInfoEmbed.addFields({
          name: "How to Get Keys",
          value: "- Purchase from shop (!shop)\n- Win races (5% chance on win)\n- Daily rewards\n- Special events\n\nUse `!usekey <type>` to use a key!"
        });
        
        await safelySendMessage(message.channel, { embeds: [keyInfoEmbed] });
      }
    },
    // Inventory command (combines cars and keys)
    {
      name: "inventory",
      description: "View your cars and keys in one place",
      cooldown: 5,
      aliases: ["inv"],
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Get user's cars and keys
        const cars = await storage.getUserCars(user.id);
        const keys = await storage.getUserKeys(user.id);
        
        if (cars.length === 0 && keys.length === 0) {
          return message.reply("Your inventory is empty! Use `!shop` to browse available cars and keys.");
        }
        
        // Create inventory embed
        const inventoryEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`${user.username}'s Inventory`)
          .setDescription(`Balance: ₵${user.balance.toLocaleString()}`)
          .setFooter({ text: "Use !garage for detailed car list and !keys for detailed key list" });
        
        // Add car summary section
        if (cars.length > 0) {
          // Count cars by rarity
          const carsByRarity: Record<string, number> = {
            "Common": 0,
            "Uncommon": 0,
            "Rare": 0,
            "Epic": 0, 
            "Legendary": 0,
            "Mythic": 0
          };
          
          cars.forEach(car => {
            if (car.rarity in carsByRarity) {
              carsByRarity[car.rarity]++;
            }
          });
          
          // Get active car
          const activeCar = cars.find(car => car.id === user.activeCarId);
          
          let carSummary = `Total Cars: ${cars.length}\n`;
          carSummary += Object.entries(carsByRarity)
            .filter(([_, count]) => count > 0)
            .map(([rarity, count]) => {
              const rarityEmojis: Record<string, string> = {
                "Common": "🟢",
                "Uncommon": "🔵",
                "Rare": "🟣",
                "Epic": "🟠", 
                "Legendary": "🟡",
                "Mythic": "🔴"
              };
              return `${rarityEmojis[rarity] || "⚪"} ${rarity}: ${count}`;
            })
            .join("\n");
          
          inventoryEmbed.addFields({
            name: "🚗 Cars",
            value: carSummary
          });
          
          if (activeCar) {
            inventoryEmbed.addFields({
              name: "🏁 Active Car",
              value: `${activeCar.name} (${activeCar.rarity})\nType: ${activeCar.type}\nValue: ₵${activeCar.value.toLocaleString()}`
            });
            
            // Removed image reference - no longer needed
          }
        } else {
          inventoryEmbed.addFields({
            name: "🚗 Cars",
            value: "You don't have any cars yet! Use `!usekey` to open a car key or buy from `!shop`."
          });
        }
        
        // Add keys summary section
        if (keys.length > 0) {
          let keySummary = "";
          
          keys.forEach(key => {
            const keyInfo = CAR_KEYS[key.keyType as keyof typeof CAR_KEYS];
            let keyColor = "⚪"; // Default color
            
            // Set key color based on rarity
            switch(key.keyType) {
              case "STANDARD":
                keyColor = "🔵";
                break;
              case "PREMIUM":
                keyColor = "🟣";
                break;
              case "LEGENDARY":
                keyColor = "🟡";
                break;
              case "MYTHIC":
                keyColor = "🔴";
                break;
            }
            
            keySummary += `${keyColor} ${keyInfo ? keyInfo.name : key.keyType} Key: ${key.quantity}\n`;
          });
          
          if (keySummary) {
            inventoryEmbed.addFields({
              name: "🔑 Keys",
              value: keySummary + "\nUse `!usekey <type>` to open a key!"
            });
          }
        } else {
          inventoryEmbed.addFields({
            name: "🔑 Keys",
            value: "You don't have any keys! Win them in races or buy with `!buykey`."
          });
        }
        
        await safelySendMessage(message.channel, { embeds: [inventoryEmbed] });
      }
    },
    // Trade car command
    {
      name: "trade",
      description: "Trade a car with another user",
      args: true,
      usage: "<user> <car_id>",
      cooldown: 60, // Cooldown to prevent abuse
      async execute(message: Message, args: string[], storage: IStorage) {
        if (args.length < 2) {
          return message.reply("Please specify a user and a car ID. Usage: `!trade <user> <car_id>`");
        }
        
        // Get target user from first argument (username without @ symbol)
        const targetUsername = args[0];
        // Get car ID from second argument
        const carId = parseInt(args[1]);
        
        if (isNaN(carId)) {
          return message.reply("Please provide a valid car ID. Usage: `!trade <user> <car_id>`");
        }
        
        // Find the user in the guild
        const guildMembers = await message.guild?.members.fetch();
        const targetMember = guildMembers?.find(member => 
          member.user.username.toLowerCase() === targetUsername.toLowerCase() ||
          member.displayName.toLowerCase() === targetUsername.toLowerCase()
        );
        
        if (!targetMember) {
          return message.reply(`Could not find user "${targetUsername}" in this server.`);
        }
        
        const mentionedUser = targetMember.user;
        
        // Check that the mentioned user is not the message author
        if (mentionedUser.id === message.author.id) {
          return message.reply("You cannot trade with yourself.");
        }
        
        if (carId === undefined) {
          return message.reply("Please provide a valid car ID to trade.");
        }

        // Get both users from database
        const sender = await storage.getUserByDiscordId(message.author.id);
        const receiver = await storage.getUserByDiscordId(mentionedUser.id);
        
        if (!sender) {
          return message.reply("You need to be registered to trade cars. Use the `!register` command first.");
        }
        
        if (!receiver) {
          return message.reply("The user you mentioned is not registered in the bot.");
        }
        
        // Check if the sender owns the car
        const car = await storage.getCar(carId);
        if (!car) {
          return message.reply(`Car with ID ${carId} does not exist.`);
        }
        
        if (car.userId !== sender.id) {
          return message.reply("You do not own this car.");
        }
        
        // Check if car is the active car
        if (sender.activeCarId === car.id) {
          return message.reply("You cannot trade your active car. Please select a different active car with `!setcar` first.");
        }
        
        // Create confirmation message with buttons
        const carEmbed = new EmbedBuilder()
          .setTitle(`🔄 Car Trade Offer`)
          .setDescription(`<@${sender.discordId}> wants to trade their ${car.name} with <@${receiver.discordId}>.`)
          .addFields(
            { name: 'Car Details', value: `**${car.name}** (ID: ${car.id})` },
            { name: 'Stats', value: `🏎️ Speed: ${car.speed} | ⚡ Acceleration: ${car.acceleration} | 🛞 Handling: ${car.handling} | 🔋 Boost: ${car.boost}` },
            { name: 'Rarity', value: `${car.rarity}` },
            { name: 'Value', value: `${car.value.toLocaleString()} credits` }
          )
          .setColor(getCarRarityColor(car))
          .setFooter({ text: 'This trade offer is valid for 2 minutes.' });
        
        // Create buttons for accept/reject
        const acceptButton = new ButtonBuilder()
          .setCustomId('accept_trade')
          .setLabel('Accept Trade')
          .setStyle(ButtonStyle.Success);
          
        const rejectButton = new ButtonBuilder()
          .setCustomId('reject_trade')
          .setLabel('Reject Trade')
          .setStyle(ButtonStyle.Danger);
          
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(acceptButton, rejectButton);
        
        // Send the trade offer
        const offerMessage = await message.channel.send({
          content: `<@${receiver.discordId}>, you have a trade offer!`,
          embeds: [carEmbed],
          components: [row]
        });
        
        // Create button collector
        const filter = (i: ButtonInteraction) => {
          return ['accept_trade', 'reject_trade'].includes(i.customId) && 
                 i.user.id === mentionedUser.id;
        };
        
        const collector = offerMessage.createMessageComponentCollector({ 
          filter, 
          time: 120000 // 2 minutes
        });
        
        collector.on('collect', async (interaction: ButtonInteraction) => {
          // Handle responses
          if (interaction.customId === 'accept_trade') {
            // Verify car ownership again, in case it changed during the offer period
            const updatedCar = await storage.getCar(carId);
            if (!updatedCar || updatedCar.userId !== sender.id) {
              await interaction.update({
                content: "⚠️ This trade is no longer valid because the car's ownership has changed.",
                embeds: [],
                components: []
              });
              return;
            }
            
            // Transfer car ownership
            await storage.updateCar(car.id, { userId: receiver.id });
            
            // Log the trade
            await storage.createActivityLog({
              type: "car_traded",
              userId: sender.id,
              targetId: receiver.id,
              details: {
                carId: car.id,
                carName: car.name,
                carValue: car.value,
                carRarity: car.rarity
              }
            });
            
            // Update embed
            const updatedEmbed = EmbedBuilder.from(carEmbed.data)
              .setTitle('🔄 Trade Completed')
              .setDescription(`<@${receiver.discordId}> has accepted the trade offer from <@${sender.discordId}>!`)
              .setColor(0x00FF00)
              .setFooter({ text: `Trade completed at ${new Date().toLocaleString()}` });
            
            await interaction.update({
              embeds: [updatedEmbed],
              components: [] // Remove buttons
            });
            
            // Send confirmation messages
            await message.channel.send({
              content: `🎉 <@${sender.discordId}> has traded their ${car.name} to <@${receiver.discordId}>!`
            });
            
          } else if (interaction.customId === 'reject_trade') {
            // Update embed
            const rejectedEmbed = EmbedBuilder.from(carEmbed.data)
              .setTitle('❌ Trade Rejected')
              .setDescription(`<@${receiver.discordId}> has rejected the trade offer.`)
              .setColor(0xFF0000)
              .setFooter({ text: `Trade rejected at ${new Date().toLocaleString()}` });
            
            await interaction.update({
              embeds: [rejectedEmbed],
              components: [] // Remove buttons
            });
          }
        });
        
        collector.on('end', async (collected, reason) => {
          if (reason === 'time' && collected.size === 0) {
            // Trade expired
            const expiredEmbed = EmbedBuilder.from(carEmbed.data)
              .setTitle('⏰ Trade Expired')
              .setDescription('This trade offer has expired.')
              .setColor(0x888888)
              .setFooter({ text: 'Trade offers expire after 2 minutes of inactivity.' });
            
            await offerMessage.edit({
              embeds: [expiredEmbed],
              components: [] // Remove buttons
            });
          }
        });
      }
    },
    // Gift car command
    {
      name: "gift",
      description: "Gift a car to another user",
      args: true,
      usage: "<@user> <car_id>",
      cooldown: 60, // Cooldown to prevent abuse
      async execute(message: Message, args: string[], storage: IStorage) {
        if (args.length < 2) {
          return message.reply("Please mention a user and specify a car ID to gift.");
        }
        
        // Extract mentioned user
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
          return message.reply("Please mention a user to gift a car to.");
        }
        
        // Check that the mentioned user is not the message author
        if (mentionedUser.id === message.author.id) {
          return message.reply("You cannot gift a car to yourself.");
        }
        
        // Get car ID from args (should be the second argument, after the mention)
        let carId: number | undefined;
        // Try to find the car ID in args (it might not be the second argument if there are spaces in the mention)
        for (const arg of args) {
          const parsedId = parseInt(arg);
          if (!isNaN(parsedId)) {
            carId = parsedId;
            break;
          }
        }
        
        if (carId === undefined) {
          return message.reply("Please provide a valid car ID to gift.");
        }

        // Get both users from database
        const sender = await storage.getUserByDiscordId(message.author.id);
        const receiver = await storage.getUserByDiscordId(mentionedUser.id);
        
        if (!sender) {
          return message.reply("You need to be registered to gift cars. Use the `!register` command first.");
        }
        
        if (!receiver) {
          return message.reply("The user you mentioned is not registered in the bot.");
        }
        
        // Check if the sender owns the car
        const car = await storage.getCar(carId);
        if (!car) {
          return message.reply(`Car with ID ${carId} does not exist.`);
        }
        
        if (car.userId !== sender.id) {
          return message.reply("You do not own this car.");
        }
        
        // Check if car is the active car
        if (sender.activeCarId === car.id) {
          return message.reply("You cannot gift your active car. Please select a different active car with `!setcar` first.");
        }
        
        // Create confirmation button
        const confirmButton = new ButtonBuilder()
          .setCustomId('confirm_gift')
          .setLabel('Confirm Gift')
          .setStyle(ButtonStyle.Success);
          
        const cancelButton = new ButtonBuilder()
          .setCustomId('cancel_gift')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger);
          
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(confirmButton, cancelButton);
          
        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
          .setTitle('🎁 Confirm Car Gift')
          .setDescription(`Are you sure you want to gift your ${car.rarity} ${car.name} to <@${receiver.discordId}>?\n\nThis action cannot be undone!`)
          .addFields(
            { name: 'Car Details', value: `**${car.name}** (ID: ${car.id})` },
            { name: 'Stats', value: `🏎️ Speed: ${car.speed} | ⚡ Acceleration: ${car.acceleration} | 🛞 Handling: ${car.handling} | 🔋 Boost: ${car.boost}` },
            { name: 'Rarity', value: `${car.rarity}` },
            { name: 'Value', value: `${car.value.toLocaleString()} credits` }
          )
          .setColor(getCarRarityColor(car))
          .setFooter({ text: 'This confirmation will expire in 30 seconds.' });
          
        // Send confirmation message
        const confirmMsg = await message.channel.send({
          content: `<@${sender.discordId}>, please confirm:`,
          embeds: [confirmEmbed],
          components: [row]
        });
        
        // Create collector
        const filter = (i: ButtonInteraction) => {
          return ['confirm_gift', 'cancel_gift'].includes(i.customId) && 
                 i.user.id === message.author.id;
        };
        
        const collector = confirmMsg.createMessageComponentCollector({ 
          filter, 
          time: 30000 // 30 seconds
        });
        
        collector.on('collect', async (interaction: ButtonInteraction) => {
          if (interaction.customId === 'confirm_gift') {
            // Verify car ownership again, in case it changed during the confirmation period
            const updatedCar = await storage.getCar(carId);
            if (!updatedCar || updatedCar.userId !== sender.id) {
              await interaction.update({
                content: "⚠️ You no longer own this car. The gift has been cancelled.",
                embeds: [],
                components: []
              });
              return;
            }
            
            // Transfer car ownership
            await storage.updateCar(car.id, { userId: receiver.id });
            
            // Log the gift
            await storage.createActivityLog({
              type: "car_gifted",
              userId: sender.id,
              targetId: receiver.id,
              details: {
                carId: car.id,
                carName: car.name,
                carValue: car.value,
                carRarity: car.rarity
              }
            });
            
            // Create gift message with embed
            const giftEmbed = new EmbedBuilder()
              .setTitle(`🎁 Car Gift`)
              .setDescription(`<@${sender.discordId}> has gifted their ${car.name} to <@${receiver.discordId}>!`)
              .addFields(
                { name: 'Car Details', value: `**${car.name}** (ID: ${car.id})` },
                { name: 'Stats', value: `🏎️ Speed: ${car.speed} | ⚡ Acceleration: ${car.acceleration} | 🛞 Handling: ${car.handling} | 🔋 Boost: ${car.boost}` },
                { name: 'Rarity', value: `${car.rarity}` },
                { name: 'Value', value: `${car.value.toLocaleString()} credits` }
              )
              .setColor(getCarRarityColor(car))
              .setFooter({ text: `Gift sent on ${new Date().toLocaleString()}` });
            
            // Update confirmation message
            await interaction.update({
              content: `🎁 Gift confirmed!`,
              embeds: [giftEmbed],
              components: []
            });
            
            // Send DM to receiver if possible
            try {
              await mentionedUser.send({
                content: `🎁 **Gift Alert!** 🎁\n<@${sender.discordId}> has gifted you a ${car.rarity} ${car.name}! Check your garage with \`!cars\`.`,
                embeds: [giftEmbed]
              });
            } catch (error) {
              // DM failed, but the gift was successful, so just continue
              console.log(`Failed to send DM to ${mentionedUser.tag}`);
            }
          } else if (interaction.customId === 'cancel_gift') {
            // Cancel the gift
            await interaction.update({
              content: `Gift cancelled.`,
              embeds: [],
              components: []
            });
          }
        });
        
        collector.on('end', async (collected, reason) => {
          if (reason === 'time' && collected.size === 0) {
            // Gift confirmation expired
            await confirmMsg.edit({
              content: `⏰ Gift confirmation expired.`,
              embeds: [],
              components: []
            });
          }
        });
      }
    },
    // Customize car command
    {
      name: "customize",
      aliases: ["customise", "paint", "design"],
      description: "Customize your car's appearance",
      args: true,
      usage: "<car_id> <option> <value>",
      cooldown: 10,
      async execute(message: Message, args: string[], storage: IStorage) {
        if (args.length < 3) {
          const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🎨 Car Customization")
            .setDescription("Customize the appearance of your cars!")
            .addFields(
              {
                name: "Usage",
                value: "`!customize <car_id> <option> <value>`"
              },
              {
                name: "Available Options",
                value: "- `name` - Give your car a custom name\n" +
                       "- `primarycolor` - Set the primary color (e.g., red, blue, #FF0000)\n" +
                       "- `secondarycolor` - Set the secondary/accent color\n" +
                       "- `neoncolor` - Add undercar neon lights\n" +
                       "- `plate` - Customize license plate text (max 8 chars)\n" +
                       "- `emoji` - Add an emoji to your car's display\n"
              },
              {
                name: "Examples",
                value: "`!customize 5 name Speed Demon`\n" +
                       "`!customize 5 primarycolor red`\n" +
                       "`!customize 5 emoji 🔥`\n" +
                       "`!customize 5 plate RACR123`"
              }
            )
            .setFooter({ text: "Car customization costs credits based on the car's rarity." });
            
          return safelySendMessage(message.channel, { embeds: [helpEmbed] });
        }
        
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        const carId = parseInt(args[0]);
        
        if (isNaN(carId)) {
          return message.reply("Please provide a valid car ID!");
        }
        
        const option = args[1].toLowerCase();
        
        // Extract the value (everything after the option)
        const value = args.slice(2).join(" ");
        
        // Check if the car exists and belongs to the user
        const car = await storage.getCar(carId);
        
        if (!car) {
          return message.reply(`No car found with ID ${carId}.`);
        }
        
        if (car.userId !== user.id) {
          return message.reply("You don't own that car!");
        }
        
        // Set customization costs based on car rarity
        const customizationCosts = {
          "Common": 1000,
          "Uncommon": 2500,
          "Rare": 5000,
          "Epic": 10000,
          "Legendary": 25000,
          "Mythic": 50000
        };
        
        const cost = customizationCosts[car.rarity as keyof typeof customizationCosts] || 2500;
        
        // Check if user has enough credits
        if (user.balance < cost) {
          return message.reply(`You don't have enough credits for this customization. Cost: ${cost} credits.`);
        }
        
        let updateData: Partial<Car> = {};
        let customizationType = "";
        let validChange = true;
        
        switch (option) {
          case "name":
          case "customname":
            if (value.length > 30) {
              return message.reply("Car name must be 30 characters or less.");
            }
            updateData.customName = value;
            customizationType = "name";
            break;
            
          case "primarycolor":
          case "primary":
          case "color":
          case "colour":
            updateData.primaryColor = value;
            customizationType = "primary color";
            break;
            
          case "secondarycolor":
          case "secondary":
          case "accent":
          case "accentcolor":
            updateData.secondaryColor = value;
            customizationType = "secondary color";
            break;
            
          case "neoncolor":
          case "neon":
          case "underbody":
            updateData.neonColor = value;
            customizationType = "neon lights";
            break;
            
          case "plate":
          case "licenseplate":
          case "license":
            if (value.length > 8) {
              return message.reply("License plate must be 8 characters or less.");
            }
            updateData.licensePlate = value.toUpperCase();
            customizationType = "license plate";
            break;
            
          case "emoji":
          case "icon":
            // Simple emoji length check (not perfect but will work for most cases)
            if (value.length > 2) {
              return message.reply("Please provide a single emoji.");
            }
            updateData.customEmoji = value;
            customizationType = "display emoji";
            break;
            
          default:
            validChange = false;
            return message.reply("Invalid customization option. Use `!customize` for help.");
        }
        
        if (validChange) {
          // Update the car
          await storage.updateCar(car.id, updateData);
          
          // Deduct the cost
          await storage.updateUser(user.id, { balance: user.balance - cost });
          
          // Create transaction
          await storage.createTransaction({
            userId: user.id,
            type: "purchase",
            amount: -cost,
            description: `Car customization: ${customizationType}`,
            relatedId: car.id
          });
          
          // Create activity log
          await storage.createActivityLog({
            type: "car_customized",
            userId: user.id,
            details: {
              carId: car.id,
              carName: car.name,
              customizationType: customizationType,
              customizationValue: value,
              cost: cost
            }
          });
          
          // Get display name
          const displayName = car.customName || car.name;
          
          // Create confirmation embed
          const confirmEmbed = new EmbedBuilder()
            .setColor(getCarRarityColor(car))
            .setTitle("🎨 Car Customized")
            .setDescription(`You've customized your ${car.rarity} ${displayName}!`)
            .addFields(
              { name: "Customization", value: `Changed ${customizationType} to: ${value}` },
              { name: "Cost", value: `${cost.toLocaleString()} credits` }
            )
            .setFooter({ text: `Car ID: ${car.id}` });
            
          safelySendMessage(message.channel, { embeds: [confirmEmbed] });
        }
      }
    },
    // Showdown command - Car comparison challenge without betting
    {
      name: "showdown",
      aliases: ["compare", "versus", "vs"],
      description: "Challenge another user to a car showdown without betting",
      args: true,
      usage: "<@user> <car_id> <track_type>",
      cooldown: 30,
      async execute(message: Message, args: string[], storage: IStorage) {
        if (args.length < 2) {
          return message.reply("Please mention a user and specify your car ID for the showdown.");
        }
        
        // Extract mentioned user
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
          return message.reply("Please mention a user to challenge to a showdown.");
        }
        
        // Check that the mentioned user is not the message author
        if (mentionedUser.id === message.author.id) {
          return message.reply("You cannot challenge yourself to a showdown.");
        }
        
        // Get challenger's car ID from args
        let carId: number | undefined;
        for (const arg of args) {
          const parsedId = parseInt(arg);
          if (!isNaN(parsedId)) {
            carId = parsedId;
            break;
          }
        }
        
        if (carId === undefined) {
          return message.reply("Please provide a valid car ID for the showdown.");
        }

        // Get track type if provided, otherwise use random track
        const trackTypes = ["street", "circuit", "drag", "offroad", "drift"];
        let trackType = trackTypes[Math.floor(Math.random() * trackTypes.length)];
        
        // Check if a track type was provided
        for (const arg of args) {
          const lowercaseArg = arg.toLowerCase();
          if (trackTypes.includes(lowercaseArg)) {
            trackType = lowercaseArg;
            break;
          }
        }
        
        // Get both users from database
        const challenger = await storage.getUserByDiscordId(message.author.id);
        const opponent = await storage.getUserByDiscordId(mentionedUser.id);
        
        if (!challenger) {
          return message.reply("You need to be registered to challenge someone. Use the `!register` command first.");
        }
        
        if (!opponent) {
          return message.reply("The user you mentioned is not registered in the bot.");
        }
        
        // Check if the challenger owns the car
        const challengerCar = await storage.getCar(carId);
        if (!challengerCar) {
          return message.reply(`Car with ID ${carId} does not exist.`);
        }
        
        if (challengerCar.userId !== challenger.id) {
          return message.reply("You do not own this car.");
        }
        
        // Check if opponent has an active car
        if (!opponent.activeCarId) {
          return message.reply(`${mentionedUser.username} doesn't have an active car selected.`);
        }
        
        // Get opponent's active car
        const opponentCar = await storage.getCar(opponent.activeCarId);
        if (!opponentCar) {
          return message.reply(`Couldn't find ${mentionedUser.username}'s active car.`);
        }
        
        // Create invitation embed
        const challengeEmbed = new EmbedBuilder()
          .setTitle(`🏁 Car Showdown Challenge`)
          .setDescription(`<@${challenger.discordId}> challenges <@${opponent.discordId}> to a car showdown on a ${trackType} track!`)
          .addFields(
            { 
              name: `${challenger.username}'s Car`, 
              value: `**${challengerCar.name}** (${challengerCar.rarity})\n` +
                     `Speed: ${challengerCar.speed} | Accel: ${challengerCar.acceleration}\n` +
                     `Handling: ${challengerCar.handling} | Boost: ${challengerCar.boost}` 
            },
            { 
              name: `${opponent.username}'s Car`, 
              value: `**${opponentCar.name}** (${opponentCar.rarity})\n` +
                     `Speed: ${opponentCar.speed} | Accel: ${opponentCar.acceleration}\n` +
                     `Handling: ${opponentCar.handling} | Boost: ${opponentCar.boost}` 
            },
            {
              name: "Track Type",
              value: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)}`
            }
          )
          .setColor(0x5865F2)
          .setFooter({ text: "This is just for fun - no credits are at stake!" });
          
        // Create buttons for accept/decline
        const acceptButton = new ButtonBuilder()
          .setCustomId('accept_showdown')
          .setLabel('Accept Showdown')
          .setStyle(ButtonStyle.Success);
          
        const declineButton = new ButtonBuilder()
          .setCustomId('decline_showdown')
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger);
          
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(acceptButton, declineButton);
          
        // Send the challenge
        const challengeMsg = await safelySendMessage(message.channel, {
          content: `<@${opponent.discordId}>, you've been challenged to a car showdown!`,
          embeds: [challengeEmbed],
          components: [row]
        });
        
        // Create button collector
        const filter = (i: ButtonInteraction) => {
          return ['accept_showdown', 'decline_showdown'].includes(i.customId) && 
                 i.user.id === mentionedUser.id;
        };
        
        const collector = challengeMsg.createMessageComponentCollector({ 
          filter, 
          time: 60000 // 1 minute
        });
        
        collector.on('collect', async (interaction: ButtonInteraction) => {
          if (interaction.customId === 'accept_showdown') {
            // Calculate results
            const trackTypeFormatted = trackType.charAt(0).toUpperCase() + trackType.slice(1);
            const challengerPerformance = evaluateTrackPerformance(challengerCar, trackType);
            const opponentPerformance = evaluateTrackPerformance(opponentCar, trackType);
            
            // Calculate scores
            let challengerScore = 0;
            let opponentScore = 0;
            
            switch(trackType.toLowerCase()) {
              case "street":
                challengerScore = (challengerCar.speed * 0.3) + (challengerCar.acceleration * 0.3) + 
                                  (challengerCar.handling * 0.25) + (challengerCar.boost * 0.15);
                opponentScore = (opponentCar.speed * 0.3) + (opponentCar.acceleration * 0.3) + 
                                (opponentCar.handling * 0.25) + (opponentCar.boost * 0.15);
                break;
              case "circuit":
                challengerScore = (challengerCar.speed * 0.25) + (challengerCar.acceleration * 0.15) + 
                                  (challengerCar.handling * 0.45) + (challengerCar.boost * 0.15);
                opponentScore = (opponentCar.speed * 0.25) + (opponentCar.acceleration * 0.15) + 
                                (opponentCar.handling * 0.45) + (opponentCar.boost * 0.15);
                break;
              case "drag":
                challengerScore = (challengerCar.speed * 0.45) + (challengerCar.acceleration * 0.4) + 
                                  (challengerCar.handling * 0.05) + (challengerCar.boost * 0.1);
                opponentScore = (opponentCar.speed * 0.45) + (opponentCar.acceleration * 0.4) + 
                                (opponentCar.handling * 0.05) + (opponentCar.boost * 0.1);
                break;
              case "offroad":
                challengerScore = (challengerCar.speed * 0.15) + (challengerCar.acceleration * 0.2) + 
                                  (challengerCar.handling * 0.3) + (challengerCar.boost * 0.35);
                opponentScore = (opponentCar.speed * 0.15) + (opponentCar.acceleration * 0.2) + 
                                (opponentCar.handling * 0.3) + (opponentCar.boost * 0.35);
                break;
              case "drift":
                challengerScore = (challengerCar.speed * 0.2) + (challengerCar.acceleration * 0.15) + 
                                  (challengerCar.handling * 0.5) + (challengerCar.boost * 0.15);
                opponentScore = (opponentCar.speed * 0.2) + (opponentCar.acceleration * 0.15) + 
                                (opponentCar.handling * 0.5) + (opponentCar.boost * 0.15);
                break;
            }
            
            // Add randomness
            challengerScore += (Math.random() * 25) - 5; // -5 to +20 random factor
            opponentScore += (Math.random() * 25) - 5;
            
            // Determine winner
            let winner: string;
            let winnerCar: Car;
            let loserCar: Car;
            if (challengerScore > opponentScore) {
              winner = challenger.username;
              winnerCar = challengerCar;
              loserCar = opponentCar;
            } else {
              winner = opponent.username;
              winnerCar = opponentCar;
              loserCar = challengerCar;
            }
            
            // Calculate winning margin
            const marginPercent = Math.abs((challengerScore - opponentScore) / ((challengerScore + opponentScore) / 2) * 100);
            let marginText: string;
            
            if (marginPercent < 5) {
              marginText = "by a hair";
            } else if (marginPercent < 15) {
              marginText = "by a small margin";
            } else if (marginPercent < 30) {
              marginText = "comfortably";
            } else {
              marginText = "by a landslide";
            }
            
            // Generate random race events
            const eventTypes = [
              "overtake", "drift", "boost", "corner", "straightaway"
            ];
            
            const events = [];
            const numEvents = 2 + Math.floor(Math.random() * 2); // 2-3 events
            
            for (let i = 0; i < numEvents; i++) {
              const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
              const driver = Math.random() > 0.5 ? challenger.username : opponent.username;
              
              let eventText = "";
              switch(eventType) {
                case "overtake":
                  eventText = `${driver} executed a perfect overtake on the ${Math.random() > 0.5 ? "inside" : "outside"}!`;
                  break;
                case "drift":
                  eventText = `${driver} performed an amazing drift through the corner!`;
                  break;
                case "boost":
                  eventText = `${driver} activated turbo boost and gained ground!`;
                  break;
                case "corner":
                  eventText = `${driver} braked late and ${Math.random() > 0.7 ? "almost lost control!" : "took the perfect racing line!"}`;
                  break;
                case "straightaway":
                  eventText = `${driver} maxed out on the straightaway reaching top speed!`;
                  break;
              }
              events.push(eventText);
            }
            
            // Create result embed
            const resultEmbed = new EmbedBuilder()
              .setTitle(`🏁 Showdown Results: ${trackTypeFormatted} Track`)
              .setDescription(`The showdown between <@${challenger.discordId}> and <@${opponent.discordId}> is complete!`)
              .addFields(
                { 
                  name: `${challenger.username}'s ${challengerCar.name}`, 
                  value: `Performance: ${challengerPerformance}\nScore: ${Math.floor(challengerScore)}` 
                },
                { 
                  name: `${opponent.username}'s ${opponentCar.name}`, 
                  value: `Performance: ${opponentPerformance}\nScore: ${Math.floor(opponentScore)}` 
                },
                {
                  name: "Race Highlights",
                  value: events.join("\n")
                },
                {
                  name: "Result",
                  value: `🏆 **${winner} wins ${marginText}!**`
                }
              )
              .setColor(getCarRarityColor(winnerCar))
              .setFooter({ text: "Friendly showdown - No credits exchanged" });
              
            await interaction.update({
              content: null,
              embeds: [resultEmbed],
              components: []
            });
            
            // Log the showdown
            await storage.createActivityLog({
              type: "car_showdown",
              userId: challenger.id,
              targetId: opponent.id,
              details: {
                challengerCarId: challengerCar.id,
                opponentCarId: opponentCar.id,
                trackType: trackType,
                winner: winner === challenger.username ? challenger.id : opponent.id,
                challengerScore: Math.floor(challengerScore),
                opponentScore: Math.floor(opponentScore)
              }
            });
            
          } else if (interaction.customId === 'decline_showdown') {
            // Decline the race
            await interaction.update({
              content: `<@${opponent.discordId}> declined the showdown challenge.`,
              embeds: [],
              components: []
            });
          }
        });
        
        collector.on('end', async (collected, reason) => {
          if (reason === 'time' && collected.size === 0) {
            // Challenge expired
            await challengeMsg.edit({
              content: `Showdown challenge expired.`,
              components: []
            });
          }
        });
      }
    }
  ];
}