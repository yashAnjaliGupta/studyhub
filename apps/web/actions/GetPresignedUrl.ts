"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3";
import { client as dbClient } from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";

const client = dbClient as any;

export async function createUploadUrl(data: {
  exam: string;
  selectedClass: string;
  subject: string;
  fileName: string;
  fileType: string;
}) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL || "yashgupta.yg318@gmail.com";
  if (!session || session.user?.email !== adminEmail) {
    throw new Error("Unauthorized");
  }
  const key = `${data.exam}/${data.selectedClass}/${data.subject}/${data.fileName}`;
  
  const existing = await client.file.findUnique({
    where: {
      s3Key: key,
      status: { in: ["UPLOADING", "COMPLETED"] }
    }
  });

  if (existing) {
    throw new Error("File with the same name already exists");
  }

  await client.file.create({
    data: {
      exam: data.exam,
      className: data.selectedClass,
      subject: data.subject,
      fileName: data.fileName,
      mimeType: data.fileType,
      s3Key: key,
    }
  });

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    ContentType: data.fileType,
  });
  console.log(s3);
  const uploadUrl = await getSignedUrl(
    s3,
    command,
    { expiresIn: 300 }
  );

  return {
    uploadUrl,
    key,
  };
}
