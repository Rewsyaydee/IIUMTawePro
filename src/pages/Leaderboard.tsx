import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { buildIndividualRanking, buildMahallahRanking, getMahallahShort } from "../lib/leaderboard";
import { getMockUserNames } from "../data/leaderboardMock";
import { allMahallahs } from "../features/navigation/data/mahallahs";
import type { LeaderboardEntry, MahallahRanking } from "../types";

const mahallahImgCache = new Map(allMahallahs.map((m) => [m.code, m.image_url]));

type Tab = "day" | "week" | "mahallah";

function Leaderboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("mahallah");
  const { leaderboardScores } = useMockData();
  const { user } = useMockUser();

  const today = new Date().toISOString().slice(0, 10);

  const dayScores = useMemo(
    () => leaderboardScores.filter((s) => s.scoreDate === today),
    [leaderboardScores, today]
  );

  const weekScores = leaderboardScores;

  const mockUsers = useMemo(() => getMockUserNames(), []);

  const userNames = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((v, k) => map.set(k, v.name));
    return map;
  }, [mockUsers]);

  const mahallahCounts = useMemo(() => {
    const map = new Map<string, number>();
    mockUsers.forEach((v) => map.set(v.mahallah, (map.get(v.mahallah) || 0) + 1));
    return map;
  }, [mockUsers]);

  const dayRankings = useMemo(() => buildIndividualRanking(dayScores, userNames), [dayScores, userNames]);
  const weekRankings = useMemo(() => buildIndividualRanking(weekScores, userNames), [weekScores, userNames]);
  const mahallahRankings = useMemo(() => buildMahallahRanking(weekScores, mahallahCounts, 7), [weekScores, mahallahCounts]);

  const entries = tab === "day" ? dayRankings : tab === "week" ? weekRankings : [];
  const top3 = (tab === "mahallah" ? mahallahRankings : entries).slice(0, 3);
  const rest = (tab === "mahallah" ? mahallahRankings : entries).slice(3);

  const tabs: { key: Tab; label: string }[] = [
    { key: "day", label: "DAY" },
    { key: "week", label: "WEEK" },
    { key: "mahallah", label: "MAHALLAH" }
  ];

  return (
    <section className="page-stack">
      <div className="leaderboard-header">
        <button className="leaderboard-back" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h2 className="leaderboard-title">LEADERBOARD</h2>
        <div style={{ width: 36 }} />
      </div>

      <div className="leaderboard-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`leaderboard-tab ${tab === t.key ? "active" : ""}`}
            type="button"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="leaderboard-podium">
        {top3.map((entry, i) => {
          const rank = i === 0 ? 1 : i === 1 ? 2 : 3;
          const posClass = rank === 1 ? "podium-first" : rank === 2 ? "podium-second" : "podium-third";
          const isMahallahTab = tab === "mahallah";
          const label = isMahallahTab
            ? getMahallahShort((entry as MahallahRanking).mahallah)
            : (entry as LeaderboardEntry).name;
          const score = isMahallahTab
            ? `${(entry as MahallahRanking).attendancePct}%`
            : `${(entry as LeaderboardEntry).score}`;
          const size = rank === 1 ? 72 : 56;

          return (
            <div key={rank} className={`podium-card ${posClass}`}>
              {rank === 1 && <Crown size={20} className="podium-crown" />}
              <span className="podium-rank-num">{rank}</span>
              <div className="podium-avatar" style={{ width: size, height: size }}>
                {isMahallahTab ? (
                  <img
                    src={mahallahImgCache.get((entry as MahallahRanking).mahallah) || ""}
                    alt={label}
                    className="podium-avatar-img"
                  />
                ) : (
                  <span className="podium-avatar-text" style={{ fontSize: size * 0.35 }}>
                    {label.charAt(0)}
                  </span>
                )}
              </div>
              <span className="podium-name">{label}</span>
              <span className="podium-score">{score}</span>
            </div>
          );
        })}
      </div>

      {/* Rank 4+ list */}
      <div className="leaderboard-list">
        {rest.map((entry) => {
          const isMahallahTab = tab === "mahallah";
          const rank = isMahallahTab
            ? (entry as MahallahRanking).rank
            : (entry as LeaderboardEntry).rank;
          const label = isMahallahTab
            ? getMahallahShort((entry as MahallahRanking).mahallah)
            : (entry as LeaderboardEntry).name;
          const score = isMahallahTab
            ? `${(entry as MahallahRanking).attendancePct}%`
            : `${(entry as LeaderboardEntry).score}`;
          const checkins = isMahallahTab
            ? `${(entry as MahallahRanking).totalCheckins} check-ins`
            : `${getMahallahShort((entry as LeaderboardEntry).mahallah)} · ${(entry as LeaderboardEntry).checkins} sessions`;

          return (
            <motion.div
              key={`${isMahallahTab ? (entry as MahallahRanking).mahallah : (entry as LeaderboardEntry).userId}`}
              className="leaderboard-rank-card glass-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="rank-card-left">
                <span className="rank-number">{rank}</span>
                <TrendingUp size={12} className="rank-trend" />
              </div>
              <div className="rank-card-avatar">
                {isMahallahTab ? (
                  <img
                    src={mahallahImgCache.get((entry as MahallahRanking).mahallah) || ""}
                    alt={label}
                    className="rank-card-avatar-img"
                  />
                ) : (
                  <span className="rank-card-avatar-text">{label.charAt(0)}</span>
                )}
              </div>
              <div className="rank-card-mid">
                <span className="rank-card-name">{label}</span>
                <span className="rank-card-checkins">{checkins}</span>
              </div>
              <span className="rank-card-score">{score}</span>
            </motion.div>
          );
        })}

        {rest.length === 0 && top3.length === 0 && (
          <p className="muted" style={{ textAlign: "center", padding: 40 }}>
            No check-ins yet. Be the first to earn points!
          </p>
        )}
      </div>
    </section>
  );
}

export default Leaderboard;
