import * as React from "react";
import {BootEngine, type BootState} from "./BootEngine.ts";
import {bootConfig} from "./boot.config.ts";

type Context = { state: BootState, skip: () => void };
const BootContext = React.createContext<Context | null>(null);

export function BootProvider({children}: { children: React.ReactNode }) {
    const [state, setState] = React.useState<BootState>({
        startedAt: Date.now(),
        done: false,
        visibleSteps: []
    });

    React.useEffect(
        () => {
            const engine = new BootEngine(bootConfig, setState);
            engine.start();
            return () => engine.skip();
        },
        []
    );

    const skip = React.useCallback(
        () => setState(s => ({...s, done: true})),
        []
    );
    return <BootContext.Provider value={{state, skip}}>{children}</BootContext.Provider>
}

export function useBoot() {
    const context = React.useContext(BootContext);
    if (!context) throw new Error("useBoot must be used within BootProvider!");

    return context;
}