import { Storybook } from "@/views/storybook";
import { NOINDEX } from "@/shared/lib/seo/noindex";

/** A component playground has nothing a visitor should ever arrive at from a search result — kept out of the index regardless of what robots.txt says (a `Disallow`ed URL can still be indexed from an inbound link). */
export const metadata = NOINDEX;

export default function Page() {
    return <Storybook />;
}
