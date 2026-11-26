# Security Specification — Asrama SMK Salaping 2027

## 1. Data Invariants
1. **Identity Integrity**: Every document in `/applications/{id}`, `/applicationStatuses/{id}`, `/kpIndex/{kpHash}`, and `/applicationFiles/{id}` must record `applicantUid == request.auth.uid` on creation.
2. **PII Isolation**: `/applications` and `/applicationFiles` contain PII (names, IC numbers, guardian names, phone numbers, residential addresses, medical form scans). Only the document owner (`applicantUid == request.auth.uid`) or a verified Warden/Admin (`isAdmin()`) may read or list them.
3. **Non-PII Public Status Lookup**: `/applicationStatuses` and `/kpIndex` contain zero PII and permit only single-document `get` lookups (no unauthenticated `list` scraping).
4. **State Shortcutting Prevention**: Non-admin applicants creating a new application must set `status == 'Dihantar'` and cannot self-assign `dorm`. Only Wardens/Admins may transition statuses to `Disemak`, `Diluluskan`, or `Ditolak` and assign `dorm`.
5. **Atomicity Guarantee**: Creating an application must atomically create its matching `/applicationStatuses/{applicationId}` record via `existsAfter()`.
6. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`, and `createdAt` and `applicantUid` remain immutable on update.
7. **Volumetric Bounds**: Every string field has strict `.size()` bounds; `dataUrl` in `/applicationFiles` is capped at 450,000 characters; `fotoDataUrl` in `/applications` is capped at 220,000 characters; `dorm` is capped at 30 characters; document IDs match `^[a-zA-Z0-9_\\-]+$`.

## 2. Adversarial "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating `/applications/A999` with `request.auth == null`.
2. **Unverified Email Spoof**: Creating or reading as admin with `email: "kodutedm@gmail.com"` and `email_verified: false`.
3. **Identity Spoofing**: Signed-in user creating `/applications/A999` with `applicantUid: "other-uid"`.
4. **State Shortcutting**: Non-admin creating `/applications/A999` with `status: "Diluluskan"` or `dorm: "1A"`.
5. **Shadow / Ghost Field Injection**: Creating `/applications/A999` with extra field `isAdminApproved: true`.
6. **Self-Assigned Admin**: Regular user creating `/admins/{uid}` to elevate privileges.
7. **PII Cross-User Read**: Signed-in User B calling `get` or `list` on User A's `/applications/{id}`.
8. **Blanket List Query**: Signed-in non-admin calling `list` on `/applications` without filtering `applicantUid == request.auth.uid`.
9. **ID Poisoning**: Creating `/applications/` with a 500-character ID or special characters `../admin`.
10. **Client Timestamp Forgery**: Creating `/applications/A999` with `createdAt` backdated instead of `request.time`.
11. **Applicant Status & Dorm Tampering**: Owner updating their own `/applications/A999` to change `status` or `dorm`.
12. **Terminal State Edit**: Owner editing `nama` or `jarak` after warden changed status to `Diluluskan`.
