import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (isAdminRoute && !isLoginPage && !req.auth) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isLoginPage && req.auth) {
    // Redirect to admin dashboard if already authenticated
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
})

export const config = {
  matcher: ["/admin/:path*"],
}
