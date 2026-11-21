export const workplaceFields = [
  { name: "campus", label: "Campus", maxLength: 100 },
  { name: "office_hours", label: "Office hours", maxLength: 160 },
  { name: "bio", label: "Short bio", maxLength: 500 },
] as const;

export type WorkplaceDetails = Record<(typeof workplaceFields)[number]["name"], string>;
