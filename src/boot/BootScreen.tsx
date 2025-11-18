import * as React from "react";
import {useBoot} from "./BootProvider.tsx";
import {useScrollLock} from "./useScrollLock.ts";
import {Button} from "../design-system/components/Button.tsx";
import {ln} from "../i18n/i18n.ts";

export function BootScreen({onDone}: { onDone: () => void }) {
    const {state, skip} = useBoot();
    useScrollLock(!state.done);

    // Enter: если загрузка не завершена — скипаем, если завершена — выходим в сайт
    React.useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Enter") (state.done ? onDone : skip)();
        }

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [state.done, skip, onDone]);

    const canEnter = state.done; // или allowSkip || state.done

    return (
        <div
            className="
            fixed inset-0 z-[200]
            grid place-items-center
            bg-[var(--color-bg)] text-[var(--color-text)]"
            style={{
                backgroundImage: "radial-gradient(1200px 600px at 80% 20%, rgba(0,229,255,0.08), transparent)"
            }}
        >
            <div className="w-[min(90vw,800px)] select-none">
                <div
                    className="
                    rounded-[var(--radius-xl)]
                    bg-[var(--color-surface)]
                    border border-[var(--color-border)]
                    p-[--space-xl] shadow-soft">
                    <div className="font-mono text-[15px] leading-7">
                        {state.visibleSteps.map((step, index) => (
                            <div key={step.id ?? index}>{ln(step.i18nKey)}</div>
                        ))}
                        {!state.done && <div>▮</div>}
                    </div>
                </div>

                <div className="mt-[--space-xl] flex items-center justify-between">
                    {!state.done && (
                        <span className="
                        text-[var(--color-muted)]
                        font-mono text-sm">
                            {ln("boot.skipHint")}
                        </span>
                    )}
                    <div className="ml-auto">
                        <Button
                            variant={canEnter ? "primary" : "secondary"}
                            disabled={!canEnter}
                            onClick={() => (canEnter ? onDone() : skip())}
                        >
                            {ln("boot.enter")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}