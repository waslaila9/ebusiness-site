import { Profile, blankProfile, interests } from "./model";
import { sortAvailability } from "./matching";

const fixtureDetails = [
  {
    interests: ["Music", "Books", "Art"],
    availability: ["Wednesday Afternoon", "Friday Evening", "Monday Morning"],
  },
  {
    interests: ["Food", "Movies"],
    availability: ["Tuesday Evening", "Saturday Morning", "Thursday Afternoon"],
  },
  {
    interests: ["Gaming", "Fitness"],
    availability: ["Thursday Evening", "Sunday Afternoon", "Monday Evening"],
  },
  {
    interests: ["Art", "Gaming", "Outdoors"],
    availability: ["Saturday Morning", "Tuesday Evening", "Thursday Morning"],
  },
  {
    interests: ["Coffee walks", "Volunteering"],
    availability: ["Monday Afternoon", "Wednesday Morning", "Saturday Evening"],
  },
  {
    interests: ["Books", "Food"],
    availability: ["Friday Afternoon", "Tuesday Morning", "Saturday Evening"],
  },
  {
    interests: ["Music", "Fitness"],
    availability: ["Tuesday Morning", "Friday Evening", "Monday Afternoon"],
  },
  {
    interests: ["Outdoors", "Art"],
    availability: ["Sunday Morning", "Thursday Afternoon", "Tuesday Evening"],
  },
  {
    interests: ["Gaming", "Art"],
    availability: ["Saturday Morning", "Monday Evening", "Wednesday Morning"],
  },
  {
    interests: ["Movies", "Volunteering"],
    availability: ["Wednesday Evening", "Friday Morning", "Tuesday Afternoon"],
  },
  {
    interests: ["Coffee walks", "Food"],
    availability: ["Tuesday Afternoon", "Saturday Evening", "Thursday Morning"],
  },
  {
    interests: ["Books", "Outdoors"],
    availability: ["Thursday Morning", "Sunday Evening", "Monday Afternoon"],
  },
];

function orderedInterests(profile: Profile) {
  return interests.filter((interest) => profile.interests.includes(interest));
}

function suggestedInterests(profile: Profile, index: number) {
  const selected = orderedInterests(profile);
  const shared = selected[index] || selected[0];
  const different = interests.find((interest) => !profile.interests.includes(interest));
  return [shared, different || "Photography"].filter(
    (interest): interest is string => !!interest,
  );
}

function suggestedAvailability(profile: Profile, index: number) {
  const selected = sortAvailability(profile.availability);
  const shared = selected[index] || selected[0];
  return shared ? [shared] : [];
}

export function fakeStudents(): Profile[] {
  return [
    "Sam",
    "Maya",
    "Jordan",
    "Noor",
    "Leo",
    "Avery",
    "Riley",
    "Sofia",
    "Eli",
    "Camille",
    "Morgan",
    "Jamie",
  ].map((name, i) => ({
    ...blankProfile(`demo-${String(i + 1).padStart(2, "0")}`),
    name,
    program: ["Arts", "Commerce", "Science", "Engineering"][i % 4],
    year: "1",
    interests: fixtureDetails[i].interests,
    values: ["Kindness", "Curiosity"],
    looking: (["friends", "dating", "either"] as const)[Math.floor(i / 4)],
    availability: fixtureDetails[i].availability,
    completed: true,
  }));
}

export function compatibleDemoStudent(profile: Profile): Profile {
  return {
    ...blankProfile("demo-00"),
    name: "Casey",
    about: "A fictional McGill student with a compatible schedule and interests.",
    interests: suggestedInterests(profile, 0),
    looking: profile.looking,
    availability: suggestedAvailability(profile, 0),
    completed: true,
  };
}

export function noHandleDemoStudent(profile: Profile): Profile {
  return {
    ...blankProfile("demo-13"),
    name: "Taylor",
    about: "A fictional McGill student with a compatible schedule and interests.",
    interests: suggestedInterests(profile, 1),
    looking: profile.looking,
    availability: suggestedAvailability(profile, 1),
    completed: true,
  };
}

export function demoInstagramFor(uid: string): string | null {
  if (uid === "demo-00") return "casey.demo.insy440";
  if (uid === "demo-01" || uid === "demo-13") return null;
  const number = Number(uid.match(/^demo-(\d+)$/)?.[1]);
  return Number.isInteger(number) && number >= 2 && number <= 12
    ? `demo_student_${String(number).padStart(2, "0")}`
    : null;
}
