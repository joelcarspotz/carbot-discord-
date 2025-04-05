import { 
  ButtonInteraction, 
  Client, 
  Collection, 
  ComponentType, 
  EmbedBuilder, 
  Message, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageEditOptions, 
  MessagePayload, 
  TextChannel,
  MessageCollector,
  MessageReaction,
  MessageCreateOptions,
  CollectorFilter,
  ReadonlyCollection,
  InteractionCollector,
  Snowflake
} from 'discord.js';
import { IStorage } from '../storage';
import { PART_TYPES, VISUAL_TYPES } from '@shared/schema';
import { log } from '../vite';

// Helper function to safely send a message, handling potential errors
export async function safelySendMessage(
  channel: TextChannel | any,
  content: string | any
): Promise<Message | null> {
  try {
    return await channel.send(content);
  } catch (error) {
    log(`Error sending message: ${error}`, "discord");
    return null;
  }
}

// Helper function to safely delete a message, handling potential errors
export async function safelyDeleteMessage(message: Message): Promise<boolean> {
  try {
    await message.delete();
    return true;
  } catch (error) {
    log(`Error deleting message: ${error}`, "discord");
    return false;
  }
}

// Helper function to calculate stats after applying parts
export function calculateCarStatsWithParts(car: any, parts: any[]): { 
  speed: number, 
  acceleration: number, 
  handling: number, 
  boost: number,
  speedBonus: number,
  accelerationBonus: number,
  handlingBonus: number,
  boostBonus: number
} {
  // Base stats
  let speedBonus = 0;
  let accelerationBonus = 0;
  let handlingBonus = 0;
  let boostBonus = 0;

  // Apply part bonuses
  for (const part of parts) {
    speedBonus += part.speedBoost || 0;
    accelerationBonus += part.accelerationBoost || 0;
    handlingBonus += part.handlingBoost || 0;
    boostBonus += part.boostBoost || 0;
  }

  return {
    speed: car.speed + speedBonus,
    acceleration: car.acceleration + accelerationBonus,
    handling: car.handling + handlingBonus,
    boost: car.boost + boostBonus,
    speedBonus,
    accelerationBonus,
    handlingBonus,
    boostBonus
  };
}

// Helper to format upgrades in a stat display
function formatStatUpgrade(baseValue: number, bonus: number): string {
  if (bonus === 0) return `${baseValue}`;
  return `${baseValue} (+${bonus} = ${baseValue + bonus})`;
}

// Create embed for a car's details including parts and visuals
export async function createCarDetailsEmbed(car: any, parts: any[] = [], visuals: any[] = []): Promise<EmbedBuilder> {
  const stats = calculateCarStatsWithParts(car, parts);
  
  const embed = new EmbedBuilder()
    .setTitle(`${car.customName || car.name}`)
    .setDescription(`Type: ${car.type} | Rarity: ${car.rarity}`)
    .setColor(getCarRarityColor(car.rarity));
  
  // Add stats with upgrades
  embed.addFields(
    { name: 'Speed', value: formatStatUpgrade(car.speed, stats.speedBonus), inline: true },
    { name: 'Acceleration', value: formatStatUpgrade(car.acceleration, stats.accelerationBonus), inline: true },
    { name: 'Handling', value: formatStatUpgrade(car.handling, stats.handlingBonus), inline: true },
    { name: 'Boost', value: formatStatUpgrade(car.boost, stats.boostBonus), inline: true },
    { name: 'Value', value: `${car.value.toLocaleString()} CR`, inline: true }
  );

  // Add customizations if present
  if (car.primaryColor || car.secondaryColor || car.neonColor || car.licensePlate) {
    let customizations = '';
    if (car.primaryColor) customizations += `Primary: ${car.primaryColor}\n`;
    if (car.secondaryColor) customizations += `Secondary: ${car.secondaryColor}\n`;
    if (car.neonColor) customizations += `Neon: ${car.neonColor}\n`;
    if (car.licensePlate) customizations += `Plate: ${car.licensePlate}\n`;
    
    embed.addFields({ name: 'Appearance', value: customizations, inline: false });
  }
  
  // Add installed parts if present
  if (parts.length > 0) {
    const partsText = parts.map(part => 
      `• ${part.name} (${part.type}) - Tier ${part.tier}`
    ).join('\n');
    
    embed.addFields({ name: 'Installed Parts', value: partsText || 'None', inline: false });
  }

  // Add installed visuals if present
  if (visuals.length > 0) {
    const visualsText = visuals.map(visual => 
      `• ${visual.name} (${visual.type})`
    ).join('\n');
    
    embed.addFields({ name: 'Visual Customizations', value: visualsText || 'None', inline: false });
  }
  
  return embed;
}

// Helper function to get color based on car rarity
function getCarRarityColor(rarity: string): number {
  switch (rarity.toLowerCase()) {
    case 'common': return 0xa5a5a5;
    case 'uncommon': return 0x55aa55;
    case 'rare': return 0x5555ff;
    case 'epic': return 0xaa00aa;
    case 'legendary': return 0xffaa00;
    case 'mythic': return 0xff5555;
    default: return 0xffffff;
  }
}

