import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated users trying to access protected routes → login
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Unauthenticated users on /profile/* → login
  if (!user && pathname.startsWith("/profile")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users: check profile_complete + admin status
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, profile_complete")
      .eq("id", user.id)
      .single();

    // Incomplete profile → redirect to setup (unless already there or on /auth)
    if (
      profile &&
      !profile.profile_complete &&
      !pathname.startsWith("/profile/setup") &&
      !pathname.startsWith("/auth")
    ) {
      return NextResponse.redirect(new URL("/profile/setup", request.url));
    }

    // Admin route protection
    if (pathname.startsWith("/admin") && !profile?.is_admin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Authenticated users on /login → dashboard
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/profile/:path*"],
};
