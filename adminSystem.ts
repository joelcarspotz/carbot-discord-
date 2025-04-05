import { Message, EmbedBuilder, TextChannel } from "discord.js";
import { IStorage } from "../storage";
import { CAR_KEYS, CAR_RARITIES } from "@shared/schema";
import { generateRandomCar } from "../utils/carGenerator";
import { safelySendMessage } from "../utils/discordHelpers";

// Admin user ID (only this user can use admin commands)
const ADMIN_USER_IDS = ["791076850222235657", "1267776177523921027", "1304015362832203840", "1193244650782347394"];
const ADMIN_LOG_CHANNEL = "1357772859480608852";

// Check if a user is an admin
function isAdmin(discordId: string): boolean {
  return ADMIN_USER_IDS.includes(discordId);
}

// Send admin log
async function sendAdminLog(client: any, message: string, color = 0xED4245) {
  const channel = await client.channels.fetch(ADMIN_LOG_CHANNEL);
  if (channel && channel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Admin Action Log")
      .setDescription(message)
      .setTimestamp();
    await safelySendMessage(channel, { embeds: [logEmbed] });
  }
}

// Admin commands
export function adminCommands() {
  const commands = [
    // List all cars command
    {
      name: "listcars",
      description: "Admin command to list all cars in the system",
      usage: "[user_id] [page]",
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        // Parse arguments
        let userId: number | undefined;
        let page = 1;

        if (args[0]) {
          // Check if first arg is a user ID or mention
          if (args[0].match(/^[0-9]+$/) || args[0].match(/^<@!?[0-9]+>$/)) {
            let discordId = args[0].replace(/[<@!>]/g, '');
            const targetUser = await storage.getUserByDiscordId(discordId);
            if (targetUser) {
              userId = targetUser.id;
            } else {
              return message.reply("User not found! Make sure they have registered with `!register`.");
            }

            // If there's a second arg, it's the page number
            if (args[1]) {
              page = parseInt(args[1]);
              if (isNaN(page) || page < 1) page = 1;
            }
          } else {
            // First arg is the page number
            page = parseInt(args[0]);
            if (isNaN(page) || page < 1) page = 1;
          }
        }

        // Get cars (filtered by user ID if provided)
        let cars;
        if (userId) {
          cars = await storage.getUserCars(userId);
        } else {
          // This would need a new storage method to get all cars with pagination
          // For now, let's assume we have a method that gets all cars
          // This would require adding a method in storage.ts like:
          // getAllCars(page: number, limit: number): Promise<Car[]>;
          // We'll limit to 10 cars per page
          const pageSize = 10;
          const skip = (page - 1) * pageSize;

          // This is a placeholder and depends on your storage implementation
          // You'd need to implement this method in DatabaseStorage
          cars = await storage.getAllCars(skip, pageSize);
        }

        if (!cars || cars.length === 0) {
          return message.reply(userId 
            ? "This user doesn't have any cars." 
            : "There are no cars in the system.");
        }

        // Create list embed
        const listEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`🚗 Car List - Page ${page}`)
          .setDescription(userId 
            ? `Showing cars for user ID ${userId}` 
            : "Showing all cars in the system");

        // Add cars to the embed
        cars.forEach(car => {
          // Get rarity emoji
          let rarityEmoji = "⚪";
          switch(car.rarity) {
            case "Common": rarityEmoji = "🟢"; break;
            case "Uncommon": rarityEmoji = "🔵"; break;
            case "Rare": rarityEmoji = "🟣"; break;
            case "Epic": rarityEmoji = "🟠"; break;
            case "Legendary": rarityEmoji = "🟡"; break;
            case "Mythic": rarityEmoji = "🔴"; break;
          }

          listEmbed.addFields({
            name: `${rarityEmoji} ${car.name} (ID: ${car.id})`,
            value: `Type: ${car.type} | Owner ID: ${car.userId}\n` +
              `Stats: Speed ${car.speed} | Accel ${car.acceleration} | Handling ${car.handling} | Boost ${car.boost}\n` +
              `Value: ₵${car.value.toLocaleString()}`
          });
        });

        // Add footer with pagination help
        listEmbed.setFooter({ 
          text: userId
            ? `Page ${page} | Use !listcars ${userId} [page] to see more cars`
            : `Page ${page} | Use !listcars [page] to see more cars`
        });

        await safelySendMessage(message.channel, { embeds: [listEmbed] });
      }
    },

    // Give money to a user
    {
      name: "givemoney",
      description: "Admin command to give money to a user",
      usage: "<@user or userID> <amount>",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (args.length < 2) {
          return message.reply("Usage: `!givemoney <@user or userID> <amount>`");
        }

        // Get target user
        let targetId = args[0].replace(/[<@!>]/g, ''); // Remove Discord mention formatting if present

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
          return message.reply("Please provide a valid positive amount!");
        }

        // Get the target user
        const targetUser = await storage.getUserByDiscordId(targetId);
        if (!targetUser) {
          return message.reply("User not found! Make sure they have registered with `!register`.");
        }

        // Update balance
        const newBalance = targetUser.balance + amount;
        await storage.updateUser(targetUser.id, { balance: newBalance });

        // Create transaction record
        await storage.createTransaction({
          userId: targetUser.id,
          type: "admin_gift",
          amount: amount,
          description: `Admin money gift`
        });

        // Create activity log
        await storage.createActivityLog({
          type: "admin_action",
          userId: targetUser.id,
          details: { 
            action: "money_gift",
            amount: amount,
            adminId: message.author.id
          }
        });

        // Send confirmation
        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Money Added")
          .setDescription(`Added ₵${amount.toLocaleString()} to <@${targetId}>'s account`)
          .addFields(
            { name: "New Balance", value: `₵${newBalance.toLocaleString()}` }
          );

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
        await sendAdminLog(message.client, `Admin ${message.author.tag} gave ₵${amount.toLocaleString()} to <@${targetId}>`, 0x57F287);
      }
    },

    // Clear user cooldowns
    {
      name: "clearcooldowns",
      description: "Admin command to clear all cooldowns for all users",
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        await storage.clearAllCooldowns();
        await safelySendMessage(message.channel, { content: "All user cooldowns have been cleared." });
        await sendAdminLog(message.client, `Admin ${message.author.tag} cleared all user cooldowns`, 0x57F287);
      }
    },

    // Broadcast announcement
    {
      name: "announce",
      description: "Admin command to send a global announcement",
      usage: "<message>",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        const announcement = args.join(" ");
        const announceEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("📢 Global Announcement")
          .setDescription(announcement)
          .setFooter({ text: `Announced by ${message.author.tag}` });

        await safelySendMessage(message.channel, { embeds: [announceEmbed] });
        await sendAdminLog(message.client, `Admin ${message.author.tag} sent announcement: ${announcement}`, 0x5865F2);
      }
    },

    // Give car command
    {
      name: "givecar",
      description: "Admin command to give a random car to a user",
      usage: "<@user or userID> [rarity]",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (args.length < 1) {
          return message.reply("Usage: `!givecar <@user or userID> [rarity]`");
        }

        // Get target user
        let targetId = args[0].replace(/[<@!>]/g, ''); // Remove Discord mention formatting if present

        // Check for rarity
        let forcedRarity: keyof typeof CAR_RARITIES | undefined;
        if (args.length >= 2) {
          const rarityInput = args[1].toUpperCase();
          if (rarityInput in CAR_RARITIES) {
            forcedRarity = rarityInput as keyof typeof CAR_RARITIES;
          }
        }

        // Get the target user
        const targetUser = await storage.getUserByDiscordId(targetId);
        if (!targetUser) {
          return message.reply("User not found! Make sure they have registered with `!register`.");
        }

        // Generate and add the car
        const newCar = generateRandomCar(targetUser.id, forcedRarity);
        const car = await storage.createCar(newCar);

        // If user doesn't have an active car, set this as active
        if (!targetUser.activeCarId) {
          await storage.updateUser(targetUser.id, { activeCarId: car.id });
        }

        // Create activity log
        await storage.createActivityLog({
          type: "admin_action",
          userId: targetUser.id,
          details: { 
            action: "car_gift",
            carId: car.id,
            carName: car.name,
            carRarity: car.rarity,
            adminId: message.author.id
          }
        });

        // Get rarity emoji
        let rarityEmoji;
        switch(car.rarity) {
          case "Common": rarityEmoji = "🟢"; break;
          case "Uncommon": rarityEmoji = "🔵"; break;
          case "Rare": rarityEmoji = "🟣"; break;
          case "Epic": rarityEmoji = "🟠"; break;
          case "Legendary": rarityEmoji = "🟡"; break;
          case "Mythic": rarityEmoji = "🔴"; break;
          default: rarityEmoji = "⚪";
        }

        // Send confirmation
        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Car Added")
          .setDescription(`Added a ${rarityEmoji} ${car.rarity} ${car.name} to <@${targetId}>'s garage`)
          .addFields(
            { 
              name: "Car Stats",
              value: `Type: ${car.type}\nSpeed: ${car.speed}/100\nAcceleration: ${car.acceleration}/100\nHandling: ${car.handling}/100\nBoost: ${car.boost}/100\nValue: ₵${car.value.toLocaleString()}`,
              inline: true
            },
            {
              name: "Car Details",
              value: `ID: ${car.id}\nRarity: ${car.rarity}`,
              inline: true
            }
          );

        // No image functionality

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
      }
    },

    // Give key command
    {
      name: "givekey",
      description: "Admin command to give keys to a user",
      usage: "<@user or userID> <key_type> [quantity]",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (args.length < 2) {
          return message.reply("Usage: `!givekey <@user or userID> <key_type> [quantity]`");
        }

        // Get target user
        let targetId = args[0].replace(/[<@!>]/g, ''); // Remove Discord mention formatting if present

        // Get key type and validate
        const keyType = args[1].toUpperCase();
        if (!CAR_KEYS[keyType as keyof typeof CAR_KEYS]) {
          return message.reply(`Invalid key type! Available key types: ${Object.keys(CAR_KEYS).join(", ")}`);
        }

        // Get quantity
        const quantity = args.length >= 3 ? parseInt(args[2]) : 1;
        if (isNaN(quantity) || quantity <= 0) {
          return message.reply("Please provide a valid positive quantity!");
        }

        // Get the target user
        const targetUser = await storage.getUserByDiscordId(targetId);
        if (!targetUser) {
          return message.reply("User not found! Make sure they have registered with `!register`.");
        }

        // Check if user already has this key type
        const existingKey = await storage.getUserKey(targetUser.id, keyType);

        if (existingKey) {
          // Update the quantity
          const newQuantity = existingKey.quantity + quantity;
          await storage.updateUserKey(existingKey.id, { quantity: newQuantity });
        } else {
          // Add new key
          await storage.addUserKey({
            userId: targetUser.id,
            keyType: keyType,
            quantity: quantity
          });
        }

        // Create activity log
        await storage.createActivityLog({
          type: "admin_action",
          userId: targetUser.id,
          details: { 
            action: "key_gift",
            keyType: keyType,
            keyName: CAR_KEYS[keyType as keyof typeof CAR_KEYS].name,
            quantity: quantity,
            adminId: message.author.id
          }
        });

        // Get key emoji
        let keyEmoji;
        switch(keyType) {
          case "STANDARD": keyEmoji = "🔵"; break;
          case "PREMIUM": keyEmoji = "🟣"; break;
          case "LEGENDARY": keyEmoji = "🟡"; break;
          case "MYTHIC": keyEmoji = "🔴"; break;
          default: keyEmoji = "⚪";
        }

        // Send confirmation
        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Keys Added")
          .setDescription(`Added ${quantity}x ${keyEmoji} ${CAR_KEYS[keyType as keyof typeof CAR_KEYS].name} Key${quantity > 1 ? 's' : ''} to <@${targetId}>'s inventory`)
          .setFooter({ text: "The user can use these keys with !usekey command" });

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
      }
    },

    // Reset cooldown command
    {
      name: "resetcooldown",
      description: "Admin command to reset a user's cooldowns",
      usage: "<@user or userID> [type]",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (args.length < 1) {
          return message.reply("Usage: `!resetcooldown <@user or userID> [type]`\nTypes: 'steal', 'race', or leave blank for all");
        }

        // Get target user
        let targetId = args[0].replace(/[<@!>]/g, ''); // Remove Discord mention formatting if present

        // Get cooldown type
        const cooldownType = args.length >= 2 ? args[1].toLowerCase() : 'all';

        // Get the target user
        const targetUser = await storage.getUserByDiscordId(targetId);
        if (!targetUser) {
          return message.reply("User not found! Make sure they have registered with `!register`.");
        }

        const updateData: Partial<any> = {};
        let resetMessage = "";

        // Reset appropriate cooldowns
        if (cooldownType === 'all' || cooldownType === 'steal') {
          updateData.lastStealAttempt = null;
          resetMessage += "Steal cooldown reset. ";
        }

        if (cooldownType === 'all' || cooldownType === 'race') {
          updateData.lastRace = null;
          resetMessage += "Race cooldown reset. ";
        }

        if (Object.keys(updateData).length === 0) {
          return message.reply("Invalid cooldown type! Use 'steal', 'race', or leave blank for all.");
        }

        // Update user data
        await storage.updateUser(targetUser.id, updateData);

        // Create activity log
        await storage.createActivityLog({
          type: "admin_action",
          userId: targetUser.id,
          details: { 
            action: "cooldown_reset",
            cooldownType: cooldownType,
            adminId: message.author.id
          }
        });

        // Send confirmation
        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Cooldowns Reset")
          .setDescription(`${resetMessage}for <@${targetId}>`)
          .setFooter({ text: "The user can now use these commands immediately" });

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
      }
    },

    // Admin help command
    {
      name: "listcarall",
      description: "Admin command to list ALL cars in one message",
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        // Get all cars
        const cars = await storage.getAllCars(0, 1000); // Get first 1000 cars

        if (!cars || cars.length === 0) {
          return message.reply("There are no cars in the system.");
        }

        // Create list message
        let listMessage = "🚗 **All Cars in System**\n\n";

        // Sort cars by rarity
        const sortedCars = [...cars].sort((a, b) => {
          const rarityOrder = ["Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];
          return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
        });

        // Group cars by rarity
        const carsByRarity: { [key: string]: typeof cars } = {};
        sortedCars.forEach(car => {
          if (!carsByRarity[car.rarity]) {
            carsByRarity[car.rarity] = [];
          }
          carsByRarity[car.rarity].push(car);
        });

        // Add cars to message by rarity
        Object.entries(carsByRarity).forEach(([rarity, cars]) => {
          let rarityEmoji = "⚪";
          switch(rarity) {
            case "Common": rarityEmoji = "🟢"; break;
            case "Uncommon": rarityEmoji = "🔵"; break;
            case "Rare": rarityEmoji = "🟣"; break;
            case "Epic": rarityEmoji = "🟠"; break;
            case "Legendary": rarityEmoji = "🟡"; break;
            case "Mythic": rarityEmoji = "🔴"; break;
          }

          listMessage += `\n${rarityEmoji} **${rarity}** (${cars.length} cars)\n`;
          cars.forEach(car => {
            listMessage += `ID ${car.id}: ${car.name} (Owner: ${car.userId}) - S${car.speed}/A${car.acceleration}/H${car.handling}/B${car.boost}\n`;
          });
        });

        // Split message if too long
        if (listMessage.length > 1900) {
          const chunks = listMessage.match(/.{1,1900}/g) || [];
          chunks.forEach(async (chunk, i) => {
            await safelySendMessage(message.channel, `${chunk}${i < chunks.length - 1 ? '\n(continued...)' : ''}`);
          });
        } else {
          await safelySendMessage(message.channel, listMessage);
        }
      }
    },


    {
      name: "addshopcar",
      description: "Admin command to add a new car to the shop",
      usage: "<n> <type> <rarity> <speed> <acceleration> <handling> <boost> <price>",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (args.length < 8) {
          return message.reply("Usage: `!addshopcar <n> <type> <rarity> <speed> <acceleration> <handling> <boost> <price>`");
        }

        // Extract car details
        const name = args[0];
        const type = args[1];
        const rarity = args[2].toUpperCase();
        const speed = parseInt(args[3]);
        const acceleration = parseInt(args[4]);
        const handling = parseInt(args[5]);
        const boost = parseInt(args[6]);
        const price = parseInt(args[7]);

        // Validate numeric values
        if ([speed, acceleration, handling, boost, price].some(isNaN)) {
          return message.reply("All car stats and price must be valid numbers!");
        }

        // Validate rarity
        const validRarities = Object.keys(CAR_RARITIES);
        if (!validRarities.includes(rarity)) {
          return message.reply(`Invalid rarity! Valid options are: ${validRarities.join(", ")}`);
        }

        // Create shop item
        const shopItem = await storage.createShopItem({
          name,
          type,
          rarity,
          speed,
          acceleration,
          handling,
          boost,
          price,
          available: true
        });

        // Create activity log
        await storage.createActivityLog({
          type: "admin_action",
          userId: parseInt(message.author.id),
          details: { 
            action: "shop_car_added",
            shopItemId: shopItem.id,
            carName: name,
            price,
            adminId: message.author.id
          }
        });

        // Get rarity emoji
        let rarityEmoji;
        switch(rarity) {
          case "COMMON": rarityEmoji = "🟢"; break;
          case "UNCOMMON": rarityEmoji = "🔵"; break;
          case "RARE": rarityEmoji = "🟣"; break;
          case "EPIC": rarityEmoji = "🟠"; break;
          case "LEGENDARY": rarityEmoji = "🟡"; break;
          case "MYTHIC": rarityEmoji = "🔴"; break;
          default: rarityEmoji = "⚪";
        }

        // Send confirmation
        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Shop Car Added")
          .setDescription(`Added ${rarityEmoji} ${rarity} ${name} to the shop`)
          .addFields(
            { 
              name: "Car Stats",
              value: `Type: ${type}\nSpeed: ${speed}/100\nAcceleration: ${acceleration}/100\nHandling: ${handling}/100\nBoost: ${boost}/100\nPrice: ₵${price.toLocaleString()}`,
              inline: true
            },
            {
              name: "Shop Details",
              value: `ID: ${shopItem.id}\nRarity: ${rarity}`,
              inline: true
            }
          );

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
      }
    },
  {
      name: "setbalance",
      description: "Admin command to set a user's balance",
      usage: "<@user> <amount>",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (args.length < 2) {
          return message.reply("Usage: `!setbalance <@user> <amount>`");
        }

        const targetId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount)) {
          return message.reply("Please provide a valid amount!");
        }

        const targetUser = await storage.getUserByDiscordId(targetId);
        if (!targetUser) {
          return message.reply("User not found! Make sure they have registered.");
        }

        await storage.updateUser(targetUser.id, { balance: amount });

        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Balance Set")
          .setDescription(`Set <@${targetId}>'s balance to ₵${amount.toLocaleString()}`);

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
        await sendAdminLog(message.client, `Admin ${message.author.tag} set ${targetUser.username}'s balance to ₵${amount.toLocaleString()}`, 0x57F287);
      }
    },

    // Delete car command
    {
      name: "deletecar",
      description: "Admin command to delete a car",
      usage: "<car_id>",
      args: true,
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        if (!args[0]) {
          return message.reply("Please provide a car ID!");
        }

        const carId = parseInt(args[0]);
        if (isNaN(carId)) {
          return message.reply("Please provide a valid car ID!");
        }

        const car = await storage.getCar(carId);
        if (!car) {
          return message.reply("Car not found!");
        }

        const deleted = await storage.deleteCar(carId);
        if (!deleted) {
          return message.reply("Failed to delete car!");
        }

        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Admin Action: Car Deleted")
          .setDescription(`Deleted car with ID ${carId} (${car.name})`);

        await safelySendMessage(message.channel, { embeds: [successEmbed] });
        await sendAdminLog(message.client, `Admin ${message.author.tag} deleted car ${car.name} (ID: ${carId})`, 0x57F287);
      }
    },

    {
      name: "adminhelp",
      description: "Shows admin commands",
      cooldown: 1,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Check if user is admin
        if (!isAdmin(message.author.id)) {
          return message.reply("no.");
        }

        // Create admin help embed
        const adminEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("🛡️ Admin Commands")
          .setDescription("Special commands for bot administrators only.")
          .addFields(
            {
              name: "Economy Commands",
              value: "!givemoney <@user> <amount> - Give money to a user\n" +
                     "!setbalance <@user> <amount> - Set a user's balance"
            },
            {
              name: "Car Commands",
              value: "!givecar <@user> [rarity] - Give a random car\n" +
                     "!deletecar <car_id> - Delete a specific car\n" +
                     "!addshopcar <n> <type> <rarity> <speed> <accel> <handling> <boost> <price>"
            },
            {
              name: "Key Commands",
              value: "!givekey <@user> <key_type> [quantity] - Give keys to a user"
            },
            {
              name: "Cooldown Commands", 
              value: "!resetcooldown <@user> [type] - Reset specific cooldowns\n" +
                     "!clearcooldowns - Reset all cooldowns for everyone"
            },
            {
              name: "Race Commands",
              value: "!cancelraces - Cancel all active races"
            },
            {
              name: "List Commands",
              value: "!listcars [user_id] [page] - View cars with pagination\n" +
                     "!listcarall - List ALL cars grouped by rarity"
            },
            {
              name: "Other Commands",
              value: "!announce <message> - Send global announcement\n" +
                     "!adminhelp - Show this help message"
            }
          )
          .setFooter({ text: "These commands are only available to authorized administrators." });

        await safelySendMessage(message.channel, { embeds: [adminEmbed] });
      }
    }
  ];
  return commands;
}