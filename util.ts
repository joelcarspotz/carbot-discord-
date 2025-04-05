import { Message, MessageCreateOptions, MessagePayloadOption, TextChannel } from "discord.js";
import { log } from "../vite";

// Helper function to safely send a message, handling potential errors
export async function safelySendMessage(
  channel: TextChannel | any,
  content: string | MessageCreateOptions | MessagePayloadOption
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

// Format a number with commas
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format a timestamp
export function formatTimestamp(timestamp: Date | number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Calculate time difference in a human-readable format
export function getTimeDifference(date1: Date, date2: Date): string {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  } else {
    return `${diffSecs} second${diffSecs !== 1 ? 's' : ''}`;
  }
}

// Calculate time until a given date/time
export function getTimeUntil(targetDate: Date | number | string): string {
  const now = new Date();
  const target = new Date(targetDate);
  
  if (now >= target) {
    return "now";
  }
  
  return getTimeDifference(now, target);
}

// Generate random hex color
export function randomColor(): number {
  return Math.floor(Math.random() * 0xFFFFFF);
}

// Truncate string to a certain length
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

// Check if a string is a valid hex color
export function isHexColor(str: string): boolean {
  return /^#([0-9A-F]{3}){1,2}$/i.test(str);
}

// Convert a hex color string to a Discord color integer
export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// Parse a duration string like "1d", "2h", "30m" into milliseconds
export function parseDuration(durationStr: string): number | null {
  const match = durationStr.match(/^(\d+)([dhms])$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return null;
  }
}

// Format a duration in milliseconds to a readable string
export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.join(' ') || '0s';
}

// Check if a user's cooldown has expired
export function isCooldownExpired(lastTime: Date | null, cooldownHours: number): boolean {
  if (!lastTime) return true;
  
  const now = new Date();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const timeSinceLastUse = now.getTime() - new Date(lastTime).getTime();
  
  return timeSinceLastUse >= cooldownMs;
}

// Format time until cooldown expires
export function formatCooldownRemaining(lastTime: Date | null, cooldownHours: number): string {
  if (!lastTime) return "now";
  
  const now = new Date();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const expirationTime = new Date(new Date(lastTime).getTime() + cooldownMs);
  
  if (now >= expirationTime) {
    return "now";
  }
  
  return getTimeDifference(now, expirationTime);
}

// Calculate average of a number array
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// Get a random integer between min and max (inclusive)
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get a weighted random item from a list
export function getWeightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length || items.length === 0) {
    throw new Error("Items and weights must be non-empty arrays of the same length");
  }
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1]; // Fallback
}

// Generate a unique ID (useful for tracking specific interactions)
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Sleep function for async/await delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calculate the effective stats of a car taking into account parts and driver skills
export function calculateEffectiveCarStats(
  car: any, 
  parts: any[] = [], 
  driverSkills: any = null, 
  weatherCondition: string = 'CLEAR'
): { speed: number; acceleration: number; handling: number; boost: number } {
  // Base stats
  let speed = car.speed;
  let acceleration = car.acceleration;
  let handling = car.handling;
  let boost = car.boost;
  
  // Apply part bonuses
  for (const part of parts) {
    speed += part.speedBoost || 0;
    acceleration += part.accelerationBoost || 0;
    handling += part.handlingBoost || 0;
    boost += part.boostBoost || 0;
  }
  
  // Apply driver skill bonuses if provided
  if (driverSkills) {
    // Example skills: circuit, drag, drift
    // Add skill bonuses based on their levels
    if (driverSkills.circuit) {
      const level = driverSkills.circuit.level || 1;
      handling += (level - 1) * 2; // +2 handling per level above 1
    }
    
    if (driverSkills.drag) {
      const level = driverSkills.drag.level || 1;
      acceleration += (level - 1) * 2; // +2 acceleration per level above 1
    }
    
    if (driverSkills.drift) {
      const level = driverSkills.drift.level || 1;
      handling += (level - 1); // +1 handling per level above 1
      boost += (level - 1); // +1 boost per level above 1
    }
  }
  
  // Apply weather condition effects
  // This would come from a constants file in a real implementation
  const weatherEffects: Record<string, { speed: number; acceleration: number; handling: number }> = {
    CLEAR: { speed: 1.0, acceleration: 1.0, handling: 1.0 },
    RAIN: { speed: 0.9, acceleration: 0.85, handling: 0.7 },
    SNOW: { speed: 0.7, acceleration: 0.6, handling: 0.5 },
    FOG: { speed: 0.8, acceleration: 0.9, handling: 0.85 },
    NIGHT: { speed: 0.9, acceleration: 0.95, handling: 0.85 },
    HEAT: { speed: 0.85, acceleration: 0.8, handling: 0.95 }
  };
  
  const effects = weatherEffects[weatherCondition] || weatherEffects.CLEAR;
  
  // Apply weather multipliers
  speed *= effects.speed;
  acceleration *= effects.acceleration;
  handling *= effects.handling;
  
  return {
    speed: Math.round(speed),
    acceleration: Math.round(acceleration),
    handling: Math.round(handling),
    boost: Math.round(boost)
  };
}