export function customizationCommands() {
  return [
    {
      name: 'customize',
      aliases: ['custom'],
      description: 'Customize your car with performance parts or visual upgrades',
      args: true,
      usage: '<car_id>',
      cooldown: 2,
      async execute(message: Message, args: string[], storage: IStorage) {
        const discordId = message.author.id;
        const user = await storage.getUserByDiscordId(discordId);
        
        if (!user) {
          await safelySendMessage(message.channel, "You don't have an account yet. Use !register to create one.");
          return;
        }
        
        if (args.length < 1) {
          await safelySendMessage(message.channel, "Please specify a car ID to customize. Usage: !customize <car_id>");
          return;
        }
        
        const carId = parseInt(args[0]);
        if (isNaN(carId)) {
          await safelySendMessage(message.channel, "Please provide a valid car ID.");
          return;
        }
        
        const car = await storage.getCar(carId);
        if (!car) {
          await safelySendMessage(message.channel, "Car not found.");
          return;
        }
        
        if (car.userId !== user.id) {
          await safelySendMessage(message.channel, "You don't own this car.");
          return;
        }
        
        // Get installed parts and visuals
        const carParts = await storage.getCarParts(carId);
        const partsDetails = await Promise.all(
          carParts.map(async cp => await storage.getPerformancePart(cp.partId))
        );
        const validParts = partsDetails.filter(part => part !== undefined) as any[];
        
        const carVisuals = await storage.getCarVisuals(carId);
        const visualsDetails = await Promise.all(
          carVisuals.map(async cv => await storage.getVisualCustomization(cv.visualId))
        );
        const validVisuals = visualsDetails.filter(visual => visual !== undefined) as any[];
        
        // Create the embed for car details
        const embed = await createCarDetailsEmbed(car, validParts, validVisuals);
        
        // Create the buttons for customization options
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('performance')
              .setLabel('Performance Parts')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('visual')
              .setLabel('Visual Customization')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('rename')
              .setLabel('Rename')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('colors')
              .setLabel('Change Colors')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
          );
        
        const response = await message.reply({
          embeds: [embed],
          components: [row]
        });
        
        // Set up collector for button interactions
        const filter = (i: ButtonInteraction) => i.user.id === message.author.id;
        const collector = response.createMessageComponentCollector({ 
          filter, 
          time: 120000, // 2 minute timeout
          componentType: ComponentType.Button
        });
        
        collector.on('collect', async (interaction: ButtonInteraction) => {
          await interaction.deferUpdate();
          
          switch (interaction.customId) {
            case 'performance':
              // Show available performance parts
              await handlePerformanceParts(message, interaction, car, storage, response, validParts);
              break;
              
            case 'visual':
              // Show available visual customizations
              await handleVisualCustomizations(message, interaction, car, storage, response, validVisuals);
              break;
              
            case 'rename':
              // Allow user to rename the car
              await handleRename(message, car, storage, collector, response);
              break;
              
            case 'colors':
              // Allow user to change car colors
              await handleColorChange(message, car, storage, collector, response);
              break;
              
            case 'cancel':
              // End the interaction
              await safelyEditMessage(response, {
                embeds: [embed],
                components: []
              });
              collector.stop();
              break;
          }
        });
        
        collector.on('end', async (collected: ReadonlyCollection<string, ButtonInteraction>, reason: string) => {
          if (reason !== 'messageDelete') {
            try {
              await safelyEditMessage(response, {
                embeds: [embed],
                components: []
              });
            } catch (error) {
              log(`Error in customization command collector end: ${error}`, 'discord');
            }
          }
        });
      }
    },
    {
      name: 'parts',
      description: 'View available performance parts for purchase',
      args: false,
      usage: '',
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const discordId = message.author.id;
        const user = await storage.getUserByDiscordId(discordId);
        
        if (!user) {
          await safelySendMessage(message.channel, "You don't have an account yet. Use !register to create one.");
          return;
        }
        
        // Get all available parts
        const allParts = await storage.getPerformanceParts();
        
        if (allParts.length === 0) {
          await safelySendMessage(message.channel, "There are no performance parts available for purchase at this time.");
          return;
        }
        
        // Group parts by type
        const partsByType = allParts.reduce((acc, part) => {
          if (!acc[part.type]) {
            acc[part.type] = [];
          }
          acc[part.type].push(part);
          return acc;
        }, {} as Record<string, any[]>);
        
        // Create embed for parts shop
        const embed = new EmbedBuilder()
          .setTitle('Performance Parts Shop')
          .setDescription(`Your balance: ${user.balance.toLocaleString()} CR\nUse !buypart <part_id> <car_id> to purchase and install a part.`)
          .setColor(0x0099FF);
        
        // Add each part type and its available parts
        for (const [type, parts] of Object.entries(partsByType)) {
          const typeInfo = PART_TYPES[type as keyof typeof PART_TYPES];
          const partsText = parts
            .sort((a, b) => a.tier - b.tier) // Sort by tier
            .map(part => {
              const stats = [];
              if (part.speedBoost > 0) stats.push(`Speed +${part.speedBoost}`);
              if (part.accelerationBoost > 0) stats.push(`Accel +${part.accelerationBoost}`);
              if (part.handlingBoost > 0) stats.push(`Handling +${part.handlingBoost}`);
              if (part.boostBoost > 0) stats.push(`Boost +${part.boostBoost}`);
              
              return `ID ${part.id} - ${part.name} (Tier ${part.tier}) - ${part.price.toLocaleString()} CR\n• ${stats.join(', ')}`;
            })
            .join('\n\n');
          
          embed.addFields({
            name: `${typeInfo?.name || type}`,
            value: partsText || 'None available',
            inline: false
          });
        }
        
        await safelySendMessage(message.channel, { embeds: [embed] });
      }
    },
    {
      name: 'buypart',
      description: 'Buy and install a performance part on your car',
      args: true,
      usage: '<part_id> <car_id>',
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const discordId = message.author.id;
        const user = await storage.getUserByDiscordId(discordId);
        
        if (!user) {
          await safelySendMessage(message.channel, "You don't have an account yet. Use !register to create one.");
          return;
        }
        
        if (args.length < 2) {
          await safelySendMessage(message.channel, "Please specify both part ID and car ID. Usage: !buypart <part_id> <car_id>");
          return;
        }
        
        const partId = parseInt(args[0]);
        const carId = parseInt(args[1]);
        
        if (isNaN(partId) || isNaN(carId)) {
          await safelySendMessage(message.channel, "Please provide valid part ID and car ID.");
          return;
        }
        
        // Verify part exists
        const part = await storage.getPerformancePart(partId);
        if (!part) {
          await safelySendMessage(message.channel, "Part not found.");
          return;
        }
        
        if (!part.available) {
          await safelySendMessage(message.channel, "This part is not currently available for purchase.");
          return;
        }
        
        // Verify car exists and is owned by user
        const car = await storage.getCar(carId);
        if (!car) {
          await safelySendMessage(message.channel, "Car not found.");
          return;
        }
        
        if (car.userId !== user.id) {
          await safelySendMessage(message.channel, "You don't own this car.");
          return;
        }
        
        // Check if user has enough balance
        if (user.balance < part.price) {
          await safelySendMessage(message.channel, `You don't have enough credits. Part costs ${part.price.toLocaleString()} CR, but you only have ${user.balance.toLocaleString()} CR.`);
          return;
        }
        
        // Check if car already has a part of this type installed
        const carParts = await storage.getCarParts(carId);
        const existingParts = await Promise.all(
          carParts.map(async cp => await storage.getPerformancePart(cp.partId))
        );
        
        const existingPartOfType = existingParts.find(p => p && p.type === part.type);
        let existingPartId = 0;
        
        if (existingPartOfType) {
          // If same tier or higher already installed, prevent downgrade
          if (existingPartOfType.tier >= part.tier) {
            await safelySendMessage(message.channel, `This car already has a ${existingPartOfType.name} (Tier ${existingPartOfType.tier}) installed, which is equal or better than this part.`);
            return;
          }
          
          // Find the carPart id to remove
          const existingCarPart = carParts.find(cp => {
            const foundPart = existingParts.find(p => p && p.id === cp.partId);
            return foundPart && foundPart.type === part.type;
          });
          
          if (existingCarPart) {
            existingPartId = existingCarPart.id;
          }
        }
        
        // Begin transaction
        try {
          // Deduct balance
          await storage.updateUser(user.id, { balance: user.balance - part.price });
          
          // Create transaction record
          await storage.createTransaction({
            userId: user.id,
            type: 'purchase',
            amount: -part.price,
            description: `Purchased ${part.name} (Tier ${part.tier}) for ${car.name}`,
            relatedId: partId
          });
          
          // Remove existing part of same type if any
          if (existingPartId > 0) {
            await storage.removeCarPart(existingPartId);
          }
          
          // Install new part
          await storage.installCarPart({
            carId,
            partId: part.id
          });
          
          // Create activity log
          await storage.createActivityLog({
            type: 'car_upgrade',
            userId: user.id,
            targetId: carId,
            details: {
              partId: part.id,
              partName: part.name,
              carName: car.name
            }
          });
          
          // Send success message
          const embed = new EmbedBuilder()
            .setTitle('Part Installed Successfully')
            .setDescription(`You installed ${part.name} (Tier ${part.tier}) on your ${car.customName || car.name}.`)
            .setColor(0x00FF00)
            .addFields(
              { name: 'Cost', value: `${part.price.toLocaleString()} CR`, inline: true },
              { name: 'Remaining Balance', value: `${(user.balance - part.price).toLocaleString()} CR`, inline: true }
            );
          
          // Add stat improvements
          const statImprovements = [];
          if (part.speedBoost > 0) statImprovements.push(`Speed +${part.speedBoost}`);
          if (part.accelerationBoost > 0) statImprovements.push(`Acceleration +${part.accelerationBoost}`);
          if (part.handlingBoost > 0) statImprovements.push(`Handling +${part.handlingBoost}`);
          if (part.boostBoost > 0) statImprovements.push(`Boost +${part.boostBoost}`);
          
          if (statImprovements.length > 0) {
            embed.addFields({ name: 'Improvements', value: statImprovements.join('\n'), inline: false });
          }
          
          await safelySendMessage(message.channel, { embeds: [embed] });
        } catch (error) {
          log(`Error in buypart command: ${error}`, 'discord');
          await safelySendMessage(message.channel, "An error occurred while processing your purchase.");
        }
      }
    },
    {
      name: 'visuals',
      description: 'View available visual customizations for purchase',
      args: false,
      usage: '',
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const discordId = message.author.id;
        const user = await storage.getUserByDiscordId(discordId);
        
        if (!user) {
          await safelySendMessage(message.channel, "You don't have an account yet. Use !register to create one.");
          return;
        }
        
        // Get all available visual customizations
        const allVisuals = await storage.getVisualCustomizations();
        
        if (allVisuals.length === 0) {
          await safelySendMessage(message.channel, "There are no visual customizations available for purchase at this time.");
          return;
        }
        
        // Group visuals by type
        const visualsByType = allVisuals.reduce((acc, visual) => {
          if (!acc[visual.type]) {
            acc[visual.type] = [];
          }
          acc[visual.type].push(visual);
          return acc;
        }, {} as Record<string, any[]>);
        
        // Create embed for visuals shop
        const embed = new EmbedBuilder()
          .setTitle('Visual Customizations Shop')
          .setDescription(`Your balance: ${user.balance.toLocaleString()} CR\nUse !buyvisual <visual_id> <car_id> to purchase and apply a visual mod.`)
          .setColor(0xFF9900);
        
        // Add each visual type and its available options
        for (const [type, visuals] of Object.entries(visualsByType)) {
          const typeInfo = VISUAL_TYPES[type as keyof typeof VISUAL_TYPES];
          const visualsText = visuals
            .sort((a, b) => a.tier - b.tier) // Sort by tier
            .map(visual => `ID ${visual.id} - ${visual.name} (Tier ${visual.tier}) - ${visual.price.toLocaleString()} CR\n• ${visual.description}`)
            .join('\n\n');
          
          embed.addFields({
            name: `${typeInfo?.name || type}`,
            value: visualsText || 'None available',
            inline: false
          });
        }
        
        await safelySendMessage(message.channel, { embeds: [embed] });
      }
    },
    {
      name: 'buyvisual',
      description: 'Buy and apply a visual customization to your car',
      args: true,
      usage: '<visual_id> <car_id>',
      cooldown: 3,
      async execute(message: Message, args: string[], storage: IStorage) {
        const discordId = message.author.id;
        const user = await storage.getUserByDiscordId(discordId);
        
        if (!user) {
          await safelySendMessage(message.channel, "You don't have an account yet. Use !register to create one.");
          return;
        }
        
        if (args.length < 2) {
          await safelySendMessage(message.channel, "Please specify both visual ID and car ID. Usage: !buyvisual <visual_id> <car_id>");
          return;
        }
        
        const visualId = parseInt(args[0]);
        const carId = parseInt(args[1]);
        
        if (isNaN(visualId) || isNaN(carId)) {
          await safelySendMessage(message.channel, "Please provide valid visual ID and car ID.");
          return;
        }
        
        // Verify visual exists
        const visual = await storage.getVisualCustomization(visualId);
        if (!visual) {
          await safelySendMessage(message.channel, "Visual customization not found.");
          return;
        }
        
        if (!visual.available) {
          await safelySendMessage(message.channel, "This visual customization is not currently available for purchase.");
          return;
        }
        
        // Verify car exists and is owned by user
        const car = await storage.getCar(carId);
        if (!car) {
          await safelySendMessage(message.channel, "Car not found.");
          return;
        }
        
        if (car.userId !== user.id) {
          await safelySendMessage(message.channel, "You don't own this car.");
          return;
        }
        
        // Check if user has enough balance
        if (user.balance < visual.price) {
          await safelySendMessage(message.channel, `You don't have enough credits. Visual mod costs ${visual.price.toLocaleString()} CR, but you only have ${user.balance.toLocaleString()} CR.`);
          return;
        }
        
        // Check if car already has a visual of this type installed
        const carVisuals = await storage.getCarVisuals(carId);
        const existingVisuals = await Promise.all(
          carVisuals.map(async cv => await storage.getVisualCustomization(cv.visualId))
        );
        
        const existingVisualOfType = existingVisuals.find(v => v && v.type === visual.type);
        let existingVisualId = 0;
        
        if (existingVisualOfType) {
          // Find the carVisual id to remove
          const existingCarVisual = carVisuals.find(cv => {
            const foundVisual = existingVisuals.find(v => v && v.id === cv.visualId);
            return foundVisual && foundVisual.type === visual.type;
          });
          
          if (existingCarVisual) {
            existingVisualId = existingCarVisual.id;
          }
        }
        
        // Begin transaction
        try {
          // Deduct balance
          await storage.updateUser(user.id, { balance: user.balance - visual.price });
          
          // Create transaction record
          await storage.createTransaction({
            userId: user.id,
            type: 'purchase',
            amount: -visual.price,
            description: `Purchased ${visual.name} visual for ${car.name}`,
            relatedId: visualId
          });
          
          // Remove existing visual of same type if any
          if (existingVisualId > 0) {
            await storage.removeCarVisual(existingVisualId);
          }
          
          // Install new visual
          await storage.installCarVisual({
            carId,
            visualId: visual.id
          });
          
          // Create activity log
          await storage.createActivityLog({
            type: 'car_visual',
            userId: user.id,
            targetId: carId,
            details: {
              visualId: visual.id,
              visualName: visual.name,
              carName: car.name
            }
          });
          
          // Send success message
          const embed = new EmbedBuilder()
            .setTitle('Visual Customization Applied')
            .setDescription(`You installed ${visual.name} on your ${car.customName || car.name}.`)
            .setColor(0xFF9900)
            .addFields(
              { name: 'Cost', value: `${visual.price.toLocaleString()} CR`, inline: true },
              { name: 'Remaining Balance', value: `${(user.balance - visual.price).toLocaleString()} CR`, inline: true },
              { name: 'Description', value: visual.description || "No description available", inline: false }
            );
          
          await safelySendMessage(message.channel, { embeds: [embed] });
        } catch (error) {
          log(`Error in buyvisual command: ${error}`, 'discord');
          await safelySendMessage(message.channel, "An error occurred while processing your purchase.");
        }
      }
    }
  ];
}

