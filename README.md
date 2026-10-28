# McGill Matched

An independent INSY 440 student project. Next.js App Router + TypeScript + Tailwind + Firebase Authentication + Cloud Firestore. Deploy on Vercel. Inter is bundled locally. No profile browsing, photos, chat, analytics vendors or non-essential cookies.

## Start here: see the demo first

1. Install Node.js LTS (22 or newer) from https://nodejs.org.
2. Download and unzip this project.
3. Open your group's cloned GitHub repository folder in VS Code. Copy the **contents** of this project into that folder, so `package.json` is directly in the repository, not one folder deeper. Include `.gitignore` and `.env.example` (on Mac, Command + Shift + . reveals hidden files).
4. In VS Code choose **Terminal → New Terminal**. Paste:

```sh
npm install
npm run dev
```

5. Open http://localhost:3000. With all four public Firebase settings absent, it automatically uses demo mode.
6. In GitHub Desktop, write `Add McGill Matched app`, click **Commit to main**, then **Push origin**. Your teammates fetch/pull, install dependencies and run the same commands.

Do not put `node_modules`, `.next`, `.env.local` or service-account JSON in GitHub. `.gitignore` excludes them. Nobody needs to keep their computer on for others to access GitHub. Each person runs their own local copy; Firebase mode uses shared data.

## Deploy the demo on Vercel

1. Sign into https://vercel.com with GitHub.
2. **Add New → Project**, import the repository. One member can own the deployment; teammates collaborate through the GitHub repository.
3. Framework: **Next.js**. Root directory: the folder containing `package.json` (normally the repository root).
4. Leave environment variables blank for the demo. Click **Deploy**.
5. Open the generated link. Subsequent pushes to the connected main branch trigger new production deployments.

Use Vercel for this project rather than GitHub Pages: it needs Next.js server routes for secure Firebase writes. Check current free-plan eligibility and quotas for your intended use; no paid services or billing upgrades are enabled by this code.

## Demo walkthrough

- Join with any syntactically valid McGill address and check the draft agreement box. No email is sent.
- Click **Continue in demo mode**, then **Simulate verified sign-in**.
- Complete the nine-question profile. Instagram can be a fictional handle.
- Matching runs locally against a small simulated batch of three compatible fictional students drawn from twelve fixtures. This keeps the one-person demo useful; the real batch runner considers all eligible profiles.
- Open My matches, read the real shared interests/availability and accept.
- Contact details are still hidden. Click **Demo: simulate their acceptance**, then **You both said yes** to see the fictional contact swap.
- A pass closes the match; there is no rematch flow.
- Browser console logs the demo “You have a match” email. Demo reports and O1/O2/O3 events remain in browser storage.
- To repeat from scratch, clear this site's browser storage. Different browsers have independent demos.
- This mode is a simulation, not identity verification or secure multi-user storage. Use only fictional answers and contacts in it.

## Connect real Firebase data and email sign-in

Do this in a test project before inviting real students. Keep legal/safety/venue placeholders visible until reviewed; configure a monitored support address before real use.

### A. Create the project and web app

1. At https://console.firebase.google.com create a Firebase project. The Spark plan is sufficient for a small test within quotas; Google Analytics is not needed.
2. In Project settings, add a **Web app** named McGill Matched. Copy its web config.
3. Under Authentication / Sign-in method, enable Email/Password and **Email link (passwordless sign-in)**. The app itself never asks for a password.
4. Under Authentication / Settings / Authorized domains, add your Vercel hostname. Add `localhost` in your test project if testing locally. Modern projects do not automatically authorize localhost.
5. Create **Cloud Firestore** in **production/locked mode**. Choose a suitable region after reviewing data-location requirements.
6. In Firestore's Rules tab, replace the rules with the contents of `firestore.rules`, then **Publish**. Do not use test-mode rules.

### B. Set environment variables

