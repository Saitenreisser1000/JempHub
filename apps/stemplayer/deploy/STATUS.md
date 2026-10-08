# StemPlayer Deployment Status

Updated: 2026-07-26

## Current State

- Local Git repository is initialized.
- Initial commit on `main` exists.
- Release archive `v0.1.0` was created and uploaded to VPS.
- VPS base paths under `/var/www/stemplayer` were created.
- Release extraction and `current` linking were started on VPS.
- Backend `.env` is present on VPS, but production values still need to be finalized.
- Frontend login/registration and admin upload UI are implemented.
- Backend API with auth, role checks, song metadata, and admin-only MP3 upload is implemented.

## Confirmed Artifacts

- Backend entry: `backend/src/server.js`
- Auth routes: `backend/src/routes/auth.js`
- Song routes: `backend/src/routes/songs.js`
- Deploy script: `scripts/deploy-release.sh`
- Rollback script: `scripts/rollback-release.sh`
- Release builder: `scripts/create-release.sh`

## Open Decisions

- Keep this repository strictly for StemPlayer and move JempHub pages/config to a separate project.

## Next Steps (VPS)

1. Ensure `current` points to the extracted release directory (symlink, not normal folder).
2. Finalize backend env:
   - `JWT_SECRET`
   - `ADMIN_BOOTSTRAP_TOKEN`
   - `FRONTEND_ORIGIN` (match final public URL)
3. Install backend dependencies:
   - `cd /var/www/stemplayer/current/backend`
   - `npm install --omit=dev`
4. Verify PostgreSQL connection:
   - `psql "postgres://stemplayer:stemplayer@localhost:5432/stemplayer" -c "select 1;"`
5. Apply schema if needed:
   - `psql "postgres://stemplayer:stemplayer@localhost:5432/stemplayer" -f /var/www/stemplayer/current/backend/sql/init.sql`
6. Start API and test:
   - `npm start`
   - `curl -i http://localhost:3000/api/health`
7. Setup process manager/service:
   - systemd service `stemplayer-api`
8. Finalize web routing and TLS with Nginx + Let's Encrypt.

## Known Pitfalls

- If `scp` says destination cannot be created, create target path first:
  - `mkdir -p /var/www/stemplayer/releases`
- If `scripts` is missing in `/var/www/stemplayer/current`, release may not be extracted correctly or `current` is not linked as expected.
- `npm start` in shell is foreground only; use systemd for persistent runtime.

## Resume Point

Resume from step 1 in "Next Steps (VPS)" and validate each step before continuing.
