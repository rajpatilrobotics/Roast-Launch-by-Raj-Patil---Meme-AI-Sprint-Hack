import { useState } from "react";
import { API } from "../lib/api";
import { useUser } from "../context/UserContext";

export default function NameModal() {
  const { setUserName } = useUser();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) { setError("Name must be at least 2 characters"); return; }
    if (trimmed.length > 24) { setError("Name must be 24 characters or less"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.status === 409) {
        setUserName(trimmed);
        return;
      }

      if (!res.ok) {
        setError("Something went wrong, try again");
        setLoading(false);
        return;
      }

      setUserName(trimmed);
    } catch {
      setError("Could not connect, try again");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-orange-500/10">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔥</div>
          <h2 className="text-2xl font-black">
            <span className="text-orange-400">Roast</span>
            <span className="text-green-400">Launch</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-2">Pick a username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="your name / handle"
              maxLength={24}
              autoFocus
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 text-zinc-100 placeholder:text-zinc-600 font-mono"
            />
            {error && (
              <p className="text-red-400 text-xs mt-2 font-mono">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl transition-colors text-sm uppercase tracking-wider"
          >
            {loading ? "Checking..." : "Let's Roast →"}
          </button>
        </form>

        <p className="text-zinc-600 text-xs text-center mt-4">
          No password needed. Returning? Just re-enter your name.
        </p>
      </div>
    </div>
  );
}
