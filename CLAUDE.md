# gstack

Este proyecto tiene disponibles los skills de [gstack](https://github.com/garrytan/gstack) (instalación personal, no team mode). Para todo lo relacionado a navegar la web, usar el skill `/browse` de gstack — nunca las herramientas `mcp__claude-in-chrome__*`.

**Nota:** el Chromium propio de gstack no está instalado en esta máquina (falló la extracción por antivirus) — los skills que dependen de ESE navegador (`/qa`, `/design-shotgun`, `/pair-agent`, `/browse`) no van a funcionar hasta resolver eso. Esto NO aplica al Chromium de Playwright (`@playwright/test`, instalado y funcionando en este proyecto desde el Sprint 6 — ver `e2e/`): ese sí está disponible para tests E2E o verificación visual puntual vía Node/Playwright directo, es un binario separado del de gstack.

Skills disponibles: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.
