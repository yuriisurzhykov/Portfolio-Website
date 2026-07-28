import { getDistinctPostCategories } from "@portfolio/backend";
import { PostEditorPage } from "@/views/admin-post-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

export default async function Page() {
    return renderOrServiceUnavailable(
        () => getDistinctPostCategories(),
        (existingCategories) => <PostEditorPage existingCategories={existingCategories} />,
    );
}
