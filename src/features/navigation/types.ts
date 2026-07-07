export type VenueCategory = "hall" | "mosque" | "clinic" | "mahallah" | "admin" | "open_area";

export interface Venue {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  category: VenueCategory;
}

export interface RouteStep {
  instruction: string;
  landmark?: string;
  note?: string;
}

export interface Route {
  id: string;
  fromCode: string;
  toCode: string;
  mapAssetUrl: string;
  durationMinutes: number;
  distanceMeters: number;
  steps: RouteStep[];
  transitionNotes?: string;
}
