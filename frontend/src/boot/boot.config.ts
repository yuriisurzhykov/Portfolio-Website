import type {BootConfig} from "./boot.types.ts"

export const bootConfig: BootConfig = {
    minTotalMs: 2200,
    allowSkip: true,
    steps: [
        {id: "init_flowbus", i18nKey: "boot.initFlowBus", delayMs: 300, glow: true},
        {id: "load_navsymphony", i18nKey: "boot.loadNavSymphony", delayMs: 570, glow: true},
        {id: "system_ready", i18nKey: "boot.systemReady", delayMs: 300, glow: true, type: "signal"},
    ]
}