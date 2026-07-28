import { getDistinctPostCategories } from "@portfolio/backend";
import { PostEditorPage } from "@/views/admin-post-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

/** `requirePage()` here, not just in the shared layout — see `journal/[slug]/edit/page.tsx`'s comment for why. */
export default async function Page() {
    await requirePage();
    return renderOrServiceUnavailable(
        () => getDistinctPostCategories(),
        (existingCategories) => <PostEditorPage existingCategories={existingCategories} />,
    );
}
