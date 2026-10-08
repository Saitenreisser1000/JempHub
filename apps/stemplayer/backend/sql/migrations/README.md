# Migrationen

Migrationen werden in aufsteigender Reihenfolge ausgefuehrt:

- `001_initial_schema.sql`
- `002_...sql`
- `003_...sql`

Beispiel:

```bash
psql "$DATABASE_URL" -f backend/sql/migrations/001_initial_schema.sql
```

Empfehlung:

- Vor jeder Migration DB-Backup erstellen.
- Jede strukturelle Aenderung in eine neue Migration schreiben.
- Vor Deploy zuerst Migration ausfuehren, dann Service neu starten.
