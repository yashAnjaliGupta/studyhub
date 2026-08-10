import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const dbEnvPath = path.resolve(process.cwd(), "packages/db/.env");
if (fs.existsSync(dbEnvPath)) {
  dotenv.config({ path: dbEnvPath });
}

const prisma = new PrismaClient();

async function main() {
  console.log("Enabling pgvector extension on database...");
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("pgvector extension enabled successfully!");
  } catch (err) {
    console.error("Error creating vector extension:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
