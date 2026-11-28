# Academic Summit: how the app is put together

Read this first when you come back to the code after a long break. It only states things that were checked in the source.

## The shape of it
- **No build step.** Files are served exactly as written. `index.html` loads many `<script>` files in a fixed order; later files add to or wrap what earlier ones defined.
- **Website:** Vercel publishes `master`. **Android app:** GitHub Actions builds an APK (Capacitor). Only a pushed *tag* publishes a release APK.
- **Backend:** Supabase (login, tables, SQL functions). The app never holds a service-role key. **Brevo** is used only for password-reset email.
- **Shared names on the page** (global, not on `window` unless stated): `U` (the user's data), `V` (student screens), `LECTURER_VIEWS` (lecturer screens), `go(view)` (switch screen, wrapped many times), `save()` (persist `U`), `sb` (database client).

## Gotchas that have already cost days
1. **`sb` is a `const`, not `window.sb`.** Code in other files must write `sb`, never `window.sb`. (Broke Nearby check-in saves until ble.js v4.)
2. **`studyhub.js` repaints itself 90 ms after the bottom Study button is tapped.** Anything that wants to own the Study tab has to switch that off (`__sh.setActive(false)`). The hub does this and re-checks.
3. **Overlays are order-sensitive.** Each `go()` / `V.x` wrapper calls the one before it. Load a file twice and it wraps twice, so every overlay starts with a guard like `if (window.__asX) return;`.
4. **The question engine is `window.StudyCore`** (file `study-core.js`, pure logic, no screens). Older screens alias it as `SC` privately; other files must use `StudyCore`.
5. **Phones cache scripts.** Every script tag carries `?v=N`. Change the file, raise N, or devices keep the old copy.
6. **Splash:** `splash.js` draws the animated "Academic Summit" screen. The old static `#splash` block in `index.html` is kept (other code removes it) but its contents are hidden by a small style in `<head>`.

## Who owns what (one owner per feature)
| Feature | File |
|---|---|
| Study Hub (hub, course panels, notes, practice, plan, progress) | `studyhub2.js` |
| Classic Study workspace, timed sessions, planner | `studyhub.js` |
| PDF/notes engine, reading sections, spaced review screens | `acad2.js` + `study-core.js` |
| Attendance protections, planner, exports, exam clearance, student record | `attendance-upgrade.js` (several modules in one file) |
| Lecturer console additions (Nearby check-in switch, hidden range picker, field guard) | `lecconsole.js` |
| Nearby check-in (Bluetooth) logic | `ble.js` + `android/.../BleProximityPlugin.java` |
| Lecturer course memory (class-start form) | `leccourse.js` |
| Sign-up / sign-in | `auth.js` |
| Teaching profile, roster, lecturer settings | `lecturer.js` |

## Where the data lives
- Course notes: `localStorage` key `as_mat_<uid>` -> `{ "<course code>": { text, words, added } }` (phone only).
- Review questions: `U.study.items` (`course, q, a, phase, due, weak, done`). Created and advanced by `study-core.js`, used by both the classic screens and the hub.
- Topics / study log: inside `studyhub.js` state (`__sh.state()`).
- Preferences: `as_lec_ble` (Nearby check-in on/off), `as_lec_course_<uid>` (last course used), `as_ble_queue` (marks waiting for a connection).

## SQL files (run in the Supabase SQL editor, in number order; all safe to re-run)
01 attendance protections, 03 minimum class size, 04 student attendance report, 05 in-range flag, 06 class notices, 08 cohort courses, 09 hardening (3 tries a minute), 09a range tuning, 10 security audit, 11 admin team, 12 privilege cleanup, 13 onboarding approval, 14 soft range check, 15 first-visit flags and exam clearance, 16 matric guard, 17 rep re-issue gate, 18 lecturer binding and Nearby check-in. Never reuse a number.

## Adding a new overlay (checklist)
1. New file, header comment saying what it owns and why, `if (window.__asYourThing) return;` at the top.
2. Only wrap functions you need; call the previous version.
3. Plain wording for users (no developer terms), SVG icons, no emoji, works in light and dark.
4. Add the script tag **last** in `index.html` with `?v=1`.
5. Add a test in `tests/` and run `node tests/run.js` and `node tools/smoke.js`.
6. Add a line to `docs/CHANGELOG.md`.
