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
  { code: "mini-auditorium",  name: "Mini Auditorium",                                    type: "venue",      lat: 3.2519151005120497,     lng:  101.73475554906162 },
  { code: "shas-mosque",      name: "IIUM SHAS Mosque",                                   type: "venue",      lat: 3.251366, lng: 101.734955 },
  { code: "sejahtera-clinic", name: "IIUM Sejahtera Clinic",                              type: "venue",      lat: 3.2533098441092965,     lng:  101.73408536898059 },
  { code: "adm-lt1",          name: "ADM Lecture Theatre 1",                              type: "venue",      lat: 3.251226985591836,     lng:  101.73445174606788 },
  { code: "icc",              name: "ICC",                                                 type: "venue",      lat: 3.251221519425329,     lng:  101.732445319513 },

  { code: "kict",             name: "Kulliyyah of ICT",                                   type: "kulliyyah",  lat: 3.253923884130264,     lng:  101.73009891058052 },
  { code: "koe",              name: "Kulliyyah of Engineering",                           type: "kulliyyah",  lat: 3.2527107907893495,     lng:  101.73260558428963 },
  { code: "kenms",            name: "Kulliyyah of Economics & Management Sciences",       type: "kulliyyah",  lat: 3.2499265704027565,     lng:  101.73799115984376 },
  { code: "koed",             name: "Kulliyyah of Education",                             type: "kulliyyah",  lat: 3.2528625768712867,     lng:  101.73391161461943 },
  { code: "aikol",            name: "Ahmad Ibrahim Kulliyyah of Laws",                    type: "kulliyyah",  lat: 3.2514265996291263,     lng:  101.73787054563844 },
  { code: "kaed",             name: "Kulliyyah of Architecture & Environmental Design",   type: "kulliyyah",  lat: 3.2513319767176663,    lng:  101.73147213654688 },
  { code: "ahaskirkhs",       name: "AHAS KIRKHS",                                        type: "kulliyyah",  lat: 3.252555798625596,    lng:  101.73519442576496 },
  { code: "celpad",           name: "CELPAD",                                        type: "kulliyyah",  lat: 3.2522279822922138,    lng: 101.7353429212483  },

  { code: "mh-uthman",        name: "Mahallah Uthman",       type: "mahallah",  lat: 3.2492790017989033,  lng:  101.74058800195546 },
  { code: "mh-faruq",         name: "Mahallah Faruq",        type: "mahallah",  lat: 3.248668479887765,  lng:  101.7400295494571 },
  { code: "mh-siddiq",        name: "Mahallah Siddiq",       type: "mahallah",  lat: 3.2478177397653862,   lng: 101.73853470671501 },
  { code: "mh-bilal",         name: "Mahallah Bilal",        type: "mahallah",  lat: 3.2466963118919216,   lng: 101.74049794276812 },
  { code: "mh-ali",           name: "Mahallah Ali",          type: "mahallah",  lat: 3.247775902546013,  lng:  101.73778971072215 },
  { code: "mh-zubair",        name: "Mahallah Zubair",       type: "mahallah",  lat: 3.246718052197621,  lng:  101.73588037792858 },

  { code: "mh-safiyyah",      name: "Mahallah Safiyyah",     type: "mahallah",  lat: 3.2482136,  lng: 101.7340588 },
  { code: "mh-aminah",        name: "Mahallah Aminah",       type: "mahallah",  lat: 3.2565195,  lng: 101.7318572 },
  { code: "mh-asiah",         name: "Mahallah Asiah",        type: "mahallah",  lat: 3.2582577,  lng: 101.7333511 },
  { code: "mh-asma",          name: "Mahallah Asma",         type: "mahallah",  lat: 3.2558925,  lng: 101.7334285 },
  { code: "mh-hafsah",        name: "Mahallah Hafsah",       type: "mahallah",  lat: 3.2548129,  lng: 101.7342318 },
  { code: "mh-halimah",       name: "Mahallah Halimah",      type: "mahallah",  lat: 3.2586235,  lng: 101.7342165 },
  { code: "mh-maryam",        name: "Mahallah Maryam",       type: "mahallah",  lat: 3.258269,   lng: 101.7361631 },
  { code: "mh-nusaibah",      name: "Mahallah Nusaibah",     type: "mahallah",  lat: 3.2530703,  lng: 101.7372048 },
  { code: "mh-sumayyah",      name: "Mahallah Sumayyah",     type: "mahallah",  lat: 3.2555813,  lng: 101.7393246 },

  { code: "mh-ruqayyah",      name: "Mahallah Ruqayyah",     type: "mahallah",  lat: 3.2598975,  lng: 101.7330973 },
  { code: "mh-salahuddin",    name: "Mahallah Salahuddin",   type: "mahallah",  lat: 3.2567808,  lng: 101.7382522 },
];

export function getLocationCoord(code: string): LocationCoord | undefined {
  return locationCoords.find((loc) => loc.code === code);
}

export function hasExactCoords(code: string): boolean {
  const loc = getLocationCoord(code);
  return loc !== undefined && loc.lat !== null && loc.lng !== null;
}
