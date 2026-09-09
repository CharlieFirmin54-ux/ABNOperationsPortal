export function isSameOrigin(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const raw = originHeader || referer;
  if (!raw) return false;

  let originUrl: URL;
  try {
    originUrl = new URL(raw);
  } catch {
    return false;
  }

  const host = request.headers.get("host")?.trim() ?? "";
  if (!host || originUrl.host !== host) return false;

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto && originUrl.protocol !== `${forwardedProto}:`) {
    return false;
  }
  return true;
}
