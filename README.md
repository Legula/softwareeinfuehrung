# Laufkarte Softwareeinführung

Klickbarer Prototyp der digitalen Laufkarte für Softwareeinführungen. Er dient dazu, den Ablauf abzustimmen; die spätere technische Umsetzung ist offen.
Alle Stellen (Antragsteller, IT, Digitalisierung, Organisation, Datenschutz, Informationssicherheit) bearbeiten denselben Vorgang nacheinander oder parallel.
Rückfragen, Laufzettel und ein Mail-Protokoll sind enthalten.

**Einstellungen (zentrale Konfiguration):** Alles Anpassbare steht im Knopf „Einstellungen“ und wird als eine Datei gespeichert (`config.json` im Daten-Volume, nicht im Repository):

| Bereich | Inhalt |
| --- | --- |
| Allgemein | Name der Verwaltung, Kürzel der Vorgangsnummer, Links in der Kopfzeile |
| Organisationseinheiten | Bezeichnung, Funktion, Mailadresse und Frist je Stelle, Standardfrist, Feiertage |
| Begriffe | Leitung, Dienstanweisung, Dienstvereinbarung, Kämmerei, Vergabestelle, Landesrecht (GO, GPA, DSG, BITV) |
| Mails | Testmodus, Test-Adresse, Anrede, Schlusssatz, Adresse der Laufkarte |
| Checklisten | Prüfpunkte je Stelle: Texte ändern, Punkte ausblenden, eigene Punkte anhängen; Zustimmungen Dritter umbenennen und ergänzen (wahlweise immer Pflicht) |
| Texte und Pflichtfelder | Abschnittstitel, Einleitungen, Stationsnamen, Feldbeschriftungen, Hilfetexte; Pflicht bei Freitextfeldern |
| Glossar | „Begriffe erklärt“ für Antragsteller |

Bewusst fest im Code bleiben Ablauf, Stationen und Verzweigungsregeln (`ST`, `OPEN`, `transition()`): Sie sind Gegenstand der Abstimmung. Punkte, an denen Regeln hängen (z. B. EU/EWR-Verarbeitung, Kontrolle von Beschäftigten, AVV/VVT/DSFA), lassen sich umformulieren, aber nicht ausblenden. Ausgeblendete Punkte behalten ihre Nummer, damit gespeicherte Antworten passen.

Über „Einstellungen übertragen“ lässt sich die gesamte Konfiguration als Text kopieren und in einer anderen Instanz einfügen. `config.beispiel.json` zeigt den Aufbau mit neutralen Beispielwerten.

**Hilfe für Antragsteller:** „Hilfe anfordern“ schickt eine Frage samt Entwurf an eine wählbare Stelle. „Begriffe erklärt“ öffnet ein Glossar in einfacher Sprache (Konstante `GLOSSAR`).

**Protokoll:** Der Reiter „Protokoll“ fasst Angaben, Stellungnahmen, Zustimmungen und Laufzettel zusammen, zum Drucken als PDF oder als HTML-Datei für die Ablage im DMS.

**Klärung:** Stimmt eine Stelle nicht zu (Digitalisierung, IT, Datenschutz, Informationssicherheit, Personalrat), geht der Vorgang in beiden Pfaden zur Klärung an den Antragsteller (Funktionen `rejectors()` und `transition()`).

**Demodaten:** „Abgeschlossenen Demovorgang erzeugen“ legt einen vollständig durchlaufenen Vorgang an. „Demodaten vorbelegen“ füllt an jeder Station die noch leeren Felder.

**Ablauf auf einer Seite:** Der Knopf „Ablauf“ zeigt den gesamten Weg als druckbare Grafik. Sie entsteht aus dem Statusmodell (`ST`, `OPEN`) und den Bezeichnungen aus den Einstellungen; die Anordnung steht in `FLOW_NODES`.

**KI-Funktionen:** Eine Frage im Antrag. Nur bei „Ja“ folgen ein Zusatzfeld und je ein Prüfpunkt bei Digitalisierung (Einordnung nach KI-Verordnung) und Datenschutz.

**Offene Fragen:** Geschützter Bereich für die Fragen, die im Gremium zu klären sind: abhaken, Ergebnis festhalten, Fragen ergänzen. Er hat ein eigenes Passwort (Umgebungsvariable `GREMIUM_PASS`); ohne gesetztes Passwort ist der Bereich abgeschaltet. Die Inhalte liegen nur im Daten-Volume (`fragen.json`).

