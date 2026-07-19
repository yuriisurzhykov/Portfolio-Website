import { notFound } from "next/navigation";
import { getPostForAdmin } from "@portfolio/backend";
import { PostEditorPage } from "@/views/admin-post-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const post = await getPostForAdmin(slug);
            if (!post) {
                notFound();
            }
            return post;
        },
        (post) => <PostEditorPage initialPost={post} />,
    );
}