Locally, copy `.env.example` to `.env.local` and fill it in. You can use VS Code's file explorer to copy and rename the file. Restart `npm run dev` after changes.

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_FIREBASE_API_KEY | web config `apiKey` |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | web config `authDomain` |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | web config `projectId` |
| NEXT_PUBLIC_FIREBASE_APP_ID | web config `appId` |
| NEXT_PUBLIC_SITE_URL | exact origin, e.g. your Vercel HTTPS URL, with no trailing slash |
| NEXT_PUBLIC_SUPPORT_EMAIL | your team's monitored support email |
| FIREBASE_PROJECT_ID | same Firebase project ID |
| FIREBASE_CLIENT_EMAIL | service account's `client_email` |
| FIREBASE_PRIVATE_KEY | service account's `private_key` |

For local use, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. In Vercel, use the deployed HTTPS origin. Add the variables in Project Settings → Environment Variables, then redeploy. The public config is intentionally exposed to browsers. The last three server variables must remain private. Use only the public web config in `NEXT_PUBLIC_` variables.

For the server credential, Project Settings → Service accounts → Firebase Admin SDK → Generate new private key. Keep the downloaded JSON outside the repository; copy its fields into private environment variables. In `.env.local`, quote the private key and use `\n` for newlines. In Vercel, paste the private key value with its real newlines, without extra surrounding quotes. Never send these credentials in chat or upload them to GitHub. Project IAM controls which teammates may access the console/credentials; GitHub collaboration does not automatically grant Firebase access.

If only some public config fields are filled, the app fails closed with a setup message. If all are blank, it runs in demo mode; check that the demo banner disappears before testing real accounts.

### C. Test real sign-in

Use your own McGill address. Open the latest email link and confirm your address and agreement on the Check your McGill inbox page. This also works in a different browser. Expired/used links go to the specified error page. Return paths are restricted to member pages.

Firebase's documented Spark quota is **5 email-link sign-in emails per day, including resends**. A team of five can use that quickly. Keep routine UI testing in demo mode. Beyond that limit, changing authentication or adding billing is a separate team decision; this project does not do either automatically.

Non-McGill accounts created outside this UI still cannot access app data: the server and Firestore rules both require a verified McGill email. Account creation alone is not acceptance into the app; server registration records the required agreement before data access.

## Database structure (Firestore, no SQL migration)

Firebase replaces the original Supabase choice, so `firestore.rules` plus the server's document creation are the schema/access-control equivalent. There is no SQL migration or Supabase dependency.

| Collection/path | Contents | Who can read |
| --- | --- | --- |
| accounts/{uid} | email and versioned consent | server/team only |
| profiles/{uid} | full private questionnaire/contact fields/current-match pointer | that member only; no collection listing |
| matches/{id} | participants, curated answer snapshots, actual reasons and decisions | participants only; no collection listing |
| matches/{id}/contacts/{uid} | Instagram and opted-in phone snapshot | either participant only after **both** accept |
| events/{id} | O1 sign-up, O2 completed profile, O3 accept/pass | server/team only |
| reports/{uid} | latest report by that member | server/team only |
| mailJobs/{match_uid} | pending notification job | server/team only |

All client writes are denied. Next.js POST routes verify a Firebase ID token with revocation checking, require verified McGill email plus consent registration, validate fields and use Admin SDK transactions. Admin SDK bypasses Firestore rules, so server authorization is independently enforced. A browser cannot set another person's decision or make their own match. No endpoint returns the full profiles collection.

Profile submission is create-only, matching the requested no-edit-settings scope. Edits/deletion are requests to the team. One current match per person remains reserved even after a pass; no automatic rematching. Contacts are never included in match cards, and an unshared phone is not persisted on profile submission.

O1/O2/O3 use deterministic IDs and transaction writes to prevent ordinary retries from double-counting. They are linked to member IDs, not anonymous analytics. Review retention for them along with the other records.

## Run matching by hand (no admin UI)

Run from a trusted computer with `.env.local` server credentials:

```sh
npm run match
npm run notify
```

The matcher scores identical connection preferences by shared-interest count plus overlapping-time-slot count. Each person chooses the highest score; UID ordering breaks ties deterministically. Mutual best pairs are removed and the next round is computed. Scores, reasons, curated cards, phone-opt-in-filtered contacts, profile pointers and email jobs are saved atomically. Re-running skips paired users. There is a 200-profile class-project batch bound.

### Optional isolated test seed

