import type { Venue } from "../types";

export const venues: Venue[] = [
  {
    id: "v-icc-main-hall",
    code: "icc-main-hall",
    name: "Main Hall, ICC",
    shortName: "ICC Main Hall",
    description: "Primary event hall in the ICC building. Hosts registration, briefings, and placement tests.",
    category: "hall",
    lat: 3.251663,
    lng: 101.732462
  },
  {
    id: "v-main-auditorium",
    code: "main-auditorium",
    name: "Main Auditorium",
    shortName: "Main Auditorium",
    description: "Largest auditorium on campus. Hosts opening ceremony, video presentations, VIP sessions.",
    category: "hall",
    lat: 3.250950,
    lng: 101.733678
  },
  {
    id: "v-mini-auditorium",
    code: "mini-auditorium",
    name: "Mini Auditorium",
    shortName: "Mini Auditorium",
    description: "Smaller auditorium for briefings and parallel sessions.",
    category: "hall"
  },
  {
    id: "v-shas-mosque",
    code: "shas-mosque",
    name: "IIUM SHAS Mosque",
    shortName: "SHAS Mosque",
    description: "Central campus mosque for congregational prayers, tadarus Al-Quran, and usrah sessions.",
    category: "mosque",
    lat: 3.251366,
    lng: 101.734955
  },
  {
    id: "v-sejahtera-clinic",
    code: "sejahtera-clinic",
    name: "IIUM Sejahtera Clinic",
    shortName: "Sejahtera Clinic",
    description: "Campus health clinic for medical check-ups and basic healthcare.",
    category: "clinic"
  },
  {
    id: "v-adm-lt1",
    code: "adm-lt1",
    name: "ADM Lecture Theatre 1",
    shortName: "ADM LT1",
    description: "Lecture theatre in the ADM building for Ihsan Madani sessions.",
    category: "hall"
  },
  {
    id: "v-icc",
    code: "icc",
    name: "ICC",
    shortName: "ICC",
    description: "International Islamic Cultural Centre. Hosts placement tests (Arabic, English, Tilawah).",
    category: "hall"
  },
  {
    id: "v-mahallah-zone",
    code: "mahallah-zone",
    name: "Mahallah Zone",
    shortName: "Mahallah",
    description: "Residential mahallahs for student accommodation and night activities.",
    category: "mahallah"
  },
  {
    id: "v-bus-stop",
    code: "bus-stop",
    name: "Bus Stop",
    shortName: "Bus Stop",
    description: "Departure point for buses to Pagoh and Kuantan campuses.",
    category: "open_area"
  },
  {
    id: "v-kulliyyah-zone",
    code: "kulliyyah-zone",
    name: "Kulliyyah Zone",
    shortName: "Kulliyyah",
    description: "Respective Kulliyyah buildings for Ihsan Madani sessions.",
    category: "open_area"
  },
  {
    id: "v-tbc",
    code: "tbc",
    name: "To Be Confirmed",
    shortName: "TBC",
    description: "Venue has not been confirmed yet. Check announcements for updates.",
    category: "open_area"
  },
  {
    id: "v-online",
    code: "online",
    name: "Online",
    shortName: "Online",
    description: "Online session — no physical venue required.",
    category: "open_area"
  }
];

export function getVenue(code: string): Venue | undefined {
  return venues.find((v) => v.code === code);
}
