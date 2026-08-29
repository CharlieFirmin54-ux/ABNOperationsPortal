import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STATIC_SECURITY_HEADERS } from "@/lib/auth/security-headers-config";

export { STATIC_SECURITY_HEADERS };

export function applySecurityHeaders(
  response: NextResponse,
  request?: NextRequest
) {
  for (const header of STATIC_SECURITY_HEADERS) {
    response.headers.set(header.key, header.value);
  }
  const https =
    request?.nextUrl.protocol === "https:" || Boolean(process.env.VERCEL);
  if (https) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  return response;
}
