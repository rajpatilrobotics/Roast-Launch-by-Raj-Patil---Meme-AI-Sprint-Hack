import { useState } from "react";
import { Link, useLocation } from "wouter";
import { API, scoreColor, verdictColor } from "../../lib/api";

const EMOJIS = ["🔥", "🚀", "💀", "😂", "🎰", "💎"];

type Summary = {
  reactions: Record<string, number>;
  myReactions: string[];
  voteTotal: number;
  myVote: number;
  commentCount: number;
};

type Comment = { id: number; userName: string; text: string; createdAt: string };

type ActivityItem = {
  id: number;
  userName: string;
  type: string;
  coinName: string;
  score: number | null;
  verdict: string | null;
  createdAt: string;
  remixOfId?: number | null;
  remixOfUser?: string | null;
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityCard({
  item,
  summary,
  userName,
  onSummaryChange,
}: {
  item: ActivityItem;
  summary: Summary;
  userName: string;
  onSummaryChange: (id: number, patch: Partial<Summary>) => void;
}) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const [battleOpen, setBattleOpen] = useState(false);
  const [battleCoin, setBattleCoin] = useState({ tokenIdea: "", tokenName: "", ticker: "" });
  const [battleSent, setBattleSent] = useState(false);
  const [sendingBattle, setSendingBattle] = useState(false);

  const [savedToWatchlist, setSavedToWatchlist] = useState(false);

  const [remixOpen, setRemixOpen] = useState(false);
  const [remixTwist, setRemixTwist] = useState("");
  const [remixing, setRemixing] = useState(false);

  async function toggleReaction(emoji: string) {
    if (!userName) return;
    const hadIt = summary.myReactions.includes(emoji);
    const newMyReactions = hadIt
      ? summary.myReactions.filter((e) => e !== emoji)
      : [...summary.myReactions, emoji];
    const newReactions = { ...summary.reactions };
    if (hadIt) {
      newReactions[emoji] = Math.max(0, (newReactions[emoji] || 1) - 1);
      if (newReactions[emoji] === 0) delete newReactions[emoji];
    } else {
      newReactions[emoji] = (newReactions[emoji] || 0) + 1;
    }
    onSummaryChange(item.id, { reactions: newReactions, myReactions: newMyReactions });
    await fetch(`${API}/community/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId: item.id, userName, emoji }),
    }).catch(() => {});
  }

  async function vote(value: number) {
    if (!userName) return;
    const isSame = summary.myVote === value;
    const newMyVote = isSame ? 0 : value;
    const delta = newMyVote - summary.myVote;
    onSummaryChange(item.id, { voteTotal: summary.voteTotal + delta, myVote: newMyVote });
    await fetch(`${API}/community/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId: item.id, userName, value: newMyVote }),
    }).catch(() => {});
  }

  async function toggleComments() {
    if (!expanded && comments.length === 0) {
      setLoadingComments(true);
      try {
        const r = await fetch(`${API}/community/comments/${item.id}`);
        const d = await r.json();
        setComments(d.comments || []);
      } catch {} finally { setLoadingComments(false); }
    }
    setExpanded((p) => !p);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentInput.trim();
    if (!text || sendingComment || !userName) return;
    setSendingComment(true);
    try {
      const r = await fetch(`${API}/community/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: item.id, userName, text }),
      });
      const newComment = await r.json();
      setComments((prev) => [...prev, newComment]);
      onSummaryChange(item.id, { commentCount: summary.commentCount + 1 });
      setCommentInput("");
    } catch {} finally { setSendingComment(false); }
  }

  async function submitRemix() {
    const twist = remixTwist.trim();
    if (!twist || remixing || !userName) return;
    setRemixing(true);
    try {
      const r = await fetch(`${API}/roast/remix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: item.id, twist, userName }),
      });
      const result = await r.json();
      if (result && !result.error) {
        sessionStorage.setItem("roastlaunch:remixResult", JSON.stringify(result));
        navigate("/");
      }
    } catch {} finally {
      setRemixing(false);
      setRemixOpen(false);
      setRemixTwist("");
    }
  }

  function shareToX() {
    const verdict = item.verdict ? `${item.verdict} ` : "";
    const score = item.score !== null ? `Score: ${item.score}/100. ` : "";
    const text = `🔥 Just got roasted on RoastLaunch:\n"${item.coinName}"\n${verdict}${score}\nThink you can do better? 👀`;
    const url = typeof window !== "undefined" ? window.location.origin : "https://roastlaunch.app";
    const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=RoastLaunch,FourMeme,memecoin`;
    window.open(tweet, "_blank", "noopener,noreferrer");
  }

  function stealIdea() {
    sessionStorage.setItem("roastlaunch:prefill", JSON.stringify({ idea: item.coinName, name: "", ticker: "" }));
    navigate("/");
  }

  async function saveToWatchlist() {
    if (!userName || savedToWatchlist) return;
    await fetch(`${API}/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, coinIdea: item.coinName }),
    }).catch(() => {});
    setSavedToWatchlist(true);
    setTimeout(() => setSavedToWatchlist(false), 3000);
  }

  async function sendBattleRequest() {
    if (!battleCoin.tokenIdea.trim() || !userName || sendingBattle) return;
    setSendingBattle(true);
    await fetch(`${API}/battle-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser: userName, toUser: item.userName, fromCoin: battleCoin }),
    }).catch(() => {});
    setSendingBattle(false);
    setBattleSent(true);
    setTimeout(() => { setBattleOpen(false); setBattleSent(false); setBattleCoin({ tokenIdea: "", tokenName: "", ticker: "" }); }, 2500);
  }

  const isOwn = item.userName === userName;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lg">{item.type === "battle" ? "⚔️" : item.type === "launch" ? "🚀" : "🔥"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/u/${item.userName}`} className={`font-mono text-sm font-bold hover:underline underline-offset-2 ${isOwn ? "text-green-400" : "text-orange-400"}`}>
              {item.userName}{isOwn ? " (you)" : ""}
            </Link>
            <span className="text-zinc-500 text-xs">{item.type === "battle" ? "battled" : "roasted"}</span>
            <span className="text-zinc-200 text-sm font-medium truncate max-w-[180px]">{item.coinName}</span>
          </div>
          <div className="text-zinc-600 text-[11px]">{timeAgo(item.createdAt)}</div>
        </div>
        {item.score !== null && (
          <div className="text-right shrink-0">
            <div className={`text-xl font-black ${scoreColor(item.score!)}`}>{item.score}</div>
            {item.verdict && (
              <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${verdictColor(item.verdict)}`}>
                {item.verdict}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reactions + votes row */}
      <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
        {EMOJIS.map((emoji) => {
          const count = summary.reactions[emoji] || 0;
          const mine = summary.myReactions.includes(emoji);
          return (
            <button key={emoji} onClick={() => toggleReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors ${mine ? "border-orange-500/60 bg-orange-500/15 text-orange-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`}>
              {emoji}{count > 0 && <span className="font-mono">{count}</span>}
            </button>
          );
        })}

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => vote(1)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors ${summary.myVote === 1 ? "border-green-500/60 bg-green-500/15 text-green-300" : "border-zinc-700 text-zinc-400 hover:border-green-500/40"}`}>
            ▲
          </button>
          <span className={`font-mono text-xs font-bold ${summary.voteTotal > 0 ? "text-green-400" : summary.voteTotal < 0 ? "text-red-400" : "text-zinc-500"}`}>
            {summary.voteTotal > 0 ? "+" : ""}{summary.voteTotal}
          </span>
          <button onClick={() => vote(-1)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors ${summary.myVote === -1 ? "border-red-500/60 bg-red-500/15 text-red-300" : "border-zinc-700 text-zinc-400 hover:border-red-500/40"}`}>
            ▼
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-3 flex items-center gap-3 flex-wrap border-t border-zinc-800/60 pt-2">
        <button onClick={toggleComments} className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
          💬 {summary.commentCount} {summary.commentCount === 1 ? "comment" : "comments"}
        </button>

        <button onClick={saveToWatchlist} disabled={savedToWatchlist} className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${savedToWatchlist ? "text-green-400" : "text-zinc-400 hover:text-blue-400"}`}>
          {savedToWatchlist ? "✅ Saved!" : "💾 Save"}
        </button>

        {!isOwn && (
          <button onClick={stealIdea} className="text-[11px] font-mono text-zinc-400 hover:text-orange-400 flex items-center gap-1">
            🍴 Steal idea
          </button>
        )}

        {!isOwn && (
          <button onClick={() => setBattleOpen((p) => !p)} className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${battleOpen ? "text-yellow-400" : "text-zinc-400 hover:text-yellow-400"}`}>
            ⚔️ Battle Request
          </button>
        )}

        <button onClick={() => setRemixOpen((p) => !p)} className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${remixOpen ? "text-purple-400" : "text-zinc-400 hover:text-purple-400"}`}>
          🔀 Remix
        </button>

        <button onClick={shareToX} className="text-[11px] font-mono text-zinc-400 hover:text-sky-400 flex items-center gap-1 ml-auto">
          𝕏 Share
        </button>
      </div>

      {item.remixOfUser && (
        <div className="px-4 -mt-1 pb-2">
          <Link href={`/u/${item.remixOfUser}`} className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
            🔀 Remix of @{item.remixOfUser}
          </Link>
        </div>
      )}

      {remixOpen && (
        <div className="px-4 pb-3 border-t border-zinc-800/60 pt-3 space-y-2">
          <p className="text-zinc-500 text-[11px] font-mono">Add your twist to <span className="text-purple-300">{item.coinName}</span>:</p>
          <input
            value={remixTwist}
            onChange={(e) => setRemixTwist(e.target.value)}
            placeholder="e.g. set in space, with cats, in 2099..."
            maxLength={80}
            className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <button onClick={submitRemix} disabled={!remixTwist.trim() || remixing}
              className="flex-1 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-mono hover:bg-purple-500/30 disabled:opacity-40">
              {remixing ? "Remixing..." : "🔀 Generate Remix"}
            </button>
            <button onClick={() => setRemixOpen(false)} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Battle request mini-form */}
      {battleOpen && !isOwn && (
        <div className="px-4 pb-3 border-t border-zinc-800/60 pt-3">
          {battleSent ? (
            <p className="text-green-400 text-xs font-mono">Battle request sent! 🎯 They'll see it in their profile.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-zinc-500 text-[11px] font-mono">Challenge <span className="text-orange-400">{item.userName}</span> — enter your coin:</p>
              <input
                value={battleCoin.tokenIdea}
                onChange={(e) => setBattleCoin((p) => ({ ...p, tokenIdea: e.target.value }))}
                placeholder="Your coin idea *"
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-yellow-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input value={battleCoin.tokenName} onChange={(e) => setBattleCoin((p) => ({ ...p, tokenName: e.target.value }))} placeholder="Name (optional)" className="bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none" />
                <input value={battleCoin.ticker} onChange={(e) => setBattleCoin((p) => ({ ...p, ticker: e.target.value.toUpperCase() }))} placeholder="TICKER" className="bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={sendBattleRequest} disabled={!battleCoin.tokenIdea.trim() || sendingBattle}
                  className="flex-1 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-xs font-mono hover:bg-yellow-500/30 disabled:opacity-40">
                  {sendingBattle ? "Sending..." : "⚔️ Send Request"}
                </button>
                <button onClick={() => setBattleOpen(false)} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments section */}
      {expanded && (
        <div className="border-t border-zinc-800/60 px-4 py-3 space-y-3">
          {loadingComments && <p className="text-zinc-600 text-xs font-mono">Loading...</p>}
          {!loadingComments && comments.length === 0 && <p className="text-zinc-600 text-xs font-mono">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Link href={`/u/${c.userName}`} className={`font-mono text-[11px] font-bold shrink-0 hover:underline ${c.userName === userName ? "text-green-400" : "text-orange-400"}`}>
                {c.userName}
              </Link>
              <span className="text-xs text-zinc-300">{c.text}</span>
              <span className="text-[10px] text-zinc-600 shrink-0 ml-auto">{timeAgo(c.createdAt)}</span>
            </div>
          ))}
          {userName && (
            <form onSubmit={submitComment} className="flex gap-2 pt-1">
              <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Add a comment..." maxLength={280}
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
              <button type="submit" disabled={!commentInput.trim() || sendingComment}
                className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 text-xs font-mono disabled:opacity-40 hover:bg-orange-500/30">
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
