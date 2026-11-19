export const profileFields = [
  { name: "fullName", label: "Full name", maxLength: 120 },
  { name: "designation", label: "Designation", maxLength: 100 },
  { name: "department", label: "Department", maxLength: 100 },
  { name: "phone", label: "Phone", maxLength: 40 },
  { name: "officeRoom", label: "Office room", maxLength: 100 },
] as const;

export type FacultyProfileFields = Record<(typeof profileFields)[number]["name"], string>;

export function getFacultyInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "F";
}
