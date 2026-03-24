import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Landing page: redirect authenticated users to dashboard (not requireUser — unauthenticated is valid here)
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="landing">
      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-content">
          <div className="landing-torch-icon" aria-hidden="true">
            <svg viewBox="0 0 48 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 0C24 0 32 12 32 20C32 25 29 28 26 30L28 50H20L22 30C19 28 16 25 16 20C16 12 24 0 24 0Z"
                fill="url(#flame-grad)"
              />
              <rect x="20" y="50" width="8" height="26" rx="2" fill="#78716c" />
              <rect x="18" y="74" width="12" height="4" rx="1" fill="#57534e" />
              <defs>
                <linearGradient id="flame-grad" x1="24" y1="0" x2="24" y2="50">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="40%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="landing-title">
            <span className="landing-title-survivor">Survivor</span>
            <span className="landing-title-pool">Pool</span>
          </h1>

          <p className="landing-tagline">
            Pick your castaways. Allocate your points. Outlast the competition.
          </p>

          <Link href="/login" className="btn btn-torch landing-cta">
            Get Started
          </Link>

          <p className="landing-subtitle">Free to play &middot; Sign up in seconds</p>
        </div>

        <div className="landing-scroll-hint" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-steps">
        <h2 className="landing-steps-heading">How It Works</h2>
        <div className="landing-steps-grid">
          <div className="landing-step">
            <div className="landing-step-number">01</div>
            <h3>Join a Pool</h3>
            <p>
              Create or join a pool with friends, family, or coworkers. Public pools are open to
              all; private pools use invite codes.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">02</div>
            <h3>Allocate Points</h3>
            <p>
              Each episode, you get 20 points to distribute across the remaining castaways. Put big
              points on who you think will be voted out.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">03</div>
            <h3>Climb the Ranks</h3>
            <p>
              When a castaway is eliminated, you earn whatever points you placed on them. The player
              with the most points at the finale wins.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-bottom-cta">
        <div className="landing-bottom-cta-inner">
          <h2>The Tribe Has Spoken</h2>
          <p>Ready to play? Sign in and join your first pool in under a minute.</p>
          <Link href="/login" className="btn btn-torch landing-cta">
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
