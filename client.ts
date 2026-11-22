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
  validateProfile,
} from "./model";
import { compatibleDemoStudent, fakeStudents } from "./fake";
import { rankCandidates, reasons, lookingMatches } from "./matching";
const key = "mcgill-matched-demo-v1";
export type DemoScenario = "compatible" | "waiting" | "no-eligible";
type State = {
  user: User | null;
  profiles: Profile[];
  matches: Match[];
  events: { type: string; at: number }[];
  reports: string[];
  candidateDecisions: Record<string, "accept" | "pass">;
  demoScenario?: DemoScenario;
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
export function recordDemoEvent(type: string) {
  if (!demo) return;
  const s = local();
  s.events.push({ type, at: Date.now() });
  write(s);
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
  if (s.demoScenario === "waiting") return [];
  if (s.demoScenario === "no-eligible") return [];
  const decided = Object.keys(s.candidateDecisions);
  return rankCandidates(
    me,
    [
      compatibleDemoStudent(me),
      ...s.profiles.filter((profile) => profile.uid !== "demo-00"),
    ],
    decided,
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
  if (decision === "accept") {
    const me = s.profiles.find((profile) => profile.uid === uid);
    let candidate = s.profiles.find((profile) => profile.uid === candidateUid);
    if (candidateUid === "demo-00" && me) {
      candidate = compatibleDemoStudent(me);
      const existingIndex = s.profiles.findIndex(
        (profile) => profile.uid === candidateUid,
      );
      if (existingIndex < 0) s.profiles.push(candidate);
      else s.profiles[existingIndex] = candidate;
    }
    if (me && candidate && lookingMatches(me, candidate)) {
      const members = [uid, candidateUid].sort();
      const id = `${members[0]}_${members[1]}`;
      let match = s.matches.find((item) => item.id === id);
      if (!match) {
        match = {
          id,
          members,
          cards: {
            [me.uid]: {
              name: me.name,
              about: me.about,
              interests: me.interests,
              availability: me.availability,
              looking: me.looking,
            },
            [candidate.uid]: {
              name: candidate.name,
              about: candidate.about,
              interests: candidate.interests,
              availability: candidate.availability,
              looking: candidate.looking,
            },
          },
          decisions: {
            [me.uid]: "accept",
            [candidate.uid]: "pending",
          },
          ...reasons(me, candidate),
          createdAt: Date.now(),
        };
        s.matches.push(match);
        me.currentMatch = id;
        candidate.currentMatch = id;
      }
    }
  }
  write(s);
}
export function resetDemoCandidates() {
  if (!demo) return;
  const s = local();
  s.candidateDecisions = {};
  write(s);
}
export function getDemoScenario(): DemoScenario {
  return demo ? (local().demoScenario || "compatible") : "compatible";
}
export function setDemoScenario(scenario: DemoScenario) {
  if (!demo) return;
  const s = local();
  s.demoScenario = scenario;
  s.matches = [];
  s.candidateDecisions = {};
  s.profiles.forEach((profile) => {
    profile.currentMatch = null;
  });
  s.events.push({ type: `demo-scenario-${scenario}`, at: Date.now() });
  write(s);
}
export async function saveProfile(p: Profile) {
  if (!demo) return request("profile", p);
  const errors = validateProfile(p);
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors)[0]);
  }
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
  if (bothAccepted(m) && !s.events.some((event) => event.type === "mutual_accept")) {
    s.events.push({ type: "mutual_accept", at: Date.now() });
  }
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
  if (bothAccepted(m) && !s.events.some((event) => event.type === "mutual_accept")) {
    s.events.push({ type: "mutual_accept", at: Date.now() });
  }
  write(s);
}
export async function report(message: string) {
  if (!demo) return request("report", { message });
  const s = local();
  s.reports.push(message);
  write(s);
}
