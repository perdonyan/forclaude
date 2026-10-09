# Single-server LAN database

The application server owns a SQLite database on its local disk. LAN browsers access it through authenticated application requests; never expose the database file through a network share. Node.js 24.16 or later is required. No separate database service is needed.

## Before switching an existing server

1. Stop the existing application and copy its actual `data/fleet-data.json` to a safe location. Git branches do not back up runtime data. Keep this copy and the previous application version for rollback.
2. Switch to this branch and install/build dependencies on the application server or Codespace. Do not change your production server until the pull request checks pass.
3. Copy `.env.example` to `.env`. Set `NODE_ENV=production`, `JWT_SECRET` to a private random value of at least 32 characters, and an absolute `DATA_DIR` outside the checkout. Set `LEGACY_DATA_FILE` to the safe copy of the CURRENT server JSON, not an older Git snapshot.
4. Set `BACKUP_DIR` to a separate disk or secured LAN backup location. The live SQLite file must remain on the server's local disk; the backup destination can be a network location. Set `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters) only when no administrator hash exists.
5. Run `npm test`, `npm run lint`, `npm run build`, then `npm start`. Review the migration output and verify record counts, logins, handovers, attachments and a restored backup before staff resume work.

The first start creates a private legacy JSON archive and imports each collection in one transaction. An initialized database is never re-imported from JSON on restart. Empty and missing legacy operational collections stay empty. Malformed records stop migration; the source file is unchanged. Legacy SVG signatures/photos are preserved as private files served with a restrictive sandbox policy.

Duplicate personnel identity fields do not cause records to be discarded or invented. ALL personnel sharing that identity are preserved with `identityConflict=true` and suspended. An administrator must correct the Qatar ID through the personnel editor, then explicitly reactivate the account. The committed snapshot contains a Qatar ID conflict between `off-1605` and `off-1789`; your actual server may differ. Correct duplicate employee IDs directly in a verified legacy copy before first import if applicable; the current editor does not edit employee IDs.

Runtime state is stored under `DATA_DIR`: `fleet.sqlite`, WAL files, private attachments, and the pre-migration archive. The tracked `data/fleet-data.json` is now a read-only legacy import source; the app no longer writes it. Removing that old snapshot and cleaning sensitive Git history are separate administrative tasks after successful migration. Runtime files and backups are ignored by Git.

## Data and access rules

- SQLite uses WAL, full synchronous durability, foreign keys and a five-second busy timeout.
- Each operational collection has a table with stable IDs, record versions, searchable statuses and soft deletion. Report-specific fields remain JSON payloads so existing forms remain compatible. Accounts/serials/report references have unique indexes. Role permissions, record relationships, attachment references and security sessions have relational tables.
- Browser changes are reduced to record operations and batched into a transaction. The transaction also writes its audit event. A conflicting version rejects the whole operation and reloads the latest data; the user must review and reapply the change. There is no automatic retry of a conflicting write.
- Related changes produced by one UI action, such as a handover and returned asset statuses, use the same transaction. New handover selections save explicit asset IDs. Older equipment links use only unambiguous exact serial matches; free-text legacy accessories remain historical text and must be reselected if an inventory status update is required.
- Full-state reads and WebSocket subscriptions require a valid live session. Broadcasts respect section access. Audit history and active sessions are administrator-only; notifications are restricted to sender/recipient or administrator. Generic writes cannot modify users, privileges or audit records.
- Passwords survive restart. First password setup requires Qatar ID verification, is rate-limited, and cannot overwrite an existing hash. Admin-issued temporary passwords use cryptographic randomness. A temporary password must be changed before operational writes.
- User removal archives/suspends the account to retain historical relationships. Audit events are retained without the previous 500-event cap. Define an organizational retention policy before introducing automatic audit deletion.
- Operational data is not stored in browser localStorage. Sign-out clears client state. A path-limited HttpOnly cookie permits protected image/document previews; other API operations require a bearer token and changing requests require CSRF protection.

## Backups and restore

Verified backups run every four hours and once daily at midnight in Asia/Riyadh (Qatar time), with 30-day retention. If both schedules are due, one full snapshot satisfies both. The schedule is recorded in completed backup manifests; restarting does not create another snapshot unless one is due. If the server was offline, a missed daily backup is created when it starts again. Automatic backups run only while the server is running. Manual backups and pre-restore safety copies remain available. Database snapshots contain SQLite and attached documents, including accounts and group permissions. Configuration is saved separately each day and whenever the effective server settings change; changes made in .env take effect and are backed up on restart.

Set `BACKUP_INTERVAL_MINUTES=240`, `BACKUP_RETENTION_DAYS=30` and `BACKUP_TIMEZONE=Asia/Riyadh` in the server's actual `.env`. An existing `BACKUP_INTERVAL_MINUTES=60` overrides the new default and must be changed. Old backup formats remain restorable. Retention pruning runs only after a successful new backup, so this schedule change does not immediately delete existing backups.