**Links:** In den Einstellungen lassen sich bis zu fünf Links hinterlegen (z. B. Konzept, Quellcode), die in der Kopfzeile erscheinen.

**Testmodus:** Im Testmodus gehen alle Mails an eine einzige Adresse (Standard: Platzhalter `testpostfach@example.org`). Im Prototyp werden Mails nur protokolliert und nicht verschickt.

**Feedback:** Über „Feedback geben“ und den Knopf „Feedback“ an jedem Abschnitt hinterlassen Testende Rückmeldungen, auf Wunsch mit Namen. Die „Feedback-Liste“ zeigt alle Einträge mit Status und kopiert sie als Text.

**Keine Organisationsdaten im Repository:** Der Code enthält nur neutrale Standardbezeichnungen und keine echten Namen, Mailadressen oder Serveradressen. Zugangsdaten und Hostnamen gehören in Umgebungsvariablen auf dem Server, Bezeichnungen und Adressen in die Einstellungen.

## Start mit Docker

```bash
cp .env.example .env        # Zugangsdaten setzen
docker compose up -d --build
```

Danach ist die Laufkarte unter `http://<server>:8080` erreichbar. Mit gesetztem `BASIC_AUTH_USER` fragt der Browser nach Benutzername und Passwort. Alternativ öffnet der Zugangslink `https://<server>/?key=<Passwort>` die Laufkarte ohne Abfrage; der Browser merkt sich den Zugang 90 Tage. Ohne `BASIC_AUTH_USER` ist die Instanz für alle offen, die die Adresse kennen.
Vorgänge, Feedback und Einstellungen liegen im Docker-Volume `laufkarte-daten` (`vorgaenge.json`, `feedback.json`, `config.json`) und überstehen Updates.

## Betrieb auf dem Hostinger-VPS

Auf dem VPS läuft die Laufkarte als Docker-Projekt `laufkarte` hinter Traefik mit HTTPS. Grundlage ist `docker-compose.hostinger.yml`.
Der Container lädt beim Start den aktuellen Stand des Branches `main`. Nach Änderungen genügt ein Neustart des Projekts im Hostinger Docker Manager.
Benutzer und Passwort stehen nur in den Umgebungsvariablen des Projekts auf dem VPS, nicht im Repository.

## Start ohne Docker

```bash
node server.js              # Node 18 oder neuer, keine weiteren Pakete nötig
```

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `public/index.html` | Die komplette Oberfläche: Felder, Abschnitte, Workflow-Logik und Mails |
| `server.js` | Liefert die Oberfläche aus und speichert Vorgänge, Feedback und Einstellungen über eine kleine API (`/api/vorgaenge`, `/api/feedback`, `/api/config`) |
| `Dockerfile`, `docker-compose.yml` | Container-Betrieb |

Die Oberfläche funktioniert auch ohne Server: Öffnet man `public/index.html` direkt im Browser, werden die Vorgänge nur lokal im Browser gespeichert.

## Weiterentwickeln

- **Felder:** Konstante `FIELDS` in `public/index.html`. Jedes Feld hat Abschnitt (`sec`), bearbeitende Stelle (`own`), Status (`st`), Typ (`t`), Pflicht (`req`) und optional eine Sichtbarkeitsbedingung (`show`).
- **Abschnitte:** Konstante `SECS`.
- **Workflow:** Konstanten `ST` und `OPEN` sowie die Funktion `transition()`, die auch die Mails erzeugt.
- **Zustimmungen Dritter:** Funktion `consentItems()`.
- **Bezeichnungen in Texten:** Platzhalter wie `{R15}` oder `{DSB}` werden bei der Anzeige durch die eingestellten Bezeichnungen ersetzt (Funktion `T()`, Standardwerte in `DEFAULT_CFG`). Neue Texte bitte mit Platzhaltern schreiben, nicht mit festen Namen.

## Hinweise

- Das ist ein Prototyp zum Testen des Ablaufs, kein Produktivsystem. Bitte keine echten personenbezogenen Daten eintragen.
- Datei-Uploads speichern nur den Dateinamen.
- Den Server nur mit Passwortschutz oder hinter einem Reverse Proxy mit HTTPS öffentlich erreichbar machen.
