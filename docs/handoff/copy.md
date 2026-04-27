# Copy & i18n

Bilingual: **Romanian (RO)** is the primary language, **English (EN)** is the fallback for visitors and accessibility. Detect from system language; let user override (v1.5 setting).

## Tone rules

- **Practical.** "3 min" not "Just 3 minutes!"
- **Calm.** No exclamation marks. No emoji unless the brand explicitly asks for one.
- **Short.** A label is a label. Don't sell, don't apologize.
- **Bilingual-aware.** Romanian sentences are usually 10–15% longer than English. Reserve room.
- **Respect numbers.** Numbers are the product. Never wrap them in fluffy phrasing.

## Plurals

Romanian has three forms: 1 / 2-19 / 20+ (with "de"). Use ICU MessageFormat or equivalent.
- 1 minut, 2 minute, 21 de minute
- 1 stație, 2 stații, 23 de stații

English: standard 1 / >1.

## Time formatting

| Case | RO | EN |
|---|---|---|
| < 1 minute | "<1 min" | "<1 min" |
| Exactly 0 / at stop | "Acum" | "Now" |
| 1 minute | "1 min" | "1 min" |
| 2-59 minutes | "{n} min" | "{n} min" |
| 1+ hours | "{HH}:{MM}" | "{HH}:{MM}" |
| Walk time | "{n} min pe jos" | "{n} min walk" |
| Distance < 1 km | "{n} m" | "{n} m" |
| Distance ≥ 1 km | "{n,number,::.#} km" | same |

24-hour clock everywhere. Romanian uses the same.

## Strings

```yaml
nav:
  home:    { ro: "Acasă",   en: "Home" }
  search:  { ro: "Caută",   en: "Search" }
  plan:    { ro: "Plan",    en: "Plan" }
  saved:   { ro: "Salvate", en: "Saved" }

home:
  greeting:
    ro: "Bună"
    en: "Hello"
  saved_section:
    ro: "Stațiile tale"
    en: "Your stops"
  nearby_section:
    ro: "În apropiere"
    en: "Nearby"
  empty_saved:
    ro: "Salvează stațiile pe care le folosești des."
    en: "Save the stops you use most."

search:
  placeholder:
    ro: "Caută o stație, linie sau adresă"
    en: "Search a stop, line, or address"
  recent:    { ro: "Recente", en: "Recent" }
  no_results:
    ro: "Niciun rezultat"
    en: "No results"

stop_detail:
  arrivals:    { ro: "Sosiri",          en: "Arrivals" }
  both_dirs:   { ro: "ambele direcții", en: "both directions" }
  live:        { ro: "în direct",       en: "live" }
  walk_chip:   { ro: "{m} min pe jos · {d} m", en: "{m} min walk · {d} m" }
  see_line:    { ro: "Vezi linia",      en: "See full line" }
  following:   { ro: "Următoarele",     en: "Following" }
  no_arrivals:
    ro: "Nicio sosire în ora următoare."
    en: "No arrivals in the next hour."
  stale_label:
    ro: "Date vechi"
    en: "Stale data"

route_detail:
  vehicles_count:
    ro: "{n,plural,one{# vehicul}other{# vehicule}}"
    en: "{n,plural,one{# vehicle}other{# vehicles}}"
  reverse:    { ro: "Inversează",       en: "Reverse" }
  your_stop:  { ro: "Stația ta",        en: "Your stop" }
  terminus:   { ro: "Terminus",         en: "Terminus" }

alert:
  service_alert: { ro: "Alertă de serviciu", en: "Service alert" }
  until:         { ro: "până {time}",        en: "until {time}" }
  more:
    ro: "+ {n} alte"
    en: "+ {n} more"

plan:
  from:    { ro: "De la",  en: "From" }
  to:      { ro: "Către",  en: "To" }
  when:
    now:       { ro: "Acum",         en: "Now" }
    leave_at:  { ro: "Plecare la",   en: "Leave at" }
    arrive_by: { ro: "Sosire până",  en: "Arrive by" }
  no_routes:
    ro: "Nu am găsit rute. Încearcă o oră diferită."
    en: "No routes found. Try a different time."

saved:
  empty:
    ro: "Adaugă stații sau linii pentru acces rapid."
    en: "Add stops or lines for quick access."
  add:        { ro: "Adaugă",           en: "Add" }
  edit:       { ro: "Editează",         en: "Edit" }
  nickname:   { ro: "Poreclă",          en: "Nickname" }
  reorder:    { ro: "Reordonează",      en: "Reorder" }

errors:
  offline:
    ro: "Fără conexiune. Afișăm ultimele date cunoscute."
    en: "Offline. Showing last known data."
  retry: { ro: "Reîncearcă", en: "Retry" }
  feed_down:
    ro: "STB nu răspunde. Reîncercăm automat."
    en: "STB isn't responding. Retrying automatically."

permissions:
  location_denied:
    ro: "Activează locația pentru a vedea stațiile din apropiere."
    en: "Turn on location to see nearby stops."
```

## Don'ts

- Don't write "Ești pe loc!" or "Aproape ai ajuns!" — no cheerleading copy in a transit app.
- Don't use ALL CAPS for emphasis. Use weight or color.
- Don't mix English-only error messages into a Romanian UI. Translate everything.
- Don't say "we" or "us" — the app isn't a personality.
