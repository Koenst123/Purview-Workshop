# Beveiligingsbeleid

Heb je een kwetsbaarheid gevonden? Meld die **niet** via een openbaar issue, maar via
**Security → Report a vulnerability** (private vulnerability reporting) in deze repository.
We reageren zo snel mogelijk.

De app slaat geen gegevens op een server op; alle invoer blijft in de browser van de gebruiker.

Browseropslag is niet versleuteld en kan door andere gebruikers van hetzelfde browserprofiel worden gelezen. Volledige JSON-back-ups bevatten ontwerpgegevens en interne notities. Bewaar die volgens het informatiebeleid van de organisatie.

Imports zijn onbetrouwbaar: het model begrenst inhoud en herstelt verwijzingen; toekomstige schema's vragen vooraf toestemming. SIT-testtekst blijft uitsluitend in het geheugen. De CSP, escaping en exportcontroles vervangen geen zorgvuldig gebruik van het apparaat of een technische tenantreview.

Zie [beveiliging en privacy](docs/security-and-privacy.md) voor gegevensstromen, beperkingen en regressies. Meldingen bevatten bij voorkeur een klein synthetisch reproduceerbaar voorbeeld, nooit klantgegevens.
