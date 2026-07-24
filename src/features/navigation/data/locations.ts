export interface LocationCoord {
  code: string;
  name: string;
  type: "venue" | "kulliyyah" | "mahallah";
  lat: number | null;
  lng: number | null;
}

export const locationCoords: LocationCoord[] = [
  { code: "icc-main-hall",    name: "Main Hall, ICC",                                     type: "venue",      lat: 3.251663, lng: 101.732462 },
  { code: "main-auditorium",  name: "Main Auditorium",                                    type: "venue",      lat: 3.250950, lng: 101.733678 },
  { code: "mini-auditorium",  name: "Mini Auditorium",                                    type: "venue",      lat: null,     lng: null },
  { code: "shas-mosque",      name: "IIUM SHAS Mosque",                                   type: "venue",      lat: 3.251366, lng: 101.734955 },
  { code: "sejahtera-clinic", name: "IIUM Sejahtera Clinic",                              type: "venue",      lat: null,     lng: null },
  { code: "adm-lt1",          name: "ADM Lecture Theatre 1",                              type: "venue",      lat: null,     lng: null },
  { code: "icc",              name: "ICC",                                                 type: "venue",      lat: null,     lng: null },

  { code: "kict",             name: "Kulliyyah of ICT",                                   type: "kulliyyah",  lat: null,     lng: null },
  { code: "koe",              name: "Kulliyyah of Engineering",                           type: "kulliyyah",  lat: null,     lng: null },
  { code: "kenms",            name: "Kulliyyah of Economics & Management Sciences",       type: "kulliyyah",  lat: null,     lng: null },
  { code: "koed",             name: "Kulliyyah of Education",                             type: "kulliyyah",  lat: null,     lng: null },
  { code: "aikol",            name: "Ahmad Ibrahim Kulliyyah of Laws",                    type: "kulliyyah",  lat: null,     lng: null },
  { code: "kaed",             name: "Kulliyyah of Architecture & Environmental Design",   type: "kulliyyah",  lat: null,     lng: null },
  { code: "ahaskirkhs",       name: "AHAS KIRKHS",                                        type: "kulliyyah",  lat: null,     lng: null },

  { code: "mh-uthman",        name: "Mahallah Uthman",       type: "mahallah",  lat: null,  lng: null },
  { code: "mh-faruq",         name: "Mahallah Faruq",        type: "mahallah",  lat: null,  lng: null },
  { code: "mh-siddiq",        name: "Mahallah Siddiq",       type: "mahallah",  lat: null,  lng: null },
  { code: "mh-bilal",         name: "Mahallah Bilal",        type: "mahallah",  lat: null,  lng: null },
  { code: "mh-ali",           name: "Mahallah Ali",          type: "mahallah",  lat: null,  lng: null },
  { code: "mh-zubair",        name: "Mahallah Zubair",       type: "mahallah",  lat: null,  lng: null },

  { code: "mh-safiyyah",      name: "Mahallah Safiyyah",     type: "mahallah",  lat: null,  lng: null },
  { code: "mh-aminah",        name: "Mahallah Aminah",       type: "mahallah",  lat: null,  lng: null },
  { code: "mh-asiah",         name: "Mahallah Asiah",        type: "mahallah",  lat: null,  lng: null },
  { code: "mh-asma",          name: "Mahallah Asma",         type: "mahallah",  lat: null,  lng: null },
  { code: "mh-hafsah",        name: "Mahallah Hafsah",       type: "mahallah",  lat: null,  lng: null },
  { code: "mh-halimah",       name: "Mahallah Halimah",      type: "mahallah",  lat: null,  lng: null },
  { code: "mh-maryam",        name: "Mahallah Maryam",       type: "mahallah",  lat: null,  lng: null },
  { code: "mh-nusaibah",      name: "Mahallah Nusaibah",     type: "mahallah",  lat: null,  lng: null },
  { code: "mh-sumayyah",      name: "Mahallah Sumayyah",     type: "mahallah",  lat: null,  lng: null },

  { code: "mh-ruqayyah",      name: "Mahallah Ruqayyah",     type: "mahallah",  lat: null,  lng: null },
  { code: "mh-salahuddin",    name: "Mahallah Salahuddin",   type: "mahallah",  lat: null,  lng: null },
];

export function getLocationCoord(code: string): LocationCoord | undefined {
  return locationCoords.find((loc) => loc.code === code);
}

export function hasExactCoords(code: string): boolean {
  const loc = getLocationCoord(code);
  return loc !== undefined && loc.lat !== null && loc.lng !== null;
}
