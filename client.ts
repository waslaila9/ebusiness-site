"use client";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, demo } from "./firebase";
import {
  Profile,
  Match,
  User,
  Contact,
  blankProfile,
  bothAccepted,
} from "./model";
import { fakeStudents } from "./fake";
import { pairProfiles, score } from "./matching";
const key = "mcgill-matched-demo-v1";
type State = {
  user: User | null;
  profiles: Profile[];
  matches: Match[];
  events: { type: string; at: number }[];
  reports: string[];
  candidateDecisions: Record<string, "accept" | "pass">;
};
export function local(): State {
  const raw = localStorage.getItem(key);
  if (raw) {
    const state = JSON.parse(raw) as Partial<State>;
    return {
      ...state,
      profiles: (state.profiles || []).map((profile) => ({
        ...blankProfile(profile.uid),
        ...profile,
      })),
      candidateDecisions: state.candidateDecisions || {},
    } as State;
  }
  return {
    user: null,
    profiles: fakeStudents(),
    matches: [],
    events: [],
    reports: [],
    candidateDecisions: {},
  };
}
export function write(s: State) {
  localStorage.setItem(key, JSON.stringify(s));
  window.dispatchEvent(new Event("demo-auth"));
}
export function demoLogin(email: string) {
  const s = local();
  s.user = { uid: "demo-you", email };
  if (!s.events.some((e) => e.type === "O1"))
    s.events.push({ type: "O1", at: Date.now() });
  write(s);
}
export async function request(route: string, data: unknown) {
  const token = await auth?.currentUser?.getIdToken();
  const r = await fetch(`/api/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const out = await r.json();
  if (!r.ok) throw new Error(out.error || "Could not save. Try again.");
  return out;
}
export async function getProfile(uid: string): Promise<Profile | null> {
  if (demo) return local().profiles.find((p) => p.uid === uid) || null;
  const snap = await getDoc(doc(db!, "profiles", uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}
export async function getCandidates(uid: string): Promise<Profile[]> {
  if (!demo) return [];
  const s = local();
  const me = s.profiles.find((profile) => profile.uid === uid);
  if (!me) return [];
  return s.profiles.filter(
    (profile) =>
      profile.uid !== uid &&
      profile.completed &&
      s.candidateDecisions[profile.uid] === undefined &&
      score(me, profile) >= 0,
  );
}
export function demoCandidateDecision(
  uid: string,
  candidateUid: string,
  decision: "accept" | "pass",
) {
  if (!demo) return;
  const s = local();
  s.candidateDecisions[candidateUid] = decision;
  s.events.push({
    type: decision === "accept" ? "candidate-yes" : "candidate-pass",
    at: Date.now(),
  });
  write(s);
}
export function resetDemoCandidates() {
  if (!demo) return;
  const s = local();
  s.candidateDecisions = {};
  write(s);
}
export async function saveProfile(p: Profile) {
  if (!demo) return request("profile", p);
  const s = local();
  const existing = s.profiles.find((x) => x.uid === p.uid);
  if (existing) {
    Object.assign(existing, {
      ...p,
      phone: p.sharePhone ? p.phone : "",
      completed: true,
      currentMatch: existing.currentMatch,
    });
    s.events.push({ type: "O2-update", at: Date.now() });
    write(s);
    return;
  }
  s.profiles.push({
    ...p,
    phone: p.sharePhone ? p.phone : "",
    completed: true,
  });
  const matches = pairProfiles([
    s.profiles.find((x) => x.uid === p.uid)!,
    ...s.profiles
      .filter(
        (x) => x.uid !== p.uid && x.looking === p.looking && !x.currentMatch,
      )
      .slice(0, 3),
  ]);
  for (const m of matches) {
    s.matches.push(m);
    m.members.forEach((uid) => {
      s.profiles.find((x) => x.uid === uid)!.currentMatch = m.id;
    });
    console.info(
      "[DEMO EMAIL] You have a match — open My matches. No email was sent.",
    );
  }
  s.events.push({ type: "O2", at: Date.now() });
  write(s);
}
export async function getMatch(id: string, uid: string): Promise<Match | null> {
  if (demo)
    return (
      local().matches.find((m) => m.id === id && m.members.includes(uid)) ||
      null
    );
  const snap = await getDoc(doc(db!, "matches", id));
  return snap.exists() ? ({ ...snap.data(), id } as Match) : null;
}
export async function decide(
  id: string,
  uid: string,
  decision: "accept" | "pass",
) {
  if (!demo) return request("decision", { id, decision });
  const s = local();
  const m = s.matches.find((x) => x.id === id && x.members.includes(uid));
  if (!m) throw new Error("Match not found.");
  if (m.decisions[uid] !== "pending") throw new Error("You already decided.");
  m.decisions[uid] = decision;
  s.events.push({ type: "O3", at: Date.now() });
  write(s);
}
export async function contacts(m: Match): Promise<Contact[]> {
  if (!bothAccepted(m)) throw new Error("Both people need to accept first.");
  if (demo)
    return local()
      .profiles.filter((p) => m.members.includes(p.uid))
      .map((p) => ({
        name: p.name,
        instagram: p.instagram,
        ...(p.sharePhone ? { phone: p.phone } : {}),
      }));
  return Promise.all(
    m.members.map(async (uid) => {
      const s = await getDoc(doc(db!, "matches", m.id, "contacts", uid));
      if (!s.exists()) throw new Error("Contact details are unavailable.");
      return s.data() as Contact;
    }),
  );
}
export function demoOtherAccept(id: string, uid: string) {
  const s = local(),
    m = s.matches.find((x) => x.id === id);
  if (!m || m.decisions[uid] !== "accept") return;
  m.members
    .filter((x) => x !== uid)
    .forEach((x) => (m.decisions[x] = "accept"));
  write(s);
}
export async function report(message: string) {
  if (!demo) return request("report", { message });
  const s = local();
  s.reports.push(message);
  write(s);
}
