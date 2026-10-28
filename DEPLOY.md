# Automatisches Veröffentlichen

Jeder Merge nach `main` veröffentlicht die geänderten Apps von selbst auf dem
VPS (Workflow `.github/workflows/deploy.yml`). Betroffen sind Hub, GuitarJemp,
NoteJemp, EarJemp und ConductJemp. Der StemPlayer bleibt vorerst manuell.

Von Hand: auf GitHub unter **Actions → Deploy → Run workflow** eine App oder
`all` wählen.

## Einmalige Einrichtung

Alle Befehle im Terminal auf dem Mac. `187.124.190.130` ist der VPS.

**1. Eigenen Deploy-Schlüssel erzeugen** (ohne Passwort, nur für GitHub):

```sh
ssh-keygen -t ed25519 -f ~/jemp_deploy -N "" -C "github-deploy"
```

**2. Den öffentlichen Teil auf dem Server erlauben:**

```sh
ssh-copy-id -i ~/jemp_deploy.pub root@187.124.190.130
```

**3. Den Fingerabdruck des Servers holen:**

```sh
ssh-keyscan -t ed25519 187.124.190.130
```

**4. Drei Secrets in GitHub anlegen:** Repository JempHub → Settings →
Secrets and variables → Actions → New repository secret

| Name | Inhalt |
| --- | --- |
| `VPS_HOST` | `187.124.190.130` |
| `VPS_SSH_KEY` | kompletter Inhalt von `~/jemp_deploy` (Ausgabe von `cat ~/jemp_deploy`, inklusive der BEGIN/END-Zeilen) |
| `VPS_KNOWN_HOSTS` | die Zeile aus Schritt 3 |

Optional `VPS_USER`, falls nicht `root`.

**5. Lokale Kopie des privaten Schlüssels löschen** (er liegt jetzt nur noch
in GitHub):

```sh
rm ~/jemp_deploy
```

**6. Testen:** Actions → Deploy → Run workflow → `all`. Jede App bekommt
einen grünen Haken, wenn sie online ist.

## Schlüssel widerrufen

Auf dem Server in `~/.ssh/authorized_keys` die Zeile mit `github-deploy`
löschen und das Secret `VPS_SSH_KEY` in GitHub entfernen.
