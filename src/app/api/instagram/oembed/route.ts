import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.INSTAGRAM_APP_ID}|${process.env.INSTAGRAM_APP_SECRET}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "oEmbed fetch failed" },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
