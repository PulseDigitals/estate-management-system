import { seedAccounting } from "./seed-accounting";

seedAccounting()
  .then(() => {
    console.log("✓ Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  });
