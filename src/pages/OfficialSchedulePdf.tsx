import { Download, ExternalLink, FileText } from "lucide-react";
import { getTelegramWebApp, hapticImpact } from "../lib/telegram";

const pdfPath = "/assets/official-taaruf-schedule-2026.pdf";

function openOfficialPdf() {
  hapticImpact("light");
  const url = new URL(pdfPath, window.location.origin).href;
  const webApp = getTelegramWebApp();
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function OfficialSchedulePdf() {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Official IIUM source</p>
          <h2>PDF Schedule</h2>
        </div>
        <button className="icon-text-button" type="button" onClick={openOfficialPdf}>
          <ExternalLink size={16} aria-hidden="true" />
          <span>Open</span>
        </button>
      </div>

      <section className="pdf-viewer-panel">
        <div className="pdf-viewer-head">
          <span className="resource-icon amber">
            <FileText size={22} aria-hidden="true" />
          </span>
          <div>
            <h3>Proposed Programme Schedule</h3>
            <p>Ta'aruf Semester 2, 2025/2026, as at 19 February 2026.</p>
          </div>
        </div>
        <iframe className="pdf-frame" src={`${pdfPath}#toolbar=1&navpanes=0`} title="Official Ta'aruf programme schedule PDF" />
        <button className="primary-button full-width" type="button" onClick={openOfficialPdf}>
          <Download size={16} aria-hidden="true" />
          <span>Open full PDF</span>
        </button>
      </section>
    </section>
  );
}

export default OfficialSchedulePdf;
