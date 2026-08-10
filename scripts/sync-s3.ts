import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Resolve paths to environment files
const webEnvPath = path.resolve(process.cwd(), "apps/web/.env");
const dbEnvPath = path.resolve(process.cwd(), "packages/db/.env");

// Load apps/web/.env first (AWS credentials, bucket)
if (fs.existsSync(webEnvPath)) {
  console.log(`Loading environment variables from: ${webEnvPath}`);
  dotenv.config({ path: webEnvPath });
} else {
  console.warn(`Warning: apps/web/.env not found at ${webEnvPath}`);
}

// Load packages/db/.env (DATABASE_URL)
if (fs.existsSync(dbEnvPath)) {
  console.log(`Loading environment variables from: ${dbEnvPath}`);
  dotenv.config({ path: dbEnvPath });
} else {
  console.warn(`Warning: packages/db/.env not found at ${dbEnvPath}`);
}

// Check configuration
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
  console.error("Error: AWS configuration is missing. Please check your apps/web/.env file.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Error: DATABASE_URL is missing. Please check your packages/db/.env file.");
  process.exit(1);
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const prisma = new PrismaClient();

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".pdf": return "application/pdf";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".gif": return "image/gif";
    case ".webp": return "image/webp";
    case ".txt": return "text/plain";
    case ".html": return "text/html";
    case ".css": return "text/css";
    case ".js": return "application/javascript";
    case ".json": return "application/json";
    case ".zip": return "application/zip";
    default: return "application/octet-stream";
  }
}

async function main() {
  console.log("\nStarting S3 sync process...");
  console.log(`Bucket: ${bucketName}`);
  console.log(`Region: ${region}`);

  let continuationToken: string | undefined = undefined;
  let objectsProcessed = 0;
  let objectsSynced = 0;
  let objectsSkipped = 0;
  let objectsFailed = 0;

  try {
    do {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);
      const contents = response.Contents || [];

      console.log(`\nRetrieved ${contents.length} objects from S3...`);

      for (const obj of contents) {
        const key = obj.Key;
        if (!key) continue;

        objectsProcessed++;

        // Exclude directory keys (keys ending with /) or empty objects
        if (key.endsWith("/")) {
          console.log(`[Skip] ${key} is a directory folder`);
          objectsSkipped++;
          continue;
        }

        // Parse path: 
        // 1. <exam>/<className>/<subject>/<fileName> (parts: 4)
        // 2. <exam>/<year>/<className>/<subject>/<fileName> (parts: 5)
        // 3. JEE/JEE_Advanced/<year>/papers/<fileName> (parts: 5)
        // 4. CBSE/<year>/Class X/Mathematics/papers/<fileName> (parts: 6)
        const parts = key.split("/");
        let exam = "";
        let className = "";
        let subject = "";
        let fileName = "";
        let year: number | null = null;

        if (parts[0].toUpperCase() === "JEE") {
          exam = parts[0];
          className = "common";
          if (parts.length === 4) {
            // JEE/JEE_Advanced/2007/2007_1.pdf
            subject = parts[1]; // e.g. "JEE_Advanced"
            const yearVal = parseInt(parts[2], 10);
            year = isNaN(yearVal) ? null : yearVal;
            fileName = parts[3];
          } else if (parts.length === 5) {
            // JEE/JEE_Advanced/2007/papers/file.pdf
            subject = parts[1]; // e.g. "JEE_Advanced"
            const yearVal = parseInt(parts[2], 10);
            year = isNaN(yearVal) ? null : yearVal;
            fileName = parts[4];
          } else {
            console.warn(`[Warning] Skipping JEE key "${key}" due to unexpected parts count: ${parts.length}`);
            objectsSkipped++;
            continue;
          }
        } else {
          if (parts.length === 4) {
            [exam, className, subject, fileName] = parts;
          } else if (parts.length === 5) {
            const secondPart = parts[1];
            if (isNaN(Number(secondPart))) {
              exam = parts[0];
              className = parts[1];
              const yearVal = parseInt(parts[2], 10);
              year = isNaN(yearVal) ? null : yearVal;
              subject = parts[3];
              fileName = parts[4];
            } else {
              // <exam>/<year>/<className>/<subject>/<fileName>
              exam = parts[0];
              const yearVal = parseInt(parts[1], 10);
              year = isNaN(yearVal) ? null : yearVal;
              className = parts[2];
              subject = parts[3];
              fileName = parts[4];
            }
          } else if (parts.length === 6) {
            // CBSE/<year>/Class X/Mathematics/papers/<fileName>
            exam = parts[0];
            const yearVal = parseInt(parts[1], 10);
            year = isNaN(yearVal) ? null : yearVal;
            className = parts[2];
            subject = parts[3];
            fileName = parts[5];
          } else {
            console.warn(`[Warning] Skipping key "${key}". Key structure must match one of:
  - <exam>/<className>/<subject>/<fileName>
  - <exam>/<year>/<className>/<subject>/<fileName>
  - CBSE/<year>/<className>/<subject>/papers/<fileName>`);
            objectsSkipped++;
            continue;
          }
        }
        const fileSize = obj.Size || null;
        const mimeType = getMimeType(fileName);

        try {
          // Upsert record in File table
          const dbFile = await prisma.file.upsert({
            where: { s3Key: key },
            update: {
              exam,
              className,
              subject,
              fileName,
              fileSize,
              mimeType,
              year,
              status: "PENDING",
            },
            create: {
              exam,
              className,
              subject,
              fileName,
              fileSize,
              mimeType,
              s3Key: key,
              year,
              status: "PENDING",
            },
          });

          console.log(`[Synced] ${key} -> DB ID: ${dbFile.id}`);
          objectsSynced++;
        } catch (dbError) {
          console.error(`[Error] Failed to insert/update database for key: ${key}`, dbError);
          objectsFailed++;
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log("\nS3 Sync Completed!");
    console.log(`-----------------------------------`);
    console.log(`Total Objects Processed: ${objectsProcessed}`);
    console.log(`Successfully Synced:     ${objectsSynced}`);
    console.log(`Skipped (folders/misc):  ${objectsSkipped}`);
    console.log(`Failed DB Inserts:       ${objectsFailed}`);
    console.log(`-----------------------------------`);

  } catch (error) {
    console.error("Fatal Error during S3 Sync:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
