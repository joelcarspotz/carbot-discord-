import { InsertCar, CAR_RARITIES, CAR_KEYS } from "@shared/schema";

// Car types with their base stats
const CAR_TYPES = [
  { 
    name: "Sedan", 
    baseStats: { speed: 65, acceleration: 60, handling: 70, boost: 55 }
  },
  { 
    name: "Sports Car", 
    baseStats: { speed: 85, acceleration: 80, handling: 75, boost: 70 }
  },
  { 
    name: "SUV", 
    baseStats: { speed: 60, acceleration: 55, handling: 65, boost: 75 },

  },
  { 
    name: "Truck", 
    baseStats: { speed: 50, acceleration: 45, handling: 55, boost: 80 },

  },
  { 
    name: "Compact", 
    baseStats: { speed: 70, acceleration: 75, handling: 80, boost: 60 },

  },
  { 
    name: "Supercar", 
    baseStats: { speed: 95, acceleration: 90, handling: 85, boost: 80 },

  },
  { 
    name: "Classic", 
    baseStats: { speed: 75, acceleration: 65, handling: 60, boost: 65 },
 
  },
  { 
    name: "Electric", 
    baseStats: { speed: 90, acceleration: 95, handling: 80, boost: 75 },

  },
  { 
    name: "Luxury", 
    baseStats: { speed: 80, acceleration: 75, handling: 85, boost: 70 },

  },
  { 
    name: "Muscle", 
    baseStats: { speed: 85, acceleration: 80, handling: 60, boost: 90 },

  },
  { 
    name: "Off-Road", 
    baseStats: { speed: 65, acceleration: 75, handling: 70, boost: 95 },

  },
  { 
    name: "Racing", 
    baseStats: { speed: 100, acceleration: 95, handling: 90, boost: 85 },

  }
];

// Car names/models
const CAR_MODELS = [
  // Speed-themed names
  "Turbo", "Blaze", "Thunder", "Lightning", "Bolt", "Flash", "Dash", "Streak", "Rocket", "Missile",
  "Comet", "Meteor", "Jet", "Zoom", "Sprint", "Velocity", "Nitro", "Boost", "Rush", "Surge",
  
  // Animal-themed names
  "Phantom", "Shadow", "Ghost", "Venom", "Cobra", "Viper", "Dragon", "Phoenix", "Hawk", "Eagle", 
  "Falcon", "Tiger", "Panther", "Cheetah", "Leopard", "Jaguar", "Mustang", "Stallion", "Wolf", "Fox", 
  "Raptor", "Scorpion", "Spider", "Lion", "Bear", "Shark", "Rhino", "Mantis", "Hornet", "Bull",
  
  // Outlaw/Rebel names
  "Maverick", "Renegade", "Outlaw", "Rebel", "Bandit", "Pirate", "Ninja", "Samurai", "Ronin", "Shogun", 
  "Desperado", "Gunslinger", "Vagabond", "Marauder", "Hunter", "Raider", "Prowler", "Stalker", "Drifter", "Nomad",
  
  // Nobility/Authority names
  "Emperor", "King", "Queen", "Prince", "Duke", "Baron", "Knight", "Paladin", "Crusader", "Templar", 
  "Sentinel", "Guardian", "Protector", "Defender", "Champion", "Warden", "Ruler", "Commander", "Captain", "Chief",
  
  // Elemental/Natural force names
  "Inferno", "Tsunami", "Cyclone", "Hurricane", "Tornado", "Avalanche", "Volcano", "Earthquake", "Storm", "Tempest",
  "Monsoon", "Typhoon", "Whirlwind", "Blizzard", "Frost", "Flame", "Magma", "Plasma", "Quasar", "Nebula",
  
  // Numeric/Technical models
  "GT500", "RS7", "Z1000", "X500", "V12", "S9", "R8", "P1", "M5", "C7", 
  "A8", "T10", "H7", "K9", "L5", "GTX", "EVO", "PRO", "MAX", "ELITE"
];

// Brand names
const CAR_BRANDS = [
  // Cosmic/Space-themed brands
  "Apex", "Velocity", "Horizon", "Quantum", "Nebula", "Stellar", "Cosmic", "Eclipse", "Nova", "Pulsar",
  "Galaxy", "Andromeda", "Orion", "Celestial", "Interstellar", "Astral", "Solar", "Lunar", "Meteor", "Comet",
  
  // Mythological brands
  "Phoenix", "Dragon", "Titan", "Atlas", "Olympus", "Zeus", "Apollo", "Hermes", "Ares", "Poseidon", 
  "Hades", "Athena", "Artemis", "Mercury", "Jupiter", "Saturn", "Neptune", "Pluto", "Mars", "Venus",
  
  // Advanced/Tech brands
  "Hyperion", "Technica", "Futuro", "Innovate", "Nexus", "Prime", "Paramount", "Zenith", "Vertex", "Synergy",
  "Precision", "Quantum", "Fusion", "Cipher", "Circuit", "Binary", "Vector", "Matrix", "Cyber", "Neural",
  
  // Strong/Powerful brands
  "Titan", "Colossus", "Goliath", "Mammoth", "Behemoth", "Juggernaut", "Leviathan", "Kraken", "Hydra", "Chimera",
  "Griffin", "Pegasus", "Centaur", "Minotaur", "Cyclops", "Cerberus", "Basilisk", "Wyvern", "Manticore", "Sphinx",
  
  // Premium/Luxury brands
  "Sovereign", "Imperial", "Royal", "Majestic", "Prestige", "Elegance", "Opulence", "Grandeur", "Regal", "Aristocrat",
  "Marquis", "Dynasty", "Heritage", "Legacy", "Emblem", "Insignia", "Crest", "Crown", "Scepter", "Monarch"
];

