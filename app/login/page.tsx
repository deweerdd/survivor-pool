import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Survivor Pool</h1>
        <p className="text-muted-foreground">Sign in to get started</p>
        <form action={signInWithGoogle}>
          <button type="submit" className="btn btn-primary px-6 py-3">
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
