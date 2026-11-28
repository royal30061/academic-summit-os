# Changelog

## Final build v4
- **Study Hub is now a working area, not just a front.** Each course has four panels: Notes (paste and save), Practice (review due questions, or make new ones from the notes), Plan (topics), Progress (exposure, recall, mastery from real records). It uses the same stored questions as the classic screens. PDF upload and timed sessions still open the classic screens.
- **Hub fixes:** the classic Study screen no longer paints over the hub; hand-offs check they opened and say why if not; "(manual)" course titles hidden; Profile "Study engine" opens the hub.
- **Lecturer:** the switch is now "Nearby check-in" (plain wording). Nearby check-in saves correctly (database client was not being found). The class-range picker is hidden (the range rule itself is unchanged).
- **Course-code bug fixed at the source:** `leccourse.js` v2 wrote the remembered course into every box and dropdown on the lecturer page every 1.2 seconds. v3 only replaces the baked POS204 example and pre-fills an empty Course box once. A field guard in `lecconsole.js` is a second safety net.
- **Class start:** no hidden "POS 204" default (it asks for a course); the live class no longer re-fills Course, Topic and Level on every redraw.
- **Splash:** the old static mountain-and-bar screen no longer shows; only the animated splash does.
- **Maintenance kit:** `docs/`, `tests/` (`node tests/run.js`), `tools/smoke.js`.
- Touches attendance tables or functions: **no** (SQL 18 from the earlier release is unchanged).

## Earlier (v27.10 and after)
- Nearby check-in (Bluetooth) added alongside the 5-digit code; lecturer and course stored on every attendance row (SQL 18).
- Matric number at sign-up; QR button on the Attend screen; Home cards dim while the Attend tab glows.
- Exam clearance v2 (eligible / ineligible, approved-only export, saved lists).