/**
 * Roll for a rarity based on the chances defined in CAR_RARITIES
 * @returns The rarity key (e.g., "COMMON", "RARE", etc.)
 */
export function rollForRarity(): keyof typeof CAR_RARITIES {
  const roll = Math.random();
  let cumulativeChance = 0;
  
  for (const [key, data] of Object.entries(CAR_RARITIES)) {
    cumulativeChance += data.chance;
    if (roll <= cumulativeChance) {
      return key as keyof typeof CAR_RARITIES;
    }
  }
  
  // Fallback to COMMON if somehow the roll doesn't match (shouldn't happen)
  return "COMMON";
}

/**
 * Generate a random car with stats based on rarity
 * @param userId The ID of the user who will own the car
 * @param forcedRarity Optional rarity to force (for testing/rewards)
 * @returns Car object ready to be inserted into database
 */
export function generateRandomCar(userId: number, forcedRarity?: keyof typeof CAR_RARITIES): InsertCar {
  // Determine rarity
  const rarityKey = forcedRarity || rollForRarity();
  
  // Get rarity info (now fully type-safe)
  const rarity = CAR_RARITIES[rarityKey].name;
  const valueMultiplier = CAR_RARITIES[rarityKey].valueMultiplier;
  
  // Pick a random car type
  const carTypeIndex = Math.floor(Math.random() * CAR_TYPES.length);
  const carType = CAR_TYPES[carTypeIndex];
  
  // Pick a random model name
  const brandIndex = Math.floor(Math.random() * CAR_BRANDS.length);
  const modelIndex = Math.floor(Math.random() * CAR_MODELS.length);
  const carName = `${CAR_BRANDS[brandIndex]} ${CAR_MODELS[modelIndex]}`;
  
  // No longer using images
  
  // Calculate stats based on rarity (10-20% boost per rarity level)
  const rarityStatBoost = Math.max(1, valueMultiplier * 0.8); // Scale with value multiplier
  
  const speed = Math.round(carType.baseStats.speed * rarityStatBoost);
  const acceleration = Math.round(carType.baseStats.acceleration * rarityStatBoost);
  const handling = Math.round(carType.baseStats.handling * rarityStatBoost);
  const boost = Math.round(carType.baseStats.boost * rarityStatBoost);
  
  // Calculate value based on stats and rarity
  const baseValue = (speed + acceleration + handling + boost) * 10;
  const value = Math.round(baseValue * valueMultiplier);
  
  return {
    userId,
    name: carName,
    type: carType.name,
    rarity,
    speed,
    acceleration,
    handling,
    boost,
    value
  };
}

/**
 * Generate a car using a specific key type
 * @param userId The ID of the user who will own the car
 * @param keyType The type of key to use (from CAR_KEYS)
 * @returns Car object ready to be inserted into database
 */
export function generateCarWithKey(userId: number, keyType: keyof typeof CAR_KEYS): InsertCar {
  // Get key rarity boost info
  const keyData = CAR_KEYS[keyType];
  
  // Calculate rarity chance modifiers based on key type
  const chancesWithKeyBoost: Record<keyof typeof CAR_RARITIES, number> = {
    COMMON: 0,
    UNCOMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0,
    MYTHIC: 0
  };
  let totalChance = 0;
  
  // Apply the rarity boost according to key type
  for (const rarityKey of Object.keys(CAR_RARITIES) as Array<keyof typeof CAR_RARITIES>) {
    const originalChance = CAR_RARITIES[rarityKey].chance;
    let boostedChance = originalChance;
    
    // Apply the appropriate boost based on key type and rarity
    const boostMultiplier = keyData.rarityBoosts[rarityKey];
    boostedChance = originalChance * boostMultiplier;
    
    chancesWithKeyBoost[rarityKey] = boostedChance;
    totalChance += boostedChance;
  }
  
  // Normalize chances to ensure they sum to 1
  for (const rarityKey in chancesWithKeyBoost) {
    chancesWithKeyBoost[rarityKey as keyof typeof CAR_RARITIES] /= totalChance;
  }
  
  // Roll for rarity using the boosted chances
  const roll = Math.random();
  let cumulativeChance = 0;
  let selectedRarity: keyof typeof CAR_RARITIES = "COMMON";
  
  for (const rarityKey in chancesWithKeyBoost) {
    cumulativeChance += chancesWithKeyBoost[rarityKey as keyof typeof CAR_RARITIES];
    if (roll <= cumulativeChance) {
      selectedRarity = rarityKey as keyof typeof CAR_RARITIES;
      break;
    }
  }
  
  // Generate a car with the selected rarity
  return generateRandomCar(userId, selectedRarity);
}

/**
 * Return all car rarities with their display names, colors and chances
 */
export function getRarityInfo() {
  return Object.entries(CAR_RARITIES).map(([key, data]) => ({
    key: key as keyof typeof CAR_RARITIES,
    name: data.name,
    chance: (data.chance * 100).toFixed(2) + '%',
    valueMultiplier: data.valueMultiplier + 'x',
    color: data.color
  }));
}