# Säkerhet och sekretess – offentlig kodfork

**Kontrollerad:** 23 november 2026.

Detta repository är **offentligt**. Vid genomgång av de fem då aktuella grenarna gjordes mönstersökning i kod och dokumentation efter kända tokenformat, lösenord, personliga e-postadresser, användarspecifika IP-adresser och enhetsidentifierare samt en genomgång av det aktuella projektets commit-ändringar.

**Resultat:** Inga bekräftade hårdkodade lösenord, verkliga API-nycklar eller åtkomstkoder identifierades i den granskade projektkoden. Detta är inte ett bevis på att all historik eller alla möjliga hemlighetsformat har inspekterats.

Tidigare offentliga anteckningar innehöll historiska data från en privatanläggning. Den detaljerade arbetsjournalen har kopierats och verifierats i ett separat privat repository. De offentliga dokumentens aktuella innehåll har därför reducerats till generell teknik och säkerhet.

**Kvarvarande risk:** GitHub-commits som redan publicerats är fortfarande en del av historiken även om filer raderas från aktuell gren. Återkallande av tidigare publicerad information kan inte garanteras genom vanlig filändring. Historiestädning kräver särskild bedömning, säkerhetskopia och eventuellt hjälp från GitHub Support. Inga destruktiva force-push-operationer har genomförts.

### Regler framåt

- Kontrollera personuppgifter, driftdata och API-uppgifter **före** varje push.
- Checka inte in rå chatt, privata foton, hemnätsadresser, Homey-ID, API-token eller lösenord i någon gren.
- Använd syntetiska exempel och avpersonifierade testdata i offentlig kod.
- Kör `node scripts/privacy-check.js` lokalt före publicering när filen finns; GitHub Actions är en kompletterande efterhandskontroll.
- Fullständiga projektanteckningar och verkliga mätdata förvaras i åtkomstbegränsat privat projektarkiv.
- Om en verklig hemlighet mot förmodan upptäcks: återkalla/rotera den, utred omfattningen och bedöm historiksanering.

Källa: [GitHub – removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
