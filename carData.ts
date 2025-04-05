import { CarData } from '../../shared/types';

// Comprehensive list of real-world cars with their stats and market values
// Prices are in game currency units, roughly 1/100 of real USD value
// Stats are rated on a scale of 0-100

export const realCarData: CarData[] = [
  // COMMON CARS (25 cars) - Everyday vehicles - Value multiplier: 1x
  // Price range: $1,000-$2,000 (game currency)
  { 
    name: "Toyota Corolla", 
    type: "Sedan",
    rarity: "Common",
    speed: 55, 
    acceleration: 50, 
    handling: 60, 
    boost: 40,
    value: 2000
  },
  { 
    name: "Honda Civic", 
    type: "Sedan",
    rarity: "Common", 
    speed: 58, 
    acceleration: 52, 
    handling: 65, 
    boost: 45,
    value: 2100
  },
  { 
    name: "Ford Focus", 
    type: "Hatchback",
    rarity: "Common", 
    speed: 57, 
    acceleration: 53, 
    handling: 62, 
    boost: 42,
    value: 2050
  },
  { 
    name: "Volkswagen Jetta", 
    type: "Sedan",
    rarity: "Common", 
    speed: 60, 
    acceleration: 55, 
    handling: 63, 
    boost: 44,
    value: 2200
  },
  { 
    name: "Hyundai Elantra", 
    type: "Sedan",
    rarity: "Common", 
    speed: 56, 
    acceleration: 51, 
    handling: 61, 
    boost: 41,
    value: 1950
  },
  { 
    name: "Chevrolet Malibu", 
    type: "Sedan",
    rarity: "Common", 
    speed: 59, 
    acceleration: 54, 
    handling: 58, 
    boost: 43,
    value: 2250
  },
  { 
    name: "Nissan Sentra", 
    type: "Sedan",
    rarity: "Common", 
    speed: 55, 
    acceleration: 50, 
    handling: 60, 
    boost: 40,
    value: 1900
  },
  { 
    name: "Toyota Camry", 
    type: "Sedan",
    rarity: "Common", 
    speed: 62, 
    acceleration: 57, 
    handling: 64, 
    boost: 46,
    value: 2400
  },
  { 
    name: "Honda Accord", 
    type: "Sedan",
    rarity: "Common", 
    speed: 63, 
    acceleration: 58, 
    handling: 65, 
    boost: 47,
    value: 2450
  },
  { 
    name: "Mazda 3", 
    type: "Compact",
    rarity: "Common", 
    speed: 61, 
    acceleration: 59, 
    handling: 68, 
    boost: 44,
    value: 2300
  },
  { 
    name: "Ford Escape", 
    type: "SUV",
    rarity: "Common", 
    speed: 54, 
    acceleration: 50, 
    handling: 56, 
    boost: 52,
    value: 2500
  },
  { 
    name: "Toyota RAV4", 
    type: "SUV",
    rarity: "Common", 
    speed: 55, 
    acceleration: 51, 
    handling: 57, 
    boost: 53,
    value: 2600
  },
  { 
    name: "Honda CR-V", 
    type: "SUV",
    rarity: "Common", 
    speed: 54, 
    acceleration: 52, 
    handling: 58, 
    boost: 54,
    value: 2550
  },
  { 
    name: "Chevrolet Equinox", 
    type: "SUV",
    rarity: "Common", 
    speed: 53, 
    acceleration: 49, 
    handling: 55, 
    boost: 51,
    value: 2400
  },
  { 
    name: "Nissan Rogue", 
    type: "SUV",
    rarity: "Common", 
    speed: 52, 
    acceleration: 48, 
    handling: 54, 
    boost: 50,
    value: 2450
  },
  { 
    name: "Ford F-150", 
    type: "Truck",
    rarity: "Common", 
    speed: 58, 
    acceleration: 52, 
    handling: 48, 
    boost: 65,
    value: 2900
  },
  { 
    name: "Chevrolet Silverado", 
    type: "Truck",
    rarity: "Common", 
    speed: 57, 
    acceleration: 51, 
    handling: 47, 
    boost: 66,
    value: 2950
  },
  { 
    name: "Ram 1500", 
    type: "Truck",
    rarity: "Common", 
    speed: 59, 
    acceleration: 53, 
    handling: 46, 
    boost: 67,
    value: 3000
  },
  { 
    name: "Toyota Tacoma", 
    type: "Truck",
    rarity: "Common", 
    speed: 56, 
    acceleration: 50, 
    handling: 49, 
    boost: 64,
    value: 2850
  },
  { 
    name: "GMC Sierra", 
    type: "Truck",
    rarity: "Common", 
    speed: 58, 
    acceleration: 52, 
    handling: 48, 
    boost: 66,
    value: 2950
  },
  { 
    name: "Kia Soul", 
    type: "Compact",
    rarity: "Common", 
    speed: 54, 
    acceleration: 52, 
    handling: 62, 
    boost: 43,
    value: 2000
  },
  { 
    name: "Hyundai Tucson", 
    type: "SUV",
    rarity: "Common", 
    speed: 55, 
    acceleration: 51, 
    handling: 57, 
    boost: 53,
    value: 2350
  },
  { 
    name: "Subaru Impreza", 
    type: "Sedan",
    rarity: "Common", 
    speed: 58, 
    acceleration: 55, 
    handling: 66, 
    boost: 45,
    value: 2200
  },
  { 
    name: "Mitsubishi Outlander", 
    type: "SUV",
    rarity: "Common", 
    speed: 54, 
    acceleration: 50, 
    handling: 56, 
    boost: 52,
    value: 2400
  },
  { 
    name: "Jeep Compass", 
    type: "SUV",
    rarity: "Common", 
    speed: 55, 
    acceleration: 52, 
    handling: 59, 
    boost: 54,
    value: 2550
  },

  // UNCOMMON CARS (35 cars) - Entry-level performance - Value multiplier: 1.5x
  // Price range: $4,000-$10,000 (game currency)
  { 
    name: "Honda Civic Si", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 70, 
    acceleration: 68, 
    handling: 75, 
    boost: 60,
    value: 4200
  },
  { 
    name: "Volkswagen Golf GTI", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 72, 
    acceleration: 70, 
    handling: 77, 
    boost: 62,
    value: 4500
  },
  { 
    name: "Ford Mustang EcoBoost", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 75, 
    acceleration: 72, 
    handling: 68, 
    boost: 65,
    value: 5000
  },
  { 
    name: "Subaru WRX", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 74, 
    acceleration: 73, 
    handling: 76, 
    boost: 64,
    value: 4800
  },
  { 
    name: "Mazda MX-5 Miata", 
    type: "Roadster",
    rarity: "Uncommon", 
    speed: 71, 
    acceleration: 69, 
    handling: 85, 
    boost: 61,
    value: 4300
  },
  { 
    name: "Toyota GR86", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 73, 
    acceleration: 71, 
    handling: 79, 
    boost: 63,
    value: 4600
  },
  { 
    name: "Hyundai Veloster N", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 72, 
    acceleration: 70, 
    handling: 76, 
    boost: 62,
    value: 4400
  },
  { 
    name: "Kia Stinger GT-Line", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 76, 
    acceleration: 73, 
    handling: 72, 
    boost: 65,
    value: 5100
  },
  { 
    name: "Tesla Model 3 Standard", 
    type: "Electric",
    rarity: "Uncommon", 
    speed: 78, 
    acceleration: 85, 
    handling: 74, 
    boost: 70,
    value: 6000
  },
  { 
    name: "Mini Cooper S", 
    type: "Compact",
    rarity: "Uncommon", 
    speed: 69, 
    acceleration: 67, 
    handling: 80, 
    boost: 60,
    value: 4100
  },
  { 
    name: "Nissan Z", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 78, 
    acceleration: 76, 
    handling: 75, 
    boost: 66,
    value: 5500
  },
  { 
    name: "Mazda3 Turbo", 
    type: "Sports Car",
    rarity: "Uncommon", 
    speed: 73, 
    acceleration: 71, 
    handling: 77, 
    boost: 64,
    value: 4700
  },
  { 
    name: "BMW 330i", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 77, 
    acceleration: 74, 
    handling: 78, 
    boost: 66,
    value: 5800
  },
  { 
    name: "Audi A4", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 76, 
    acceleration: 73, 
    handling: 77, 
    boost: 65,
    value: 5700
  },
  { 
    name: "Mercedes-Benz C300", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 77, 
    acceleration: 74, 
    handling: 79, 
    boost: 67,
    value: 5900
  },
  { 
    name: "Acura TLX", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 75, 
    acceleration: 72, 
    handling: 76, 
    boost: 65,
    value: 5600
  },
  { 
    name: "Lexus IS 300", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 76, 
    acceleration: 73, 
    handling: 77, 
    boost: 65,
    value: 5700
  },
  { 
    name: "Volvo S60", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 75, 
    acceleration: 73, 
    handling: 76, 
    boost: 66,
    value: 5500
  },
  { 
    name: "Infiniti Q50", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 76, 
    acceleration: 74, 
    handling: 75, 
    boost: 66,
    value: 5600
  },
  { 
    name: "Genesis G70", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 77, 
    acceleration: 75, 
    handling: 76, 
    boost: 67,
    value: 5800
  },
  { 
    name: "Cadillac CT4", 
    type: "Luxury",
    rarity: "Uncommon", 
    speed: 76, 
    acceleration: 73, 
    handling: 75, 
    boost: 66,
    value: 5700
  },
  { 
    name: "Ford Edge ST", 
    type: "SUV",
    rarity: "Uncommon", 
    speed: 72, 
    acceleration: 69, 
    handling: 67, 
    boost: 70,
    value: 5200
  },
  { 
    name: "Hyundai Santa Fe", 
    type: "SUV",
    rarity: "Uncommon", 
    speed: 68, 
    acceleration: 65, 
    handling: 65, 
    boost: 68,
    value: 4800
  },
  { 
    name: "Jeep Grand Cherokee", 
    type: "SUV",
    rarity: "Uncommon", 
    speed: 69, 
    acceleration: 66, 
    handling: 66, 
    boost: 71,
    value: 5000
  },
  { 
    name: "Mazda CX-5", 
    type: "SUV",
    rarity: "Uncommon", 
    speed: 67, 
    acceleration: 64, 
    handling: 68, 
    boost: 67,
    value: 4700
  },
  { 
    name: "Toyota 4Runner", 
    type: "SUV",
    rarity: "Uncommon", 
    speed: 65, 
    acceleration: 62, 
    handling: 64, 
    boost: 75,
    value: 5100
  },
  { 
    name: "Honda Pilot", 
    type: "SUV",
    rarity: "Uncommon", 
    speed: 66, 
    acceleration: 63, 
    handling: 65, 
    boost: 69,
    value: 4900
  },
  { 
    name: "Subaru Outback XT", 
    type: "Wagon",
    rarity: "Uncommon", 
    speed: 70, 
    acceleration: 68, 
    handling: 72, 
    boost: 66,
    value: 4800
  },
  { 
    name: "Dodge Charger SXT", 
    type: "Sedan",
    rarity: "Uncommon", 
    speed: 75, 
    acceleration: 72, 
    handling: 68, 
    boost: 67,
    value: 5300
  },
  { 
    name: "Chevrolet Colorado ZR2", 
    type: "Truck",
    rarity: "Uncommon", 
    speed: 68, 
    acceleration: 65, 
    handling: 62, 
    boost: 78,
    value: 5200
  },
  { 
    name: "GMC Canyon AT4", 
    type: "Truck",
    rarity: "Uncommon", 
    speed: 67, 
    acceleration: 64, 
    handling: 61, 
    boost: 77,
    value: 5100
  },
  { 
    name: "Ford Ranger Tremor", 
    type: "Truck",
    rarity: "Uncommon", 
    speed: 66, 
    acceleration: 63, 
    handling: 60, 
    boost: 76,
    value: 5000
  },
  { 
    name: "Toyota Tacoma TRD", 
    type: "Truck",
    rarity: "Uncommon", 
    speed: 65, 
    acceleration: 62, 
    handling: 63, 
    boost: 79,
    value: 5300
  },
  { 
    name: "Jeep Wrangler Rubicon", 
    type: "Off-Road",
    rarity: "Uncommon", 
    speed: 64, 
    acceleration: 61, 
    handling: 62, 
    boost: 80,
    value: 5400
  },
  { 
    name: "Ford Bronco Wildtrak", 
    type: "Off-Road",
    rarity: "Uncommon", 
    speed: 65, 
    acceleration: 62, 
    handling: 63, 
    boost: 81,
    value: 5500
  },

  // RARE CARS (35 cars) - High-performance vehicles - Value multiplier: 2x
  // Price range: $10,000-$20,000 (game currency)
  { 
    name: "Honda Civic Type R", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 82, 
    acceleration: 80, 
    handling: 88, 
    boost: 75,
    value: 10200
  },
  { 
    name: "Toyota GR Supra", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 85, 
    acceleration: 83, 
    handling: 84, 
    boost: 76,
    value: 10800
  },
  { 
    name: "Volkswagen Golf R", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 83, 
    acceleration: 81, 
    handling: 86, 
    boost: 75,
    value: 10500
  },
  { 
    name: "Ford Mustang GT", 
    type: "Muscle",
    rarity: "Rare", 
    speed: 87, 
    acceleration: 84, 
    handling: 78, 
    boost: 80,
    value: 11500
  },
  { 
    name: "Subaru WRX STI", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 84, 
    acceleration: 82, 
    handling: 87, 
    boost: 76,
    value: 10700
  },
  { 
    name: "BMW M3", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 88, 
    acceleration: 86, 
    handling: 85, 
    boost: 79,
    value: 13000
  },
  { 
    name: "BMW M4", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 89, 
    acceleration: 87, 
    handling: 86, 
    boost: 80,
    value: 13500
  },
  { 
    name: "Mercedes-AMG C63", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 90, 
    acceleration: 88, 
    handling: 84, 
    boost: 81,
    value: 14000
  },
  { 
    name: "Audi S4", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 86, 
    acceleration: 85, 
    handling: 83, 
    boost: 78,
    value: 12500
  },
  { 
    name: "Lexus RC F", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 87, 
    acceleration: 84, 
    handling: 82, 
    boost: 77,
    value: 12700
  },
  { 
    name: "Chevrolet Camaro SS", 
    type: "Muscle",
    rarity: "Rare", 
    speed: 88, 
    acceleration: 85, 
    handling: 77, 
    boost: 81,
    value: 12000
  },
  { 
    name: "Dodge Challenger R/T Scat Pack", 
    type: "Muscle",
    rarity: "Rare", 
    speed: 89, 
    acceleration: 86, 
    handling: 75, 
    boost: 83,
    value: 12500
  },
  { 
    name: "Audi RS5", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 89, 
    acceleration: 87, 
    handling: 85, 
    boost: 80,
    value: 13800
  },
  { 
    name: "Cadillac CT5-V", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 87, 
    acceleration: 85, 
    handling: 83, 
    boost: 79,
    value: 13200
  },
  { 
    name: "Tesla Model S Long Range", 
    type: "Electric",
    rarity: "Rare", 
    speed: 90, 
    acceleration: 95, 
    handling: 82, 
    boost: 83,
    value: 15000
  },
  { 
    name: "Jaguar F-Type", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 88, 
    acceleration: 86, 
    handling: 84, 
    boost: 78,
    value: 13500
  },
  { 
    name: "Alfa Romeo Giulia Quadrifoglio", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 89, 
    acceleration: 87, 
    handling: 88, 
    boost: 79,
    value: 13900
  },
  { 
    name: "Lexus IS 500", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 88, 
    acceleration: 86, 
    handling: 85, 
    boost: 78,
    value: 13400
  },
  { 
    name: "Genesis G70 3.3T", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 86, 
    acceleration: 84, 
    handling: 83, 
    boost: 77,
    value: 12800
  },
  { 
    name: "Dodge Charger Scat Pack", 
    type: "Muscle",
    rarity: "Rare", 
    speed: 89, 
    acceleration: 86, 
    handling: 76, 
    boost: 82,
    value: 12900
  },
  { 
    name: "Infiniti Q60 Red Sport", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 87, 
    acceleration: 85, 
    handling: 82, 
    boost: 78,
    value: 12800
  },
  { 
    name: "Kia Stinger GT", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 85, 
    acceleration: 84, 
    handling: 81, 
    boost: 77,
    value: 12000
  },
  { 
    name: "BMW M240i", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 86, 
    acceleration: 85, 
    handling: 84, 
    boost: 78,
    value: 12500
  },
  { 
    name: "Mercedes-AMG CLA 45", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 87, 
    acceleration: 86, 
    handling: 85, 
    boost: 79,
    value: 13000
  },
  { 
    name: "Audi TTS", 
    type: "Sports Car",
    rarity: "Rare", 
    speed: 86, 
    acceleration: 84, 
    handling: 86, 
    boost: 78,
    value: 12600
  },
  { 
    name: "BMW X3 M", 
    type: "SUV",
    rarity: "Rare", 
    speed: 84, 
    acceleration: 82, 
    handling: 78, 
    boost: 80,
    value: 14000
  },
  { 
    name: "Porsche Macan S", 
    type: "SUV",
    rarity: "Rare", 
    speed: 85, 
    acceleration: 83, 
    handling: 81, 
    boost: 79,
    value: 14500
  },
  { 
    name: "Mercedes-AMG GLC 43", 
    type: "SUV",
    rarity: "Rare", 
    speed: 84, 
    acceleration: 82, 
    handling: 79, 
    boost: 78,
    value: 14200
  },
  { 
    name: "Audi SQ5", 
    type: "SUV",
    rarity: "Rare", 
    speed: 83, 
    acceleration: 81, 
    handling: 78, 
    boost: 77,
    value: 13800
  },
  { 
    name: "Jeep Grand Cherokee SRT", 
    type: "SUV",
    rarity: "Rare", 
    speed: 82, 
    acceleration: 80, 
    handling: 75, 
    boost: 81,
    value: 13500
  },
  { 
    name: "Dodge Durango SRT", 
    type: "SUV",
    rarity: "Rare", 
    speed: 83, 
    acceleration: 81, 
    handling: 74, 
    boost: 82,
    value: 13700
  },
  { 
    name: "Ford F-150 Raptor", 
    type: "Truck",
    rarity: "Rare", 
    speed: 80, 
    acceleration: 78, 
    handling: 73, 
    boost: 89,
    value: 13000
  },
  { 
    name: "RAM 1500 TRX", 
    type: "Truck",
    rarity: "Rare", 
    speed: 81, 
    acceleration: 79, 
    handling: 72, 
    boost: 90,
    value: 13200
  },
  { 
    name: "GMC Sierra AT4X", 
    type: "Truck",
    rarity: "Rare", 
    speed: 79, 
    acceleration: 77, 
    handling: 71, 
    boost: 88,
    value: 12800
  },
  { 
    name: "Tesla Model Y Performance", 
    type: "Electric",
    rarity: "Rare", 
    speed: 86, 
    acceleration: 93, 
    handling: 80, 
    boost: 81,
    value: 13500
  },

  // EPIC CARS (25 cars) - Supercars and luxury performance - Value multiplier: 3x
  // Price range: $20,000-$50,000 (game currency)
  { 
    name: "Porsche 911 Carrera S", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 92, 
    acceleration: 90, 
    handling: 93, 
    boost: 85,
    value: 22000
  },
  { 
    name: "Porsche Taycan", 
    type: "Electric",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 98, 
    handling: 90, 
    boost: 87,
    value: 24000
  },
  { 
    name: "BMW M5", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 94, 
    acceleration: 92, 
    handling: 88, 
    boost: 86,
    value: 25000
  },
  { 
    name: "Mercedes-AMG GT", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 95, 
    acceleration: 93, 
    handling: 91, 
    boost: 87,
    value: 26000
  },
  { 
    name: "Audi RS7", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 91, 
    handling: 89, 
    boost: 86,
    value: 24500
  },
  { 
    name: "Lexus LC 500", 
    type: "Luxury",
    rarity: "Epic", 
    speed: 91, 
    acceleration: 88, 
    handling: 89, 
    boost: 84,
    value: 22500
  },
  { 
    name: "Chevrolet Corvette C8", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 91, 
    handling: 92, 
    boost: 87,
    value: 23000
  },
  { 
    name: "Dodge Challenger Hellcat", 
    type: "Muscle",
    rarity: "Epic", 
    speed: 95, 
    acceleration: 92, 
    handling: 81, 
    boost: 90,
    value: 23500
  },
  { 
    name: "Maserati Ghibli Trofeo", 
    type: "Luxury",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 91, 
    handling: 88, 
    boost: 86,
    value: 24000
  },
  { 
    name: "Tesla Model S Plaid", 
    type: "Electric",
    rarity: "Epic", 
    speed: 97, 
    acceleration: 99, 
    handling: 88, 
    boost: 90,
    value: 28000
  },
  { 
    name: "Aston Martin Vantage", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 94, 
    acceleration: 92, 
    handling: 91, 
    boost: 87,
    value: 26500
  },
  { 
    name: "Bentley Continental GT", 
    type: "Luxury",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 90, 
    handling: 87, 
    boost: 88,
    value: 28000
  },
  { 
    name: "Porsche 718 Cayman GT4", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 92, 
    acceleration: 90, 
    handling: 95, 
    boost: 86,
    value: 23500
  },
  { 
    name: "Jaguar F-Type R", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 91, 
    handling: 89, 
    boost: 86,
    value: 24000
  },
  { 
    name: "Audi RS6 Avant", 
    type: "Wagon",
    rarity: "Epic", 
    speed: 94, 
    acceleration: 92, 
    handling: 88, 
    boost: 87,
    value: 25500
  },
  { 
    name: "Dodge Charger Hellcat", 
    type: "Muscle",
    rarity: "Epic", 
    speed: 96, 
    acceleration: 93, 
    handling: 82, 
    boost: 91,
    value: 24000
  },
  { 
    name: "BMW X5 M Competition", 
    type: "SUV",
    rarity: "Epic", 
    speed: 91, 
    acceleration: 89, 
    handling: 84, 
    boost: 88,
    value: 25000
  },
  { 
    name: "Mercedes-AMG G63", 
    type: "SUV",
    rarity: "Epic", 
    speed: 90, 
    acceleration: 88, 
    handling: 80, 
    boost: 89,
    value: 26000
  },
  { 
    name: "Porsche Cayenne Turbo", 
    type: "SUV",
    rarity: "Epic", 
    speed: 92, 
    acceleration: 90, 
    handling: 85, 
    boost: 87,
    value: 25500
  },
  { 
    name: "Lamborghini Urus", 
    type: "SUV",
    rarity: "Epic", 
    speed: 93, 
    acceleration: 91, 
    handling: 86, 
    boost: 88,
    value: 32000
  },
  { 
    name: "Maserati Levante Trofeo", 
    type: "SUV",
    rarity: "Epic", 
    speed: 92, 
    acceleration: 90, 
    handling: 84, 
    boost: 87,
    value: 25000
  },
  { 
    name: "Audi R8", 
    type: "Supercar",
    rarity: "Epic", 
    speed: 95, 
    acceleration: 93, 
    handling: 92, 
    boost: 88,
    value: 29000
  },
  { 
    name: "Chevrolet Corvette Z06", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 95, 
    acceleration: 93, 
    handling: 94, 
    boost: 89,
    value: 30000
  },
  { 
    name: "Nissan GT-R NISMO", 
    type: "Sports Car",
    rarity: "Epic", 
    speed: 96, 
    acceleration: 94, 
    handling: 93, 
    boost: 90,
    value: 31000
  },
  { 
    name: "Porsche Panamera Turbo S", 
    type: "Luxury",
    rarity: "Epic", 
    speed: 94, 
    acceleration: 92, 
    handling: 89, 
    boost: 88,
    value: 27000
  },

  // LEGENDARY CARS (20 cars) - Exotic supercars - Value multiplier: 5x
  // Price range: $50,000-$150,000 (game currency)
  { 
    name: "Ferrari Roma", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 96, 
    acceleration: 94, 
    handling: 95, 
    boost: 92,
    value: 52000
  },
  { 
    name: "Ferrari F8 Tributo", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 98, 
    acceleration: 96, 
    handling: 96, 
    boost: 93,
    value: 65000
  },
  { 
    name: "Lamborghini Huracán Evo", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 97, 
    acceleration: 95, 
    handling: 97, 
    boost: 94,
    value: 62000
  },
  { 
    name: "McLaren 720S", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 99, 
    acceleration: 97, 
    handling: 98, 
    boost: 95,
    value: 70000
  },
  { 
    name: "Rolls-Royce Ghost", 
    type: "Luxury",
    rarity: "Legendary", 
    speed: 92, 
    acceleration: 90, 
    handling: 89, 
    boost: 96,
    value: 75000
  },
  { 
    name: "Porsche 911 Turbo S", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 97, 
    acceleration: 98, 
    handling: 96, 
    boost: 93,
    value: 60000
  },
  { 
    name: "Mercedes-AMG GT Black Series", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 98, 
    acceleration: 96, 
    handling: 95, 
    boost: 94,
    value: 68000
  },
  { 
    name: "Aston Martin DBS Superleggera", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 96, 
    acceleration: 95, 
    handling: 94, 
    boost: 93,
    value: 64000
  },
  { 
    name: "Ferrari 812 Superfast", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 99, 
    acceleration: 96, 
    handling: 95, 
    boost: 94,
    value: 75000
  },
  { 
    name: "Lamborghini Huracán STO", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 98, 
    acceleration: 97, 
    handling: 99, 
    boost: 95,
    value: 78000
  },
  { 
    name: "Porsche 911 GT3 RS", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 97, 
    acceleration: 96, 
    handling: 99, 
    boost: 94,
    value: 63000
  },
  { 
    name: "Ferrari SF90 Stradale", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 99, 
    acceleration: 98, 
    handling: 97, 
    boost: 95,
    value: 85000
  },
  { 
    name: "McLaren Artura", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 97, 
    acceleration: 96, 
    handling: 96, 
    boost: 94,
    value: 68000
  },
  { 
    name: "Aston Martin Vantage F1 Edition", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 96, 
    acceleration: 95, 
    handling: 96, 
    boost: 93,
    value: 65000
  },
  { 
    name: "Bentley Continental GT Speed", 
    type: "Luxury",
    rarity: "Legendary", 
    speed: 94, 
    acceleration: 92, 
    handling: 90, 
    boost: 95,
    value: 72000
  },
  { 
    name: "Porsche Taycan Turbo S", 
    type: "Electric",
    rarity: "Legendary", 
    speed: 96, 
    acceleration: 99, 
    handling: 95, 
    boost: 94,
    value: 65000
  },
  { 
    name: "Maserati MC20", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 97, 
    acceleration: 96, 
    handling: 95, 
    boost: 94,
    value: 67000
  },
  { 
    name: "Rolls-Royce Wraith", 
    type: "Luxury",
    rarity: "Legendary", 
    speed: 93, 
    acceleration: 91, 
    handling: 88, 
    boost: 97,
    value: 80000
  },
  { 
    name: "Mercedes-AMG SL 63", 
    type: "Sports Car",
    rarity: "Legendary", 
    speed: 95, 
    acceleration: 94, 
    handling: 93, 
    boost: 92,
    value: 58000
  },
  { 
    name: "Aston Martin DB12", 
    type: "Supercar",
    rarity: "Legendary", 
    speed: 96, 
    acceleration: 94, 
    handling: 95, 
    boost: 93,
    value: 63000
  },

  // MYTHIC CARS (15 cars) - Hypercars and ultra-rare vehicles - Value multiplier: 10x
  // Price range: $150,000-$500,000 (game currency)
  { 
    name: "Ferrari LaFerrari", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 99, 
    acceleration: 98, 
    handling: 97, 
    boost: 98,
    value: 200000
  },
  { 
    name: "Lamborghini Aventador SVJ", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 99, 
    acceleration: 97, 
    handling: 96, 
    boost: 99,
    value: 195000
  },
  { 
    name: "Bugatti Chiron", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 99, 
    handling: 95, 
    boost: 98,
    value: 300000
  },
  { 
    name: "Koenigsegg Jesko", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 99, 
    handling: 96, 
    boost: 99,
    value: 320000
  },
  { 
    name: "McLaren Senna", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 99, 
    acceleration: 98, 
    handling: 100, 
    boost: 97,
    value: 210000
  },
  { 
    name: "Pagani Huayra BC", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 99, 
    acceleration: 98, 
    handling: 98, 
    boost: 97,
    value: 240000
  },
  { 
    name: "Rimac Nevera", 
    type: "Electric Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 100, 
    handling: 97, 
    boost: 99,
    value: 350000
  },
  { 
    name: "Bugatti Divo", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 98, 
    handling: 96, 
    boost: 97,
    value: 290000
  },
  { 
    name: "Aston Martin Valkyrie", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 99, 
    handling: 99, 
    boost: 98,
    value: 330000
  },
  { 
    name: "Ferrari SF90 XX Stradale", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 99, 
    handling: 98, 
    boost: 97,
    value: 270000
  },
  { 
    name: "McLaren Speedtail", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 98, 
    handling: 96, 
    boost: 97,
    value: 250000
  },
  { 
    name: "Koenigsegg Regera", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 100, 
    handling: 95, 
    boost: 98,
    value: 280000
  },
  { 
    name: "Pagani Utopia", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 99, 
    acceleration: 98, 
    handling: 99, 
    boost: 97,
    value: 260000
  },
  { 
    name: "Bugatti Bolide", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 99, 
    handling: 98, 
    boost: 99,
    value: 400000
  },
  { 
    name: "SSC Tuatara", 
    type: "Hypercar",
    rarity: "Mythic", 
    speed: 100, 
    acceleration: 98, 
    handling: 97, 
    boost: 98,
    value: 310000
  }
];