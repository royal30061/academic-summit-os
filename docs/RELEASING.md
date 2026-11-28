# Releasing

## Before you ship
```
node tests/run.js      # every check must pass
node tools/smoke.js    # every script tag points at a real file, every file parses
```

## Ship (Termux, from the repo folder)
```
git checkout master
node <path>/release.js          # merges the prepared branch, asks you to type DEPLOY, then pushes master + the next tag
```
- Pushing `master` publishes the website (Vercel, about a minute).
- Pushing the tag builds the release APK (GitHub > Actions). Install it only after the run is green.
- Nothing is pushed until you type `DEPLOY`. Anything else undoes the local merge.

## Database changes
Run any new `sql/NN_*.sql` in the Supabase SQL editor **before** testing the app against it. Files are numbered and re-runnable.

## Go back
- Website problem: `git revert <merge commit>` on master and push; Vercel redeploys.
- Bad APK: push a new tag from the reverted master. Do not delete or reuse old tags.

## After every release, a 5-minute phone check
Student: sign in, Study hub opens, open a course, save notes, make questions, answer one; Attend screen shows the code box, QR and Check in nearby.
Lecturer: start a class with the code; the Nearby check-in switch is there; Level/Topic stay empty unless typed; a second course can be chosen.
Web and app: hard-refresh the web app; confirm the splash shows only the animated "Academic Summit" screen.

## Rules that keep it maintainable
- One owner per feature (see `ARCHITECTURE.md`). Fix it in its owner; do not stack another patch on top.
- Anything that touches attendance tables or functions is called out in the changelog.
- Keep user wording plain. Technical detail goes to the console or a support field, not a toast.
