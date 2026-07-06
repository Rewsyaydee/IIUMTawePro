import type { Bureau, Role } from "./types";

export const ROLES: Role[] = ["student", "committee", "head", "mainboard"];

export const BUREAUS: Bureau[] = [
  "Catering",
  "PrepTech",
  "Registration",
  "Program Coordinator",
  "Special Task",
  "Discipline",
  "Multimedia",
  "Welfare"
];

export const roleLabels: Record<Role, string> = {
  student: "Student",
  committee: "Committee",
  head: "Head of Bureau",
  mainboard: "Mainboard"
};

export const bureauShortLabels: Record<Bureau, string> = {
  Catering: "Catering",
  PrepTech: "PrepTech",
  Registration: "Registration",
  "Program Coordinator": "Program",
  "Special Task": "Special",
  Discipline: "Discipline",
  Multimedia: "Media",
  Welfare: "Welfare"
};
