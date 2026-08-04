import { useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Github,
  Heart,
  HelpCircle,
  LifeBuoy,
  Linkedin,
  Mail,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  FileText,
  Info
} from "lucide-react";
import { APP_INFO } from "../lib/appInfo";
import { getTelegramWebApp, hapticError, hapticSuccess } from "../lib/telegram";

const DONATION_AMOUNTS = [100, 250, 500];

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || window.location.origin;
}

const DOCS_LINKS = [
  { label: "User Guide", url: "https://tawepro.rewsyaydee.tech/docs/user-guide" },
  { label: "Committee Guide", url: "https://tawepro.rewsyaydee.tech/docs/committee-guide" },
  { label: "FAQ", url: "https://tawepro.rewsyaydee.tech/faq" },
  { label: "Privacy Policy", url: "https://tawepro.rewsyaydee.tech/privacy" },
  { label: "Changelog", url: "https://tawepro.rewsyaydee.tech/changelog" }
];

const LINKS = [
  { label: "Telegram Bot", url: "https://t.me/iiumtaweprobot" },
  { label: "GitHub Repository", url: "https://github.com/Rewsyaydee/IIUMTawePro" },
  { label: "Official Website", url: "https://tawepro.rewsyaydee.tech" },
  { label: "Feedback & Bug Report", url: "https://t.me/taweprohelp" }
];

const PERMISSIONS = [
  {
    icon: MapPin,
    title: "Location",
    body: "Used only to verify you are at a session venue when checking in. Nothing is tracked or shared beyond that moment."
  },
  {
    icon: Info,
    title: "Camera",
    body: "Committee members use it to submit daily attendance selfies, which are reviewed by Special Task."
  },
  {
    icon: Sparkles,
    title: "Notifications",
    body: "Optional session reminders are sent through the Telegram Bot — the Mini App itself does not send push notifications."
  },
  {
    icon: Wallet,
    title: "Local Storage",
    body: "Your login session and a small offline cache are stored on your device so the app works even with a weak connection."
  }
];

const CREDITS = [
  "IIUM",
  "Telegram",
  "Supabase",
  "React",
  "TypeScript",
  "Vercel",
  "Framer Motion",
  "Lucide Icons"
];