// Helper function to safely edit a message
async function safelyEditMessage(message: Message, options: string | MessagePayload | MessageEditOptions) {
  try {
    await message.edit(options);
  } catch (error) {
    log(`Error editing message: ${error}`, 'discord');
  }
}

// Handler for performance parts customization
async function handlePerformanceParts(message: Message, interaction: ButtonInteraction, car: any, storage: IStorage, response: Message, installedParts: any[]) {
  // Get all available performance parts
  const availableParts = await storage.getPerformanceParts();
  
  // Group by part type for easier display
  const partsByType = availableParts.reduce((acc, part) => {
    if (!acc[part.type]) {
      acc[part.type] = [];
    }
    acc[part.type].push(part);
    return acc;
  }, {} as Record<string, any[]>);
  
  // Create embed for parts selection
  const embed = new EmbedBuilder()
    .setTitle(`Performance Parts - ${car.customName || car.name}`)
    .setDescription(`Select a part type to view available parts.\nCurrently installed parts will be replaced if you buy a new part of the same type.`)
    .setColor(0x0099FF);
  
  // Add installed parts section if any
  if (installedParts.length > 0) {
    const installedPartsText = installedParts.map(part => 
      `• ${part.name} (${part.type}) - Tier ${part.tier}`
    ).join('\n');
    
    embed.addFields({ name: 'Currently Installed Parts', value: installedPartsText, inline: false });
  }
  
  // Create buttons for each part type
  const buttons = Object.keys(PART_TYPES).map(type => {
    const typeInfo = PART_TYPES[type as keyof typeof PART_TYPES];
    return new ButtonBuilder()
      .setCustomId(`part_${type}`)
      .setLabel(typeInfo.name)
      .setStyle(ButtonStyle.Primary);
  });
  
  // Add back button
  buttons.push(
    new ButtonBuilder()
      .setCustomId('back')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
  );
  
  // Create button rows (max 5 buttons per row)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    buttons.slice(i, i + 5).forEach(button => row.addComponents(button));
    rows.push(row);
  }
  
  // Update message with parts selection
  await safelyEditMessage(response, {
    embeds: [embed],
    components: rows
  });
  
  // Set up collector for part type selection
  const filter = (i: ButtonInteraction) => i.user.id === message.author.id;
  const collector = response.createMessageComponentCollector({ 
    filter, 
    time: 60000, // 1 minute timeout
    componentType: ComponentType.Button
  });
  
  collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
    await buttonInteraction.deferUpdate();
    
    if (buttonInteraction.customId === 'back') {
      // Return to main customize menu
      collector.stop();
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
      return;
    }
    
    // Handle part type selection
    if (buttonInteraction.customId.startsWith('part_')) {
      const selectedType = buttonInteraction.customId.replace('part_', '');
      const partsOfType = partsByType[selectedType] || [];
      
      if (partsOfType.length === 0) {
        // No parts of this type available
        const typeInfo = PART_TYPES[selectedType as keyof typeof PART_TYPES];
        
        const noPartsEmbed = new EmbedBuilder()
          .setTitle(`No ${typeInfo?.name || selectedType} Parts Available`)
          .setDescription(`There are currently no ${typeInfo?.name || selectedType} parts available for purchase.`)
          .setColor(0xFF0000);
        
        await safelyEditMessage(response, {
          embeds: [noPartsEmbed],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('back_to_parts')
                  .setLabel('Back to Part Types')
                  .setStyle(ButtonStyle.Secondary)
              )
          ]
        });
        
        // Don't stop collector, let user go back
        return;
      }
      
      // Show parts of selected type
      const typeInfo = PART_TYPES[selectedType as keyof typeof PART_TYPES];
      const partsEmbed = new EmbedBuilder()
        .setTitle(`${typeInfo?.name || selectedType} Parts`)
        .setDescription(`Select a part to purchase and install on your ${car.customName || car.name}.`)
        .setColor(0x0099FF);
      
      // Check if user already has a part of this type installed
      const installedPart = installedParts.find(p => p.type === selectedType);
      if (installedPart) {
        partsEmbed.addFields({ 
          name: 'Currently Installed', 
          value: `${installedPart.name} (Tier ${installedPart.tier})`, 
          inline: false 
        });
      }
      
      // Add available parts
      partsOfType.sort((a, b) => a.tier - b.tier).forEach(part => {
        const stats = [];
        if (part.speedBoost > 0) stats.push(`Speed +${part.speedBoost}`);
        if (part.accelerationBoost > 0) stats.push(`Accel +${part.accelerationBoost}`);
        if (part.handlingBoost > 0) stats.push(`Handling +${part.handlingBoost}`);
        if (part.boostBoost > 0) stats.push(`Boost +${part.boostBoost}`);
        
        partsEmbed.addFields({
          name: `${part.name} (Tier ${part.tier}) - ${part.price.toLocaleString()} CR`,
          value: `${part.description || 'No description'}\n${stats.join(', ')}`,
          inline: false
        });
      });
      
      // Create buttons for parts
      const partButtons = partsOfType.map(part => {
        // Check if this part is lower tier than what's already installed
        const isDowngrade = installedPart && part.tier < installedPart.tier;
        
        return new ButtonBuilder()
          .setCustomId(`buy_part_${part.id}`)
          .setLabel(`Tier ${part.tier} - ${part.price.toLocaleString()} CR`)
          .setStyle(isDowngrade ? ButtonStyle.Danger : ButtonStyle.Success)
          .setDisabled(isDowngrade); // Disable downgrade options
      });
      
      // Add back button
      partButtons.push(
        new ButtonBuilder()
          .setCustomId('back_to_parts')
          .setLabel('Back to Part Types')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Create button rows (max 5 buttons per row)
      const partRows = [];
      for (let i = 0; i < partButtons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        partButtons.slice(i, i + 5).forEach(button => row.addComponents(button));
        partRows.push(row);
      }
      
      // Update message with parts list
      await safelyEditMessage(response, {
        embeds: [partsEmbed],
        components: partRows
      });
      
      return;
    }
    
    // Handle back to part types
    if (buttonInteraction.customId === 'back_to_parts') {
      // Go back to part type selection
      await safelyEditMessage(response, {
        embeds: [embed],
        components: rows
      });
      return;
    }
    
    // Handle part purchase
    if (buttonInteraction.customId.startsWith('buy_part_')) {
      const partId = parseInt(buttonInteraction.customId.replace('buy_part_', ''));
      
      // Execute buypart command
      collector.stop();
      await customizationCommands()[2].execute(message, [partId.toString(), car.id.toString()], storage);
      return;
    }
  });
  
  collector.on('end', async (collected: ReadonlyCollection<string, ButtonInteraction>, reason: string) => {
    if (reason !== 'messageDelete' && reason !== 'user') {
      try {
        // If the collector timed out, remove buttons
        await safelyEditMessage(response, {
          embeds: [embed],
          components: []
        });
      } catch (error) {
        log(`Error in performance parts collector end: ${error}`, 'discord');
      }
    }
  });
}

