import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { API } from "../lib/api";
import { isMuted, setMuted, subscribeMute, Sound } from "../lib/sounds";
import { useUser } from "../context/UserContext";

export default function Header({ isIframed }: { isIframed: boolean }) {
  const [loc] = useLocation();
  const [todayCount, setTodayCount] = useState<number>(0);
  const [muted, setMutedLocal] = useState<boolean>(isMuted());
  const [pendingBattles, setPendingBattles] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const { userName, clearUser } = useUser();

  useEffect(() => subscribeMute(setMutedLocal), []);

  useEffect(() => {
    const tick = () =>
      fetch(`${API}/history`)
        .then((r) => r.json())
        .then((d) => setTodayCount(d.todayCount || 0))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userName) return;
    const tick = () =>
      fetch(`${API}/battle-requests?userName=${encodeURIComponent(userName)}`)
        .then((r) => r.json())
        .then((d) => {
          const pending = (d.requests || []).filter((r: any) => r.toUser === userName && r.status === "pending").length;
          setPendingBattles(pending);
        })
        .catch(() => {});
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [userName]);

  useEffect(() => {
    if (!userName) return;
    const tick = () =>
      fetch(`${API}/friends/summary/${encodeURIComponent(userName)}`)
        .then((r) => r.json())
        .then((d) => {
          setPendingFriends(d.pendingFriendRequests || 0);
          setUnreadDMs(d.unreadDMs || 0);
        })
        .catch(() => {});
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [userName]);

  const navItem = (to: string, label: string, badge?: number) => {
    const active = loc === to || (to !== "/" && loc.startsWith(to));
    return (
      <Link
        href={to}
        className={`relative px-2 py-1 rounded font-mono text-xs uppercase tracking-wider ${
          active ? "text-orange-400 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-100"
        }`}
      >
        {label}
        {badge ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <header className="border-b border-zinc-900 bg-black/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg overflow-hidden shadow-md shadow-orange-500/20">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="RoastLaunch"
              className="w-full h-full object-cover scale-[1.08]"
            />
          </div>
          <div className="text-xl md:text-2xl font-black tracking-tight neon-pulse">
            <span className="text-orange-400">Roast</span>
            <span className="text-green-400">Launch</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 hidden md:inline">/v1</span>
        </Link>

        <nav className="flex items-center gap-1 flex-wrap">
          {navItem("/", "Home")}
          {navItem("/battle", "Battle")}
          {navItem("/meta", "Meta")}
          {navItem("/leaderboard", "Leaderboard")}
          {navItem("/history", "Community")}
          {navItem("/watchlist", "Watchlist")}
          {userName && navItem("/friends", "Friends", pendingFriends + unreadDMs || undefined)}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-[10px] font-mono text-orange-400">
            🔥 {todayCount} roasted today
          </span>
          {userName && (
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${userName}`} className="text-[11px] font-mono text-green-400 hidden md:inline hover:text-green-300 relative">
                👤 {userName}
                {pendingBattles > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {pendingBattles}
                  </span>
                )}
              </Link>
              <button
                onClick={clearUser}
                title="Logout"
                className="px-2 py-1 rounded border border-zinc-700 text-zinc-500 font-mono text-[10px] hover:text-red-400 hover:border-red-500/50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
          <span className="hidden md:inline text-[10px] font-mono text-green-400">● BNB Testnet</span>
          <button
            onClick={() => { const next = !muted; setMuted(next); if (!next) Sound.click(); }}
            title={muted ? "Unmute" : "Mute"}
            className="px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 font-mono text-[11px] hover-elevate"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          {isIframed && (
            <a href={window.location.href} target="_blank" rel="noreferrer"
              className="px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 font-mono text-[10px] hover-elevate">
              ↗ Open
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