Only in a separate **test** Firebase project, set `ALLOW_FAKE_STUDENT_SEED=true`, then:

```sh
npm run seed
npm run match
npm run notify
```

This creates twelve fictional records and disabled Auth users. It does not send mail to their fabricated addresses. Existing seed profiles are skipped. Never run this against a real student project: fake profiles can otherwise be matched to genuine members. Browser demo mode does not need this script.

## “You have a match” emails

Firebase Authentication sends sign-in emails, not arbitrary match notifications. For real match emails, configure the optional SMTP settings in `.env.local` and run `npm run notify` after matching. Use a provider/account your team is authorized to send from; its free quota is separate from Firebase's. This is a manual script, not a notification page or scheduler.

Without SMTP, real mail jobs remain pending and the script says so. Fictional-user jobs are explicitly logged as demo emails and marked accordingly. Failed sends remain pending for retry. Run one notifier at a time. A process failure between SMTP delivery and marking a job sent can cause a duplicate on retry; this small class-project runner does not promise exactly-once email delivery.

Subject: **You have a match — McGill Matched**

Body: A little common ground is waiting. See why you matched, choose an easy first plan, and decide if you'd like to say hi. Contact details stay private until you both accept. [link to /matches]

## Support and deletion requests

Add your support email before real use. Signed-in reports are stored for the team in Firestore; the form does not send a support email. A new report replaces the previous open report from that same account, keeping the write path bounded. Support staff must monitor reports and the email inbox manually.

When fulfilling a deletion request, verify the requester, remove their account/profile/consent, relevant contacts and match-card snapshots, linked analytics/reports/mail jobs, and their Firebase Auth user. Review effects on the other participant's match and applicable retention before doing this. There is no automated deletion promise or rematch flow.

## Routes

Only the requested page routes are implemented. No separate login or admin page.

- `/` — Home, with `#how-it-works`
- `/join` — Join
- `/join/check-inbox` — Check your McGill inbox (also completes email links)
- `/join/error` — Link expired or not a McGill email
- `/profile` — My profile
- `/profile/saved` — Profile saved
- `/matches` — My matches
- `/matches/[id]` — Your match
- `/matches/[id]/connected` — You both said yes
- `/staying-safe` — Staying safe
- `/questions` — Questions
- `/privacy` — Privacy policy
- `/terms` — Terms of use
- `/contact` — Contact & report a problem
- unknown paths — Page not found

Footer pages stay out of the main navigation; agreement links also appear where needed at signup. Member pages show no member data before the auth check and redirect logged-out users to Join with a safe return path. Data authorization is enforced by Firestore and API checks, independently of that client redirect.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

Seven focused tests cover email restrictions, return-path validation, explainable scores, mutual pairing, exclusion of paired/incomplete profiles, contact opt-in and mutual acceptance, and profile validation. The initial production build passed. A browser preview rendered, but interactive QA was blocked by this execution environment's development-server `uv_resident_set_memory` error. These checks do **not** constitute live Firebase integration testing or an executed Firestore rules emulator suite.

Before inviting real students, test with two verified test accounts and a third unrelated account:

1. A user can get their own profile but cannot get/list other profiles.
2. A participant can get their assigned match card, while an outsider and signed-out client cannot.
3. The contacts document is denied with zero or one acceptance, allowed after two acceptances, and denied after any pass. Navigate directly to the connected URL too.
4. Raw browser writes to profiles, matches, contacts, events, accounts and reports fail; a forged uid/decision fails through the HTTP API.
5. Non-McGill and unverified tokens fail API requests and Firestore reads.
6. Try non-McGill input, empty fields, expired links, network failures, no-match state and unknown URLs. Drafts should survive failed sends.
7. At 360px, test menu, keyboard focus, accordion, form controls and availability grid. Review text contrast and screen-reader labels.
8. Review actual legal/safety copy, consent process, support monitoring, data location/retention, verified venue names and email sending before real data collection.

## Official setup references

- https://firebase.google.com/docs/auth/web/email-link-auth
- https://firebase.google.com/docs/auth/limits
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://vercel.com/docs/git
- https://nextjs.org/docs/app/getting-started/installation
