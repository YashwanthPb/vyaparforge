import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@ssi.com" },
    });

    console.log("User found:", user ? "YES" : "NO");

    if (user) {
      console.log("Name:", user.name);
      console.log("Role:", user.role);
      console.log("Hash starts:", user.password.substring(0, 15));
      const match = await bcrypt.compare("Admin@123", user.password);
      console.log("Password match:", match);
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
