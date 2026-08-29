import { FormEvent, useEffect, useState } from "react";
import { Check, FileText, PenLine, Phone, Plus, Shirt, Siren, Trash2, UtensilsCrossed, X } from "lucide-react";
import { Link } from "react-router-dom";
import { emergencyContacts as mockContacts } from "../data/mockData";
import { couponCafes as mockCoupons } from "../data/couponCafes";
import { hapticImpact, hapticSuccess } from "../lib/telegram";
import { playSfx } from "../lib/sfx";
import { motion } from "framer-motion";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { useMockUser } from "../state/MockUserContext";
import {
  createCouponLocation,
  createEmergencyContact,
  deleteCouponLocation,
  deleteEmergencyContact,
  listCouponLocations,
  listEmergencyContacts,
  updateCouponLocation,
  updateEmergencyContact,
  type CouponLocation,
  type EmergencyContact
} from "../lib/guidesApi";

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

const emptyContactForm = { name: "", role: "", phone: "", priority: false };
const emptyCouponForm = { name: "", location: "", accepts: "All meals", hours: "" };

function Resources() {
  const { user } = useMockUser();
  const apiMode = shouldUseApiAuth();
  const isMainboard = user.role === "mainboard";
  const [authTick, setAuthTick] = useState(0);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [coupons, setCoupons] = useState<CouponLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [confirmContactDelete, setConfirmContactDelete] = useState<string | null>(null);

  const [couponFormOpen, setCouponFormOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [confirmCouponDelete, setConfirmCouponDelete] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = () => setAuthTick((v) => v + 1);
    window.addEventListener(authSessionChangedEvent, h);
    return () => window.removeEventListener(authSessionChangedEvent, h);
  }, []);

  useEffect(() => {
    if (!apiMode) {
      setContacts(mockContacts.map((c) => ({ ...c, sortOrder: 0 })));
      setCoupons(mockCoupons.map((c) => ({ ...c, sortOrder: 0 })));
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMessage("");
    Promise.all([listEmergencyContacts(), listCouponLocations()])
      .then(([loadedContacts, loadedCoupons]) => {
        if (cancelled) return;
        setContacts(loadedContacts);
        setCoupons(loadedCoupons);
      })
      .catch((error) => {
        if (!cancelled) {
          setContacts(mockContacts.map((c) => ({ ...c, sortOrder: 0 })));
          setCoupons(mockCoupons.map((c) => ({ ...c, sortOrder: 0 })));
          setErrorMessage(error instanceof Error ? error.message : "Unable to load guides; showing fallback list.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiMode, authTick]);

  const submitContact = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMessage("");
    try {
      if (editingContactId) {
        if (apiMode) {
          const updated = await updateEmergencyContact(editingContactId, contactForm);
          setContacts((items) => items.map((item) => (item.id === editingContactId ? updated : item)));
        } else {
          setContacts((items) => items.map((item) => (item.id === editingContactId ? { ...item, ...contactForm } : item)));
        }
      } else if (apiMode) {
        const created = await createEmergencyContact(contactForm);
        setContacts((items) => [...items, created]);
      } else {
        setContacts((items) => [...items, { id: `c-${Date.now()}`, ...contactForm, sortOrder: items.length + 1 }]);
      }
      setContactForm(emptyContactForm);
      setContactFormOpen(false);
      setEditingContactId(null);
      hapticSuccess();
      playSfx("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save contact.");
      playSfx("error");
    } finally {
      setSaving(false);
    }
  };

  const startEditContact = (contact: EmergencyContact) => {
    setContactForm({ name: contact.name, role: contact.role, phone: contact.phone, priority: contact.priority });
    setEditingContactId(contact.id);
    setContactFormOpen(true);
    hapticImpact("light");
    playSfx("open");
  };

  const handleDeleteContact = async (id: string) => {
    setErrorMessage("");
    try {
      if (apiMode) {
        await deleteEmergencyContact(id);
      }
      setContacts((items) => items.filter((item) => item.id !== id));
      setConfirmContactDelete(null);
      hapticSuccess();
      playSfx("delete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete contact.");
      playSfx("error");
    }
  };

  const submitCoupon = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMessage("");
    try {
      if (editingCouponId) {
        if (apiMode) {
          const updated = await updateCouponLocation(editingCouponId, couponForm);
          setCoupons((items) => items.map((item) => (item.id === editingCouponId ? updated : item)));
        } else {
          setCoupons((items) => items.map((item) => (item.id === editingCouponId ? { ...item, ...couponForm } : item)));
        }
      } else if (apiMode) {
        const created = await createCouponLocation(couponForm);
        setCoupons((items) => [...items, created]);
      } else {
        setCoupons((items) => [...items, { id: `cafe-${Date.now()}`, ...couponForm, sortOrder: items.length + 1 }]);
      }
      setCouponForm(emptyCouponForm);
      setCouponFormOpen(false);
      setEditingCouponId(null);
      hapticSuccess();
      playSfx("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save location.");
      playSfx("error");
    } finally {
      setSaving(false);
    }
  };

  const startEditCoupon = (coupon: CouponLocation) => {
    setCouponForm({ name: coupon.name, location: coupon.location, accepts: coupon.accepts, hours: coupon.hours });
    setEditingCouponId(coupon.id);
    setCouponFormOpen(true);
    hapticImpact("light");
    playSfx("open");
  };

  const handleDeleteCoupon = async (id: string) => {
    setErrorMessage("");
    try {
      if (apiMode) {
        await deleteCouponLocation(id);
      }
      setCoupons((items) => items.filter((item) => item.id !== id));
      setConfirmCouponDelete(null);
      hapticSuccess();
      playSfx("delete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete location.");
      playSfx("error");
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Knowledge base</p>
          <h2>Resources</h2>
        </div>
        <span className="soft-chip">{apiMode ? "Supabase" : "Mock"}</span>
      </div>

      {errorMessage && (
        <div className="banner banner-emergency">
          <Siren size={18} />
          <div>
            <strong>Notice</strong>
            <p>{errorMessage}</p>
          </div>
          <button className="icon-button" onClick={() => { playSfx("close"); setErrorMessage(""); }} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </div>
      )}

      <article className="resource-card">
        <div className="resource-icon">
          <FileText size={22} aria-hidden="true" />
        </div>
        <div>
          <h3>Official PDF Schedule</h3>
          <p>Public copy of the IIUM Ta'aruf Semester 2, 2025/2026 programme schedule.</p>
        </div>
        <Link className="primary-button" to="/official-schedule" onClick={() => { hapticImpact("light"); playSfx("forward"); }}>
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
            <p>Hotline numbers for urgent support during the programme.</p>
          </div>
          {isMainboard && (
            <button className="icon-text-button" type="button" onClick={() => {
              const next = !contactFormOpen;
              playSfx(next ? "open" : "close");
              setContactFormOpen(next);
              setEditingContactId(null);
              setContactForm(emptyContactForm);
            }}>
              <Plus size={15} aria-hidden="true" />
              <span>Add contact</span>
            </button>
          )}
        </div>

        {isMainboard && contactFormOpen && (
          <motion.form className="form-card compact inline-editor" onSubmit={submitContact} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <label>
              <span>Name</span>
              <input required value={contactForm.name} onChange={(e) => setContactForm((c) => ({ ...c, name: e.target.value }))} />
            </label>
            <label>
              <span>Role</span>
              <input required value={contactForm.role} onChange={(e) => setContactForm((c) => ({ ...c, role: e.target.value }))} />
            </label>
            <label>
              <span>Phone</span>
              <input required value={contactForm.phone} onChange={(e) => setContactForm((c) => ({ ...c, phone: e.target.value }))} />
            </label>
            <label className="inline-checkbox-row">
              <input type="checkbox" checked={contactForm.priority} onChange={(e) => {
                const checked = e.target.checked;
                playSfx(checked ? "check" : "uncheck");
                setContactForm((c) => ({ ...c, priority: checked }));
              }} />
              <span>Priority contact</span>
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                <Check size={15} aria-hidden="true" />
                <span>{editingContactId ? "Save" : "Add"}</span>
              </button>
              <button className="outline-button" type="button" onClick={() => { playSfx("cancel"); setContactFormOpen(false); setEditingContactId(null); }}>Cancel</button>
            </div>
          </motion.form>
        )}

        {loading ? (
          <div className="skeleton-page" />
        ) : (
          <div className="contact-list">
            {contacts.map((contact) => (
              <div key={contact.id} className={contact.priority ? "contact-row-wrap priority" : "contact-row-wrap"}>
                <a className="contact-row" href={`tel:${contact.phone}`} onClick={() => { hapticImpact("medium"); playSfx("forward"); }}>
                  <div>
                    <strong>{contact.name}</strong>
                    <span>{contact.role}</span>
                  </div>
                  <div className="phone-pill">
                    <Phone size={15} aria-hidden="true" />
                    <span>{contact.phone}</span>
                  </div>
                </a>
                {isMainboard && (
                  <div className="inline-row-actions">
                    <button className="icon-button" type="button" aria-label="Edit contact" onClick={() => startEditContact(contact)}>
                      <PenLine size={14} />
                    </button>
                    {confirmContactDelete === contact.id ? (
                      <div className="inline-confirm">
                        <span>Delete?</span>
                        <button type="button" className="danger-outline-button" onClick={() => handleDeleteContact(contact.id)}>Yes</button>
                        <button type="button" className="outline-button" onClick={() => { playSfx("cancel"); setConfirmContactDelete(null); }}>No</button>
                      </div>
                    ) : (
                      <button className="icon-button" type="button" aria-label="Delete contact" onClick={() => { playSfx("press"); setConfirmContactDelete(contact.id); }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="resource-card stacked">
        <div className="resource-heading">
          <div className="resource-icon gold">
            <UtensilsCrossed size={22} aria-hidden="true" />
          </div>
          <div>
            <h3>Accepted Coupon Locations</h3>
            <p>Cafes and eateries that accept Ta'aruf Week food coupons.</p>
          </div>
          {isMainboard && (
            <button className="icon-text-button" type="button" onClick={() => {
              const next = !couponFormOpen;
              playSfx(next ? "open" : "close");
              setCouponFormOpen(next);
              setEditingCouponId(null);
              setCouponForm(emptyCouponForm);
            }}>
              <Plus size={15} aria-hidden="true" />
              <span>Add location</span>
            </button>
          )}
        </div>

        {isMainboard && couponFormOpen && (
          <motion.form className="form-card compact inline-editor" onSubmit={submitCoupon} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <label>
              <span>Name</span>
              <input required value={couponForm.name} onChange={(e) => setCouponForm((c) => ({ ...c, name: e.target.value }))} />
            </label>
            <label>
              <span>Location</span>
              <input required value={couponForm.location} onChange={(e) => setCouponForm((c) => ({ ...c, location: e.target.value }))} />
            </label>
            <label>
              <span>Accepts</span>
              <input value={couponForm.accepts} onChange={(e) => setCouponForm((c) => ({ ...c, accepts: e.target.value }))} />
            </label>
            <label>
              <span>Hours</span>
              <input value={couponForm.hours} onChange={(e) => setCouponForm((c) => ({ ...c, hours: e.target.value }))} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                <Check size={15} aria-hidden="true" />
                <span>{editingCouponId ? "Save" : "Add"}</span>
              </button>
              <button className="outline-button" type="button" onClick={() => { playSfx("cancel"); setCouponFormOpen(false); setEditingCouponId(null); }}>Cancel</button>
            </div>
          </motion.form>
        )}

        {loading ? (
          <div className="skeleton-page" />
        ) : (
          <div className="coupon-cafe-grid">
            {coupons.map((cafe, index) => (
              <motion.div
                className="coupon-cafe-card"
                key={cafe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="coupon-cafe-name">
                  <UtensilsCrossed size={16} aria-hidden="true" />
                  <strong>{cafe.name}</strong>
                </div>
                <p className="coupon-cafe-location">{cafe.location}</p>
                <div className="coupon-cafe-meta">
                  <span className="coupon-cafe-badge">{cafe.accepts}</span>
                  <span className="coupon-cafe-hours">{cafe.hours}</span>
                </div>
                {isMainboard && (
                  <div className="inline-row-actions" style={{ marginTop: 8 }}>
                    <button className="icon-button" type="button" aria-label="Edit location" onClick={() => startEditCoupon(cafe)}>
                      <PenLine size={14} />
                    </button>
                    {confirmCouponDelete === cafe.id ? (
                      <div className="inline-confirm">
                        <span>Delete?</span>
                        <button type="button" className="danger-outline-button" onClick={() => handleDeleteCoupon(cafe.id)}>Yes</button>
                        <button type="button" className="outline-button" onClick={() => { playSfx("cancel"); setConfirmCouponDelete(null); }}>No</button>
                      </div>
                    ) : (
                      <button className="icon-button" type="button" aria-label="Delete location" onClick={() => { playSfx("press"); setConfirmCouponDelete(cafe.id); }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

export default Resources;
