import { isLowPerformance } from "./deviceInfo";

const CANVAS_SCALE = isLowPerformance() ? 0.5 : 1;
const CANVAS_W = Math.round(1080 * CANVAS_SCALE);
const CANVAS_H = Math.round(1920 * CANVAS_SCALE);

let testCanvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (typeof document !== "undefined") return document.createElement("canvas");
  if (!testCanvas) {
    testCanvas = { width: CANVAS_W, height: CANVAS_H, getContext: () => null } as unknown as HTMLCanvasElement;
  }
  return testCanvas;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface WrappedData {
  username: string;
  attendedCount: number;
  totalRequired: number;
  attendedPct: number;
  venuesVisited: number;
  totalVenues: number;
  firstCheckInPlace: string;
  firstCheckInTime: string;
  weekProgress: number;
}

export async function renderWrappedCard(data: WrappedData): Promise<Blob | null> {
  const canvas = getCanvas();
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a2e23";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawBrandHeader(ctx, "TAWE WRAPPED");
  drawGoldDivider(ctx, 200);

  ctx.font = "bold 42px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`Salam, ${data.username}`, CANVAS_W / 2, 290);

  ctx.font = "24px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("Your Ta'aruf Week journey", CANVAS_W / 2, 340);

  const cards = [
    { icon: "🎯", value: `${data.attendedCount}/${data.totalRequired}`, label: "Events Attended" },
    { icon: "📊", value: `${data.attendedPct}%`, label: "Attendance Rate" },
    { icon: "📍", value: `${data.venuesVisited}/${data.totalVenues}`, label: "Venues Visited" },
    { icon: "📅", value: `${data.weekProgress}%`, label: "Week Complete" },
  ];

  const startY = 420;
  const boxW = 440;
  const boxH = 240;
  const gap = 30;
  const leftX = CANVAS_W / 2 - boxW - gap / 2;
  const rightX = CANVAS_W / 2 + gap / 2;

  cards.forEach((card, i) => {
    const x = i % 2 === 0 ? leftX : rightX;
    const y = startY + Math.floor(i / 2) * (boxH + gap);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, x, y, boxW, boxH, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(229,211,179,0.25)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, boxW, boxH, 20);
    ctx.stroke();

    ctx.font = "40px Inter, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(card.icon, x + boxW / 2, y + 70);

    ctx.font = "bold 48px Inter, sans-serif";
    ctx.fillStyle = "#E5D3B3";
    ctx.fillText(card.value, x + boxW / 2, y + 140);

    ctx.font = "22px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(card.label, x + boxW / 2, y + 190);
  });

  const footerY = startY + 2 * (boxH + gap) + 80;
  ctx.font = "22px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText(`First check-in: ${data.firstCheckInPlace}`, CANVAS_W / 2, footerY);
  ctx.fillText(data.firstCheckInTime, CANVAS_W / 2, footerY + 32);

  drawHashtagFooter(ctx);
  return canvasToBlob(canvas);
}

export interface AchievementData {
  username: string;
  attendedCount: number;
  totalRequired: number;
  earnedKit: boolean;
  milestones: { target: number; reached: boolean }[];
}

