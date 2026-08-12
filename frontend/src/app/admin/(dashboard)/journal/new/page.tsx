import { getDistinctPostCategories, getWorkForAdmin } from "@portfolio/backend";
import { PostEditorPage } from "@/views/admin-post-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

/** `requirePage()` here, not just in the shared layout — see `journal/[slug]/edit/page.tsx`'s comment for why. */
export default async function Page() {
    await requirePage();
    return renderOrServiceUnavailable(
        async () => {
            const [existingCategories, work] = await Promise.all([getDistinctPostCategories(), getWorkForAdmin()]);
            return { existingCategories, workOptions: work.map((item) => ({ slug: item.slug, label: item.title.en })) };
        },
        ({ existingCategories, workOptions }) => <PostEditorPage existingCategories={existingCategories} workOptions={workOptions} />,
    );
}
