import type { WorkStatus } from "@portfolio/backend";
import type { WorkPropertiesValue } from "@/features/edit-content-properties";
export interface WorkEditorForm extends WorkPropertiesValue {
    status: WorkStatus;
    featured: boolean;
}
