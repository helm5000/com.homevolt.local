# START HÄR – offentlig Homevolt-kod

Detta är en offentlig kodfork. Den fullständiga projektjournalen och alla verkliga testresultat för användarens Homey Energy-installation har flyttats till ett **privat fristående GitHub-repository**.

## Arbetsprinciper

1. Utgå från den **privata projektjournalen** för tidigare test, beslut, mätvärden och nästa steg. Den offentliga forken är **inte längre** primär överlämningsplats.
2. Granska alltid vilka commits som faktiskt finns på GitHub och vilken version som är installerad i Homey. En publik testgren är inte nödvändigtvis synkroniserad med lokalt installerad version.
3. Publicera inte personliga råmätningar, detaljerade driftprofiler, hembilder, skärmbilder, nätverksidentifierare, lösenord, API-token eller andra åtkomstuppgifter.
4. Använd bara generella kodbeskrivningar och syntetiska tester i offentliga PR:er.
5. Verifiera VPP-styrning och mätgränser genom riktiga tester innan en generell Homevolt-korrigering föreslås.
6. Skicka inte `--clean`, fabriksåterställning eller batteristyrningskommandon som rutinåtgärd.

## Begränsning

Tidigare offentlig Git-historik kan fortfarande innehålla gamla testanteckningar. Den är inte historiksanerad genom denna filändring. Se [sekretessnotering](./SEKRETESS-REVISION-2026-11-23.md).
