ACADEMIC SUMMIT - attendance protections (geofence + device lock)

ORDER:  1) run sql/01_attendance_protections.sql   2) run sql/02_verify.sql   3) deploy the app files.
Both switches start OFF. Turn them ON in Admin Panel > Attendance protections.
Instant undo: flip the switch OFF. Full undo: sql/99_rollback.sql (+ restore attend-qr.js, delete attend-guard.js).
