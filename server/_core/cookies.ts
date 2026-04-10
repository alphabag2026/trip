import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const isLocal = LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);
  const secure = isSecureRequest(req);

  // For production domains, set domain to allow cookie sharing across subdomains
  // For local development, omit domain
  const domain = !isLocal && hostname
    ? (hostname.startsWith(".") ? hostname : `.${hostname}`)
    : undefined;

  return {
    httpOnly: true,
    path: "/",
    // Use "lax" for same-site navigation (most common case)
    // "none" requires Secure and can cause issues with some browsers
    sameSite: secure ? "lax" : "lax",
    secure,
    ...(domain ? { domain } : {}),
  };
}
