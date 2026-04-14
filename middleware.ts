import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CachedProfile = { is_admin: boolean; profile_complete: boolean };

const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, { profile: CachedProfile; expires: number }>();

function getCachedProfile(userId: string): CachedProfile | null {
  const entry = profileCache.get(userId);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    profileCache.delete(userId);
    return null;
  }
  return entry.profile;
}

function setCachedProfile(userId: string, profile: CachedProfile) {
  profileCache.set(userId, { profile, expires: Date.now() + PROFILE_CACHE_TTL_MS });
}

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
  if (!user) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/profile")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Authenticated users on /login → dashboard. No profile query needed.
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Profile data needed for: profile_complete gate (all protected routes) and
  // admin gate (/admin). Cache briefly so a burst of navigations reuses one query,
  // and so a transient Supabase blip doesn't immediately break protected routes.
  let profile = getCachedProfile(user.id);
  if (!profile) {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin, profile_complete")
      .eq("id", user.id)
      .single();

    if (data) {
      profile = { is_admin: !!data.is_admin, profile_complete: !!data.profile_complete };
      setCachedProfile(user.id, profile);
    } else if (error) {
      // On query failure, fall through without redirecting — page-level auth
      // (supabase.auth.getUser + its own profile check) will still apply.
      return supabaseResponse;
    }
  }

  if (profile) {
    // Incomplete profile → redirect to setup (unless already there or on /auth)
    if (
      !profile.profile_complete &&
      !pathname.startsWith("/profile/setup") &&
      !pathname.startsWith("/auth")
    ) {
      return NextResponse.redirect(new URL("/profile/setup", request.url));
    }

    // Admin route protection
    if (pathname.startsWith("/admin") && !profile.is_admin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/profile/:path*"],
};
