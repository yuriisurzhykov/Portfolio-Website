export type BootStep = {
    id: string;                    // unique key
    i18nKey: string;               // key for locale string
    delayMs?: number;              // input latency before string output
    type?: "print" | "signal";     // UI behaviour
    glow?: boolean;                // blink the backlight
};

export type BootConfig = {
    steps: BootStep[];
    minTotalMs?: number;           // total min duration (blocking from the instant loading)
    allowSkip?: boolean;           // whether to show "Enter System" before finishing loading
};
