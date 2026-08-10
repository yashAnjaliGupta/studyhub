"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3";
import { PrismaClient } from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const client = new PrismaClient() as any;


export async function createUploadUrl(data: {
  exam: string;
  selectedClass: string;
  subject: string;
  fileName: string;
  fileType: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== "yashgupta.yg318@gmail.com") {
    throw new Error("Unauthorized");
  }
  const key = `${data.exam}/${data.selectedClass}/${data.subject}/${data.fileName}`;
  
  const existing = await client.file.findUnique({
    where: {
      s3Key: key,
      status:{ in: ["UPLOADING", "COMPLETED"] }
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
  })


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