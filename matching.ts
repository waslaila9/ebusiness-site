import { Profile, Match, cardOf } from "./model";

export function lookingMatches(a: Profile, b: Profile) {
  if (!["friends", "dating", "either"].includes(a.looking)) return false;
  if (!["friends", "dating", "either"].includes(b.looking)) return false;
  return a.looking === "either" || b.looking === "either" || a.looking === b.looking;
}

export function reasons(a: Profile, b: Profile) {
  return {
    sharedInterests: [...new Set(a.interests || [])].filter((x) =>
      (b.interests || []).includes(x),
    ).sort(),
    sharedAvailability: [...new Set(a.availability || [])].filter((x) =>
      (b.availability || []).includes(x),
    ).sort(),
  };
}

export function conversationStarter(sharedInterests: string[]) {
  return sharedInterests.length
    ? `Hey! I noticed we both enjoy ${sharedInterests[0].toLowerCase()}. How did you get into it?`
    : "Hey! What has been the best surprise about McGill so far?";
}

export function firstPlanSuggestion(sharedAvailability: string[]) {
  if (!sharedAvailability.length) return null;
  return `During ${sharedAvailability[0]}, suggest a 20-minute coffee at a public café near campus.`;
}
export function score(a: Profile, b: Profile) {
  if (a.uid === b.uid || !a.completed || !b.completed || !lookingMatches(a, b)) return -1;
  const r = reasons(a, b);
  return r.sharedInterests.length + r.sharedAvailability.length;
}

export function rankCandidates(
  me: Profile,
  candidates: Profile[],
  passed: string[] = [],
) {
  const passedSet = new Set(passed);
  return candidates
    .filter((candidate) =>
      candidate.uid !== me.uid &&
      candidate.completed &&
      !candidate.currentMatch &&
      !passedSet.has(candidate.uid) &&
      score(me, candidate) >= 0,
    )
    .sort((a, b) => {
      const sharedA = reasons(me, a);
      const sharedB = reasons(me, b);
      const scoreDifference =
        score(me, b) - score(me, a);
      if (scoreDifference) return scoreDifference;
      const interestDifference =
        sharedB.sharedInterests.length - sharedA.sharedInterests.length;
      if (interestDifference) return interestDifference;
      const availabilityDifference =
        sharedB.sharedAvailability.length - sharedA.sharedAvailability.length;
      if (availabilityDifference) return availabilityDifference;
      return a.uid.localeCompare(b.uid);
    });
}
// Recompute each remaining person's best choice after mutual pairs are removed.
// Stable UID tie-breaking makes every run deterministic.
export function pairProfiles(profiles: Profile[]): Match[] {
  let remaining = profiles
    .filter((p) => p.completed && !p.currentMatch)
    .sort((a, b) => a.uid.localeCompare(b.uid));
  const result: Match[] = [];
  while (remaining.length > 1) {
    const best = new Map<string, string>();
    for (const a of remaining) {
      const candidates = rankCandidates(a, remaining);
      if (candidates[0]) best.set(a.uid, candidates[0].uid);
    }
    const used = new Set<string>();
    for (const a of remaining) {
      const b = remaining.find((p) => p.uid === best.get(a.uid));
      if (!b || used.has(a.uid) || used.has(b.uid) || best.get(b.uid) !== a.uid)
        continue;
      const members = [a.uid, b.uid].sort();
      result.push({
        id: `${members[0]}_${members[1]}`,
        members,
        cards: { [a.uid]: cardOf(a), [b.uid]: cardOf(b) },
        decisions: { [a.uid]: "pending", [b.uid]: "pending" },
        ...reasons(a, b),
        createdAt: Date.now(),
      });
      used.add(a.uid);
      used.add(b.uid);
    }
    if (!used.size) break;
    remaining = remaining.filter((p) => !used.has(p.uid));
  }
  return result;
}
