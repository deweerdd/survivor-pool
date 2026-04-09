import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import EmberParticles from "@/components/EmberParticles";
import ScrollReveal from "@/components/ScrollReveal";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="landing">
      {/* ── Minimal nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3">
        <Link href="/" className="text-display text-lg tracking-wider">
          <span className="text-primary font-semibold">SURVIVOR</span>
          <span className="text-foreground font-semibold">POOL</span>
        </Link>
        <Link href="/login" className="btn btn-ghost btn-sm">
          Sign In
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <EmberParticles />
        <div className="landing-hero-content animate-fade-up">
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
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

      {/* ── Stats ── */}
      <ScrollReveal>
        <section className="landing-stats">
          <div className="landing-stats-grid">
            <div>
              <div className="landing-stat-value">500+</div>
              <div className="landing-stat-label">Players</div>
            </div>
            <div>
              <div className="landing-stat-value">50+</div>
              <div className="landing-stat-label">Active Pools</div>
            </div>
            <div>
              <div className="landing-stat-value">S48</div>
              <div className="landing-stat-label">Current Season</div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <hr className="divider-accent" />

      {/* ── How It Works ── */}
      <section className="landing-steps">
        <ScrollReveal>
          <h2 className="landing-steps-heading">How It Works</h2>
        </ScrollReveal>
        <ScrollReveal stagger>
          <div className="landing-steps-grid">
            <div className="landing-step">
              <div className="landing-step-number">01</div>
              <div className="landing-step-icon">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Join a Pool</h3>
              <p>
                Create or join a pool with friends, family, or coworkers. Public pools are open to
                all; private pools use invite codes.
              </p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">02</div>
              <div className="landing-step-icon">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3>Allocate Points</h3>
              <p>
                Each episode, you get 20 points to distribute across the remaining castaways. Put
                big points on who you think will be voted out.
              </p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">03</div>
              <div className="landing-step-icon">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <h3>Climb the Ranks</h3>
              <p>
                When a castaway is eliminated, you earn whatever points you placed on them. The
                player with the most points at the finale wins.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Features ── */}
      <section className="landing-features">
        <ScrollReveal>
          <h2 className="landing-features-heading">Built for the Game</h2>
        </ScrollReveal>
        <ScrollReveal stagger>
          <div className="landing-features-grid">
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h4>Sole Survivor Picks</h4>
              <p>
                Predict the ultimate winner for bonus points. Change your pick as the game evolves —
                earlier picks earn more.
              </p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </div>
              <h4>Episode Allocations</h4>
              <p>
                Spread 20 points across castaways each episode. Go all-in on a hunch or hedge your
                bets.
              </p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <h4>Live Leaderboards</h4>
              <p>
                Track your rank in real-time. See how you stack up against friends with detailed
                scoring breakdowns.
              </p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h4>Private Pools</h4>
              <p>
                Create invite-only pools for your crew. Share a code and compete in your own private
                tribal council.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-bottom-cta">
        <ScrollReveal>
          <div className="landing-bottom-cta-inner">
            <h2>The Tribe Has Spoken</h2>
            <p>Ready to play? Sign in and join your first pool in under a minute.</p>
            <Link href="/login" className="btn btn-torch landing-cta">
              Get Started
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
