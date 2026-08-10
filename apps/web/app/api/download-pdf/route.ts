import { NextRequest, NextResponse } from "next/server";
import { getPaperUrl } from "../../../lib/s3";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return new Response("Missing key parameter", { status: 400 });
  }

  try {
    const downloadUrl = getPaperUrl(key);

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
