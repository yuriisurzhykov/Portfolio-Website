import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IP_CAMERAS_HUB_POLICY, PRIVACY_CONTACT_EMAIL } from "./ip-cameras-hub-policy";
import type { PolicyDocument, PolicyTable } from "./policy-document";
import { PrivacyPolicyPage } from "./PrivacyPolicyPage";

/** Every string of a policy, headings and table cells included, in reading order. */
function allTexts(policy: PolicyDocument): string[] {
    const texts = [policy.title, policy.intro];
    for (const section of policy.sections) {
        texts.push(section.heading);
        for (const block of section.blocks) {
            if (block.kind === "paragraph" || block.kind === "subheading") {
                texts.push(block.text);
            } else if (block.kind === "list") {
                texts.push(...block.items);
            } else {
                texts.push(...block.table.columns, ...block.table.rows.flat());
            }
        }
    }
    return texts;
}

function tablesOf(policy: PolicyDocument): PolicyTable[] {
    return policy.sections.flatMap((section) =>
        section.blocks.flatMap((block) => (block.kind === "table" ? [block.table] : [])),
    );
}

describe("the privacy policy page", () => {
    it("shows the title, the date and one level-2 heading per section, in order", () => {
        render(<PrivacyPolicyPage policy={ IP_CAMERAS_HUB_POLICY } />);

        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy Policy for IP Cameras Hub");
        expect(screen.getByText(`Last updated: ${ IP_CAMERAS_HUB_POLICY.updated }`)).toBeInTheDocument();
        expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent))
            .toEqual(IP_CAMERAS_HUB_POLICY.sections.map((section) => section.heading));
    });

    it("names each section by its own heading", () => {
        render(<PrivacyPolicyPage policy={ IP_CAMERAS_HUB_POLICY } />);

        for (const section of IP_CAMERAS_HUB_POLICY.sections) {
            expect(screen.getByRole("region", { name: section.heading })).toBeInTheDocument();
        }
    });

    it("shows a subheading as a level-3 heading inside its section", () => {
        render(<PrivacyPolicyPage policy={ IP_CAMERAS_HUB_POLICY } />);

        const subheading = screen.getByRole("heading", { level: 3, name: "Firebase Analytics" });

        expect(subheading.closest("section")).toBe(
            screen.getByRole("region", { name: "6. Services of other companies" }),
        );
    });

    it("offers the contact address as a mailto link wherever the policy names it", () => {
        render(<PrivacyPolicyPage policy={ IP_CAMERAS_HUB_POLICY } />);
        const namedInText = allTexts(IP_CAMERAS_HUB_POLICY)
            .flatMap((text) => [...text.matchAll(/\]\(mailto:/g)]);

        const links = screen.getAllByRole("link", { name: PRIVACY_CONTACT_EMAIL });

        expect(links).toHaveLength(namedInText.length);
        expect(links.length).toBeGreaterThanOrEqual(4);
        for (const link of links) {
            expect(link).toHaveAttribute("href", `mailto:${ PRIVACY_CONTACT_EMAIL }`);
        }
    });

    it("renders every table with column headers and complete rows", () => {
        render(<PrivacyPolicyPage policy={ IP_CAMERAS_HUB_POLICY } />);
        const tables = tablesOf(IP_CAMERAS_HUB_POLICY);

        const rendered = screen.getAllByRole("table");

        expect(rendered).toHaveLength(tables.length);
        rendered.forEach((table, index) => {
            expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent))
                .toEqual(tables[index].columns);
            expect(within(table).getAllByRole("row")).toHaveLength(tables[index].rows.length + 1);
        });
    });
});

describe("the text of the policy", () => {
    it("gives every table row exactly as many cells as the table has columns", () => {
        for (const table of tablesOf(IP_CAMERAS_HUB_POLICY)) {
            for (const row of table.rows) {
                expect(row).toHaveLength(table.columns.length);
            }
        }
    });

    it("uses the current name of the app and never the old one", () => {
        const text = allTexts(IP_CAMERAS_HUB_POLICY).join("\n");

        expect(text).toContain("IP Cameras Hub");
        expect(text).not.toMatch(/WiFi Cameras/i);
    });

    it("links only over https", () => {
        const links = allTexts(IP_CAMERAS_HUB_POLICY)
            .flatMap((text) => [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]));

        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
            expect(link.startsWith("https://") || link.startsWith("mailto:")).toBe(true);
        }
    });
});
