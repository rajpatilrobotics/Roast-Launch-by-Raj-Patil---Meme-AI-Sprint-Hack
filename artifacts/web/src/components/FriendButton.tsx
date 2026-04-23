import { useEffect, useState } from "react";
import { API } from "../lib/api";

type Status = "self" | "friends" | "outgoing" | "incoming" | "none" | "loading";

export default function FriendButton({
  userName,
  otherUser,
  onChange,
}: {
  userName: string;
  otherUser: string;
  onChange?: (s: Status) => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch(
        `${API}/friends/status?userName=${encodeURIComponent(userName)}&otherUser=${encodeURIComponent(otherUser)}`,
      );
      const d = await r.json();
      setStatus(d.status as Status);
      onChange?.(d.status as Status);
    } catch {}
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, otherUser]);

  async function send() {
    setBusy(true);
    await fetch(`${API}/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser: userName, toUser: otherUser }),
    }).catch(() => {});
    await load();
    setBusy(false);
  }
  async function accept() {
    setBusy(true);
    await fetch(`${API}/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, otherUser }),
    }).catch(() => {});
    await load();
    setBusy(false);
  }
  async function unfriend() {
    if (!confirm(`Unfriend @${otherUser}?`)) return;
    setBusy(true);
    await fetch(`${API}/friends/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, otherUser }),
    }).catch(() => {});
    await load();
    setBusy(false);
  }
  async function cancel() {
    setBusy(true);
    await fetch(`${API}/friends/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, otherUser }),
    }).catch(() => {});
    await load();
    setBusy(false);
  }

  if (status === "self" || status === "loading") return null;

  if (status === "friends") {
    return (
      <button
        onClick={unfriend}
        disabled={busy}
        className="px-3 py-2 rounded-xl bg-green-500/15 border border-green-500/40 text-green-300 font-mono text-xs hover:bg-red-500/15 hover:border-red-500/40 hover:text-red-300 transition-colors disabled:opacity-50"
        title="Click to unfriend"
      >
        ✓ Friends
      </button>
    );
  }
  if (status === "outgoing") {
    return (
      <button
        onClick={cancel}
        disabled={busy}
        className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 font-mono text-xs hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-50"
        title="Cancel request"
      >
        Request Sent
      </button>
    );
  }
  if (status === "incoming") {
    return (
      <button
        onClick={accept}
        disabled={busy}
        className="px-3 py-2 rounded-xl bg-pink-500/20 border border-pink-500/50 text-pink-200 font-mono text-xs font-bold hover:bg-pink-500/30 disabled:opacity-50 animate-pulse"
      >
        Accept Friend Request
      </button>
    );
  }
  return (
    <button
      onClick={send}
      disabled={busy}
      className="px-3 py-2 rounded-xl bg-pink-500/20 border border-pink-500/50 text-pink-200 font-mono text-xs hover:bg-pink-500/30 disabled:opacity-50 transition-colors"
    >
      + Add Friend
    </button>
  );
}
