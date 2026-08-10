"use server";
import { PrismaClient } from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const client = new PrismaClient() as any;

export async function markUploadSuccessful(s3Key: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== "yashgupta.yg318@gmail.com") {
    throw new Error("Unauthorized");
  }
  const file = await client.update({
    where:{ s3Key },
    data:{ status: "COMPLETED" }
  })
}