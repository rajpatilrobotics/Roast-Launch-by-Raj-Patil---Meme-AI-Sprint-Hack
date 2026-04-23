import { Router, type IRouter } from "express";

const router: IRouter = Router();

type VoteCounts = { bull: number; skeptic: number; rug: number };
const votes = new Map<string, VoteCounts>();

function getOrInit(id: string): VoteCounts {
  let v = votes.get(id);
  if (!v) {
    v = { bull: 0, skeptic: 0, rug: 0 };
    votes.set(id, v);
  }
  return v;
}

router.get("/votes/:id", (req, res) => {
  const v = getOrInit(req.params.id);
  res.json({ counts: v, total: v.bull + v.skeptic + v.rug });
});

router.post("/votes/:id", (req, res) => {
  const { kind } = req.body || {};
  if (!["bull", "skeptic", "rug"].includes(kind)) {
    return res.status(400).json({ error: "kind must be bull|skeptic|rug" });
  }
  const v = getOrInit(req.params.id);
  v[kind as keyof VoteCounts] += 1;
  res.json({ counts: v, total: v.bull + v.skeptic + v.rug });
});

export default router;
