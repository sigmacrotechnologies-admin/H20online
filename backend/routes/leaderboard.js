const express = require("express");
const User = require("../models/User");
const WaterIntake = require("../models/WaterIntake");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function dateString(d) {
  const x = d instanceof Date ? d : new Date(d);
  return x.toISOString().slice(0, 10);
}

function getMonthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to, label: new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }) };
}

function parseMonthQuery(query) {
  const now = new Date();
  let year = Number(query.year) || now.getFullYear();
  let month = Number(query.month) || now.getMonth() + 1;
  if (month < 1 || month > 12) month = now.getMonth() + 1;
  if (year < 2020 || year > 2100) year = now.getFullYear();
  return getMonthRange(year, month);
}

function displayName(name) {
  const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "User";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

async function buildMonthlyLeaderboard(from, to, currentUserId) {
  const optedInUsers = await User.find({
    role: "customer",
    leaderboardOptIn: true,
  })
    .select("_id name avatarUrl")
    .lean();
  const optedInIds = optedInUsers.map((u) => u._id);
  if (!optedInIds.length) {
    return { entries: [], userRank: null, userTotalLiters: 0 };
  }

  const totals = await WaterIntake.aggregate([
    {
      $match: {
        userId: { $in: optedInIds },
        date: { $gte: from, $lte: to },
      },
    },
    {
      $project: {
        userId: 1,
        totalMl: {
          $reduce: {
            input: { $ifNull: ["$entries", []] },
            initialValue: 0,
            in: { $add: ["$$value", { $ifNull: ["$$this.volumeMl", 0] }] },
          },
        },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalMl: { $sum: "$totalMl" },
      },
    },
    { $sort: { totalMl: -1 } },
  ]);

  const userMap = Object.fromEntries(optedInUsers.map((u) => [u._id.toString(), u]));
  const entries = totals.map((row, index) => {
    const user = userMap[row._id.toString()] || {};
    const totalLiters = Math.round((row.totalMl / 1000) * 10) / 10;
    return {
      rank: index + 1,
      userId: row._id.toString(),
      name: displayName(user.name),
      avatarUrl: user.avatarUrl || "",
      totalLiters,
      isCurrentUser: row._id.toString() === currentUserId.toString(),
    };
  });

  const currentEntry = entries.find((e) => e.isCurrentUser);
  let userRank = currentEntry ? currentEntry.rank : null;
  let userTotalLiters = currentEntry ? currentEntry.totalLiters : 0;

  if (!currentEntry) {
    const me = await User.findById(currentUserId).select("leaderboardOptIn").lean();
    if (me?.leaderboardOptIn) {
      const myDocs = await WaterIntake.find({
        userId: currentUserId,
        date: { $gte: from, $lte: to },
      }).lean();
      const myMl = myDocs.reduce(
        (sum, doc) => sum + (doc.entries || []).reduce((s, e) => s + (e.volumeMl || 0), 0),
        0
      );
      userTotalLiters = Math.round((myMl / 1000) * 10) / 10;
      const ahead = entries.filter((e) => e.totalLiters > userTotalLiters).length;
      userRank = ahead + 1;
    }
  }

  return { entries: entries.slice(0, 50), userRank, userTotalLiters };
}

router.get("/", async (req, res) => {
  try {
    const { from, to, label } = parseMonthQuery(req.query);
    const user = await User.findById(req.user._id).select("leaderboardOptIn leaderboardMonthlyReport").lean();
    const { entries, userRank, userTotalLiters } = await buildMonthlyLeaderboard(from, to, req.user._id);

    res.json({
      period: { from, to, label },
      rankings: entries,
      preferences: {
        optIn: !!user?.leaderboardOptIn,
        monthlyReport: !!user?.leaderboardMonthlyReport,
      },
      me: {
        rank: user?.leaderboardOptIn ? userRank : null,
        totalLiters: userTotalLiters,
        optedIn: !!user?.leaderboardOptIn,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/preferences", async (req, res) => {
  try {
    const { optIn, monthlyReport } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (optIn !== undefined) user.leaderboardOptIn = !!optIn;
    if (monthlyReport !== undefined) user.leaderboardMonthlyReport = !!monthlyReport;
    await user.save();

    res.json({
      optIn: !!user.leaderboardOptIn,
      monthlyReport: !!user.leaderboardMonthlyReport,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
