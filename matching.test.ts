import { test } from "node:test";
import assert from "node:assert/strict";
import { compatibleDemoStudent, fakeStudents } from "./fake";
import {
  conversationStarter,
  firstPlanSuggestion,
  lookingMatches,
  pairProfiles,
  rankCandidates,
  reasons,
  score,
} from "./matching";
import {
  bothAccepted,
  contactOf,
  isMcGill,
  safeNext,
  validateProfile,
  Profile,
} from "./model";
test("email allowlist requires an exact mail.mcgill.ca address", () => {
  assert.equal(isMcGill("A@mail.mcgill.ca"), true);
  for (const email of [
    "a@mcgill.ca",
    "a@mcgill.ca.evil.com",
    "a@notmcgill.ca",
    "a@@mail.mcgill.ca",
    "@mail.mcgill.ca",
  ])
    assert.equal(isMcGill(email), false);
});
test("post-login return paths cannot become external redirects", () => {
  assert.equal(safeNext("https://evil.com"), "/profile");
  assert.equal(safeNext("//evil.com"), "/profile");
  assert.equal(safeNext("/matches/abc/connected"), "/matches/abc/connected");
});
test("matching uses looking-for compatibility and never duplicates a member", () => {
  const p = fakeStudents(),
    out = pairProfiles(p);
  assert.equal(out.length, 6);
  const seen = new Set();
  for (const m of out) {
    for (const uid of m.members) {
      assert.equal(seen.has(uid), false);
      seen.add(uid);
    }
    const a = p.find((x) => x.uid === m.members[0])!,
      b = p.find((x) => x.uid === m.members[1])!;
    assert.equal(lookingMatches(a, b), true);
    assert.deepEqual(
      {
        sharedInterests: m.sharedInterests,
        sharedAvailability: m.sharedAvailability,
      },
      reasons(a, b),
    );
    assert.equal("phone" in m.cards[a.uid], false);
    assert.equal("instagram" in m.cards[a.uid], false);
  }
});
test("each pair is mutual best with stable tie breaks on its round", () => {
  let remaining = fakeStudents();
  for (const pair of pairProfiles(remaining)) {
    for (const uid of pair.members) {
      const a = remaining.find((p) => p.uid === uid)!;
      const best = remaining
        .filter((b) => score(a, b) >= 0)
        .sort(
          (b, c) => score(a, c) - score(a, b) || b.uid.localeCompare(c.uid),
        )[0];
      assert.equal(pair.members.includes(best.uid), true);
    }
    remaining = remaining.filter((x) => !pair.members.includes(x.uid));
  }
});
test("already paired and incomplete profiles are excluded", () => {
  const p = fakeStudents();
  p[0].currentMatch = "old";
  p[1].completed = false;
  assert.equal(
    pairProfiles(p).some((m) =>
      m.members.some((x) => [p[0].uid, p[1].uid].includes(x)),
    ),
    false,
  );
});
test("phone omitted unless explicitly opted in; both accepts required", () => {
  const p = fakeStudents()[0];
  p.phone = "514-555-0100";
  assert.equal("phone" in contactOf(p), false);
  p.sharePhone = true;
  assert.equal(contactOf(p).phone, p.phone);
  const m = pairProfiles(fakeStudents())[0];
  assert.equal(bothAccepted(m), false);
  m.decisions[m.members[0]] = "accept";
  assert.equal(bothAccepted(m), false);
  m.decisions[m.members[1]] = "accept";
  assert.equal(bothAccepted(m), true);
  m.decisions[m.members[1]] = "pass";
  assert.equal(bothAccepted(m), false);
});
test("validation rejects empty fields and unrecognized availability", () => {
  const p = fakeStudents()[0];
  assert.deepEqual(validateProfile(p), {});
  assert.ok(
    validateProfile({ ...p, name: "", availability: ["Not a time"] } as Profile)
      .availability,
  );
});
test("short profile allows blank bio and rejects missing required answers", () => {
  const p = fakeStudents()[0];
  assert.deepEqual(validateProfile({ ...p, about: "" }), {});
  assert.ok(validateProfile({ ...p, name: "" }).name);
  assert.ok(validateProfile({ ...p, looking: "" }).looking);
  assert.ok(validateProfile({ ...p, interests: [] }).interests);
  assert.ok(validateProfile({ ...p, availability: [] }).availability);
  assert.ok(
    validateProfile({
      ...p,
      interests: [
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
      ],
    } as unknown as Profile).interests,
  );
});

