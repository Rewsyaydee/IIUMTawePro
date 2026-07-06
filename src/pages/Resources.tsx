import { FileText, Phone, Shirt, Siren } from "lucide-react";
import { Link } from "react-router-dom";
import { emergencyContacts } from "../data/mockData";
import { hapticImpact } from "../lib/telegram";

function Resources() {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Knowledge base</p>
          <h2>Resources</h2>
        </div>
        <span className="soft-chip">Offline fallback ready</span>
      </div>

      <article className="resource-card">
        <div className="resource-icon">
          <FileText size={22} aria-hidden="true" />
        </div>
        <div>
          <h3>Official PDF Schedule</h3>
          <p>Public copy of the IIUM Ta'aruf Semester 2, 2025/2026 programme schedule.</p>
        </div>
        <Link className="primary-button" to="/official-schedule" onClick={() => hapticImpact("light")}>
          <FileText size={16} aria-hidden="true" />
          <span>View PDF</span>
        </Link>
      </article>

      <article className="resource-card">
        <div className="resource-icon amber">
          <Shirt size={22} aria-hidden="true" />
        </div>
        <div className="resource-wide">
          <h3>Dress Code</h3>
          <div className="two-column">
            <div>
              <h4>Allowed</h4>
              <ul>
                <li>Formal dark shoes</li>
                <li>Institutional blazer</li>
                <li>Neat headwear in neutral colors</li>
              </ul>
            </div>
            <div>
              <h4>Prohibited</h4>
              <ul>
                <li>Open sandals</li>
                <li>Graphic outerwear</li>
                <li>Unapproved event tags</li>
              </ul>
            </div>
          </div>
          <p className="muted">Updated 2026-02-19 21:00</p>
        </div>
      </article>

      <article className="resource-card stacked">
        <div className="resource-heading">
          <div className="resource-icon red">
            <Siren size={22} aria-hidden="true" />
          </div>
          <div>
            <h3>Emergency Contacts</h3>
            <p>Fallback list remains visible if the database is unreachable.</p>
          </div>
        </div>
        <div className="contact-list">
          {emergencyContacts.map((contact) => (
            <a
              key={contact.id}
              className={contact.priority ? "contact-row priority" : "contact-row"}
              href={`tel:${contact.phone}`}
              onClick={() => hapticImpact("medium")}
            >
              <div>
                <strong>{contact.name}</strong>
                <span>{contact.role}</span>
              </div>
              <div className="phone-pill">
                <Phone size={15} aria-hidden="true" />
                <span>{contact.phone}</span>
              </div>
            </a>
          ))}
        </div>
      </article>
    </section>
  );
}

export default Resources;
