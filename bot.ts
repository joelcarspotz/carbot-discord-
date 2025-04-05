import { Client, Events, GatewayIntentBits, Collection, TextChannel } from "discord.js";
import { storage } from "../storage";
import { registerCommands } from "./commands";
import { setupCarSystem } from "./carSystem";
import { setupRaceSystem } from "./raceSystem";
import { setupEconomySystem } from "./economySystem";
import { setupStealSystem } from "./stealSystem";
import { setupMinigameSystem } from "./minigameSystem";
import { setupCustomizationSystem } from "./customizationSystem";

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Command cooldowns
const cooldowns = new Collection<string, Collection<string, number>>();

// Bot initialization
export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  
  if (!token) {
    console.error("Discord bot token is required to start the bot");
    return;
  }
  
  try {
    // Register commands
    const commands = registerCommands();
    
    // Initialize car system
    setupCarSystem(client);
    
    // Initialize race system
    setupRaceSystem(client, cooldowns);
    
    // Initialize economy system
    setupEconomySystem(client);
    
    // Initialize steal system
    setupStealSystem(client);
    
    // Initialize minigame system
    setupMinigameSystem();
    
    // Initialize customization system
    setupCustomizationSystem(client);
    
    // When the client is ready, run this code (only once)
    client.once(Events.ClientReady, (readyClient) => {
      console.log(`Bot ready! Logged in as ${readyClient.user.tag}`);
    });
    
    // Command handler
    client.on(Events.MessageCreate, async (message) => {
      // Ignore messages from bots
      if (message.author.bot) return;
      
      // Check for command prefix
      const prefix = "!";
      if (!message.content.startsWith(prefix)) return;
      
      // Parse command and arguments
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();
      
      if (!commandName) return;
      
      // Find the command
      const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      if (!command) return;
      
      // Check for required permissions
      if (command.permissions && message.guild) {
        const textChannel = message.channel as TextChannel;
        const authorPerms = textChannel.permissionsFor(message.author);
        if (!authorPerms || !command.permissions.every(perm => authorPerms.has(perm))) {
          return message.reply("You don't have permission to use this command.");
        }
      }
      
      // Check if command can be executed in DMs
      if (command.guildOnly && message.channel.type !== 0) {
        return message.reply("I can't execute that command inside DMs!");
      }
      
      // Check if args are required
      if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        
        if (command.usage) {
          reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }
        
        return message.reply(reply);
      }
      
      // Handle cooldowns
      if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Collection<string, number>());
      }
      
      const now = Date.now();
      const timestamps = cooldowns.get(command.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;
      
      if (timestamps && timestamps.has(message.author.id)) {
        // Using non-null assertion since we've already checked with timestamps.has()
        const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply(
            `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`
          );
        }
      }
      
      if (timestamps) {
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
      }
      
      // Execute the command
      try {
        // Ensure user exists in database
        let user = await storage.getUserByDiscordId(message.author.id);
        
        if (!user && command.name !== "register") {
          return message.reply("You need to register first! Use `!register` to create an account.");
        }
        
        await command.execute(message, args, storage);
      } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
      }
    });
    
    // Log in to Discord with the client token
    await client.login(token);
    
    return client;
  } catch (error) {
    console.error("Error starting the bot:", error);
    throw error;
  }
}
