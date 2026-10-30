import { Button } from "@/shared/ui/button";
import type { WorkspacePanel } from "../model/types";

const panels: readonly WorkspacePanel[] = ["body", "details", "actions"];
export function WorkspacePanelNavigation({
    active,
    onChange,
}: {
    active: WorkspacePanel;
    onChange(panel: WorkspacePanel): void;
}) {
    return (
        <nav
            aria-label="Editor workspace"
            className="flex shrink-0 gap-xs border-t border-border-subtle bg-surface-base p-sm xl:hidden"
        >
            {panels.map((panel) => (
                <Button
                    key={panel}
                    appearance="flat"
                    size="sm"
                    fullWidth
                    aria-pressed={active === panel}
                    variant={active === panel ? "secondary" : "ghost"}
                    onClick={() => onChange(panel)}
                >
                    {panel === "body" ? "Body" : panel === "details" ? "Details" : "Actions"}
                </Button>
            ))}
        </nav>
    );
}
