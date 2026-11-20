# Laufkarte Softwareeinführung

Klickbarer Prototyp der digitalen Laufkarte für Softwareeinführungen. Er dient als Vorlage für das spätere FormCycle-Formular.
Alle Stellen (Antragsteller, 15/1, 01/3, 15, 11/2, DSB, ISB) bearbeiten denselben Vorgang nacheinander oder parallel.
Rückfragen, Laufzettel und ein Mail-Protokoll sind enthalten.

**Testmodus:** Alle Mails gehen an ein gemeinsames Test-Postfach (Platzhalter `testpostfach@example.org`, über die Umgebungsvariable `TEST_MAIL` änderbar). Im Prototyp werden Mails nur protokolliert und nicht verschickt.

**Feedback:** Über „Feedback geben“ und den Knopf „Feedback“ an jedem Abschnitt hinterlassen Testende anonyme Rückmeldungen. Die „Feedback-Liste“ zeigt alle Einträge mit Status und kopiert sie als Text.

**Anonym:** Das Repository enthält keine Namen, Mailadressen oder Serveradressen. Zugangsdaten und Hostnamen gehören nur in Umgebungsvariablen auf dem Server.

## Start mit Docker

```bash
cp .env.example .env        # Zugangsdaten setzen
docker compose up -d --build
```

Danach ist die Laufkarte unter `http://<server>:8080` erreichbar. Mit gesetztem `BASIC_AUTH_USER` fragt der Browser nach Benutzername und Passwort.
Die Vorgänge liegen im Docker-Volume `laufkarte-daten` (Datei `vorgaenge.json`) und überstehen Updates.

## Betrieb auf dem Hostinger-VPS

Auf dem VPS läuft die Laufkarte als Docker-Projekt `laufkarte` hinter Traefik mit HTTPS. Grundlage ist `docker-compose.hostinger.yml`.
Das Image wird direkt aus dem Branch `main` dieses Repositorys gebaut. Nach Änderungen das Projekt im Hostinger Docker Manager neu bereitstellen.
Benutzer und Passwort stehen nur in den Umgebungsvariablen des Projekts auf dem VPS, nicht im Repository.

## Start ohne Docker

```bash
node server.js              # Node 18 oder neuer, keine weiteren Pakete nötig
```

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `public/index.html` | Die komplette Oberfläche: Felder, Abschnitte, Workflow-Logik und Mails |
| `server.js` | Liefert die Oberfläche aus und speichert die Vorgänge über eine kleine API (`/api/vorgaenge`) |
| `Dockerfile`, `docker-compose.yml` | Container-Betrieb |

Die Oberfläche funktioniert auch ohne Server: Öffnet man `public/index.html` direkt im Browser, werden die Vorgänge nur lokal im Browser gespeichert.

## Weiterentwickeln

- **Felder:** Konstante `FIELDS` in `public/index.html`. Jedes Feld hat Abschnitt (`sec`), bearbeitende Stelle (`own`), Status (`st`), Typ (`t`), Pflicht (`req`) und optional eine Sichtbarkeitsbedingung (`show`).
- **Abschnitte:** Konstante `SECS`.
- **Workflow:** Konstanten `ST` und `OPEN` sowie die Funktion `transition()`, die auch die Mails erzeugt.
- **Zustimmungen Dritter:** Funktion `consentItems()`.
- **Fristen:** Konstante `FRIST_TAGE`. Test-Mailadresse: Umgebungsvariable `TEST_MAIL`.

## Hinweise

- Das ist ein Prototyp zum Testen des Ablaufs, kein Produktivsystem. Bitte keine echten personenbezogenen Daten eintragen.
- Datei-Uploads speichern nur den Dateinamen.
- Den Server nur mit Passwortschutz oder hinter einem Reverse Proxy mit HTTPS öffentlich erreichbar machen.
