import { Profile, blankProfile } from "./model";

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
    interests: i % 2 ? ["Coffee walks", "Art", "Movies"] : ["Coffee walks", "Music", "Books"],
    values: ["Kindness", "Curiosity"],
    looking: (["friends", "dating", "either"] as const)[Math.floor(i / 4)],
    availability: [
      "Wednesday Afternoon",
      "Friday Evening",
      ...(i % 2 ? ["Saturday Morning"] : ["Monday Morning"]),
    ],
    instagram: `fake_student_${i + 1}`,
    sharePhone: false,
    phone: "",
    completed: true,
  }));
}

export function compatibleDemoStudent(profile: Profile): Profile {
  return {
    ...blankProfile("demo-00"),
    name: "Casey",
    about: "A fictional McGill student with a compatible schedule and interests.",
    interests: [...(profile.interests || [])],
    looking: profile.looking,
    availability: [...(profile.availability || [])],
    instagram: "fake_casey",
    completed: true,
  };
}
