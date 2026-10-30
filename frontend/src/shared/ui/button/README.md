# shared/ui/button — LinkButton

## 2026-07-18 — `react-router-dom`'s `Link` → `next/link`

`LinkButton` уже принимал проп `href` (не `to`) в своём собственном API —
поменялся только импорт `Link` (react-router → `next/link`) и то, что
внутри компонента передаётся в него (`to={href}` → `href={href}`). Внешний
контракт компонента (`<LinkButton href="/work">...`) не изменился, значит
ни один вызывающий код в других срезах не потребовал правок.


## 2026-10-29 Unified editor controls

The editor reuses the shared controls rather than adding private copies. Flat buttons and inset fields preserve existing defaults. Field context connects hints and errors to inputs. Relationship selection delegates to the shared single-value combobox in closed mode; arbitrary text cannot become a relationship. Unit tests cover keyboard selection and error descriptions.

`appearance="flat"` selects an explicit set of authoring styles without the public primary button's shadow, pressed scale or bold weight. It avoids relying on conflicting utility order. Default appearances and LinkButton classes remain compatible.
