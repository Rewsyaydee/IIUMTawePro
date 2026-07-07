export function mapAssetUrl(fromCode: string, toCode: string): string {
  return `/assets/maps/routes/${fromCode}__to__${toCode}.webp`;
}

export function campusOverviewUrl(): string {
  return "/assets/maps/campus-overview.webp";
}
