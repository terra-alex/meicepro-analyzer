import { NextRequest, NextResponse } from "next/server";

// Aliyun OSS doesn't return CORS headers, so canvas warping (which needs pixel
// access) blows up on cross-origin tainting. Proxy through here for any OSS
// bucket the Meicepro API ever points at.
const ALLOWED_HOSTS = [
  /\.oss-eu-central-1\.aliyuncs\.com$/,
  /\.oss-cn-shanghai\.aliyuncs\.com$/,
  /\.oss-ap-southeast-1\.aliyuncs\.com$/,
  /\.aliyuncs\.com$/,
];

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "missing ?url" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.some((re) => re.test(parsed.hostname))) {
    return NextResponse.json({ error: "host not allowed", host: parsed.hostname }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), { cache: "force-cache" });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: upstream.status });
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `proxy: ${(e as Error).message}` }, { status: 502 });
  }
}
