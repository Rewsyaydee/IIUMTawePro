import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const W = 1080;
const H = 1920;
const BG = "#0a2e23";
const GOLD = "#E5D3B3";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.6)";
const FAINT = "rgba(255,255,255,0.35)";

const baseStyle = {
  width: W,
  height: H,
  background: BG,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative"
};

function Header(subtitle) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
      <div style={{ color: GOLD, fontSize: 40, fontWeight: 700, letterSpacing: 2 }}>
        IIUM TA'ARUF WEEK
      </div>
      <div style={{ color: MUTED, fontSize: 26, marginTop: 10 }}>{subtitle}</div>
      <div
        style={{
          width: 160,
          height: 4,
          background: GOLD,
          marginTop: 26,
          borderRadius: 2
        }}
      />
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14
      }}
    >
      <div style={{ width: 160, height: 4, background: GOLD, borderRadius: 2 }} />
      <div style={{ color: GOLD, fontSize: 32, fontWeight: 700 }}>#TaweAuTaraweh</div>
    </div>
  );
}

function MetricCard({ value, label }) {
  return (
    <div
      style={{
        width: 440,
        height: 240,
        borderRadius: 24,
        border: "2px solid rgba(229,211,179,0.3)",
        background: "rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12
      }}
    >
      <div style={{ color: GOLD, fontSize: 56, fontWeight: 700 }}>{value}</div>
      <div style={{ color: MUTED, fontSize: 26 }}>{label}</div>
    </div>
  );
}

function Blocks({ blocks }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 30 }}>
      {blocks.map((b, i) => (
        <div
          key={i}
          style={{
            width: 860,
            minHeight: 110,
            borderRadius: 16,
            border: "1px solid rgba(229,211,179,0.2)",
            background: "rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 36,
            paddingRight: 36
          }}
        >
          <div style={{ color: GOLD, fontSize: 28, fontWeight: 700, width: 200 }}>{b.time}</div>
          <div style={{ flex: 1, color: WHITE, fontSize: 28 }}>{b.title}</div>
          <div style={{ color: FAINT, fontSize: 24, width: 260, textAlign: "right" }}>{b.venue}</div>
        </div>
      ))}
    </div>
  );
}

