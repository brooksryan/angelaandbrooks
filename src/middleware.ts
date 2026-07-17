import { NextResponse, type NextRequest } from "next/server";
import { GATE_SESSION_COOKIE, verifyGateSession } from "./lib/gate-auth";

// Whole-site guest gate. Every unauthenticated, guest-facing request is
// rewritten to the name screen at /gate. The cookie is verified by HMAC
// signature only — NO sheet read in the request path (the gate ADR's rule).
//
// Rewrite, not redirect: the URL the guest asked for stays in the address bar,
// so once they enter their name a reload re-runs this middleware (now with a
// valid cookie) and serves the page they originally wanted.
//
// Also enforces HTTPS outside local development: a plain-http request
// (x-forwarded-proto: http, set by Cloudflare and by Next's local server) is
// 308-redirected to https before any gate work, and every served production
// response carries an HSTS header so browsers upgrade on their own. Localhost
// is exempt because `next dev` serves HTTP only.

// Two years, subdomains, preload — the standard strong HSTS policy.
const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function isLocalDevelopment(hostname: string): boolean {
  return process.env.NODE_ENV === "development" || isLocalHostname(hostname);
}

function withHsts(response: NextResponse, hostname: string): NextResponse {
  if (!isLocalDevelopment(hostname)) {
    response.headers.set("Strict-Transport-Security", HSTS_VALUE);
  }
  return response;
}

// Paths the gate must never touch. The guest gate and the admin login are two
// separate auth systems (gate ADR) — admin routes carry their own session and
// must reach admin's own login, not the guest name screen.
function isExempt(pathname: string): boolean {
  return (
    // The gate screen itself and the API that issues its cookie.
    pathname === "/gate" ||
    pathname === "/api/gate" ||
    pathname.startsWith("/api/gate/") ||
    // Admin login + admin API never cross into the guest gate.
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const hostname = request.nextUrl.hostname;

  // Force HTTPS first. Next's dev server also supplies x-forwarded-proto=http,
  // so exempt loopback hosts where no TLS listener exists. 308 preserves the
  // method and body of the original request.
  if (
    request.headers.get("x-forwarded-proto") === "http" &&
    !isLocalDevelopment(hostname)
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    httpsUrl.port = "";
    return NextResponse.redirect(httpsUrl, 308);
  }

  const { pathname } = request.nextUrl;
  if (isExempt(pathname)) {
    return withHsts(NextResponse.next(), hostname);
  }

  const token = request.cookies.get(GATE_SESSION_COOKIE)?.value;
  const session = await verifyGateSession(token);
  if (session) {
    return withHsts(NextResponse.next(), hostname);
  }

  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  return withHsts(NextResponse.rewrite(url), hostname);
}

export const config = {
  // Run on every route EXCEPT Next internals and static assets. The negative
  // lookahead skips `_next/static`, `_next/image`, the favicon, and any path
  // with a file extension (`.*\\..*` — images, fonts, robots.txt, etc.), so the
  // gate guards pages and API routes without intercepting asset requests.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
