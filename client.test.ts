import { test } from "node:test";
import assert from "node:assert/strict";
import { blankProfile, Match } from "./model";
import {
  demoCandidateDecision,
  demoLogin,
  demoOtherAccept,
  getCandidates,
  getMatch,
  local,
  recordDemoEvent,
  saveMatchInstagram,
  saveProfile,
} from "./client";
import { demo } from "./firebase";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { dispatchEvent: () => true },
});

async function startDemo() {
  assert.equal(demo, true);
  storage.clear();
  demoLogin("demo.user@mail.mcgill.ca");
  await saveProfile({
    ...blankProfile("demo-you"),
    name: "Alex",
    interests: ["Music"],
    looking: "either",
    availability: ["Sunday Evening"],
    completed: true,
  });
}

test("pass persists and a different suggestion can receive an independent yes", async () => {
  await startDemo();
  assert.deepEqual(
    getCandidates("demo-you").slice(0, 2).map((candidate) => candidate.uid),
    ["demo-00", "demo-13"],
  );
  assert.equal(demoCandidateDecision("demo-you", "demo-00", "pass"), "saved");

  const reloadedCandidates = getCandidates("demo-you");
  assert.equal(reloadedCandidates[0].uid, "demo-13");
  assert.equal(local().candidateDecisions["demo-you:demo-00"], "pass");
  assert.equal(
    demoCandidateDecision("demo-you", "demo-00", "accept"),
    "stale",
  );

  assert.equal(demoCandidateDecision("demo-you", "demo-13", "accept"), "saved");
  const profile = local().profiles.find((item) => item.uid === "demo-you")!;
  const match = await getMatch(profile.currentMatch!, "demo-you");
  assert.ok(match);
  assert.equal(match.decisions["demo-you"], "accept");
  assert.equal(match.decisions["demo-13"], "pending");
  assert.equal(match.instagram?.["demo-13"], undefined);
  assert.equal("phone" in match.cards["demo-you"], false);
  assert.equal("email" in match.cards["demo-you"], false);
  await assert.rejects(
    saveMatchInstagram(match.id, "demo-you", "demo_student_you"),
    /Both people need to say yes/,
  );

  assert.equal(demoOtherAccept(match.id, "demo-you"), true);
  assert.equal(demoOtherAccept(match.id, "demo-you"), true);
  assert.equal(
    local().events.filter(
      (event) => event.type === "mutual_accept" && event.matchId === match.id,
    ).length,
    1,
  );
  await assert.rejects(
    saveMatchInstagram(match.id, "demo-you", "not a valid handle"),
    /valid Instagram username/,
  );
  await saveMatchInstagram(match.id, "demo-you", "@demo_student_you");
  const mutual = (await getMatch(match.id, "demo-you")) as Match;
  assert.equal(mutual.instagram?.["demo-you"], "demo_student_you");
  assert.equal(mutual.instagram?.["demo-13"], undefined);
  assert.equal(getCandidates("demo-you").length, 0);
});

test("mutual yes shares only Casey's fictional handle and survives reload", async () => {
  await startDemo();
  assert.equal(demoCandidateDecision("demo-you", "demo-00", "accept"), "saved");
  const matchId = local().profiles.find((item) => item.uid === "demo-you")!
    .currentMatch!;
  const pending = (await getMatch(matchId, "demo-you")) as Match;
  assert.equal(pending.instagram?.["demo-00"], undefined);
  assert.equal(demoOtherAccept(matchId, "demo-you"), true);
  await saveMatchInstagram(matchId, "demo-you", "demo_ayden");

  const restored = (await getMatch(matchId, "demo-you")) as Match;
  assert.equal(restored.decisions["demo-you"], "accept");
  assert.equal(restored.decisions["demo-00"], "accept");
  assert.equal(restored.instagram?.["demo-00"], "casey.demo.insy440");
  assert.equal(restored.instagram?.["demo-you"], "demo_ayden");
});

test("editing demo answers reuses Casey and Taylor instead of adding students", async () => {
  await startDemo();
  const startingProfiles = local().profiles.length;
  const initialCasey = getCandidates("demo-you").find(
    (candidate) => candidate.uid === "demo-00",
  )!;
  const profile = local().profiles.find((item) => item.uid === "demo-you")!;
  await saveProfile({
    ...profile,
    interests: ["Art", "Gaming"],
    availability: ["Saturday Morning"],
  });

  const updatedCandidates = getCandidates("demo-you");
  const updatedCasey = updatedCandidates.find(
    (candidate) => candidate.uid === "demo-00",
  )!;
  const updatedTaylor = updatedCandidates.find(
    (candidate) => candidate.uid === "demo-13",
  )!;
  assert.equal(local().profiles.length, startingProfiles);
  assert.equal(
    local().profiles.filter((item) => item.uid === "demo-you").length,
    1,
  );
  assert.equal(updatedCasey.name, "Casey");
  assert.equal(updatedTaylor.name, "Taylor");
  assert.notDeepEqual(updatedCasey.interests, initialCasey.interests);
  assert.deepEqual(updatedCasey.availability, ["Saturday Morning"]);
});

test("legacy demo profile contact fields are removed during storage migration", () => {
  storage.clear();
  storage.set(
    "mcgill-matched-demo-v1",
    JSON.stringify({
      user: null,
      profiles: [
        {
          ...blankProfile("demo-you"),
          name: "Alex",
          instagram: "old_handle",
          phone: "5145550100",
          sharePhone: true,
          email: "private@mail.mcgill.ca",
        },
      ],
      matches: [
        {
          id: "demo-you_demo-00",
          members: ["demo-you", "demo-00"],
          cards: {},
          decisions: { "demo-you": "accept", "demo-00": "pending" },
          sharedInterests: [],
          sharedAvailability: [],
          instagram: { "demo-00": "must_not_show" },
          createdAt: 1,
        },
      ],
      events: [
        { type: "O1", at: 1 },
        { type: "O2", at: 2 },
        { type: "O2-update", at: 3 },
        { type: "join_error", at: 4 },
        { type: "join_error:non_mcgill_email", at: 5 },
        { type: "candidate-yes", at: 6 },
      ],
      reports: [],
      candidateDecisions: {},
    }),
  );
  const profile = local().profiles[0];
  const pendingMatch = local().matches[0];
  assert.equal("instagram" in profile, false);
  assert.equal("phone" in profile, false);
  assert.equal("sharePhone" in profile, false);
  assert.equal("email" in profile, false);
  assert.equal(pendingMatch.instagram, undefined);
  assert.equal(
    JSON.stringify(JSON.parse(storage.get("mcgill-matched-demo-v1")!))
      .includes("5145550100"),
    false,
  );
  assert.equal(storage.get("mcgill-matched-demo-v1")!.includes("must_not_show"), false);
  assert.deepEqual(
    local().events.map((event) => event.type),
    ["join_error", "demo_internal:candidate_yes"],
  );
  assert.equal(local().events[0].reason, "non_mcgill_email");
  assert.equal(local().events[1].category, "demo_internal");
});

test("demo join errors keep a single event type and a structured reason", () => {
  storage.clear();
  recordDemoEvent("join_error", { reason: "consent_unticked" });
  assert.deepEqual(local().events.map(({ type, reason }) => ({ type, reason })), [
    { type: "join_error", reason: "consent_unticked" },
  ]);
});