function str(name, fallback = "") {
  return String(name || fallback).slice(0, 60);
}

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") || "wrapped";
  const username = str(searchParams.get("username"), "there");
  const attended = str(searchParams.get("attended"), "0");
  const total = str(searchParams.get("total"), "8");
  const pct = str(searchParams.get("pct"), "0");
  const venues = str(searchParams.get("venues"), "0");
  const firstPlace = str(searchParams.get("firstPlace"), "IIUM Campus");
  const firstTime = str(searchParams.get("firstTime"), "-");
  const weekProgress = str(searchParams.get("weekProgress"), "0");
  const eventTitle = str(searchParams.get("eventTitle"), "Session");
  const venue = str(searchParams.get("venue"), "IIUM Campus");
  const time = str(searchParams.get("time"), "-");
  const roleLabel = str(searchParams.get("roleLabel"), "Student");
  const dayLabel = str(searchParams.get("dayLabel"), "Today");
  const dateDisplay = str(searchParams.get("dateDisplay"), "");
  const earned = searchParams.get("earned") === "1";
  const lat = str(searchParams.get("lat"), "0");
  const lng = str(searchParams.get("lng"), "0");
  let blocks = [];
  try {
    const raw = searchParams.get("blocks");
    if (raw) blocks = JSON.parse(raw).slice(0, 6);
  } catch {}

  const common = { display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" };

  let children;
  if (template === "achievement") {
    const milestones = [3, 5, parseInt(total, 10) || 8].filter((m, i, a) => a.indexOf(m) === i);
    children = (
      <div style={{ ...baseStyle }}>
        {Header("ACHIEVEMENT")}
        <div style={{ color: WHITE, fontSize: 52, fontWeight: 700, marginTop: 150 }}>{username}</div>
        <div style={{ color: GOLD, fontSize: 120, fontWeight: 700, marginTop: 30 }}>{attended}/{total}</div>
        <div style={{ color: MUTED, fontSize: 30, marginTop: 8 }}>sessions attended</div>
        <div style={{ display: "flex", gap: 60, marginTop: 90 }}>
          {milestones.map((m, i) => {
            const reached = parseInt(attended, 10) >= m;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: reached ? GOLD : "transparent",
                    border: reached ? "none" : "4px solid rgba(229,211,179,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: reached ? BG : FAINT,
                    fontSize: 44,
                    fontWeight: 700
                  }}
                >
                  {reached ? "✓" : m}
                </div>
                <div style={{ color: reached ? GOLD : FAINT, fontSize: 24 }}>{m} Events</div>
              </div>
            );
          })}
        </div>
        <div style={{ color: GOLD, fontSize: 44, fontWeight: 700, marginTop: 110 }}>
          {earned ? "TAARUF KIT UNLOCKED!" : `${total - parseInt(attended, 10) || 0} more to unlock Ta'aruf Kit`}
        </div>
        {Footer()}
      </div>
    );
  } else if (template === "schedule") {
    children = (
      <div style={{ ...baseStyle }}>
        {Header("DAILY SCHEDULE")}
        <div style={{ color: GOLD, fontSize: 56, fontWeight: 700, marginTop: 120 }}>{dayLabel}</div>
        <div style={{ color: MUTED, fontSize: 28, marginTop: 12 }}>{dateDisplay}</div>
        {blocks.length > 0 ? (
          <Blocks blocks={blocks} />
        ) : (
          <div style={{ color: MUTED, fontSize: 32, marginTop: 120 }}>No sessions scheduled today</div>
        )}
        {Footer()}
      </div>
    );
  } else if (template === "checkin") {
    children = (
      <div style={{ ...baseStyle }}>
        {Header("CHECK-IN")}
        <div style={{ color: WHITE, fontSize: 52, fontWeight: 700, marginTop: 150 }}>{username} checked in</div>
        <div
          style={{
            width: 820,
            borderRadius: 28,
            border: "2px solid rgba(229,211,179,0.25)",
            background: "rgba(229,211,179,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 60,
            paddingBottom: 60,
            marginTop: 70,
            gap: 28
          }}
        >
          <div style={{ color: GOLD, fontSize: 42, fontWeight: 700 }}>{eventTitle}</div>
          <div style={{ color: WHITE, fontSize: 32 }}>📍 {venue}</div>
          <div style={{ color: MUTED, fontSize: 26 }}>🕐 {time}</div>
          <div style={{ color: FAINT, fontSize: 22 }}>GPS: {lat}, {lng}</div>
          <div style={{ color: "#22a879", fontSize: 26, fontWeight: 700 }}>✓ Verified within 200m of venue</div>
        </div>
        {Footer()}
      </div>
    );
  } else if (template === "invite") {
    children = (
      <div style={{ ...baseStyle }}>
        {Header("INVITE")}
        <div style={{ color: WHITE, fontSize: 58, fontWeight: 700, marginTop: 150 }}>Join Ta'aruf Week!</div>
        <div style={{ color: GOLD, fontSize: 32, marginTop: 24 }}>{username} invited you</div>
        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: 24,
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 80,
            gap: 10
          }}
        >
          <div style={{ color: BG, fontSize: 44, fontWeight: 700 }}>IIUM</div>
          <div style={{ color: BG, fontSize: 44, fontWeight: 700 }}>TAWE</div>
          <div style={{ color: BG, fontSize: 44, fontWeight: 700 }}>PRO</div>
          <div style={{ color: "#555", fontSize: 22, marginTop: 14 }}>t.me/iiumtaweprobot</div>
        </div>
        <div style={{ color: MUTED, fontSize: 28, marginTop: 50 }}>{roleLabel}</div>
        <div style={{ color: FAINT, fontSize: 24, marginTop: 12 }}>Scan or tap to join</div>
        {Footer()}
      </div>
    );
  } else {
    // wrapped (default)
    children = (
      <div style={{ ...baseStyle }}>
        {Header("TAWE WRAPPED")}
        <div style={{ color: WHITE, fontSize: 56, fontWeight: 700, marginTop: 110 }}>Salam, {username}</div>
        <div style={{ color: MUTED, fontSize: 28, marginTop: 14 }}>Your Ta'aruf Week journey</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 30, justifyContent: "center", marginTop: 70, width: 930 }}>
          <MetricCard value={`${attended}/${total}`} label="Events Attended" />
          <MetricCard value={`${pct}%`} label="Attendance Rate" />
          <MetricCard value={`${venues} venues`} label="Venues Visited" />
          <MetricCard value={`${weekProgress}%`} label="Week Complete" />
        </div>
        <div style={{ color: MUTED, fontSize: 26, marginTop: 100 }}>
          First check-in: {firstPlace} · {firstTime}
        </div>
        {Footer()}
      </div>
    );
  }

  return new ImageResponse(
    <div style={{ ...baseStyle, ...common }}>{children}</div>,
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=60" }
    }
  );
}
