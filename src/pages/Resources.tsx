import { FileText, Phone, Shirt, Siren } from "lucide-react";
import { Link } from "react-router-dom";
import { emergencyContacts } from "../data/mockData";
import { hapticImpact } from "../lib/telegram";

const brothersDressCode = [
  "White plain long-sleeve shirt, tucked in",
  "Black slack",
  "Black belt with small buckle",
  "Black or navy blue tie",
  "Black or navy blue plain long socks",
  "Black plain leather or PVC shoes",
  "Matric card",
  "Short tidy hair with no dyed hair",
  "No headwear"
];

const sistersDressCode = [
  "Traditional knee-length Baju Kurung",
  "Loose dress for international students only",
  "Plain white square bawal scarf for local students",
  "Plain white shawl for international students",
  "Dark-coloured plain long socks",
  "Black plain leather or PVC shoes",
  "No heels, canvas shoes, or sport shoes",
  "Matric card"
];

const dressReminders = [
  "Bring your own umbrella to all sessions in case of rain.",
  "Jeans and slippers are not allowed during the programme.",
  "Sisters are advised to bring telekung and prayer mat.",
  "Students are encouraged to perform ablution before meeting at the assembly point."
];

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

      <article className="resource-card stacked dresscode-card">
        <div className="resource-heading">
          <div className="resource-icon amber">
            <Shirt size={22} aria-hidden="true" />
          </div>
          <div>
            <h3>Dress Code</h3>
            <p>Formal attire guideline for Ta'aruf Week sessions.</p>
          </div>
        </div>
        <img className="dresscode-image" src="/assets/dresscodetawe.jpg" alt="Formal attire dress code guideline for brothers and sisters during Ta'aruf Week" />
        <div className="dresscode-grid">
          <section>
            <h4>Brothers</h4>
            <ul>
              {brothersDressCode.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4>Sisters</h4>
            <ul>
              {sistersDressCode.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="reminder-box">
          <strong>Reminder</strong>
          <ol>
            {dressReminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
        <p className="muted">Thank you for your kind cooperation.</p>
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
