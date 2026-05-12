import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://eu-meicepro-api.meiquc.cn/meicepro-api/open/diagnosis/get";

// Proxy /api/report/{id}?lang=en → Meicepro open API.
// Bypasses CORS for the browser and gives us a single fetch path.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lang = req.nextUrl.searchParams.get("lang") ?? "en";
  const url = `${UPSTREAM}/${encodeURIComponent(id)}/${encodeURIComponent(lang)}`;

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { code: 0, status: "F", message: `proxy error: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
