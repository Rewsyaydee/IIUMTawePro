export interface Mahallah {
  code: string;
  name: string;
  short: string;
  zone: "male" | "female" | "mixed";
  image_url: string;
}

export const maleMahallahs: Mahallah[] = [
  { code: "mh-uthman", name: "Mahallah Uthman", short: "Uthman", zone: "male", image_url: "" },
  { code: "mh-faruq", name: "Mahallah Faruq", short: "Faruq", zone: "male", image_url: "" },
  { code: "mh-siddiq", name: "Mahallah Siddiq", short: "Siddiq", zone: "male", image_url: "" },
  { code: "mh-bilal", name: "Mahallah Bilal", short: "Bilal", zone: "male", image_url: "" },
  { code: "mh-ali", name: "Mahallah Ali", short: "Ali", zone: "male", image_url: "" },
  { code: "mh-zubair", name: "Mahallah Zubair", short: "Zubair", zone: "male", image_url: "" }
];

export const femaleMahallahs: Mahallah[] = [
  { code: "mh-safiyyah", name: "Mahallah Safiyyah", short: "Safiyyah", zone: "female", image_url: "" },
  { code: "mh-aminah", name: "Mahallah Aminah", short: "Aminah", zone: "female", image_url: "" },
  { code: "mh-asiah", name: "Mahallah Asiah", short: "Asiah", zone: "female", image_url: "" },
  { code: "mh-asma", name: "Mahallah Asma", short: "Asma", zone: "female", image_url: "" },
  { code: "mh-hafsah", name: "Mahallah Hafsah", short: "Hafsah", zone: "female", image_url: "" },
  { code: "mh-halimah", name: "Mahallah Halimah", short: "Halimah", zone: "female", image_url: "" },
  { code: "mh-maryam", name: "Mahallah Maryam", short: "Maryam", zone: "female", image_url: "" },
  { code: "mh-nusaibah", name: "Mahallah Nusaibah", short: "Nusaibah", zone: "female", image_url: "" },
  { code: "mh-sumayyah", name: "Mahallah Sumayyah", short: "Sumayyah", zone: "female", image_url: "" }
];

export const mixedMahallahs: Mahallah[] = [
  { code: "mh-ruqayyah", name: "Mahallah Ruqayyah", short: "Ruqayyah", zone: "mixed", image_url: "" },
  { code: "mh-salahuddin", name: "Mahallah Salahuddin", short: "Salahuddin", zone: "mixed", image_url: "" }
];

export const allMahallahs: Mahallah[] = [...maleMahallahs, ...femaleMahallahs, ...mixedMahallahs];

export function getMahallah(code: string): Mahallah | undefined {
  return allMahallahs.find((m) => m.code === code);
}
