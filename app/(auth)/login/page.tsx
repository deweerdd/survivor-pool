// Server component — login page
import { LoginButton } from "./login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900">
      <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Survivor Pool</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Outwit. Outplay. Out-pick.
          </p>
        </div>

        {error && (
          <div className="w-full bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
            Sign-in failed. Please try again.
          </div>
        )}

        <LoginButton />

        <p className="text-xs text-gray-400 text-center">
          Sign in with your Google account to join or create a pool.
        </p>
      </div>
    </div>
  );
}
