# 🔥 RoastLaunch — Full App Walkthrough

**A meme-coin idea simulator for BNB Chain / Four.meme.**
Pitch a coin → 3 AI judges roast it → get a Survive Score, fix it, share it,
launch it on (fake) chain, battle friends live, and climb the leaderboard.

Use this as your script for the judges' demo video. Read the **"Say this"**
lines on camera, do the **"Show this"** action, and move on.

Total runtime target: **3 to 4 minutes.**

---

## 0. Before you hit record — 30-second checklist

- App is open at the home page (`/`).
- Pick a username when the popup asks (e.g. `RajP`). This unlocks Friends,
  DMs, leaderboard, watchlist.
- Open a second browser (or incognito) and log in as a second user
  (e.g. `JudgeBot`). You'll need this for the **Live Battle** demo.
- Sound on. The app has verdict sounds, AI voice, and confetti — they
  sell the energy.

---

## 1. The Hook (10 seconds) — Hero section

**Show this:** The animated hero at the top. Floating 🪙💎🚀🐸 emojis,
the live "X coins roasted today" counter, and the orange/green color theme.

**Say this:**
> "RoastLaunch is the AI sanity-check for meme coins. You pitch an idea in
> one sentence, three AI judges roast it, and you get a Survive Score
> before you waste a single dollar of liquidity."

Right under the hero is the **trending ticker bar** — it auto-refreshes
every 60 seconds with the current "hot meta" (e.g. "AI agent coins") and a
scrolling list of trending tickers. Point it out — it shows the app feels
alive.

---

## 2. The Core Loop — Home page (`/`) — 60 seconds

This is the heart of the app. Walk through the numbered steps.

### Step 1 — Pitch your meme coin
**Show:** The big orange textarea labelled "Your idea".
- Click **🎲 Surprise me** once to show the random preset chips
  (e.g. "🐸 Frog that trades in its sleep").
- Then type your own: *"a cat that does the family taxes on-chain"*.
- Optionally fill **Token name** and **TICKER**.
- Hit **🔥 Roast My Coin**.

**Say:** "No wallet, no signup, no gas. Free. Takes about thirty seconds."

### Step 2 — The Countdown + 3 AI Judges
**Show:** A 3-2-1 countdown overlay, then three judge cards type out their
verdict in real time:
- 🐂 **The Bull** (green) — finds the bullish case.
- 🦝 **The Skeptic** (orange) — pokes holes in the narrative.
- 🚨 **The Rug Detector** (red) — looks for scam patterns.

Hit the **🔊 Hear it** button — the app reads the whole roast aloud in a
synthesized voice, like a panel show. Confetti fires (green WAGMI, red NGMI,
orange DYOR), and on a bad verdict the whole page shakes. **Demo this.**

### Step 3 — The Numbers
Scroll to the **Survive Score** dial (0-100) plus four sub-bars:
**Narrative · Community · Timing · Risk**, and two probabilities:
**Rug Probability** and **Graduation Probability** (chance the coin
"graduates" off the bonding curve on Four.meme).

**Say:** "One score that tells you if this thing has any chance of making it."

### Step 4 — Fix It (Coach mode)
**Show:** The **🛠️ Coach Me** button. Click it.
The AI rewrites your pitch, returns an **improved** version, and shows a
side-by-side **before → after** with green deltas on every metric.

**Say:** "If your score is bad, the AI doesn't just roast — it teaches.
One click and you see exactly what changed."

Click **Use this version** to make the improved roast your current one.

### Step 5 — Launch (fake on-chain receipt)
Click **⛓ Save On-Chain**. A realistic fake transaction receipt appears —
hash, block, gas, BNB Chain branding. Pure simulation, but it sells the
"this could be real" feeling for judges.

### Step 6 — Share
Two buttons:
- **🎨 Download card** — exports a clean PNG of your roast (great for
  Twitter/X).
- **🐦 Share on X** — opens a pre-filled tweet with your score, verdict,
  and `#RoastLaunch #FourMeme #BNBChain`.

---

## 3. Top Nav — Tab by Tab

The header has these tabs (left to right). Visit each one briefly.

### 🏠 Home (`/`)
Already covered above. The pitch → roast → fix → launch loop.

### ⚔️ Battle (`/battle`)
**Show:** Two coin panels side by side (Coin A vs Coin B), plus a row of
**preset matchups** ("🐸 Pepe vs 🐕 Doge", "🤖 AI Agent vs 🧠 Brainrot",
"👟 Elon's shoe vs 💍 CZ's ring").
Pick a preset, hit **Battle**, and the AI judges both coins, declares a
winner, and gives a one-line reason.

There's also a **Live Battle** widget on this page that shows:
- Who's online right now.
- A history of recent live battles.

**Say:** "Battle mode is for arguments. Two coins enter, one wins."

### 🥊 Live Battle Room (`/battle/live/:id`) — show this with two browsers
This is the killer multiplayer feature.
1. From a friend's profile (or the Battle page), send a **live battle
   invite**.
2. The other browser gets a notification with **Accept / Decline**.
3. Once accepted, both players have **60 seconds** to enter their coin.
4. Both submissions are roasted simultaneously, judged head-to-head, and
   a winner is announced live.