// Handler for visual customizations
async function handleVisualCustomizations(message: Message, interaction: ButtonInteraction, car: any, storage: IStorage, response: Message, installedVisuals: any[]) {
  // Get all available visual customizations
  const availableVisuals = await storage.getVisualCustomizations();
  
  // Group by visual type for easier display
  const visualsByType = availableVisuals.reduce((acc, visual) => {
    if (!acc[visual.type]) {
      acc[visual.type] = [];
    }
    acc[visual.type].push(visual);
    return acc;
  }, {} as Record<string, any[]>);
  
  // Create embed for visuals selection
  const embed = new EmbedBuilder()
    .setTitle(`Visual Customizations - ${car.customName || car.name}`)
    .setDescription(`Select a visual type to view available customizations.\nCurrently installed visuals will be replaced if you buy a new one of the same type.`)
    .setColor(0xFF9900);
  
  // Add installed visuals section if any
  if (installedVisuals.length > 0) {
    const installedVisualsText = installedVisuals.map(visual => 
      `• ${visual.name} (${visual.type})`
    ).join('\n');
    
    embed.addFields({ name: 'Currently Installed Visuals', value: installedVisualsText, inline: false });
  }
  
  // Create buttons for each visual type
  const buttons = Object.keys(VISUAL_TYPES).map(type => {
    const typeInfo = VISUAL_TYPES[type as keyof typeof VISUAL_TYPES];
    return new ButtonBuilder()
      .setCustomId(`visual_${type}`)
      .setLabel(typeInfo.name)
      .setStyle(ButtonStyle.Primary);
  });
  
  // Add back button
  buttons.push(
    new ButtonBuilder()
      .setCustomId('back')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
  );
  
  // Create button rows (max 5 buttons per row)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    buttons.slice(i, i + 5).forEach(button => row.addComponents(button));
    rows.push(row);
  }
  
  // Update message with visuals selection
  await safelyEditMessage(response, {
    embeds: [embed],
    components: rows
  });
  
  // Set up collector for visual type selection
  const filter = (i: ButtonInteraction) => i.user.id === message.author.id;
  const collector = response.createMessageComponentCollector({ 
    filter, 
    time: 60000, // 1 minute timeout
    componentType: ComponentType.Button
  });
  
  collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
    await buttonInteraction.deferUpdate();
    
    if (buttonInteraction.customId === 'back') {
      // Return to main customize menu
      collector.stop();
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
      return;
    }
    
    // Handle visual type selection
    if (buttonInteraction.customId.startsWith('visual_')) {
      const selectedType = buttonInteraction.customId.replace('visual_', '');
      const visualsOfType = visualsByType[selectedType] || [];
      
      if (visualsOfType.length === 0) {
        // No visuals of this type available
        const typeInfo = VISUAL_TYPES[selectedType as keyof typeof VISUAL_TYPES];
        
        const noVisualsEmbed = new EmbedBuilder()
          .setTitle(`No ${typeInfo?.name || selectedType} Customizations Available`)
          .setDescription(`There are currently no ${typeInfo?.name || selectedType} customizations available for purchase.`)
          .setColor(0xFF0000);
        
        await safelyEditMessage(response, {
          embeds: [noVisualsEmbed],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('back_to_visuals')
                  .setLabel('Back to Visual Types')
                  .setStyle(ButtonStyle.Secondary)
              )
          ]
        });
        
        // Don't stop collector, let user go back
        return;
      }
      
      // Show visuals of selected type
      const typeInfo = VISUAL_TYPES[selectedType as keyof typeof VISUAL_TYPES];
      const visualsEmbed = new EmbedBuilder()
        .setTitle(`${typeInfo?.name || selectedType} Customizations`)
        .setDescription(`Select a customization to purchase and apply to your ${car.customName || car.name}.`)
        .setColor(0xFF9900);
      
      // Check if user already has a visual of this type installed
      const installedVisual = installedVisuals.find(v => v.type === selectedType);
      if (installedVisual) {
        visualsEmbed.addFields({ 
          name: 'Currently Installed', 
          value: installedVisual.name, 
          inline: false 
        });
      }
      
      // Add available visuals
      visualsOfType.sort((a, b) => a.tier - b.tier).forEach(visual => {
        visualsEmbed.addFields({
          name: `${visual.name} (Tier ${visual.tier}) - ${visual.price.toLocaleString()} CR`,
          value: visual.description || 'No description',
          inline: false
        });
      });
      
      // Create buttons for visuals
      const visualButtons = visualsOfType.map(visual => {
        return new ButtonBuilder()
          .setCustomId(`buy_visual_${visual.id}`)
          .setLabel(`${visual.name} - ${visual.price.toLocaleString()} CR`)
          .setStyle(ButtonStyle.Success);
      });
      
      // Add back button
      visualButtons.push(
        new ButtonBuilder()
          .setCustomId('back_to_visuals')
          .setLabel('Back to Visual Types')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Create button rows (max 5 buttons per row)
      const visualRows = [];
      for (let i = 0; i < visualButtons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        visualButtons.slice(i, i + 5).forEach(button => row.addComponents(button));
        visualRows.push(row);
      }
      
      // Update message with visuals list
      await safelyEditMessage(response, {
        embeds: [visualsEmbed],
        components: visualRows
      });
      
      return;
    }
    
    // Handle back to visual types
    if (buttonInteraction.customId === 'back_to_visuals') {
      // Go back to visual type selection
      await safelyEditMessage(response, {
        embeds: [embed],
        components: rows
      });
      return;
    }
    
    // Handle visual purchase
    if (buttonInteraction.customId.startsWith('buy_visual_')) {
      const visualId = parseInt(buttonInteraction.customId.replace('buy_visual_', ''));
      
      // Execute buyvisual command
      collector.stop();
      await customizationCommands()[4].execute(message, [visualId.toString(), car.id.toString()], storage);
      return;
    }
  });
  
  collector.on('end', async (collected: ReadonlyCollection<string, ButtonInteraction>, reason: string) => {
    if (reason !== 'messageDelete' && reason !== 'user') {
      try {
        // If the collector timed out, remove buttons
        await safelyEditMessage(response, {
          embeds: [embed],
          components: []
        });
      } catch (error) {
        log(`Error in visual customizations collector end: ${error}`, 'discord');
      }
    }
  });
}

