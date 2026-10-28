# Get McGill Matched running

1. Install Node.js LTS from https://nodejs.org.
2. Copy this project's contents into your group's cloned GitHub folder. `package.json` should be at the top level. Include the hidden `.gitignore` file (Command + Shift + . on Mac).
3. Open that folder in VS Code, then Terminal → New Terminal.
4. Paste:

```sh
npm install
npm run dev
```

5. Open http://localhost:3000. Demo mode works without Firebase setup.
6. Commit and push using GitHub Desktop.
7. In Vercel, Add New → Project → import your GitHub repository → Deploy.

**Firebase comes next:** follow README.md when you're ready for real shared accounts and data. Do not upload credentials or `.env.local` to GitHub.

For a quick demo: Join → valid McGill-formatted email + draft agreement → Simulate verified sign-in → fill profile → My matches → Accept → Demo: simulate their acceptance → You both said yes.

Demo mode uses fictional students and sends no emails. Real Firebase integration still needs your team's credentials and testing. Firebase Spark currently limits email-link sign-in emails to 5/day, including resends. Safety, legal and venue placeholders need review before real use.
