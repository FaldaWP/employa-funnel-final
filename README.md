# EMPLOYA – Bewerbungs-Funnel

Ein konversionsoptimierter, mehrstufiger Bewerbungs-Funnel für die Personaldienstleistung
**EMPLOYA** („Für eine gute Pflege"). Zielgruppe: Pflegefachkräfte, Gesundheits- &
Krankenpfleger:innen und Erzieher:innen (m/w/d) in Norddeutschland. Gedacht als
Landingpage für **Video-Ads** (TikTok, Meta, YouTube).

## Dateien

| Datei | Zweck |
|-------|-------|
| `index.html` | Komplette Landingpage inkl. Funnel-Formular |
| `styles.css` | Branding & Layout (Employa-Grün, responsive) |
| `script.js` | Funnel-Logik: Schritte, Validierung, E-Mail-Versand, Ad-Tracking |
| `impressum.html` | Impressum (EMPLOYA GmbH) |
| `datenschutz.html` | Datenschutzerklärung (Verantwortlicher: EMPLOYA, funnel-spezifische Dienste) |
| `assets/employa_logo.svg` | Original-Logo von employa.org |

## Lokal ansehen

Einfach `index.html` im Browser öffnen – oder einen kleinen Server starten:

```bash
cd "Employa Funnel"
node .claude/server.js   # http://localhost:4321
```

## Der Funnel (7 Schritte)

Schnelle Tap-Fragen (springen automatisch weiter):

1. **Stelle** (Pflegefachkraft, Krankenpfleger:in, Erzieher:in, Personaldisponent:in …)
2. **Bereich** (Krankenhaus/Klinik, Altenpflege, ambulante Pflege, Kita/Erziehung …)
   – ersetzt die frühere Aufteilung „Krankenhaus vs. Pflege" durch **eine** Frage
3. **Berufserfahrung**
4. **Region / Niederlassung** (Hamburg, Bremen, Schleswig-Holstein, Rendsburg)
5. **Arbeitszeitmodell**
6. **Mobilität** (Bus/Bahn, Führerschein mit/ohne Auto)
7. **„Passt alles?"-Detailformular**: Recap · Anrede · Vor-/Nachname · E-Mail · Rufnummer ·
   Eintrittstermin · Gehaltsvorstellung · Nachricht · Lebenslauf- & Qualifikations-Upload ·
   Datenschutz → Erfolgsseite mit direktem Standort-Kontakt

## E-Mail-Versand & Standort-Routing

Der Versand läuft über **FormSubmit** (formsubmit.co) – kostenlos, ohne Account,
inkl. Datei-Anhängen. Konfiguration oben in `script.js`:

- **`PRIMARY_MAIL`** = `wendepunkt.marketing@gmail.com` → erhält **jede** Bewerbung
- **`REGION_MAIL`** → das gewählte Standort-Postfach bekommt die Bewerbung automatisch in Kopie (CC):

| Region im Funnel | Standort-Mail (CC) |
|---|---|
| Hamburg | hamburg@employa.org |
| Bremen | bremen@employa.org |
| Schleswig-Holstein | s-h@employa.org |
| Rendsburg / Umland | rendsburg@employa.org |

Zusätzlich bekommt der/die Bewerber:in automatisch eine Bestätigungs-Mail
(`_autoresponse`), und die Antwort-Adresse (Reply-To) ist die Bewerber-Mail.

**Datei-Anhänge:** FormSubmits AJAX-Endpoint verwirft Anhänge stillschweigend –
nur der klassische Endpoint stellt sie zu (getestet 05.07.2026). `submitBewerbung()`
wählt deshalb automatisch: **mit** Upload → klassischer Endpoint (Antwort nicht
lesbar, Erfolg wird optimistisch angezeigt), **ohne** Upload → AJAX-Endpoint
(lesbarer Status, Fehlerbox bei Problemen).

> ### ⚠️ Einmalige Aktivierung nötig
> Nach der **ersten** abgeschickten Bewerbung sendet FormSubmit eine
> **Aktivierungs-Mail an wendepunkt.marketing@gmail.com**. Den Link darin einmal anklicken –
> erst danach werden Bewerbungen wirklich zugestellt. (Ohne Aktivierung geht nichts raus!)

**Warum ist wendepunkt.marketing@gmail.com Hauptempfänger und die Standorte CC?**
FormSubmit muss den Hauptempfänger per Klick bestätigen. Mit dieser Aufteilung reicht
**eine** Aktivierung (dein Postfach) – die Standort-Mails brauchen keine Bestätigung und
bekommen trotzdem jede Bewerbung. Sollen die Standorte stattdessen Hauptempfänger sein,
den `ENDPOINT` je Region dynamisch bauen – dann muss aber **jedes** der 4 Postfächer
einmalig den Aktivierungslink klicken.

**Fallback:** Schlägt der Versand fehl (z. B. offline), erscheint eine Fehlerbox mit
„E-Mail öffnen" – ein fertiger `mailto:`-Entwurf an das richtige Standort-Postfach
mit CC an wendepunkt.marketing@gmail.com. Zusätzlich wird jede Bewerbung lokal im Browser
gesichert (`localStorage`, Schlüssel `employa_bewerbungen`).

## Links für Video-Ads

| Link | Wirkung |
|---|---|
| `…/#funnel` | springt direkt zum Funnel |
| `…/?stelle=erzieher` | Stelle vorausgewählt, Funnel startet bei Schritt 2 |
| `…/?stelle=pflegefachkraft&region=bremen` | Stelle vorausgewählt + Region vormarkiert |
| `…/?utm_source=tiktok&utm_campaign=pflege-hh` | Kampagnen-Daten werden mit der Bewerbung mitgesendet |

Erfasst werden automatisch: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term` sowie die Klick-IDs `fbclid` (Meta), `gclid` (Google), `ttclid` (TikTok).
Die Werte stehen in der Bewerbungs-Mail als `Ad-…`-Zeilen – so siehst du, welche
Video-Ad die Bewerbung gebracht hat. Bei Ad-Traffic (UTM vorhanden) scrollt die Seite
auf dem Handy automatisch zum Funnel.

## Meta-Pixel (Facebook/Instagram-Ads)

Für Conversion-Tracking der Video-Ads ist der Meta-Pixel vorbereitet. **Nur die
Pixel-ID eintragen** – oben in `script.js`:

```js
var META_PIXEL_ID = '';   // ← hier die ID aus dem Meta Events Manager (nur Zahlen)
```

Danach feuert automatisch (nichts weiter zu tun):

| Ereignis | Wann | Zweck |
|---|---|---|
| `PageView` | bei jedem Seitenaufruf | Standard-Reichweite |
| `FunnelStart` (Custom) | erste beantwortete Frage | misst Funnel-Einstieg |
| `Lead` | Bewerbung erfolgreich abgeschickt | **Conversion – hierauf die Ads optimieren** |

Das `Lead`-Event enthält `content_name` (Stelle) und `content_category` (Region).
Ist die ID leer, wird kein Pixel geladen (kein Fehler).

**Consent:** Der Pixel lädt erst nach aktiver Einwilligung über das Cookie-Banner
(§ 25 TDDDG). Die Entscheidung wird in `localStorage` (`employa_consent`) gespeichert;
das Banner erscheint nur, wenn eine Pixel-ID gesetzt ist und noch keine Wahl getroffen
wurde. „Nur notwendige" verhindert das Laden des Pixels dauerhaft.

## Schriftart

Plus Jakarta Sans wird **selbst gehostet** (`assets/fonts/`, eingebunden per `@font-face`
in `styles.css`) – es geht keine IP-Adresse an Google-Server (kein Google-Fonts-CDN).

**Nach dem Go-Live mit eigener Domain:** die Domain im Meta Business Manager unter
*Brand Safety → Domains* verifizieren (Meta-Tag oder DNS) – nötig für iOS-Tracking /
Aggregated Event Measurement. Im Werbeanzeigenmanager „Lead" als Optimierungsereignis wählen.

## Hinweise / nächste Schritte

- **Impressum & Datenschutz** verlinken (Pflicht in Deutschland) – Platzhalter im Footer.
  In der Datenschutzerklärung FormSubmit als Auftragsverarbeiter erwähnen.
- Nach der Aktivierung schickt FormSubmit einen **Alias-String** mit – diesen in
  `FORM_ALIAS` (`script.js`) eintragen, damit die Adresse nicht im Endpoint steht.
- Für Conversion-Tracking ggf. Meta-/TikTok-Pixel-Event in `showSuccess()` (in `script.js`) auslösen.
- Testimonial ist exemplarisch – durch echtes Zitat/Foto ersetzen.
- Deployment: liegt auf GitHub Pages (faldawp.github.io) – Änderungen müssen gepusht werden.