// Handler for renaming cars
async function handleRename(message: Message, car: any, storage: IStorage, collector: InteractionCollector<ButtonInteraction>, response: Message) {
  // Create embed for renaming
  const embed = new EmbedBuilder()
    .setTitle(`Rename Your Car - ${car.name}`)
    .setDescription(`Please enter a new name for your car. Type a new name in the chat.\nCurrent name: ${car.customName || car.name}`)
    .setColor(0x5555FF);
  
  // Update message
  await safelyEditMessage(response, {
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('cancel_rename')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
    ]
  });
  
  // Create a message collector for the rename
  const filter = (m: Message) => m.author.id === message.author.id;
  const messageCollector = (message.channel as TextChannel).createMessageCollector({ filter, time: 60000, max: 1 });
  
  messageCollector.on('collect', async (m: Message) => {
    // Prevent default collection behavior
    collector.stop('user');
    
    const newName = m.content.trim();
    
    // Validate name
    if (newName.length < 1 || newName.length > 30) {
      await safelySendMessage(message.channel, "Car name must be between 1 and 30 characters.");
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
      return;
    }
    
    // Update car name
    await storage.updateCar(car.id, { customName: newName });
    
    // Create activity log
    await storage.createActivityLog({
      type: 'car_rename',
      userId: car.userId,
      targetId: car.id,
      details: {
        oldName: car.customName || car.name,
        newName
      }
    });
    
    // Send success message
    const successEmbed = new EmbedBuilder()
      .setTitle('Car Renamed')
      .setDescription(`Your car has been renamed from "${car.customName || car.name}" to "${newName}".`)
      .setColor(0x00FF00);
    
    await safelySendMessage(message.channel, { embeds: [successEmbed] });
    
    // Delete the user's message
    try {
      await safelyDeleteMessage(m);
    } catch (error) {
      // Ignore delete errors
    }
    
    // Reopen the customize menu with the updated car
    await customizationCommands()[0].execute(message, [car.id.toString()], storage);
  });
  
  // Watch for cancel button
  const buttonFilter = (i: ButtonInteraction) => i.user.id === message.author.id && i.customId === 'cancel_rename';
  const buttonCollector = response.createMessageComponentCollector({ 
    filter: buttonFilter, 
    time: 60000,
    componentType: ComponentType.Button
  });
  
  buttonCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
    await buttonInteraction.deferUpdate();
    messageCollector.stop();
    buttonCollector.stop();
    collector.stop('user');
    
    // Return to main customize menu
    await customizationCommands()[0].execute(message, [car.id.toString()], storage);
  });
  
  messageCollector.on('end', async (collected: ReadonlyCollection<string, Message<boolean>>, reason: string) => {
    buttonCollector.stop();
    
    if (reason === 'time' && collected.size === 0) {
      // If timed out with no input
      await safelySendMessage(message.channel, "Car rename timed out.");
      
      // Return to main customize menu
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
    }
  });
}

