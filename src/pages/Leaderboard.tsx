import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, TrendingUp, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboardData, buildIndividualRanking, buildMahallahRanking, getMahallahShort, getMahallahName } from "../lib/leaderboard";
import type { LeaderboardRow } from "../lib/leaderboard";
import { allMahallahs } from "../features/navigation/data/mahallahs";
import type { LeaderboardEntry, MahallahRanking } from "../types";

type Tab = "day" | "week" | "mahallah";

function Leaderboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("mahallah");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLeaderboardData();
      setRows(data);
    } catch (err) {
      setError("Failed to load leaderboard. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dayRankings = useMemo(() => rows ? buildIndividualRanking(rows, today) : [], [rows, today]);
  const weekRankings = useMemo(() => rows ? buildIndividualRanking(rows) : [], [rows]);
  const mahallahRankings = useMemo(() => rows ? buildMahallahRanking(rows, 7) : [], [rows]);

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
        <button className="leaderboard-back" type="button" onClick={load} title="Refresh">
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="leaderboard-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`leaderboard-tab ${tab === t.key ? "active" : ""}`} type="button" onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <button className="leaderboard-retry" type="button" onClick={load}>
          {error}
        </button>
      )}

      {loading && (
        <div className="leaderboard-skeleton-wrap">
          <div className="leaderboard-skeleton-podium">
            <div className="skeleton-bar sk-p1" />
            <div className="skeleton-bar sk-p2" />
            <div className="skeleton-bar sk-p3" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="leaderboard-skeleton-card">
              <div className="skeleton-circle" />
              <div className="skeleton-lines">
                <div className="skeleton-line sk-w60" />
                <div className="skeleton-line sk-w40" />
              </div>
              <div className="skeleton-line sk-w20 sk-right" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="leaderboard-podium">
            {top3.map((entry, i) => {
              const rank = i === 0 ? 1 : i === 1 ? 2 : 3;
              const posClass = rank === 1 ? "podium-first" : rank === 2 ? "podium-second" : "podium-third";
              const isMahallahTab = tab === "mahallah";
              const mEntry = entry as MahallahRanking;
              const label = isMahallahTab ? getMahallahShort(mEntry.mahallah) : (entry as LeaderboardEntry).name;
              const score = isMahallahTab ? `${mEntry.attendancePct}%` : `${(entry as LeaderboardEntry).score}`;
              const size = rank === 1 ? 72 : 56;
              const imgSrc = isMahallahTab ? allMahallahs.find((m) => m.code === mEntry.mahallah)?.image_url || "" : "";
              const initials = label.charAt(0);

              return (
                <div key={rank} className={`podium-card ${posClass}`}>
                  {rank === 1 && <Crown size={20} className="podium-crown" />}
                  <span className="podium-rank-num">{rank}</span>
                  <div className="podium-avatar" style={{ width: size, height: size }}>
                    {isMahallahTab && imgSrc ? (
                      <img src={imgSrc} alt={label} className="podium-avatar-img" />
                    ) : (
                      <span className="podium-avatar-text" style={{ fontSize: size * 0.35 }}>{initials}</span>
                    )}
                  </div>
                  <span className="podium-name">{label}</span>
                  <span className="podium-score">{score}</span>
                </div>
              );
            })}
          </div>

          <div className="leaderboard-list">
            {rest.map((entry) => {
              const isMahallahTab = tab === "mahallah";
              const mEntry = entry as MahallahRanking;
              const rank = isMahallahTab ? mEntry.rank : (entry as LeaderboardEntry).rank;
              const label = isMahallahTab ? getMahallahShort(mEntry.mahallah) : (entry as LeaderboardEntry).name;
              const score = isMahallahTab ? `${mEntry.attendancePct}%` : `${(entry as LeaderboardEntry).score}`;
              const checkins = isMahallahTab
                ? `${mEntry.totalCheckins} check-ins`
                : `${getMahallahShort((entry as LeaderboardEntry).mahallah)} · ${(entry as LeaderboardEntry).checkins} sessions`;
              const imgSrc = isMahallahTab ? allMahallahs.find((m) => m.code === mEntry.mahallah)?.image_url || "" : "";
              const initials = label.charAt(0);

              return (
                <motion.div key={isMahallahTab ? mEntry.mahallah : (entry as LeaderboardEntry).userId} className="leaderboard-rank-card glass-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rank-card-left">
                    <span className="rank-number">{rank}</span>
                    <TrendingUp size={12} className="rank-trend" />
                  </div>
                  <div className="rank-card-avatar">
                    {isMahallahTab && imgSrc ? (
                      <img src={imgSrc} alt={label} className="rank-card-avatar-img" />
                    ) : (
                      <span className="rank-card-avatar-text">{initials}</span>
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
        </>
      )}
    </section>
  );
}

export default Leaderboard;
