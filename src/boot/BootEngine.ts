import type {BootConfig, BootStep} from "./boot.types.ts";

export type BootState = {
    startedAt: number;
    done: boolean;
    visibleSteps: BootStep[];
};

export class BootEngine {
    private bootConfig: BootConfig;
    private bootState: BootState = {startedAt: Date.now(), done: false, visibleSteps: []};
    private readonly onUpdate: (state: BootState) => void;

    constructor(config: BootConfig, onUpdate: (state: BootState) => void) {
        this.bootConfig = config;
        this.onUpdate = onUpdate;
    }

    async start() {
        const start = Date.now();
        for (const step of this.bootConfig.steps) {
            // If step has a delay, we await a timer response.
            if (step.delayMs) await this.sleep(step.delayMs)

            this.bootState.visibleSteps = [...this.bootState.visibleSteps, step];
            this.onUpdate({...this.bootState});
        }

        const elapsedTime = Date.now() - start;
        const minLeft = Math.max((this.bootConfig.minTotalMs ?? 0) - elapsedTime, 0);
        if (minLeft > 0) {
            await this.sleep(minLeft);
        }

        this.bootState.done = true;
        this.onUpdate({...this.bootState});
    }

    skip(): void {
        this.bootState.done = true;
        this.onUpdate({...this.bootState});
    }

    getState(): BootState {
        return this.bootState;
    }

    private sleep(ms: number) {
        return new Promise(r => setTimeout(r, ms))
    }
}