function Support() {
  const [donating, setDonating] = useState(false);
  const [donateError, setDonateError] = useState("");
  const [qrFailed, setQrFailed] = useState(false);

  const handleStarsDonate = async (stars: number) => {
    setDonating(true);
    setDonateError("");
    try {
      const response = await fetch(`${apiBase()}/api/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars })
      });
      const payload = await response.json();
      if (!response.ok || !payload.link) {
        throw new Error(payload.error || "Could not prepare the payment.");
      }
      const webApp = getTelegramWebApp();
      if (!webApp || typeof webApp.openInvoice !== "function") {
        setDonateError("Stars payments are only available inside the Telegram Mini App.");
        hapticError();
        return;
      }
      webApp.openInvoice(payload.link, (status) => {
        if (status === "paid") hapticSuccess();
        else if (status === "failed") hapticError();
      });
    } catch (err) {
      setDonateError(err instanceof Error ? err.message : "Donation failed. Please try again.");
      hapticError();
    } finally {
      setDonating(false);
    }
  };

  const openExternal = (url: string) => {
    const webApp = getTelegramWebApp();
    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Official hub</p>
          <h2>Support & Information</h2>
        </div>
        <span className="soft-chip">v{APP_INFO.version}</span>
      </div>

      {/* Support TawePro */}
      <section className="ops-panel support-section">
        <div className="form-title">
          <Heart size={20} aria-hidden="true" />
          <h3>Support TawePro</h3>
        </div>
        <p className="muted">
          TawePro is built and maintained as a passion project. Donations help fund hosting,
          Telegram Bot infrastructure, AI services, maintenance, and future development.
          Every Star means the world — thank you! 🤲
        </p>

        <div className="donation-block">
          <div className="donation-option">
            <div className="donation-option-head">
              <Star size={18} color="#ffcc33" aria-hidden="true" />
              <strong>Telegram Stars</strong>
              <span className="soft-chip">Primary · Recommended</span>
            </div>
            <p className="muted">Quick and seamless inside Telegram — tap an amount below.</p>
            <div className="donation-amounts">
              {DONATION_AMOUNTS.map((stars) => (
                <button
                  key={stars}
                  type="button"
                  className="primary-button"
                  disabled={donating}
                  onClick={() => handleStarsDonate(stars)}
                >
                  <Star size={15} aria-hidden="true" />
                  <span>{donating ? "..." : `${stars} ⭐`}</span>
                </button>
              ))}
            </div>
            {donateError && <p className="access-error">{donateError}</p>}
          </div>

          <div className="donation-option">
            <div className="donation-option-head">
              <QrCode size={18} color="var(--gold-accent)" aria-hidden="true" />
              <strong>DuitNow QR</strong>
              <span className="soft-chip">Malaysia</span>
            </div>
            <p className="muted">For Malaysian users — scan with your banking app.</p>
            <div className="duitnow-qr-wrap">
              {qrFailed ? (
                <div className="duitnow-qr-placeholder">QR coming soon</div>
              ) : (
                <img
                  src="/assets/duitnow-qr.png"
                  alt="DuitNow QR code"
                  className="duitnow-qr"
                  onError={() => setQrFailed(true)}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section className="ops-panel">
        <div className="form-title">
          <FileText size={20} aria-hidden="true" />
          <h3>Documentation</h3>
        </div>
        <div className="link-list">
          {DOCS_LINKS.map((doc) => (
            <button key={doc.label} type="button" className="link-row" onClick={() => openExternal(doc.url)}>
              <span>{doc.label}</span>
              <ExternalLink size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {/* Important Links */}
      <section className="ops-panel">
        <div className="form-title">
          <LifeBuoy size={20} aria-hidden="true" />
          <h3>Important Links</h3>
        </div>
        <div className="link-list">
          {LINKS.map((link) => (
            <button key={link.label} type="button" className="link-row" onClick={() => openExternal(link.url)}>
              <span>{link.label}</span>
              <ExternalLink size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {/* About the Developer */}
      <section className="ops-panel">
        <div className="form-title">
          <Sparkles size={20} aria-hidden="true" />
          <h3>About the Developer</h3>
        </div>
        <p className="muted">
          Hi! I'm <strong>{APP_INFO.author}</strong> — an IIUM student who built TawePro to help
          every participant get the most out of Ta'aruf Week. If you have ideas or find a bug,
          reach out — I read every message. 🚀
        </p>
        <div className="link-list">
          <button type="button" className="link-row" onClick={() => openExternal("https://github.com/Rewsyaydee")}>
            <Github size={15} aria-hidden="true" />
            <span>GitHub</span>
            <ExternalLink size={15} aria-hidden="true" />
          </button>
          <button type="button" className="link-row" onClick={() => openExternal("https://rewsyaydee.tech")}>
            <Sparkles size={15} aria-hidden="true" />
            <span>Portfolio</span>
            <ExternalLink size={15} aria-hidden="true" />
          </button>
          <button type="button" className="link-row" onClick={() => openExternal("https://www.linkedin.com/in/rusyaidihusni/")}>
            <Linkedin size={15} aria-hidden="true" />
            <span>LinkedIn</span>
            <ExternalLink size={15} aria-hidden="true" />
          </button>
          <button type="button" className="link-row" onClick={() => openExternal("mailto:work@syedi.my")}>
            <Mail size={15} aria-hidden="true" />
            <span>work@syedi.my</span>
            <ExternalLink size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* App Information */}
      <section className="ops-panel">
        <div className="form-title">
          <Info size={20} aria-hidden="true" />
          <h3>App Information</h3>
        </div>
        <div className="info-rows">
          <div><span>Version</span><strong>{APP_INFO.version}</strong></div>
          <div><span>Build Number</span><strong>{APP_INFO.buildNumber}</strong></div>
          <div><span>Release Date</span><strong>{APP_INFO.releaseDate}</strong></div>
        </div>
      </section>

      {/* Permissions */}
      <section className="ops-panel">
        <div className="form-title">
          <ShieldCheck size={20} aria-hidden="true" />
          <h3>Permissions</h3>
        </div>
        <div className="permission-grid">
          {PERMISSIONS.map((permission) => (
            <motion.article
              key={permission.title}
              className="permission-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <permission.icon size={18} aria-hidden="true" />
              <strong>{permission.title}</strong>
              <p>{permission.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Credits */}
      <section className="ops-panel">
        <div className="form-title">
          <HelpCircle size={20} aria-hidden="true" />
          <h3>Credits</h3>
        </div>
        <div className="credit-chips">
          {CREDITS.map((credit) => (
            <span key={credit} className="soft-chip">{credit}</span>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Built with love and open-source technology. Ta'aruf Week is an IIUM programme;
          TawePro is an independent companion app.
        </p>
      </section>
    </section>
  );
}

export default Support;
