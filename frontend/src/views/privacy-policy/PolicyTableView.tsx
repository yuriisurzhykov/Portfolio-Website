import { Markdown } from "@/shared/ui/markdown";
import type { PolicyTable } from "./policy-document";

export interface PolicyTableViewProps {
    table: PolicyTable;
}

/** A policy table as semantic HTML: header cells are `th scope="col"`, and a narrow screen scrolls the table sideways instead of squeezing it. */
export function PolicyTableView({ table }: PolicyTableViewProps) {
    return (
        <div className="overflow-x-auto mt-md">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr>
                        { table.columns.map((column) => (
                            <th
                                key={ column }
                                scope="col"
                                className="py-sm pr-md align-bottom text-caption font-medium text-text-muted border-b border-border-default"
                            >
                                { column }
                            </th>
                        )) }
                    </tr>
                </thead>
                <tbody>
                    { table.rows.map((row) => (
                        <tr key={ row[0] }>
                            { row.map((cell, cellIndex) => (
                                <td
                                    key={ `${ row[0] }-${ cellIndex }` }
                                    className="py-sm pr-md align-top text-body text-text-primary border-b border-border-subtle"
                                >
                                    <Markdown text={ cell } />
                                </td>
                            )) }
                        </tr>
                    )) }
                </tbody>
            </table>
        </div>
    );
}
