// Script to populate the shop with various cars
import { realCarData } from "../server/data/carData";
import { db } from "../server/db";
import { shopItems } from "../shared/schema";

// Add all cars to shop
async function populateShop() {
  console.log("Populating shop with ALL cars...");
  
  // Clear existing shop items
  await db.execute(`DELETE FROM shop_items`);
  console.log("Cleared existing shop items");
  
  // Add ALL cars from each rarity
  const carValues: any[] = [];
  let commonCount = 0, uncommonCount = 0, rareCount = 0, 
      epicCount = 0, legendaryCount = 0, mythicCount = 0;
  
  // Process all cars and apply appropriate price ranges based on rarity
  realCarData.forEach(car => {
    // Calculate base factor based on car stats (higher stats = higher price within range)
    const statSum = car.speed + car.acceleration + car.handling + car.boost;
    const maxPossibleStatSum = 400; // Assuming each stat can be max 100
    const statFactor = statSum / maxPossibleStatSum; // 0 to 1 factor
    
    let price = 0;
    
    switch(car.rarity) {
      case "Common":
        // Range: 5k to 10k - Affordable cars ($20k-$35k IRL)
        // Toyota Corolla, Honda Civic, etc.
        price = Math.round(5000 + (5000 * statFactor));
        commonCount++;
        break;
      case "Uncommon":
        // Range: 12k to 35k - Mid-range cars ($40k-$70k IRL)
        // Entry luxury and SUVs, Jeep Wrangler, etc.
        price = Math.round(12000 + (23000 * statFactor));
        uncommonCount++;
        break;
      case "Rare":
        // Range: 40k to 90k - Premium cars ($70k-$150k IRL)
        // BMW M3, Audi RS5, Dodge Challenger Scat Pack
        price = Math.round(40000 + (50000 * statFactor));
        rareCount++;
        break;
      case "Epic":
        // Range: 100k to 250k - Luxury performance ($150k-$300k IRL)
        // Aston Martin Vantage, Mercedes AMG GT, Porsche 911 GT3
        price = Math.round(100000 + (150000 * statFactor));
        epicCount++;
        break;
      case "Legendary":
        // Range: 300k to 600k - Supercars ($300k-$800k IRL)
        // Ferrari F8, Lamborghini Huracán, McLaren 720S
        price = Math.round(300000 + (300000 * statFactor));
        legendaryCount++;
        break;
      case "Mythic":
        // Range: 750k to 2M - Hypercars ($1M-$3M+ IRL)
        // Bugatti Chiron, Koenigsegg Jesko, McLaren Senna
        price = Math.round(750000 + (1250000 * statFactor));
        mythicCount++;
        break;
    }
    
    carValues.push({
      name: car.name,
      type: car.type,
      rarity: car.rarity,
      speed: car.speed,
      acceleration: car.acceleration,
      handling: car.handling,
      boost: car.boost,
      price: price,
      available: true,
      image: null
    });
  });
  
  // Batch insert all cars
  const result = await db.insert(shopItems).values(carValues).returning();
  
  console.log(`Shop populated with ${result.length} cars:`);
  console.log(`- Common: ${commonCount}`);
  console.log(`- Uncommon: ${uncommonCount}`);
  console.log(`- Rare: ${rareCount}`);
  console.log(`- Epic: ${epicCount}`);
  console.log(`- Legendary: ${legendaryCount}`);
  console.log(`- Mythic: ${mythicCount}`);
}

// Run the script
populateShop()
  .then(() => {
    console.log("Shop population completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error populating shop:", error);
    process.exit(1);
  });