export async function renderAchievementCard(data: AchievementData): Promise<Blob | null> {
  const canvas = getCanvas();
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a2e23";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawBrandHeader(ctx, "ACHIEVEMENT");

  ctx.font = "bold 48px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(data.username, CANVAS_W / 2, 400);

  ctx.font = "bold 96px Inter, sans-serif";
  ctx.fillStyle = "#E5D3B3";
  ctx.fillText(`${data.attendedCount}/${data.totalRequired}`, CANVAS_W / 2, 520);

  ctx.font = "28px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("sessions attended", CANVAS_W / 2, 570);

  const milestoneY = 660;
  const mSpacing = 200;
  const totalWidth = (data.milestones.length - 1) * mSpacing;
  const mStartX = (CANVAS_W - totalWidth) / 2;

  data.milestones.forEach((m, i) => {
    const mx = mStartX + i * mSpacing;
    const r = 60;

    if (m.reached) {
      ctx.fillStyle = "#E5D3B3";
      ctx.beginPath();
      ctx.arc(mx, milestoneY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.fillStyle = "#0a2e23";
      ctx.textAlign = "center";
      ctx.fillText("✓", mx, milestoneY + 12);
    } else {
      ctx.strokeStyle = "rgba(229,211,179,0.4)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(mx, milestoneY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.fillStyle = "rgba(229,211,179,0.4)";
      ctx.textAlign = "center";
      ctx.fillText(`${m.target}`, mx, milestoneY + 12);
    }

    ctx.font = "20px Inter, sans-serif";
    ctx.fillStyle = m.reached ? "#E5D3B3" : "rgba(255,255,255,0.35)";
    ctx.fillText(`${m.target} Events`, mx, milestoneY + r + 40);
  });

  if (data.earnedKit) {
    ctx.font = "bold 38px Inter, sans-serif";
    ctx.fillStyle = "#E5D3B3";
    ctx.textAlign = "center";
    ctx.fillText("TAARUF KIT UNLOCKED! ✨", CANVAS_W / 2, 880);
  } else {
    ctx.font = "24px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.textAlign = "center";
    ctx.fillText(`${data.totalRequired - data.attendedCount} more to unlock Ta'aruf Kit`, CANVAS_W / 2, 880);
  }

  drawHashtagFooter(ctx);
  return canvasToBlob(canvas);
}

export interface ScheduleCardData {
  dayLabel: string;
  dateDisplay: string;
  blocks: { time: string; title: string; venue: string }[];
}

export async function renderScheduleCard(data: ScheduleCardData): Promise<Blob | null> {
  const canvas = getCanvas();
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a2e23";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawBrandHeader(ctx, "DAILY SCHEDULE");

  ctx.font = "bold 48px Inter, sans-serif";
  ctx.fillStyle = "#E5D3B3";
  ctx.textAlign = "center";
  ctx.fillText(data.dayLabel, CANVAS_W / 2, 380);

  ctx.font = "26px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(data.dateDisplay, CANVAS_W / 2, 430);

  let y = 520;
  const cardW = 860;
  const cardX = (CANVAS_W - cardW) / 2;

  data.blocks.forEach((block) => {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, cardX, y, cardW, 100, 14);
    ctx.fill();

    ctx.strokeStyle = "rgba(229,211,179,0.18)";
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, y, cardW, 100, 14);
    ctx.stroke();

    ctx.font = "bold 22px Inter, sans-serif";
    ctx.fillStyle = "#E5D3B3";
    ctx.textAlign = "left";
    ctx.fillText(block.time, cardX + 30, y + 38);

    ctx.font = "24px Inter, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(block.title, cardX + 30, y + 72);

    ctx.font = "20px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "right";
    ctx.fillText(block.venue, cardX + cardW - 30, y + 72);

    y += 130;
  });

  if (data.blocks.length === 0) {
    ctx.font = "28px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.textAlign = "center";
    ctx.fillText("No sessions scheduled today", CANVAS_W / 2, y + 40);
    ctx.fillText("Enjoy your break! ☕", CANVAS_W / 2, y + 80);
  }

  drawHashtagFooter(ctx);
  return canvasToBlob(canvas);
}

export interface CheckInCardData {
  username: string;
  eventTitle: string;
  venue: string;
  time: string;
  lat: number;
  lng: number;
}

