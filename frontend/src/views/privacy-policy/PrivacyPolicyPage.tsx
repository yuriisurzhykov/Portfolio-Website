import { Markdown } from "@/shared/ui/markdown";
import { Text } from "@/shared/ui/text";
import type { PolicyDocument } from "./policy-document";
import { PolicyBlockView } from "./PolicyBlockView";

export interface PrivacyPolicyPageProps {
    policy: PolicyDocument;
}

/**
 * A privacy policy as a reading page: title, date, intro, numbered sections.
 * The text arrives as data (`PolicyDocument`) from the route, so the page itself
 * holds no wording and reads no database.
 */
export function PrivacyPolicyPage({ policy }: PrivacyPolicyPageProps) {
    return (
        <main>
            <div className="max-w-(--layout-content-reading) mx-auto px-(--layout-reading-horizontal-padding) pt-(--layout-reading-top-padding) pb-25">
                <Text as="h1" variant="h1" className="m-0 mb-md">
                    { policy.title }
                </Text>
                <Text variant="caption" tone="faint" className="font-mono mb-lg">
                    Last updated: { policy.updated }
                </Text>
                <Text variant="body-lg" tone="secondary">
                    <Markdown text={ policy.intro } />
                </Text>
                { policy.sections.map((section, index) => {
                    const headingId = `policy-section-${ index + 1 }`;
                    return (
                        <section key={ headingId } aria-labelledby={ headingId } className="mt-xl">
                            <Text as="h2" variant="h2" id={ headingId } className="m-0">
                                { section.heading }
                            </Text>
                            { section.blocks.map((block, blockIndex) => (
                                <PolicyBlockView key={ `${ headingId }-${ blockIndex }` } block={ block } />
                            )) }
                        </section>
                    );
                }) }
            </div>
        </main>
    );
}