**Say:** "Real-time PvP roast battles. 60-second timer. Winner takes the
bragging rights."

### 📊 Meta (`/meta`)
**Show:** The current trending "meta" (AI coins / Dog coins / Political /
Anime / Degen / Other), a **24-hour heatmap** of when the chain is most
active, the **best hour to launch**, a **graveyard** of dead narratives,
and a **forecast** card with confidence percentage and a one-line summary.

There are also category preset buttons — click one to instantly jump back
to Home with a pre-filled pitch in that meta. You can **download a Meta
report card** as PNG.

**Say:** "Meta tells you what's hot, when to launch, and what's already
dead. It's the macro view."

### 🏆 Leaderboard (`/leaderboard`)
Three sections:
- 🥇 **Hall of Fame** — top 5 highest-scoring roasts (real + seeded).
- 💀 **Wall of Shame** — bottom 5, lowest scores.
- ⭐ **Community Stars** — top users by total activity, average score,
  roast count, and battle count.

Click any user to jump to their profile.

### 📜 History (`/history`) — also acts as the **Community** hub
This page is dense — point out the highlights:
- 🎯 **Daily Challenge** — today's narrative + prompt + reward. One click
  takes the challenge (pre-fills Home).
- 👑 **Roast of the Week** — community-voted top roast.
- ⚔️ **Daily Battle** — community votes A vs B; show your vote.
- **Activity feed** — every roast / battle / launch by every user, with
  reactions (🔥💀🚀🤡), comments, and remix buttons. Filter **All / Mine**
  and sort **Newest / Top / Most Discussed**.
- **Launches tab** — leaderboard of who has "launched" the most coins
  (saved on the fake chain) and a recent launches stream.
- **Daily Recap** — yesterday's totals, top user, best coin.
- 💬 **Chat panel** — global community chat, slide-out from the side.

**Say:** "This is where the community lives. Daily challenges, weekly
winners, group chat, and every roast anyone has ever shared."

### 📋 Watchlist (`/watchlist`)
Coin ideas you've saved for later. Each card shows the idea, name, ticker,
and timestamp. Two buttons per card: **🔥 Roast Now** (pre-fills Home) and
**Remove**.

**Say:** "Save ideas now, roast them later when the meta shifts."

### 👥 Friends (`/friends`)
Three tabs inside this page:
1. **Friends** — your friend list with online dots and last-seen.
2. **Requests** — pending incoming + outgoing friend requests with
   Accept / Decline.
3. **Find** — search any user, filter by **All / Online / New / Active**,
   send friend requests.

From any friend you can: visit their profile, send a **DM**, or
**challenge them to a live battle**.

**Say:** "Add friends, challenge them, message them. Everything social
in one place."

### 👤 User Profile (`/u/:name`)
Click any username anywhere in the app to land here. Shows:
- Their stats: total score, average, roast count, battle count, votes
  received.
- Their top coin.
- Recent activity feed.
- **Add Friend / Message** buttons.
- A **Challenge to Battle** button — sends a live battle request that
  appears as a notification on their end.
- If it's your own profile: incoming battle requests with Accept /
  Decline (with a coin entry form).

### 🔔 Notifications (top-right bell)
Persistent across every page. Shows live battle invites, friend requests,
DMs, and acceptance pings. Click one to jump straight to the relevant
screen.

### 🔇 Mute toggle (top-right speaker)
Kills all sound effects + AI voice. Mention it but leave it on for the
demo — sound makes it feel alive.

---

## 4. The Closer (15 seconds)

**Show:** Quick triple-cut — Home result card → Live Battle in progress →
Leaderboard.

**Say:**
> "RoastLaunch turns the scariest, most expensive part of meme-coin
> launches — finding out your idea is bad — into a 30-second free
> AI panel show. With friends, battles, daily challenges, and on-chain
> launch receipts. Built on BNB Chain for Four.meme. Thanks for watching."

---

## 5. Cheat-sheet for the demo (one-liner per tab)

| Tab | One-liner |
|---|---|
| **Home** | "Pitch → 3 judges → score → fix → launch → share." |
| **Battle** | "Two coins enter, AI picks the winner." |
| **Live Battle** | "Real-time PvP, 60-second timer." |
| **Meta** | "What's hot, when to launch, what's dead." |
| **Leaderboard** | "Hall of Fame, Wall of Shame, Community Stars." |
| **History / Community** | "Daily challenges, weekly winners, global chat." |
| **Watchlist** | "Save ideas, roast later." |
| **Friends** | "Add, message, challenge." |
| **Profile** | "Stats, top coin, battle me button." |
| **Notifications** | "Invites and DMs in real time." |

---

## 6. Recording tips

- **Mouse**: move slowly, hover before you click — judges need to see
  what you're about to do.
- **Don't read every word on screen.** Let the visuals breathe.
- **Capture sound**: make sure your screen recorder includes system
  audio so the verdict sounds + AI voice land.
- **Two windows**: do the live battle with the second browser **already
  on the right half of the screen** so the cut to "the other player just
  joined" feels seamless.
- **End on a WAGMI**. Pick an idea you've already tested that scores
  high, so the final shot is green confetti and a 90+ score.

Good luck — go win this thing. 🔥
