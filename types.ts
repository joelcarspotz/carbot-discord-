// User type
export interface User {
  id: number;
  discordId: string;
  username: string;
  balance: number;
  activeCarId: number | null;
  lastStealAttempt: string | null;
  lastRace: string | null;
  createdAt: string;
}

// Car type
export interface Car {
  id: number;
  userId: number;
  name: string;
  type: string;
  rarity: string;
  speed: number;
  acceleration: number;
  handling: number;
  boost: number;
  value: number;
  // image field removed
  acquired: string;
}

// Race type
export interface Race {
  id: number;
  challenger: number;
  opponent: number | null;
  challengerCarId: number;
  opponentCarId: number | null;
  bet: number;
  trackType: string;
  status: 'pending' | 'in_progress' | 'completed';
  winner: number | null;
  raceData: any | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

// Shop item type
export interface ShopItem {
  id: number;
  name: string;
  type: string;
  rarity: string;
  speed: number;
  acceleration: number;
  handling: number;
  boost: number;
  price: number;
  available: boolean;
  // image field removed
}

// Transaction type
export interface Transaction {
  id: number;
  userId: number;
  type: string;
  amount: number;
  description: string | null;
  relatedId: number | null;
  createdAt: string;
}

// Activity log type
export interface ActivityLog {
  id: number;
  type: string;
  userId: number;
  targetId: number | null;
  details: any | null;
  createdAt: string;
}

// Steal attempt type
export interface StealAttempt {
  id: number;
  thiefId: number;
  targetId: number;
  success: boolean;
  carId: number | null;
  fine: number | null;
  createdAt: string;
}
