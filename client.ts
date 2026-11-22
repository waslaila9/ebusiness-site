"use client";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, demo } from "./firebase";
import {
  Profile,
  Match,
  User,
  blankProfile,
  bothAccepted,
  validateProfile,
} from "./model";
import {
  compatibleDemoStudent,
  demoInstagramFor,
  fakeStudents,
  noHandleDemoStudent,
} from "./fake";
import {
  applyMatchDecision,
  rankCandidates,
  reasons,
  lookingMatches,
} from "./matching";
const key = "mcgill-matched-demo-v1";
export type DemoScenario = "compatible" | "waiting" | "no-eligible";
type State = {
  user: User | null;
  profiles: Profile[];
  matches: Match[];
  events: {
    type: string;
    at: number;
    matchId?: string;
    candidateUid?: string;
  }[];
  reports: string[];
  candidateDecisions: Record<string, "accept" | "pass">;
  demoScenario?: DemoScenario;
};
function savedProfile(profile: Profile): Profile {
  const clean = {
    ...profile,
  } as Profile & {
    instagram?: string;
    phone?: string;
    sharePhone?: boolean;
    email?: string;
  };
  delete clean.instagram;
  delete clean.phone;
  delete clean.sharePhone;
  delete clean.email;
  return { ...blankProfile(profile.uid), ...clean };
}
function savedMatch(match: Match): Match {
  const clean = { ...match };
  if (!clean.decisions || !bothAccepted(clean)) delete clean.instagram;
  return clean;
}
const candidateDecisionKey = (uid: string, candidateUid: string) =>
  `${uid}:${candidateUid}`;
export function local(): State {
  const raw = localStorage.getItem(key);
  if (raw) {
    const state = JSON.parse(raw) as Partial<State>;
    const normalized = {
      ...state,
      profiles: (state.profiles || []).map(savedProfile),
      matches: (state.matches || []).map(savedMatch),
      events: state.events || [],
      reports: state.reports || [],
      candidateDecisions: state.candidateDecisions || {},
    } as State;
    const migrated = JSON.stringify(normalized);
    if (migrated !== raw) localStorage.setItem(key, migrated);
    return normalized;
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
  return snap.exists() ? savedProfile(snap.data() as Profile) : null;
}
export function getCandidates(uid: string): Profile[] {
  if (!demo) return [];
  const s = local();
  const me = s.profiles.find((profile) => profile.uid === uid);
  if (!me || me.currentMatch) return [];
  if (s.demoScenario === "waiting") return [];
  if (s.demoScenario === "no-eligible") return [];
  const decided = Object.entries(s.candidateDecisions)
    .filter(([key]) =>
      key.startsWith(`${uid}:`) ||
      (uid === "demo-you" && !key.includes(":")),
    )
    .map(([key]) => key.slice(key.lastIndexOf(":") + 1));
  return rankCandidates(
    me,
    [
      compatibleDemoStudent(me),
      noHandleDemoStudent(me),
      ...s.profiles.filter(
        (profile) => !["demo-00", "demo-13"].includes(profile.uid),
      ),
    ],
    decided,
  );
}
export function demoCandidateDecision(
  uid: string,
  candidateUid: string,
  decision: "accept" | "pass",
): "saved" | "stale" | "already-decided" {
  if (!demo) return "stale";
  const s = local();
  const me = s.profiles.find((profile) => profile.uid === uid);
  const decisionKey = candidateDecisionKey(uid, candidateUid);
  if (
    !me?.completed ||
    me.currentMatch ||
    getCandidates(uid)[0]?.uid !== candidateUid
  )
    return "stale";
  if (
    s.candidateDecisions[decisionKey] ||
    (uid === "demo-you" && s.candidateDecisions[candidateUid])
  )
    return "already-decided";

  const candidate =
    candidateUid === "demo-00"
      ? compatibleDemoStudent(me)
      : candidateUid === "demo-13"
        ? noHandleDemoStudent(me)
      : s.profiles.find((profile) => profile.uid === candidateUid);
  if (!candidate || !lookingMatches(me, candidate)) return "stale";
  const members = [uid, candidateUid].sort();
  const id = `${members[0]}_${members[1]}`;
  if (decision === "accept" && s.matches.some((item) => item.id === id))
    return "already-decided";

  s.candidateDecisions[decisionKey] = decision;
  s.events.push({
    type: decision === "accept" ? "candidate-yes" : "candidate-pass",
    candidateUid,
    at: Date.now(),
  });
  if (decision === "accept") {
    const existingIndex = s.profiles.findIndex(
      (profile) => profile.uid === candidateUid,
    );
    if (existingIndex < 0) s.profiles.push(candidate);
    else s.profiles[existingIndex] = candidate;
    const match: Match = {
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
  write(s);
  return "saved";
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
  if (!demo) return request("profile", savedProfile(p));
  const errors = validateProfile(p);
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors)[0]);
  }
  const s = local();
  const cleanProfile = savedProfile(p);
  const existing = s.profiles.find((x) => x.uid === p.uid);
  if (existing) {
    Object.assign(existing, {
      ...cleanProfile,
      completed: true,
      currentMatch: existing.currentMatch,
    });
    s.events.push({ type: "O2-update", at: Date.now() });
    write(s);
    return;
  }
  s.profiles.push({
    ...cleanProfile,
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
  const wasMutual = bothAccepted(m);
  const result = applyMatchDecision(m, uid, decision);
  if (result !== "saved")
    throw new Error(
      result === "closed"
        ? "This match is already closed."
        : "You already decided.",
    );
  s.events.push({ type: "O3", at: Date.now() });
  if (
    !wasMutual &&
    bothAccepted(m) &&
    !s.events.some(
      (event) => event.type === "mutual_accept" && event.matchId === m.id,
    )
  )
    s.events.push({ type: "mutual_accept", matchId: m.id, at: Date.now() });
  write(s);
  return;
}
export async function saveMatchInstagram(
  id: string,
  uid: string,
  input: string,
) {
  const instagram = input.trim().replace(/^@/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram))
    throw new Error("Enter a valid Instagram username (letters, numbers, . or _).");
  if (!demo) return request("instagram", { id, instagram });
  const s = local();
  const match = s.matches.find((item) => item.id === id);
  if (!match || !match.members.includes(uid))
    throw new Error("Match not found.");
  if (!bothAccepted(match))
    throw new Error("Both people need to say yes before sharing Instagram.");
  match.instagram ||= {};
  if (instagram) match.instagram[uid] = instagram;
  else delete match.instagram[uid];
  write(s);
}
export function demoOtherAccept(id: string, uid: string): boolean {
  if (!demo) return false;
  const s = local();
  const match = s.matches.find((item) => item.id === id);
  if (!match || match.decisions[uid] !== "accept") return false;
  const other = match.members.find((member) => member !== uid);
  if (!other || match.decisions[other] !== "pending") return false;
  const result = applyMatchDecision(match, other, "accept");
  if (result !== "saved") return false;
  const instagram = demoInstagramFor(other);
  if (instagram) {
    match.instagram ||= {};
    match.instagram[other] = instagram;
  }
  if (
    bothAccepted(match) &&
    !s.events.some(
      (event) => event.type === "mutual_accept" && event.matchId === match.id,
    )
  )
    s.events.push({ type: "mutual_accept", matchId: match.id, at: Date.now() });
  write(s);
  return true;
}
export async function report(message: string) {
  if (!demo) return request("report", { message });
  const s = local();
  s.reports.push(message);
  write(s);
}