export async function renderCheckInCard(data: CheckInCardData): Promise<Blob | null> {
  const canvas = getCanvas();
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a2e23";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawBrandHeader(ctx, "CHECK-IN");

  ctx.font = "bold 44px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`${data.username} checked in`, CANVAS_W / 2, 380);

  const boxW = 800;
  const boxX = (CANVAS_W - boxW) / 2;
  const boxY = 460;

  ctx.fillStyle = "rgba(229,211,179,0.06)";
  roundRect(ctx, boxX, boxY, boxW, 420, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(229,211,179,0.2)";
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxY, boxW, 420, 24);
  ctx.stroke();

  ctx.font = "bold 36px Inter, sans-serif";
  ctx.fillStyle = "#E5D3B3";
  ctx.textAlign = "center";
  ctx.fillText(data.eventTitle, CANVAS_W / 2, boxY + 80);

  ctx.font = "26px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`📍 ${data.venue}`, CANVAS_W / 2, boxY + 160);

  ctx.font = "22px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`🕐 ${data.time}`, CANVAS_W / 2, boxY + 210);

  ctx.font = "20px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText(`GPS: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`, CANVAS_W / 2, boxY + 260);

  ctx.font = "bold 22px Inter, sans-serif";
  ctx.fillStyle = "#22a879";
  ctx.fillText("✓ Verified within 200m of venue", CANVAS_W / 2, boxY + 350);

  ctx.font = "22px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText("Ta'aruf Week 2025/2026", CANVAS_W / 2, 980);

  drawHashtagFooter(ctx);
  return canvasToBlob(canvas);
}

export interface InviteCardData {
  username: string;
  roleLabel: string;
}

export async function renderInviteCard(data: InviteCardData): Promise<Blob | null> {
  const canvas = getCanvas();
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a2e23";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawBrandHeader(ctx, "INVITE");

  ctx.font = "bold 52px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("Join Ta'aruf Week!", CANVAS_W / 2, 420);

  ctx.font = "28px Inter, sans-serif";
  ctx.fillStyle = "#E5D3B3";
  ctx.fillText(`${data.username} invited you`, CANVAS_W / 2, 490);

  const qrBox = 360;
  const qrX = (CANVAS_W - qrBox) / 2;
  const qrY = 580;

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX, qrY, qrBox, qrBox, 20);
  ctx.fill();

  ctx.font = "bold 32px Inter, sans-serif";
  ctx.fillStyle = "#0a2e23";
  ctx.textAlign = "center";
  ctx.fillText("IIUM", CANVAS_W / 2, qrY + 140);
  ctx.fillText("TAWE", CANVAS_W / 2, qrY + 190);
  ctx.fillText("PRO", CANVAS_W / 2, qrY + 240);

  ctx.font = "bold 28px Inter, sans-serif";
  ctx.fillStyle = "#0a2e23";
  ctx.textAlign = "center";
  ctx.fillText("t.me/iiumtaweprobot", CANVAS_W / 2, qrY + qrBox - 40);

  ctx.font = "26px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center";
  ctx.fillText(data.roleLabel, CANVAS_W / 2, qrY + qrBox + 80);
  ctx.fillText("Scan or tap to join", CANVAS_W / 2, qrY + qrBox + 120);

  drawHashtagFooter(ctx);
  return canvasToBlob(canvas);
}

function drawBrandHeader(ctx: CanvasRenderingContext2D, subtitle: string) {
  ctx.font = "bold 28px Inter, sans-serif";
  ctx.fillStyle = "#E5D3B3";
  ctx.textAlign = "center";
  ctx.fillText("IIUM TA'ARUF WEEK", CANVAS_W / 2, 70);

  ctx.font = "20px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(subtitle, CANVAS_W / 2, 105);
}

function drawGoldDivider(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = "rgba(229,211,179,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2 - 120, y);
  ctx.lineTo(CANVAS_W / 2 + 120, y);
  ctx.stroke();

  ctx.fillStyle = "#E5D3B3";
  ctx.beginPath();
  ctx.arc(CANVAS_W / 2, y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawHashtagFooter(ctx: CanvasRenderingContext2D) {
  const y = CANVAS_H - 90;
  drawGoldDivider(ctx, y - 30);

  ctx.font = "bold 26px Inter, sans-serif";
  ctx.fillStyle = "#E5D3B3";
  ctx.textAlign = "center";
  ctx.fillText("#TaweAuTaraweh", CANVAS_W / 2, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      canvas.toBlob = (cb, type, quality) => {
        const dataUrl = canvas.toDataURL(type, quality);
        const byteString = atob(dataUrl.split(",")[1]);
        const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        cb(new Blob([ab], { type: mimeString }));
      };
    }
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export { CANVAS_W, CANVAS_H };
