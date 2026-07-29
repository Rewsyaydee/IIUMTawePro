export interface Mahallah {
  code: string;
  name: string;
  short: string;
  zone: "male" | "female" | "mixed";
  image_url: string;
}

const avatarPath = (short: string) => `/assets/mahallahs/${short.toLowerCase()}.png`;

export const maleMahallahs: Mahallah[] = [
  { code: "mh-uthman", name: "Mahallah Uthman", short: "Uthman", zone: "male", image_url: avatarPath("Uthman") },
  { code: "mh-faruq", name: "Mahallah Faruq", short: "Faruq", zone: "male", image_url: avatarPath("Faruq") },
  { code: "mh-siddiq", name: "Mahallah Siddiq", short: "Siddiq", zone: "male", image_url: avatarPath("Siddiq") },
  { code: "mh-bilal", name: "Mahallah Bilal", short: "Bilal", zone: "male", image_url: avatarPath("Bilal") },
  { code: "mh-ali", name: "Mahallah Ali", short: "Ali", zone: "male", image_url: avatarPath("Ali") },
  { code: "mh-zubair", name: "Mahallah Zubair", short: "Zubair", zone: "male", image_url: avatarPath("Zubair") }
];

export const femaleMahallahs: Mahallah[] = [
  { code: "mh-safiyyah", name: "Mahallah Safiyyah", short: "Safiyyah", zone: "female", image_url: avatarPath("Safiyyah") },
  { code: "mh-aminah", name: "Mahallah Aminah", short: "Aminah", zone: "female", image_url: avatarPath("Aminah") },
  { code: "mh-asiah", name: "Mahallah Asiah", short: "Asiah", zone: "female", image_url: avatarPath("Asiah") },
  { code: "mh-asma", name: "Mahallah Asma", short: "Asma", zone: "female", image_url: avatarPath("Asma") },
  { code: "mh-hafsah", name: "Mahallah Hafsah", short: "Hafsah", zone: "female", image_url: avatarPath("Hafsah") },
  { code: "mh-halimah", name: "Mahallah Halimah", short: "Halimah", zone: "female", image_url: avatarPath("Halimah") },
  { code: "mh-maryam", name: "Mahallah Maryam", short: "Maryam", zone: "female", image_url: avatarPath("Maryam") },
  { code: "mh-nusaibah", name: "Mahallah Nusaibah", short: "Nusaibah", zone: "female", image_url: avatarPath("Nusaibah") },
  { code: "mh-sumayyah", name: "Mahallah Sumayyah", short: "Sumayyah", zone: "female", image_url: avatarPath("Sumayyah") }
];

export const mixedMahallahs: Mahallah[] = [
  { code: "mh-ruqayyah", name: "Mahallah Ruqayyah", short: "Ruqayyah", zone: "mixed", image_url: avatarPath("Ruqayyah") },
  { code: "mh-salahuddin", name: "Mahallah Salahuddin", short: "Salahuddin", zone: "mixed", image_url: avatarPath("Salahuddin") }
];

export const allMahallahs: Mahallah[] = [...maleMahallahs, ...femaleMahallahs, ...mixedMahallahs];

export function getMahallah(code: string): Mahallah | undefined {
  return allMahallahs.find((m) => m.code === code);
}
