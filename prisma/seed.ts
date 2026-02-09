import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const HAL_DIVISIONS = [
  { name: "Aircraft Division", code: "AD" },
  { name: "Helicopter Division", code: "HD" },
  { name: "Engine Division", code: "ED" },
  { name: "Avionics Division", code: "AVD" },
  { name: "Foundry & Forge Division", code: "FFD" },
  { name: "LRDE (Electronics & Radar)", code: "LRDE" },
];

async function main() {
  console.log("Seeding HAL divisions...");

  for (const division of HAL_DIVISIONS) {
    await prisma.division.upsert({
      where: { code: division.code },
      update: { name: division.name },
      create: division,
    });
    console.log(`  -> ${division.name} (${division.code})`);
  }

  // Seed default admin user
  console.log("Seeding admin user...");
  const hashedPassword = await bcrypt.hash("password", 10);
  await prisma.user.upsert({
    where: { email: "admin@ssi.com" },
    update: { name: "Admin", password: hashedPassword, role: "ADMIN" },
    create: {
      email: "admin@ssi.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("  -> Admin user (admin@ssi.com)");

  console.log("Seeding complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
