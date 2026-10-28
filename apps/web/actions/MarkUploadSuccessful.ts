"use server";
import { client as dbClient } from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";

const client = dbClient as any;

export async function markUploadSuccessful(s3Key: string) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL || "yashgupta.yg318@gmail.com";
  if (!session || session.user?.email !== adminEmail) {
    throw new Error("Unauthorized");
  }
  const file = await client.file.update({
    where: { s3Key },
    data: { status: "COMPLETED" },
  });
  return file;
}
