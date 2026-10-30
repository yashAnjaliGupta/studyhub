import { NextRequest, NextResponse } from "next/server";

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, link-local metadata, and private IP spaces
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    // Allow configured CDN host
    const configuredCdn = process.env.NEXT_PUBLIC_CDN_URL;
    if (configuredCdn) {
      try {
        const cdnHost = new URL(configuredCdn).hostname.toLowerCase();
        if (hostname === cdnHost) return true;
      } catch {}
    }

    // Allow S3 hosts & trusted domains
    if (
      hostname.endsWith(".amazonaws.com") ||
      hostname.endsWith(".yashguptaiiit.in") ||
      hostname === "ncert.nic.in" ||
      hostname.endsWith(".ncert.nic.in")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return new NextResponse("Forbidden target URL", { status: 403 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse("Failed to fetch PDF", {
        status: response.status,
      });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public,max-age=86400",
      },
    });
  } catch (error) {
    console.error("[PDF Proxy] Fetch error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
