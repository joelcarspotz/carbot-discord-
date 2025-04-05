import { Collection, Message, PermissionResolvable, TextChannel } from "discord.js";
import { safelySendMessage } from "../utils/discordHelpers";
import { IStorage } from "../storage";
import { raceCommand, joinRaceCommand, soloRaceCommand } from "./raceSystem";
import { carCommands } from "./carSystem";
import { economyCommands } from "./economySystem";
import { adminCommands } from "./adminSystem";
import { stealCommands } from "./stealSystem";
import { minigameCommands } from "./minigameSystem";
import { customizationCommands } from "./customizationSystem";

interface Command {
  name: string;
  aliases?: string[];
  description: string;
  args?: boolean;
  usage?: string;
  guildOnly?: boolean;
  cooldown?: number;
  permissions?: PermissionResolvable[];
  execute: (message: Message, args: string[], storage: IStorage) => Promise<any>;
}

// Register all commands
export function registerCommands(): Collection<string, Command> {
  const commands = new Collection<string, Command>();

  // Info command
  commands.set("info", {
    name: "info",
    description: "Display information about commands and tracks",
    aliases: ["commands", "help"],
    usage: "[commands|tracks|command name]",
    cooldown: 5,
    async execute(message, args, storage) {
      // If no args, show both commands and tracks
      if (!args.length) {
        // Command list embed
        const commandsEmbed = {
          color: 0x5865F2,
          title: "🎮 Joel's Car Bot Commands",
          description: "Here are all available bot commands:",
          fields: [
            {
              name: "📋 General Commands",
              value: "!register - Create a new account\n!profile - View your driver profile\n!info - Get help with commands\n!balance - Check your current balance"
            },
            {
              name: "🚗 Car Commands",
              value: "!garage - View your car collection\n!car <id> - View details about a specific car\n!setactive <id> - Set your active car for racing\n!sell <id> - Sell one of your cars\n!giftcar <@user> - Gift a common car to someone\n!rarity - See info about car rarities"
            },
            {
              name: "💰 Economy Commands",
              value: "!daily - Collect daily reward\n!shop - Browse cars for sale\n!buy <id> - Purchase a car from the shop\n!leaderboard - View top players by wealth or races"
            },
            {
              name: "🏁 Racing Commands",
              value: "!race <@user> <bet> [track] - Challenge another player\n!solorace <bet> [track] - Race against AI (or !solo)\n!joinrace <id> - Join an open race\n!tracks - See info about track types"
            },
            {
              name: "🔑 Key & Steal Commands",
              value: "!steal <@user> - Attempt to steal a car\n!inventory - View your collection of car keys\n!buykey <type> - Purchase a car key\n!usekey <type> - Use a key to obtain a car"
            },
            {
              name: "🎮 Mini-Games",
              value: "!drift <bet> - Test your car's handling in a drift challenge\n!slotmachine <bet> - Try your luck at the slot machine\n!dragrace <bet> - Test your car's speed in a quarter-mile drag race"
            },
            {
              name: "🔧 Customization",
              value: "!customize <id> - Customize your car with parts and visuals\n!parts - Browse available performance parts\n!visuals - Browse available visual customizations\n!installpart <id> <part_id> - Install a performance part\n!installvisual <id> <visual_id> - Install a visual customization"
            }
          ],
          footer: {
            text: "Use !info [command name] for detailed info on a specific command"
          }
        };

        await safelySendMessage(message.channel, { embeds: [commandsEmbed] });

        // Track list embed
        const tracksEmbed = {
          color: 0xFEE75C,
          title: "🏎️ Racing Track Types",
          description: "Different tracks favor different car stats. Choose wisely based on your car's strengths!",
          fields: [
            {
              name: "🛣️ Street",
              value: "**Default track type.** Balanced racing that values speed and acceleration.\n**Stats Priority**: Speed (30%), Acceleration (30%), Handling (20%), Boost (20%)"
            },
            {
              name: "🏎️ Circuit",
              value: "Professional race tracks with many turns. Handling is key!\n**Stats Priority**: Handling (35%), Speed (25%), Acceleration (25%), Boost (15%)"
            },
            {
              name: "⚡ Drag",
              value: "Straight line racing that heavily favors raw speed and acceleration.\n**Stats Priority**: Speed (60%), Acceleration (40%)"
            },
            {
              name: "🌄 Offroad",
              value: "Rough terrain that tests handling and boost capabilities.\n**Stats Priority**: Handling (30%), Boost (30%), Acceleration (25%), Speed (15%)"
            },
            {
              name: "↪️ Drift",
              value: "Technical courses that prioritize handling and control.\n**Stats Priority**: Handling (50%), Boost (20%), Acceleration (20%), Speed (10%)"
            }
          ],
          footer: {
            text: "Usage: !race @user 5000 drift"
          }
        };

        await safelySendMessage(message.channel, { embeds: [tracksEmbed] });
        return;
      }

      // Check if it's a request for a specific information type
      const infoType = args[0]?.toLowerCase();

      // Command list embed
      if (infoType === "commands") {
        const commandsEmbed = {
          color: 0x5865F2,
          title: "🎮 Joel's Car Bot Commands",
          description: "Here are all available bot commands:",
          fields: [
            {
              name: "📋 General Commands",
              value: "!register - Create a new account\n!profile - View your driver profile\n!info - Get help with commands\n!balance - Check your current balance"
            },
            {
              name: "🚗 Car Commands",
              value: "!garage - View your car collection\n!car <id> - View details about a specific car\n!setactive <id> - Set your active car for racing\n!sell <id> - Sell one of your cars\n!giftcar <@user> - Gift a common car to someone\n!rarity - See info about car rarities"
            },
            {
              name: "💰 Economy Commands",
              value: "!daily - Collect daily reward\n!shop - Browse cars for sale\n!buy <id> - Purchase a car from the shop\n!leaderboard - View top players by wealth or races"
            },
            {
              name: "🏁 Racing Commands",
              value: "!race <@user> <bet> [track] - Challenge another player\n!solorace <bet> [track] - Race against AI (or !solo)\n!joinrace <id> - Join an open race\n!tracks - See info about track types"
            },
            {
              name: "🔑 Key & Steal Commands",
              value: "!steal <@user> - Attempt to steal a car\n!inventory - View your collection of car keys\n!buykey <type> - Purchase a car key\n!usekey <type> - Use a key to obtain a car"
            },
            {
              name: "🎮 Mini-Games",
              value: "!drift <bet> - Test your car's handling in a drift challenge\n!slotmachine <bet> - Try your luck at the slot machine\n!dragrace <bet> - Test your car's speed in a quarter-mile drag race"
            },
            {
              name: "🔧 Customization",
              value: "!customize <id> - Customize your car with parts and visuals\n!parts - Browse available performance parts\n!visuals - Browse available visual customizations\n!installpart <id> <part_id> - Install a performance part\n!installvisual <id> <visual_id> - Install a visual customization"
            }
          ],
          footer: {
            text: "Use !info [command name] for detailed info on a specific command"
          }
        };

        await safelySendMessage(message.channel, { embeds: [commandsEmbed] });
        return;
      }

      // Track list embed
      if (infoType === "tracks") {
        const tracksEmbed = {
          color: 0xFEE75C,
          title: "🏎️ Racing Track Types",
          description: "Different tracks favor different car stats. Choose wisely based on your car's strengths!",
          fields: [
            {
              name: "🛣️ Street",
              value: "**Default track type.** Balanced racing that values speed and acceleration.\n**Stats Priority**: Speed (30%), Acceleration (30%), Handling (20%), Boost (20%)"
            },
            {
              name: "🏎️ Circuit",
              value: "Professional race tracks with many turns. Handling is key!\n**Stats Priority**: Handling (35%), Speed (25%), Acceleration (25%), Boost (15%)"
            },
            {
              name: "⚡ Drag",
              value: "Straight line racing that heavily favors raw speed and acceleration.\n**Stats Priority**: Speed (60%), Acceleration (40%)"
            },
            {
              name: "🌄 Offroad",
              value: "Rough terrain that tests handling and boost capabilities.\n**Stats Priority**: Handling (30%), Boost (30%), Acceleration (25%), Speed (15%)"
            },
            {
              name: "↪️ Drift",
              value: "Technical courses that prioritize handling and control.\n**Stats Priority**: Handling (50%), Boost (20%), Acceleration (20%), Speed (10%)"
            }
          ],
          footer: {
            text: "Usage: !race @user 5000 drift"
          }
        };

        await safelySendMessage(message.channel, { embeds: [tracksEmbed] });
        return;
      }

      // If it's neither "commands" nor "tracks", try to find the command
      const { commands } = message.client as any;
      const name = infoType;
      const command = commands.get(name) || commands.find((c: any) => c.aliases && c.aliases.includes(name));

      if (!command) {
        return message.reply("That's not a valid command or option! Use !info commands to see all commands or !info tracks to see track types.");
      }

      const commandEmbed = {
        color: 0x5865F2,
        title: `Command: ${name}`,
        fields: [
          {
            name: "Description",
            value: command.description
          }
        ]
      };

      if (command.aliases) {
        commandEmbed.fields.push({
          name: "Aliases",
          value: command.aliases.join(", ")
        });
      }

      if (command.usage) {
        commandEmbed.fields.push({
          name: "Usage",
          value: `${command.usage}`
        });
      }

      commandEmbed.fields.push({
        name: "Cooldown",
        value: `${command.cooldown || 3} second(s)`
      });

      await safelySendMessage(message.channel, { embeds: [commandEmbed] });
    }
  });

  // Add car related commands
  const carCommandsList = carCommands();
  carCommandsList.forEach(command => {
    commands.set(command.name, command);
  });

  // Add economy related commands
  const economyCommandsList = economyCommands();
  economyCommandsList.forEach(command => {
    commands.set(command.name, command);
  });

  // Add race related commands
  commands.set("race", raceCommand);
  commands.set("joinrace", joinRaceCommand);
  commands.set("solorace", soloRaceCommand);
  commands.set("solo", soloRaceCommand); // Alias for solorace

  // Add admin commands
  const adminCommandsList = adminCommands();
  adminCommandsList.forEach(command => {
    commands.set(command.name, command);
  });

  // Add steal commands
  const stealCommandsList = stealCommands();
  stealCommandsList.forEach(command => {
    commands.set(command.name, command);
  });
  
  // Add minigame commands
  const minigameCommandsList = minigameCommands();
  minigameCommandsList.forEach(command => {
    commands.set(command.name, command);
  });
  
  // Add customization commands
  const customizationCommandsList = customizationCommands();
  customizationCommandsList.forEach(command => {
    commands.set(command.name, command);
  });

  return commands;
}