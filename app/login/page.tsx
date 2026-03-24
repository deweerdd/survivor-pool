import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  async function signInWithGoogle() {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (data.url) {
      redirect(data.url);
    }
  }

  return (
    <main className="landing">
      <section className="landing-hero" style={{ minHeight: "100vh" }}>
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-content" style={{ maxWidth: "480px", width: "100%" }}>
          {/* Torch + Title */}
          <div className="landing-torch-icon" aria-hidden="true">
            <svg viewBox="0 0 48 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 0C24 0 32 12 32 20C32 25 29 28 26 30L28 50H20L22 30C19 28 16 25 16 20C16 12 24 0 24 0Z"
                fill="url(#flame-grad-login)"
              />
              <rect x="20" y="50" width="8" height="26" rx="2" fill="#78716c" />
              <rect x="18" y="74" width="12" height="4" rx="1" fill="#57534e" />
              <defs>
                <linearGradient id="flame-grad-login" x1="24" y1="0" x2="24" y2="50">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="40%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="landing-title" style={{ marginBottom: "0.5rem" }}>
            <span className="landing-title-survivor">Survivor</span>
            <span className="landing-title-pool">Pool</span>
          </h1>

          <p className="landing-tagline" style={{ marginBottom: "2rem", fontSize: "1rem" }}>
            Outlast the competition
          </p>

          {/* Login Form */}
          <LoginForm signInWithGoogle={signInWithGoogle} />
        </div>
      </section>
    </main>
  );
}
