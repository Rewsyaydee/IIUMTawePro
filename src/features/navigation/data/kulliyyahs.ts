import { appleMapsUrl, googleMapsWalkingUrl, openExternalMap, wazeUrl } from "../utils/mapLinks";

export const kulliyyahs = [
  { code: "kict", name: "Kulliyyah of Information & Communication Technology", short: "KICT", search: "KICT IIUM Gombak" },
  { code: "koe", name: "Kulliyyah of Engineering", short: "KOE", search: "KOE IIUM Gombak" },
  { code: "kenms", name: "Kulliyyah of Economics & Management Sciences", short: "KENMS", search: "KENMS IIUM Gombak" },
  { code: "koed", name: "Kulliyyah of Education", short: "KOED", search: "KOED IIUM Gombak" },
  { code: "aikol", name: "Ahmad Ibrahim Kulliyyah of Laws", short: "AIKOL", search: "AIKOL IIUM Gombak" },
  { code: "kaed", name: "Kulliyyah of Architecture & Environmental Design", short: "KAED", search: "KAED IIUM Gombak" },
  { code: "ahaskirkhs", name: "Abdul Hamid Abu Sulayman Kulliyyah of Islamic Revealed Knowledge and Human Sciences", short: "AHAS KIRKHS", search: "AHAS KIRKHS IIUM Gombak" }
];

export type Kulliyyah = typeof kulliyyahs[number];

export function openKulliyyahDirections(fromName: string, kulliyyah: Kulliyyah) {
  const toName = `${kulliyyah.name}, IIUM Gombak Campus`;
  return {
    google: () => openExternalMap(googleMapsWalkingUrl(fromName, toName)),
    waze: () => openExternalMap(wazeUrl(toName)),
    apple: () => openExternalMap(appleMapsUrl(fromName, toName))
  };
}
