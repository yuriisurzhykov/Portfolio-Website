# shared/ui/button — LinkButton

## 2026-07-18 — `react-router-dom`'s `Link` → `next/link`

`LinkButton` уже принимал проп `href` (не `to`) в своём собственном API —
поменялся только импорт `Link` (react-router → `next/link`) и то, что
внутри компонента передаётся в него (`to={href}` → `href={href}`). Внешний
контракт компонента (`<LinkButton href="/work">...`) не изменился, значит
ни один вызывающий код в других срезах не потребовал правок.
