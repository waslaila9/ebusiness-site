export const interests = [
  "Coffee walks",
  "Music",
  "Food",
  "Art",
  "Gaming",
  "Books",
  "Outdoors",
  "Movies",
  "Fitness",
  "Volunteering",
] as const;
export const values = [
  "Kindness",
  "Curiosity",
  "Creativity",
  "Community",
  "Balance",
  "Adventure",
] as const;
export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export const times = ["Morning", "Afternoon", "Evening"] as const;
export const programCategories = [
  "Arts & Humanities",
  "Business",
  "Engineering",
  "Environment",
  "Law",
  "Management",
  "Medicine & Health",
  "Science",
  "Social Sciences",
  "Other",
] as const;
export const socialStyles = ["one-on-one", "small-groups", "either"] as const;
export type Looking = "friends" | "dating" | "either";
export type Profile = {
  uid: string;
  name: string;
  programCategory: string;
  program: string;
  year: string;
  about: string;
  socialStyle: "one-on-one" | "small-groups" | "either";
  interests: string[];
  values: string[];
  looking: Looking;
  availability: string[];
  instagram: string;
  sharePhone: boolean;
  phone: string;
  completed: boolean;
  currentMatch: string | null;
};
export type Card = Pick<
  Profile,
  | "name"
  | "programCategory"
  | "program"
  | "year"
  | "about"
  | "socialStyle"
  | "interests"
  | "values"
  | "looking"
>;
export type Match = {
  id: string;
  members: string[];
  cards: Record<string, Card>;
  decisions: Record<string, "pending" | "accept" | "pass">;
  sharedInterests: string[];
  sharedAvailability: string[];
  sharedProgram: boolean;
  createdAt: number;
};
export type Contact = { name: string; instagram: string; phone?: string };
export type User = { uid: string; email: string };
export const blankProfile = (uid: string): Profile => ({
  uid,
  name: "",
  programCategory: "Other",
  program: "",
  year: "",
  about: "",
  socialStyle: "either",
  interests: [],
  values: [],
  looking: "friends",
  availability: [],
  instagram: "",
  sharePhone: false,
  phone: "",
  completed: false,
  currentMatch: null,
});
export const isMcGill = (email: string) =>
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@mail\.mcgill\.ca$/i.test(email.trim());
export const safeNext = (value: string | null | undefined) =>
  value &&
  (/^\/profile(?:\/saved)?$/.test(value) ||
    /^\/matches(?:\/[A-Za-z0-9_-]+(?:\/connected)?)?$/.test(value))
    ? value
    : "/profile";
export function validateProfile(p: Profile) {
  const e: Record<string, string> = {};
  if (!p.name.trim() || p.name.length > 60)
    e.name = "Add your first name (up to 60 characters).";
  if (
    !programCategories.includes(
      p.programCategory as (typeof programCategories)[number],
    )
  )
    e.programCategory = "Choose a broad area of study.";
  if (!p.program.trim() || p.program.length > 100)
    e.program = "Add your program (up to 100 characters).";
  if (p.about.length > 280)
    e.about = "Keep your introduction under 280 characters.";
  if (!socialStyles.includes(p.socialStyle))
    e.socialStyle = "Choose the kind of connection that feels comfortable.";
  if (!["1", "2", "3", "4", "5+", "Graduate"].includes(p.year))
    e.year = "Choose your year.";
  if (
    !Array.isArray(p.interests) ||
    !p.interests.length ||
    p.interests.length > 10 ||
    p.interests.some(
      (x) => !interests.includes(x as (typeof interests)[number]),
    )
  )
    e.interests = "Choose at least one interest.";
  if (
    !Array.isArray(p.values) ||
    !p.values.length ||
    p.values.length > 6 ||
    p.values.some((x) => !values.includes(x as (typeof values)[number]))
  )
    e.values = "Choose at least one value.";
  if (!["friends", "dating", "either"].includes(p.looking))
    e.looking = "Choose what you are looking for.";
  const slots = days.flatMap((d) => times.map((t) => `${d} ${t}`));
  if (
    !Array.isArray(p.availability) ||
    !p.availability.length ||
    p.availability.length > 21 ||
    p.availability.some((x) => !slots.includes(x))
  )
    e.availability = "Choose at least one time that works for you.";
  if (!/^@?[a-zA-Z0-9._]{1,30}$/.test(p.instagram))
    e.instagram =
      "Add an Instagram username (letters, numbers, dots or underscores).";
  if (
    typeof p.sharePhone !== "boolean" ||
    typeof p.phone !== "string" ||
    (p.sharePhone && !/^\+?[0-9 ()-]{7,24}$/.test(p.phone))
  )
    e.phone = "Add a valid phone number or turn off phone sharing.";
  return e;
}
export const cardOf = (p: Profile): Card => ({
  name: p.name,
  programCategory: p.programCategory,
  program: p.program,
  year: p.year,
  about: p.about,
  socialStyle: p.socialStyle,
  interests: p.interests,
  values: p.values,
  looking: p.looking,
});
export const contactOf = (p: Profile): Contact => ({
  name: p.name,
  instagram: p.instagram,
  ...(p.sharePhone ? { phone: p.phone } : {}),
});
export const bothAccepted = (m: Match) =>
  m.members.length === 2 &&
  m.members.every((uid) => m.decisions[uid] === "accept");
