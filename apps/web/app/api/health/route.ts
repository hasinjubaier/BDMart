import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "@bdmart/web",
    version: "1.0.0",
    milestone: "1",
    timestamp: new Date().toISOString(),
  });
}
