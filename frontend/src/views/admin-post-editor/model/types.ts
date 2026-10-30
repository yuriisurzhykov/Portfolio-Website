import type { PostStatus } from "@portfolio/backend";
import type { JournalPropertiesValue } from "@/features/edit-content-properties";
export interface PostEditorForm extends JournalPropertiesValue {
    status: PostStatus;
}