// Handler for changing car colors
async function handleColorChange(message: Message, car: any, storage: IStorage, collector: InteractionCollector<ButtonInteraction>, response: Message) {
  // Create embed for color selection
  const embed = new EmbedBuilder()
    .setTitle(`Change Car Colors - ${car.customName || car.name}`)
    .setDescription(`Select which color you want to change.`)
    .setColor(0xFF00FF);
  
  // Add current colors if any
  const colorFields = [];
  if (car.primaryColor) colorFields.push({ name: 'Primary Color', value: car.primaryColor, inline: true });
  if (car.secondaryColor) colorFields.push({ name: 'Secondary Color', value: car.secondaryColor, inline: true });
  if (car.neonColor) colorFields.push({ name: 'Neon Color', value: car.neonColor, inline: true });
  
  if (colorFields.length > 0) {
    embed.addFields(colorFields);
  }
  
  // Update message
  await safelyEditMessage(response, {
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('primary_color')
            .setLabel('Change Primary Color')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('secondary_color')
            .setLabel('Change Secondary Color')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('neon_color')
            .setLabel('Change Neon Color')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('cancel_color')
            .setLabel('Back')
            .setStyle(ButtonStyle.Danger)
        )
    ]
  });
  
  // Set up collector for color selection
  const colorFilter = (i: ButtonInteraction) => i.user.id === message.author.id;
  const colorCollector = response.createMessageComponentCollector({ 
    filter: colorFilter, 
    time: 60000,
    componentType: ComponentType.Button
  });
  
  colorCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
    await buttonInteraction.deferUpdate();
    
    if (buttonInteraction.customId === 'cancel_color') {
      colorCollector.stop();
      
      // Return to main customize menu
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
      return;
    }
    
    let colorType = '';
    let colorTitle = '';
    
    switch (buttonInteraction.customId) {
      case 'primary_color':
        colorType = 'primaryColor';
        colorTitle = 'Primary Color';
        break;
      case 'secondary_color':
        colorType = 'secondaryColor';
        colorTitle = 'Secondary Color';
        break;
      case 'neon_color':
        colorType = 'neonColor';
        colorTitle = 'Neon Color';
        break;
    }
    
    if (!colorType) return;
    
    // Create embed for color input
    const colorEmbed = new EmbedBuilder()
      .setTitle(`Change ${colorTitle} - ${car.customName || car.name}`)
      .setDescription(`Enter a color name or hex code for the ${colorTitle.toLowerCase()}.\nExamples: Red, Blue, Green, Metallic Silver, #FF0000, #00FF00`)
      .setColor(0xFF00FF);
    
    if (car[colorType]) {
      colorEmbed.addFields({ name: 'Current Color', value: car[colorType], inline: true });
    }
    
    // Update message
    await safelyEditMessage(response, {
      embeds: [colorEmbed],
      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('cancel_color_input')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
          )
      ]
    });
    
    // Create a message collector for the color input
    const messageFilter = (m: Message) => m.author.id === message.author.id;
    const messageCollector = (message.channel as TextChannel).createMessageCollector({ filter: messageFilter, time: 60000, max: 1 });
    
    messageCollector.on('collect', async (m: Message) => {
      colorCollector.stop('user');
      collector.stop('user');
      
      const newColor = m.content.trim();
      
      // Validate color
      if (newColor.length < 1 || newColor.length > 30) {
        await safelySendMessage(message.channel, "Color must be between 1 and 30 characters.");
        await customizationCommands()[0].execute(message, [car.id.toString()], storage);
        return;
      }
      
      // Update car color
      const updateData: any = {};
      updateData[colorType] = newColor;
      await storage.updateCar(car.id, updateData);
      
      // Create activity log
      await storage.createActivityLog({
        type: 'car_color_change',
        userId: car.userId,
        targetId: car.id,
        details: {
          colorType,
          oldColor: car[colorType] || 'None',
          newColor
        }
      });
      
      // Send success message
      const successEmbed = new EmbedBuilder()
        .setTitle('Car Color Changed')
        .setDescription(`Your ${car.customName || car.name}'s ${colorTitle.toLowerCase()} has been changed to "${newColor}".`)
        .setColor(0x00FF00);
      
      await safelySendMessage(message.channel, { embeds: [successEmbed] });
      
      // Delete the user's message
      try {
        await safelyDeleteMessage(m);
      } catch (error) {
        // Ignore delete errors
      }
      
      // Reopen the customize menu with the updated car
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
    });
    
    // Watch for cancel button
    const cancelFilter = (i: ButtonInteraction) => 
      i.user.id === message.author.id && i.customId === 'cancel_color_input';
    
    const cancelCollector = response.createMessageComponentCollector({ 
      filter: cancelFilter, 
      time: 60000,
      componentType: ComponentType.Button
    });
    
    cancelCollector.on('collect', async (cancelInteraction: ButtonInteraction) => {
      await cancelInteraction.deferUpdate();
      messageCollector.stop();
      cancelCollector.stop();
      colorCollector.stop();
      
      // Return to color selection menu
      await handleColorChange(message, car, storage, collector, response);
    });
    
    messageCollector.on('end', async (collected: ReadonlyCollection<string, Message<boolean>>, reason: string) => {
      cancelCollector.stop();
      
      if (reason === 'time' && collected.size === 0) {
        // If timed out with no input
        await safelySendMessage(message.channel, "Color change timed out.");
        
        // Return to main customize menu
        await customizationCommands()[0].execute(message, [car.id.toString()], storage);
      }
    });
  });
  
  colorCollector.on('end', async (collected: ReadonlyCollection<string, ButtonInteraction>, reason: string) => {
    if (reason !== 'messageDelete' && reason !== 'user') {
      // If timed out
      collector.stop();
      await safelySendMessage(message.channel, "Color selection timed out.");
      
      // Return to main customize menu
      await customizationCommands()[0].execute(message, [car.id.toString()], storage);
    }
  });
}

export function setupCustomizationSystem(client: Client) {
  log('Car customization system initialized', 'discord');
}