Each completed folder contains a consistent SQLite online backup, every referenced attachment, and a `manifest.json` written only after database/foreign-key/hash checks succeed. An incomplete folder has no manifest and cannot be restored. Private environment settings and JWT secrets are stored in separate verified configuration snapshots, never in new database backup folders.

Create an additional backup:

```sh
node server/backup.mjs create /absolute/runtime-directory /absolute/backup-directory
```

Restore into a NEW directory (never overwrite a running database):

```sh
node server/backup.mjs restore /absolute/backup-directory/fleet-backup-TIMESTAMP-UUID /absolute/new-runtime-directory
```

Stop the app, restore into a new directory, point `DATA_DIR` there, and start with the same private configuration. Restoration clears captured active sessions, so staff must sign in again. Verify counts, attachments and a handover before reconnecting staff. Keep the former runtime directory until restoration is accepted.

For rollback before accepting migration, stop the new app and run the backed-up previous code against a COPY of the pre-migration JSON. SQLite writes made after migration are not automatically reflected in that JSON; do not roll back to it after staff resume without a deliberate reconciliation/export.

## Administrator Settings: Backup & Restore

An administrator can open Settings → Backup & Restore and select Database & Attached Documents or Configuration. Each section has separate Create, Upload, Download and Restore actions. Database backups contain SQLite, referenced documents, accounts and group permissions. Configuration backups contain effective server paths, environment mode, port, backup schedule, proxy/origin settings and secrets such as JWT_SECRET. Configuration files are SHA-256 verified and limited to 1 MB; database exports support 64 MB uncompressed. Keep both types private.

Database snapshots stay under BACKUP_DIR. Separate configuration snapshots default to BACKUP_DIR/configuration; set CONFIGURATION_BACKUP_DIR to another secured directory if desired. Both retain 30 days by default, with pruning only after a successful new snapshot of that type. Configuration backups run daily at midnight in BACKUP_TIMEZONE and when effective configuration changes, independently of whether a database snapshot succeeds.

Upload Backup verifies an exported package and adds it to backup history. Restore requires typing RESTORE, takes a safety snapshot of the current database, and verifies/copies the selected backup into a new runtime directory. It does not overwrite or switch the running database. The panel displays the new DATA_DIR. Stop the server, set DATA_DIR to that path, and restart to verify the data. Restore configuration separately if required; review any configuration.json from an older combined backup before applying its values. Keep the current host's backup location and update paths for the new directory. Active sessions are cleared, so all users must sign in again. Existing backups created before this feature may contain only database/documents. No live restore or automatic server restart is performed from the browser.

## Direct group permissions

USERS contains Users, Groups, and Permissions tabs. Each group owns its permission grants. The Permissions badge selects ADMIN, OFFICER, USER, or a custom group; changing a custom group’s grants affects only its members. There are no separate custom role definitions or role assignments.

Administrators can add and edit custom groups, configure their permissions, and delete empty groups. Move members before deleting a group. Standard groups are protected. Approval authority comes from the Approve Requests permission, not a selected account classification. New custom groups start without that permission. Reset Defaults uses the USER baseline for every custom group; it cannot restore authority from hidden legacy metadata. Existing officer access is preserved by migration 6.

Schema migration 4 copies each group’s previous effective grants from its assigned role into direct group permissions, preserves members and approval types, and removes the separate role tables and assignment column. Shared-role groups become independent copies. Groups that already used direct grants remain unchanged. The migration runs in a SQLite transaction. Restoring an older verified backup into a new runtime directory applies the same migration on startup. Reset Defaults affects only the selected group.

## Legacy account classification compatibility

Schema migration 7 canonicalizes old accounts to an explicit built-in group and matching legacy display class. It preserves IDs, group memberships, credentials, suspension/archive markers and permission grants, and corrects member metadata that disagrees with its existing group. The same normalization runs during first JSON import. A missing referenced group stops migration with a repair message rather than silently changing membership.

The built-in ADMIN, OFFICER and USER groups are still supported and must not be deleted from existing data. userClass, descriptive position text and custom group base_role remain compatibility fields; account position text cannot grant live administrator access. Known historical administrator titles are recognized only when migrating an account without an explicit userRole. Unknown classifications default to USER. New accounts also default to USER unless an administrator explicitly selects another group.

Account creation/deletion and full personnel editing are administrator-only. Approve Requests authorizes operational approvals and does not grant account administration. Non-administrators may edit their own contact details. The obsolete personnel approval route is removed; old pending personnel requests can be declined, but cannot be marked approved. An administrator must make the corresponding account change directly in Users.

Configuration Restore creates a safety configuration snapshot, verifies the selected snapshot and copies it into a new staging directory without modifying the live .env, database or attachments. Review its configuration.json, apply appropriate values to the server .env, keep the correct paths for the current host, and restart. For a full recovery, restore both the database/documents and the appropriate configuration snapshot. Older combined database backups remain compatible and may include configuration.json; they are labeled as older combined copies in history. Existing combined backups are not rewritten or split automatically.
