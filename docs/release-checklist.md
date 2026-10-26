# Releasechecklist

1. Scope en publicatietoestemming voor de huidige opdracht vaststellen. Een lokale oplevering wordt niet gecommit, gepusht of gepubliceerd.
2. Wijzig uitsluitend bronbestanden, synthetische tests en bijbehorende tools/docs. Controleer `git diff` en nieuwe bestanden op klantgegevens en artefacten.
3. Draai de volledige sequentiele suite, webbuild, `tools/check.py`, `tools/syntax.py` en verplichte smoke.
4. Bekijk licht/donker, smal, beamer, focus en de werkelijke downloads/printuitvoer. Noteer niet-uitgevoerde Office-, screenreader- en tenantcontroles.
5. Bouw het offline deliverable opnieuw met `python src/build.py`.
6. Alleen bij toestemming: publiceer met `publiceer.ps1`, controleer Actions en de live site. Een lokaal gewijzigde workflow is nog niet bewezen op GitHub.
7. Rapporteer geslaagd, mislukt, overgeslagen en niet uitgevoerd afzonderlijk. Noem open inhoudelijke verificaties; claim geen algemene WCAG- of securitycertificering.
