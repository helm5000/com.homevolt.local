# Homevolt Energy – offentlig teknisk översikt

**Status:** Offentlig kodfork och generellt utvecklingsunderlag. **Ingen personlig driftsjournal lagras avsiktligt i denna aktuella filversion.**

## Syfte

Utvecklingsarbetet gäller beräkning av laddad respektive urladdad energi i Homevolt-appen för Homey, med hantering av olika EMS-fält, ackumulerade energiräknare, nollställda baslinjer, gränser mot felaktiga hopp och överlappande avläsningar.

Kodändringar och tester finns på projektets offentliga grenar. Förslag till originalutvecklaren är **inte** godkända eller mergade.

## Sekretess

Tidigare offentlig testjournal har flyttats till ett **fristående privat arkiv**. Den innehöll historiska driftsdata från en verklig anläggning. Några personliga mätvärden, autentiseringsuppgifter, hemnätsidentifierare eller originalskärmbilder ska **inte** publiceras här framöver.

> **Historikvarning:** Tidigare offentliga commits kan fortfarande innehålla äldre dokumentation. Att radera eller ersätta en fil på grenspetsen raderar inte tidigare Git-historik. Ingen garanti om historisk fullständig radering lämnas.

För säkerhetsregler: [offentlig sekretessnotering](./SEKRETESS-REVISION-2026-11-23.md).

## Praktisk kodutveckling

- All kod ska granskas för hemligheter och personliga identifierare före publicering.
- Använd syntetiska tester och anonymiserade exempel i offentlig dokumentation.
- Kodens testresultat ska inte likställas med verifierad energimätning i verklig drift.
- Fullständiga testprotokoll, rådata, beslutshistorik och överlämningsinformation hör till den **privata projektjournalen**.
- Säkerhetskontroll vid push är ett kompletterande skydd; den kan inte förhindra att en uppgift hinner bli offentlig när den pushas.
