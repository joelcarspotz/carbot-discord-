import { 
  Client, 
  Message, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ButtonInteraction,
  MessageActionRowComponentBuilder 
} from "discord.js";
import { IStorage } from "../storage";
import { CAR_KEYS } from "@shared/schema";
import { safelySendMessage } from "../utils/discordHelpers";

// Setup economy system
export function setupEconomySystem(client: Client) {
  // Check for daily reward resets, etc.
  console.log("Economy system initialized");
}

// Economy commands
export function economyCommands() {
  return [
    // Register command
    {
      name: "register",
      description: "Create a new account",
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        console.log("Register command executed by user:", message.author.id, message.author.username);
        
        try {
          // Check if the user is already registered
          const existingUser = await storage.getUserByDiscordId(message.author.id);
          console.log("Existing user check result:", existingUser);
          
          if (existingUser) {
            return message.reply("You're already registered! Use `!profile` to see your account details.");
          }
          
          console.log("Creating new user in database...");
          // Create a new user
          const newUser = await storage.createUser({
            discordId: message.author.id,
            username: message.author.username,
            balance: 50000, // Starting balance
            activeCarId: null,
            lastStealAttempt: null,
            lastRace: null
          });
          
          console.log("New user created:", newUser);
          
          // Create a starter car for the user
          const starterCar = await storage.createCar({
            userId: newUser.id,
            name: "Starter Sedan",
            type: "Sedan",
            rarity: "Common", // This matches the name property in CAR_RARITIES.COMMON
            speed: 40,
            acceleration: 40,
            handling: 40,
            boost: 40,
            value: 5000
          });
          
          console.log("Starter car created:", starterCar);
          
          // Set the starter car as the active car
          await storage.updateUser(newUser.id, { activeCarId: starterCar.id });
          
          // Send welcome message
          const welcomeEmbed = {
            color: 0x5865F2,
            title: "🎉 Welcome to Joel's Car Bot!",
            description: `Welcome, ${message.author.username}! Your account has been created with ₵50,000 starting balance.`,
            fields: [
              {
                name: "Your First Car",
                value: "You've been given a **Starter Sedan** to begin your racing career!"
              },
              {
                name: "Getting Started",
                value: "- Use `!profile` to view your stats\n- Use `!garage` to see your cars\n- Use `!shop` to buy new cars\n- Use `!race` to start racing and earn money"
              }
            ],
            footer: {
              text: "Use !info for a list of all commands"
            }
          };
          
          await safelySendMessage(message.channel, { embeds: [welcomeEmbed] });
        } catch (error) {
          console.error("Error in register command:", error);
          return message.reply("There was an error creating your account. Please try again later.");
        }
      }
    },
    // Inventory command to view keys
    {
      name: "inventory",
      aliases: ["keys", "inv"],
      description: "View your keys inventory",
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Get user's keys
        const userKeys = await storage.getUserKeys(user.id);
        
        if (userKeys.length === 0) {
          return message.reply("You don't have any keys in your inventory! Use `!shop keys` to browse available keys.");
        }
        
        // Create inventory embed
        const inventoryEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`${user.username}'s Inventory`)
          .setDescription("Here are the keys in your inventory:")
          .setFooter({ text: "Use !usekey <key_type> to use a key and get a random car" });
          
        // Add each key to the embed
        userKeys.forEach(userKey => {
          const keyData = CAR_KEYS[userKey.keyType as keyof typeof CAR_KEYS];
          if (keyData) {
            inventoryEmbed.addFields({ 
              name: `🔑 ${keyData.name} (x${userKey.quantity})`,
              value: `${keyData.description}\nType: ${userKey.keyType}\nUse: \`!usekey ${userKey.keyType.toLowerCase()}\``
            });
          }
        });
        
        safelySendMessage(message.channel, { embeds: [inventoryEmbed] });
      }
    },
    // Buy key command
    {
      name: "buykey",
      description: "Purchase a key to unlock a random car",
      usage: "<key_type>",
      args: true,
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        if (!args[0]) {
          return message.reply("Please specify a key type! Use `!shop keys` to see available keys.");
        }
        
        const keyType = args[0].toUpperCase();
        
        // Check if key type exists
        if (!CAR_KEYS[keyType as keyof typeof CAR_KEYS]) {
          return message.reply("Invalid key type! Use `!shop keys` to see available keys.");
        }
        
        const keyData = CAR_KEYS[keyType as keyof typeof CAR_KEYS];
        
        // Check if user can afford the key
        if (user.balance < keyData.price) {
          return message.reply(`You don't have enough money to buy a ${keyData.name} Key! It costs ₵${keyData.price.toLocaleString()} but you only have ₵${user.balance.toLocaleString()}.`);
        }
        
        // Update user balance
        await storage.updateUser(user.id, { balance: user.balance - keyData.price });
        
        // Create transaction record
        await storage.createTransaction({
          userId: user.id,
          type: "key_purchase",
          amount: -keyData.price,
          description: `Purchased ${keyData.name} Key`
        });
        
        // Check if user already has this key type in their inventory
        const existingKey = await storage.getUserKey(user.id, keyType);
        
        if (existingKey) {
          // Update the quantity
          await storage.updateUserKey(existingKey.id, { 
            quantity: existingKey.quantity + 1,
            updatedAt: new Date()
          });
        } else {
          // Add new key to inventory
          await storage.addUserKey({
            userId: user.id,
            keyType,
            quantity: 1
          });
        }
        
        // Create activity log
        await storage.createActivityLog({
          type: "key_purchased",
          userId: user.id,
          details: { 
            keyType,
            keyName: keyData.name,
            price: keyData.price
          }
        });
        
        // Send confirmation
        const keyEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("🔑 Key Purchased!")
          .setDescription(`You've successfully purchased a ${keyData.name} Key!`)
          .addFields(
            { 
              name: "Purchase Details",
              value: `Price: ₵${keyData.price.toLocaleString()}\nNew Balance: ₵${(user.balance - keyData.price).toLocaleString()}`
            },
            {
              name: "Usage",
              value: "Use your key with `!usekey ${keyType.toLowerCase()}` to get a random car!"
            }
          )
          .setFooter({ text: "Keys can be viewed in your inventory with !inventory" });
        
        safelySendMessage(message.channel, { embeds: [keyEmbed] });
      }
    },
    // Profile command
    {
      name: "profile",
      aliases: ["p", "me"],
      description: "View your driver profile",
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Target is either mentioned user or message author
        const target = message.mentions.users.first() || message.author;
        
        const user = await storage.getUserByDiscordId(target.id);
        
        if (!user) {
          return message.reply(
            target.id === message.author.id
              ? "You're not registered yet! Use `!register` to start playing."
              : "That user hasn't registered yet!"
          );
        }
        
        // Get user's active car
        let activeCar = null;
        if (user.activeCarId) {
          activeCar = await storage.getCar(user.activeCarId);
        }
        
        // Get user stats
        const cars = await storage.getUserCars(user.id);
        const races = await storage.getUserRaces(user.id);
        const transactions = await storage.getUserTransactions(user.id);
        const stealAttempts = await storage.getUserStealAttempts(user.id);
        
        // Calculate stats
        const racesWon = races.filter(race => race.winner === user.id).length;
        const racesLost = races.filter(race => race.challenger === user.id || (race.opponent === user.id && race.winner !== user.id)).length;
        const winRate = races.length > 0 ? ((racesWon / races.length) * 100).toFixed(1) : "0.0";
        
        const stealSuccesses = stealAttempts.filter(attempt => attempt.success).length;
        const stealFailures = stealAttempts.filter(attempt => !attempt.success).length;
        const stealRate = stealAttempts.length > 0 ? ((stealSuccesses / stealAttempts.length) * 100).toFixed(1) : "0.0";
        
        // Create profile embed
        const profileEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🏁 ${user.username}'s Driver Profile`)
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { 
              name: "💰 Balance", 
              value: `₵${user.balance.toLocaleString()}`, 
              inline: true 
            },
            { 
              name: "🏎️ Cars Owned", 
              value: cars.length.toString(), 
              inline: true 
            },
            { 
              name: "🏆 Race Record", 
              value: `${racesWon} Wins / ${racesLost} Losses (${winRate}%)`, 
              inline: false 
            },
            { 
              name: "🔑 Steal Attempts", 
              value: `${stealSuccesses} Successful / ${stealFailures} Failed (${stealRate}%)`, 
              inline: false 
            }
          )
          .setFooter({ text: "Use !garage to see your cars | !race to compete | !steal to find cars to steal" });
        
        // Add active car info if available
        if (activeCar) {
          profileEmbed.addFields({
            name: "🚗 Active Car",
            value: `${activeCar.name} (${activeCar.rarity})\nSpeed: ${activeCar.speed} | Accel: ${activeCar.acceleration} | Handling: ${activeCar.handling} | Boost: ${activeCar.boost}`
          });
        }
        
        await safelySendMessage(message.channel, { embeds: [profileEmbed] });
      }
    },
    
    // Balance command
    {
      name: "balance",
      aliases: ["bal", "money"],
      description: "Check your current balance",
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Target is either mentioned user or message author
        const target = message.mentions.users.first() || message.author;
        
        const user = await storage.getUserByDiscordId(target.id);
        
        if (!user) {
          return message.reply(
            target.id === message.author.id
              ? "You're not registered yet! Use `!register` to start playing."
              : "That user hasn't registered yet!"
          );
        }
        
        // Emoji for currency based on amount
        let emoji = "💰";
        if (user.balance > 100000) emoji = "💎";
        else if (user.balance > 50000) emoji = "💸";
        else if (user.balance > 10000) emoji = "💵";
        else if (user.balance < 1000) emoji = "🪙";
        
        safelySendMessage(message.channel, `${emoji} **${user.username}'s Balance:** ₵${user.balance.toLocaleString()}`);
      }
    },
    // Shop command
    {
      name: "shop",
      description: "Browse available cars to purchase",
      usage: "[category]",
      cooldown: 5,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Get shop items
        const shopItems = await storage.getShopItems();
        
        if (shopItems.length === 0) {
          return message.reply("There are no cars available in the shop right now.");
        }
        
        // Parse category filter
        const validCategories = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "keys"];
        const filter = args[0]?.toLowerCase();
        const categoryArg = filter;
        
        let filteredItems = shopItems;
        if (filter && validCategories.includes(filter)) {
          // Special case for keys
          if (filter === "keys") {
            const keyEmbed = new EmbedBuilder()
              .setColor(0x3498DB)
              .setTitle("🔑 Car Keys Shop")
              .setDescription("Use keys to obtain cars of specific rarities!")
              .setFooter({ text: `Your Balance: ₵${user.balance.toLocaleString()} | Use !buykey <key_type> to purchase a key` });
            
            // Add car keys to shop display
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
              
              const canAfford = user.balance >= keyData.price;
              keyEmbed.addFields({
                name: `${keyColor} ${keyData.name} Key`,
                value: `Price: ${canAfford ? "₵" : "❌ ₵"}${keyData.price.toLocaleString()}\n` +
                       `Drop Rate: ${keyData.dropRate.toFixed(2)}%\n` +
                       `Use: \`!buykey ${keyType.toLowerCase()}\``
              });
            });
            
            // Create buy key buttons
            const keyButtonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('buykey_STANDARD')
                  .setLabel('Buy Standard Key')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔵'),
                new ButtonBuilder()
                  .setCustomId('buykey_PREMIUM')
                  .setLabel('Buy Premium Key')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🟣'),
                new ButtonBuilder()
                  .setCustomId('buykey_LEGENDARY')
                  .setLabel('Buy Legendary Key')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🟡'),
                new ButtonBuilder()
                  .setCustomId('buykey_MYTHIC')
                  .setLabel('Buy Mythic Key')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔴')
              );
                  
            const keyMessage = await safelySendMessage(message.channel, { 
              embeds: [keyEmbed],
              components: [keyButtonRow]
            });
            
            // Set up collector for button interactions
            const filter = (i: ButtonInteraction) => {
              return i.user.id === message.author.id && i.customId.startsWith('buykey_');
            };
            
            const collector = keyMessage.createMessageComponentCollector({ 
              filter, 
              time: 60000 // 1 minute
            });
            
            collector.on('collect', async (interaction: ButtonInteraction) => {
              const keyType = interaction.customId.split('_')[1];
              
              // Check if key type exists
              if (!CAR_KEYS[keyType as keyof typeof CAR_KEYS]) {
                return interaction.reply({ 
                  content: "Invalid key type!", 
                  ephemeral: true 
                });
              }
              
              // Check if user can afford the key
              const keyData = CAR_KEYS[keyType as keyof typeof CAR_KEYS];
              if (user.balance < keyData.price) {
                return interaction.reply({ 
                  content: `You can't afford this key! You need ₵${keyData.price.toLocaleString()}.`, 
                  ephemeral: true 
                });
              }
              
              // Update user's balance
              await storage.updateUser(user.id, { balance: user.balance - keyData.price });
              
              // Add key to user's inventory or increase quantity
              const existingKey = await storage.getUserKey(user.id, keyType);
              if (existingKey) {
                await storage.updateUserKey(existingKey.id, { quantity: existingKey.quantity + 1 });
              } else {
                await storage.addUserKey({
                  userId: user.id,
                  keyType: keyType,
                  quantity: 1
                });
              }
              
              // Create transaction record
              await storage.createTransaction({
                userId: user.id,
                type: "key_purchase",
                amount: keyData.price,
                description: `Purchased ${keyData.name}`
              });
              
              // Create activity log
              await storage.createActivityLog({
                type: "key_purchased",
                userId: user.id,
                details: { 
                  keyType,
                  keyName: keyData.name,
                  price: keyData.price
                }
              });
              
              // Update user object with new balance
              user.balance -= keyData.price;
              
              await interaction.reply({
                content: `You purchased a ${keyData.name} Key for ₵${keyData.price.toLocaleString()}! Use \`!usekey ${keyType.toLowerCase()}\` to open it.`,
                ephemeral: false
              });
              
              // Update the original message with updated affordability
              const updatedKeyEmbed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle("🔑 Car Keys Shop")
                .setDescription("Use keys to obtain cars of specific rarities!")
                .setFooter({ text: `Your Balance: ₵${user.balance.toLocaleString()} | Use !buykey <key_type> to purchase a key` });
              
              // Add car keys to shop display with updated affordability
              Object.entries(CAR_KEYS).forEach(([kt, kd]) => {
                let kColor = "⚪"; // Default color
                
                // Set key color based on rarity
                switch(kt) {
                  case "STANDARD":
                    kColor = "🔵";
                    break;
                  case "PREMIUM":
                    kColor = "🟣";
                    break;
                  case "LEGENDARY":
                    kColor = "🟡";
                    break;
                  case "MYTHIC":
                    kColor = "🔴";
                    break;
                }
                
                const canAfford = user.balance >= kd.price;
                updatedKeyEmbed.addFields({
                  name: `${kColor} ${kd.name} Key`,
                  value: `Price: ${canAfford ? "₵" : "❌ ₵"}${kd.price.toLocaleString()}\n` +
                         `Drop Rate: ${kd.dropRate.toFixed(2)}%\n` +
                         `Use: \`!buykey ${kt.toLowerCase()}\``
                });
              });
              
              // Update buttons based on what user can afford
              const updatedKeyButtonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId('buykey_STANDARD')
                    .setLabel('Buy Standard Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔵')
                    .setDisabled(user.balance < CAR_KEYS.STANDARD.price),
                  new ButtonBuilder()
                    .setCustomId('buykey_PREMIUM')
                    .setLabel('Buy Premium Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🟣')
                    .setDisabled(user.balance < CAR_KEYS.PREMIUM.price),
                  new ButtonBuilder()
                    .setCustomId('buykey_LEGENDARY')
                    .setLabel('Buy Legendary Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🟡')
                    .setDisabled(user.balance < CAR_KEYS.LEGENDARY.price),
                  new ButtonBuilder()
                    .setCustomId('buykey_MYTHIC')
                    .setLabel('Buy Mythic Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔴')
                    .setDisabled(user.balance < CAR_KEYS.MYTHIC.price)
                );
                    
              await keyMessage.edit({ 
                embeds: [updatedKeyEmbed],
                components: [updatedKeyButtonRow]
              });
            });
            
            collector.on('end', async () => {
              // Disable all buttons when collector ends
              const disabledButtonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId('buykey_STANDARD')
                    .setLabel('Buy Standard Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔵')
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('buykey_PREMIUM')
                    .setLabel('Buy Premium Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🟣')
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('buykey_LEGENDARY')
                    .setLabel('Buy Legendary Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🟡')
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('buykey_MYTHIC')
                    .setLabel('Buy Mythic Key')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔴')
                    .setDisabled(true)
                );
                    
              await keyMessage.edit({ components: [disabledButtonRow] });
            });
            
            return;
          }
          
          // Regular car category filtering
          filteredItems = shopItems.filter(item => 
            item.rarity.toLowerCase() === filter
          );
          
          if (filteredItems.length === 0) {
            return message.reply(`There are no ${filter} cars available right now.`);
          }
        }
        
        // Function to display shop page
        const displayShopPage = async (items: any[], page: number) => {
          const ITEMS_PER_PAGE = 9; // Show 9 items per page to leave room for category field
          const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
          
          if (page < 1) page = 1;
          if (page > totalPages) page = totalPages;
          
          const startIndex = (page - 1) * ITEMS_PER_PAGE;
          const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, items.length);
          const pageItems = items.slice(startIndex, endIndex);
          
          // Build shop embed
          const shopEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🏪 Car Shop ${categoryArg ? `(${categoryArg.toUpperCase()})` : ''} - Page ${page}/${totalPages}`)
            .setDescription(filter 
              ? `Showing ${filter.charAt(0).toUpperCase() + filter.slice(1)} cars only` 
              : "Here are the available cars:")
            .setFooter({ text: `Your Balance: ₵${user.balance.toLocaleString()} | Use !buy <car_id> to purchase a car` });
          
          const rarityColors = {
            "Common": "🟢",
            "Uncommon": "🔵",
            "Rare": "🟣",
            "Epic": "🟠",
            "Legendary": "🟡",
            "Mythic": "⭐"
          };
          
          // Add cars to shop display (only for current page)
          pageItems.forEach((item) => {
            const canAfford = user.balance >= item.price;
            const rarityEmoji = rarityColors[item.rarity as keyof typeof rarityColors] || "⚪";
            
            shopEmbed.addFields({
              name: `${rarityEmoji} ${item.name} (ID: ${item.id})`,
              value: `Type: ${item.type} | Rarity: ${item.rarity}\n` +
                    `Stats: Speed ${item.speed} | Accel ${item.acceleration} | Handling ${item.handling} | Boost ${item.boost}\n` +
                    `Price: ${canAfford ? "₵" : "❌ ₵"}${item.price.toLocaleString()}`
            });
          });
          
          // Add categories help
          shopEmbed.addFields({
            name: "Categories",
            value: "Filter: `!shop [category]` (common, uncommon, rare, epic, legendary, mythic, keys)"
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
                .setLabel(`${page}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages),
              new ButtonBuilder()
                .setCustomId('last_page')
                .setLabel('>>')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages)
            );
            
          // Create category buttons
          const categoryRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('cat_all')
                .setLabel('All')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!filter),
              new ButtonBuilder()
                .setCustomId('cat_common')
                .setLabel('Common')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(filter === 'common'),
              new ButtonBuilder()
                .setCustomId('cat_uncommon')
                .setLabel('Uncommon')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(filter === 'uncommon'),
              new ButtonBuilder()
                .setCustomId('cat_rare')
                .setLabel('Rare')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(filter === 'rare'),
              new ButtonBuilder()
                .setCustomId('cat_keys')
                .setLabel('Keys')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(filter === 'keys')
            );
            
          const categoryRow2 = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('cat_epic')
                .setLabel('Epic')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(filter === 'epic'),
              new ButtonBuilder()
                .setCustomId('cat_legendary')
                .setLabel('Legendary')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(filter === 'legendary'),
              new ButtonBuilder()
                .setCustomId('cat_mythic')
                .setLabel('Mythic')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(filter === 'mythic')
            );
          
          return { 
            embeds: [shopEmbed], 
            components: [navigationRow, categoryRow, categoryRow2] 
          };
        };
          
        // Send initial message
        const initialMessage = await safelySendMessage(message.channel, 
          await displayShopPage(filteredItems, args[1] ? parseInt(args[1]) : 1)
        );
        
        // Create collector for button interactions
        const buttonFilter = (i: ButtonInteraction) => {
          return i.user.id === message.author.id && 
                 (i.customId.startsWith('cat_') || 
                  ['first_page', 'prev_page', 'next_page', 'last_page'].includes(i.customId));
        };
        
        let currentPage = args[1] ? parseInt(args[1]) : 1;
        let currentCategory = categoryArg || 'all';
        let currentItems = filteredItems;
        
        const collector = initialMessage.createMessageComponentCollector({ 
          filter: buttonFilter, 
          time: 180000 // 3 minutes
        });
        
        collector.on('collect', async (interaction: ButtonInteraction) => {
          // Handle category change
          if (interaction.customId.startsWith('cat_')) {
            const newCategory = interaction.customId.split('_')[1];
            
            // Reset to page 1 when changing category
            currentPage = 1;
            
            if (newCategory === 'all') {
              currentCategory = 'all';
              currentItems = shopItems;
            } else if (newCategory === 'keys') {
              // Redirect to keys shop
              await interaction.update({ components: [] });
              
              // Call the command again with "keys" as the category
              const args = ['keys'];
              return this.execute(message, args, storage);
            } else {
              currentCategory = newCategory;
              currentItems = shopItems.filter(item => 
                item.rarity.toLowerCase() === newCategory
              );
            }
          } else {
            // Handle page navigation
            if (interaction.customId === 'first_page') {
              currentPage = 1;
            } else if (interaction.customId === 'prev_page') {
              currentPage--;
            } else if (interaction.customId === 'next_page') {
              currentPage++;
            } else if (interaction.customId === 'last_page') {
              const totalPages = Math.ceil(currentItems.length / 9);
              currentPage = totalPages;
            }
          }
          
          // Update message
          await interaction.update(await displayShopPage(currentItems, currentPage));
        });
        
        collector.on('end', async () => {
          // Disable buttons when collector ends
          const disabledRow1 = new ActionRowBuilder<MessageActionRowComponentBuilder>()
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
                .setLabel(`${currentPage}/${Math.ceil(currentItems.length / 9)}`)
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
            
          const disabledRow2 = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('cat_all')
                .setLabel('All')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cat_common')
                .setLabel('Common')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cat_uncommon')
                .setLabel('Uncommon')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cat_rare')
                .setLabel('Rare')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cat_keys')
                .setLabel('Keys')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
            
          const disabledRow3 = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('cat_epic')
                .setLabel('Epic')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cat_legendary')
                .setLabel('Legendary')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cat_mythic')
                .setLabel('Mythic')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
          
          try {
            await initialMessage.edit({ components: [disabledRow1, disabledRow2, disabledRow3] });
          } catch (error) {
            console.error("Failed to update message with disabled buttons:", error);
          }
        });
      }
    },
    // Buy command
    {
      name: "buy",
      description: "Purchase a car from the shop",
      usage: "<car_id>",
      args: true,
      cooldown: 10,
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        const itemId = parseInt(args[0]);
        
        if (isNaN(itemId)) {
          return message.reply("Please provide a valid car ID! Use `!shop` to see available cars.");
        }
        
        // Get shop item
        const item = await storage.getShopItem(itemId);
        
        if (!item) {
          return message.reply("Car not found in the shop! Use `!shop` to see available cars.");
        }
        
        if (!item.available) {
          return message.reply("This car is no longer available for purchase.");
        }
        
        // Check if user can afford it
        if (user.balance < item.price) {
          return message.reply(`You can't afford this car! It costs ₵${item.price.toLocaleString()} but you only have ₵${user.balance.toLocaleString()}.`);
        }
        
        // Update user balance
        await storage.updateUser(user.id, { balance: user.balance - item.price });
        
        // Create transaction record
        await storage.createTransaction({
          userId: user.id,
          type: "purchase",
          amount: -item.price,
          description: `Purchased ${item.name}`
        });
        
        // Create car for user
        const car = await storage.createCar({
          userId: user.id,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          speed: item.speed,
          acceleration: item.acceleration,
          handling: item.handling,
          boost: item.boost,
          value: Math.floor(item.price * 0.7) // Resale value is lower
        });
        
        // If user doesn't have an active car, set this as active
        if (!user.activeCarId) {
          await storage.updateUser(user.id, { activeCarId: car.id });
        }
        
        // Create activity log
        await storage.createActivityLog({
          type: "car_purchased",
          userId: user.id,
          details: { 
            carId: car.id, 
            carName: car.name, 
            price: item.price,
            rarity: car.rarity
          }
        });
        
        // Send confirmation
        const purchaseEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("🎉 Car Purchased!")
          .setDescription(`You've successfully purchased a ${item.rarity} ${item.name}!`)
          .addFields(
            {
              name: "Car Stats",
              value: `Speed: ${item.speed}/100 | Acceleration: ${item.acceleration}/100\nHandling: ${item.handling}/100 | Boost: ${item.boost}/100`
            },
            {
              name: "Purchase Details",
              value: `Price: ₵${item.price.toLocaleString()}\nNew Balance: ₵${(user.balance - item.price).toLocaleString()}`
            }
          )
          .setFooter({ text: "Check your garage with !garage" });
        
        safelySendMessage(message.channel, { embeds: [purchaseEmbed] });
      }
    },
    // Daily command
    {
      name: "daily",
      description: "Collect your daily reward",
      cooldown: 3600, // Long cooldown to prevent spam
      async execute(message: Message, args: string[], storage: IStorage) {
        const user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user) {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        // Check if user has collected daily reward in the last 24 hours
        const lastDaily = await storage.getUserTransactions(user.id)
          .then(transactions => transactions.find(t => t.type === "daily"));
        
        if (lastDaily) {
          const lastDailyTime = lastDaily.createdAt ? new Date(lastDaily.createdAt).getTime() : Date.now();
          const now = Date.now();
          const timeSinceLastDaily = now - lastDailyTime;
          const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours in ms
          
          if (timeSinceLastDaily < dailyCooldown) {
            const timeLeft = dailyCooldown - timeSinceLastDaily;
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            return message.reply(`You've already collected your daily reward! Try again in ${hours}h ${minutes}m.`);
          }
        }
        
        // Calculate reward (between 1000 and 5000)
        const baseReward = 1000;
        const bonusReward = Math.floor(Math.random() * 4000);
        const totalReward = baseReward + bonusReward;
        
        // Award the money
        await storage.updateUser(user.id, { balance: user.balance + totalReward });
        
        // Create transaction record
        await storage.createTransaction({
          userId: user.id,
          type: "daily",
          amount: totalReward,
          description: "Daily reward"
        });
        
        // Create activity log
        await storage.createActivityLog({
          type: "daily_reward",
          userId: user.id,
          details: { amount: totalReward }
        });
        
        // Send confirmation
        const dailyEmbed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle("💰 Daily Reward")
          .setDescription(`You received ₵${totalReward.toLocaleString()} as your daily reward!`)
          .addFields({
            name: "New Balance",
            value: `₵${(user.balance + totalReward).toLocaleString()}`
          })
          .setFooter({ text: "Come back tomorrow for another reward!" });
        
        safelySendMessage(message.channel, { embeds: [dailyEmbed] });
      }
    },
    // Leaderboard command
    {
      name: "leaderboard",
      aliases: ["lb", "top"],
      description: "View the richest players or best racers",
      usage: "[wealth|races]",
      cooldown: 10,
      async execute(message: Message, args: string[], storage: IStorage) {
        // Get all users
        const users = Array.from((await Promise.all(
          Array.from({ length: 100 }, (_, i) => storage.getUser(i + 1))
        )).filter(Boolean) as any[]);
        
        if (users.length === 0) {
          return message.reply("No users found!");
        }
        
        const type = args[0]?.toLowerCase() || 'wealth';
        
        if (type === 'wealth') {
          // Sort by balance
          users.sort((a, b) => b.balance - a.balance);
          
          const leaderboardEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle("💰 Wealth Leaderboard")
            .setDescription("The richest drivers in Joel's Car Bot:")
            .setFooter({ text: "Use !leaderboard races to see the race leaderboard" });
          
          // Add top 10 users
          users.slice(0, 10).forEach((user, index) => {
            leaderboardEmbed.addFields({
              name: `#${index + 1} ${user.username}`,
              value: `Balance: ₵${user.balance.toLocaleString()}`
            });
          });
          
          safelySendMessage(message.channel, { embeds: [leaderboardEmbed] });
        } else if (type === 'races') {
          // Create mapping of user IDs to win counts
          const userWins = new Map();
          const userRaces = new Map();
          
          // For each user, get their races
          for (const user of users) {
            const races = await storage.getUserRaces(user.id);
            const completedRaces = races.filter(race => race.status === "completed");
            const wins = completedRaces.filter(race => race.winner === user.id).length;
            
            userWins.set(user.id, wins);
            userRaces.set(user.id, completedRaces.length);
          }
          
          // Sort users by wins
          users.sort((a, b) => {
            const aWins = userWins.get(a.id) || 0;
            const bWins = userWins.get(b.id) || 0;
            
            if (aWins === bWins) {
              // If tied on wins, sort by win rate
              const aRate = aWins / (userRaces.get(a.id) || 1);
              const bRate = bWins / (userRaces.get(b.id) || 1);
              return bRate - aRate;
            }
            
            return bWins - aWins;
          });
          
          const raceLeaderboardEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("🏁 Racing Leaderboard")
            .setDescription("The best racers in Joel's Car Bot:")
            .setFooter({ text: "Use !leaderboard wealth to see the wealth leaderboard" });
          
          // Add top 10 racers
          users.slice(0, 10).forEach((user, index) => {
            const wins = userWins.get(user.id) || 0;
            const races = userRaces.get(user.id) || 0;
            const winRate = races > 0 ? Math.round((wins / races) * 100) : 0;
            
            raceLeaderboardEmbed.addFields({
              name: `#${index + 1} ${user.username}`,
              value: `Wins: ${wins} | Races: ${races} | Win Rate: ${winRate}%`
            });
          });
          
          safelySendMessage(message.channel, { embeds: [raceLeaderboardEmbed] });
        } else {
          message.reply("Invalid leaderboard type! Use `wealth` or `races`.");
        }
      }
    }
  ];
}
