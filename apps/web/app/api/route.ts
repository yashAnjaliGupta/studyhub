import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  console.log(url);
  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  const response = await fetch(url);

  if (!response.ok) {
    return new Response("Failed to fetch PDF", {
      status: response.status,
    });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "public,max-age=86400",
    },
  });
}