test("either is compatible and ranking uses only interests and availability", () => {
  const p = fakeStudents()[0];
  const friend = fakeStudents()[1];
  const dating = fakeStudents()[4];
  dating.looking = "dating";
  p.looking = "friends";
  friend.looking = "either";
  assert.equal(lookingMatches(p, friend), true);
  assert.equal(lookingMatches(p, dating), false);

  const base = fakeStudents()[0];
  const candidateA = { ...fakeStudents()[1], uid: "demo-a", program: "Science", interests: ["Music"], availability: ["Wednesday Afternoon"] };
  const candidateB = { ...fakeStudents()[2], uid: "demo-b", program: "Arts", interests: ["Music"], availability: ["Wednesday Afternoon"] };
  base.looking = "either";
  base.interests = ["Music"];
  base.availability = ["Wednesday Afternoon"];
  candidateA.looking = "either";
  candidateB.looking = "either";
  assert.equal(score(base, candidateA), score(base, candidateB));
});

test("ranking excludes current, passed, and ineligible profiles with stable UID ties", () => {
  const me = fakeStudents()[0];
  me.uid = "demo-you";
  me.looking = "friends";
  me.interests = ["Music"];
  me.availability = ["Wednesday Afternoon"];
  const tieA = { ...fakeStudents()[1], uid: "demo-a", looking: "friends" as const, interests: ["Music"], availability: ["Wednesday Afternoon"] };
  const tieB = { ...fakeStudents()[2], uid: "demo-b", looking: "friends" as const, interests: ["Music"], availability: ["Wednesday Afternoon"] };
  const passed = { ...tieA, uid: "demo-c", interests: ["Music"], availability: ["Wednesday Afternoon"] };
  const ineligible = { ...tieA, uid: "demo-d", looking: "dating" as const };
  const ranked = rankCandidates(me, [tieB, me, passed, ineligible, tieA], [passed.uid]);
  assert.deepEqual(ranked.map((profile) => profile.uid), ["demo-a", "demo-b"]);
});

test("compatible demo student preserves profile fields and ranks first", () => {
  const me = fakeStudents()[0];
  me.uid = "demo-you";
  me.looking = "either";
  me.interests = ["Music", "Books"];
  me.availability = ["Sunday Evening"];
  const candidate = compatibleDemoStudent(me);
  const ranked = rankCandidates(me, [...fakeStudents(), candidate]);

  assert.equal(candidate.uid, "demo-00");
  assert.equal(lookingMatches(me, candidate), true);
  assert.deepEqual(reasons(me, candidate), {
    sharedInterests: ["Books", "Music"],
    sharedAvailability: ["Sunday Evening"],
  });
  assert.equal(ranked[0].uid, candidate.uid);
});

test("conversation starter and plan use only shared ranking inputs", () => {
  assert.equal(
    conversationStarter(["Music"]),
    "Hey! I noticed we both enjoy music. How did you get into it?",
  );
  assert.equal(
    conversationStarter([]),
    "Hey! What has been the best surprise about McGill so far?",
  );
  assert.equal(
    firstPlanSuggestion(["Wednesday Afternoon"]),
    "During Wednesday Afternoon, suggest a 20-minute coffee at a public café near campus.",
  );
  assert.equal(firstPlanSuggestion([]), null);
});
