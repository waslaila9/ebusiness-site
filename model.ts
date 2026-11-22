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
export type Looking = "" | "friends" | "dating" | "either";
export type Profile = {
  uid: string;
  name: string;
  programCategory?: string;
  program?: string;
  year?: string;
  about: string;
  socialStyle?: "one-on-one" | "small-groups" | "either";
  interests: string[];
  values: string[];
  looking: Looking;
  availability: string[];
  completed: boolean;
  currentMatch: string | null;
};
export type Card = Pick<
  Profile,
  | "name"
  | "about"
  | "interests"
  | "availability"
  | "looking"
>;
export type Match = {
  id: string;
  members: string[];
  cards: Record<string, Card>;
  decisions: Record<string, "pending" | "accept" | "pass">;
  sharedInterests: string[];
  sharedAvailability: string[];
  instagram?: Record<string, string>;
  createdAt: number;
};
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
  looking: "",
  availability: [],
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
  if (p.about.length > 280)
    e.about = "Keep your introduction under 280 characters.";
  if (
    !Array.isArray(p.interests) ||
    !p.interests.length ||
    p.interests.length > 10 ||
    p.interests.some(
      (x) => !interests.includes(x as (typeof interests)[number]),
    )
  )
    e.interests = "Choose at least one interest.";
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
  return e;
}
export const cardOf = (p: Profile): Card => ({
  name: p.name,
  about: p.about,
  interests: p.interests,
  availability: p.availability,
  looking: p.looking,
});
export const bothAccepted = (m: Match) =>
  m.members.length === 2 &&
  m.members.every((uid) => m.decisions[uid] === "accept");
