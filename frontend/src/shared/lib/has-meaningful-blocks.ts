import type { BlockInput } from "@portfolio/backend";

/** Called at persistence boundaries, not while rendering or counting each keystroke. */
export function hasMeaningfulBlocks(blocks: readonly BlockInput[]): boolean {
    return blocks.some(block => {
        if ("text" in block && block.text?.trim()) return true;
        switch (block.type) {
            case "code": return Boolean(block.data.code.trim());
            case "image": return Boolean(block.data.src.trim());
            case "diagram": return Boolean(block.data.source.trim());
            case "linkCard": return Boolean(block.data.url.trim());
            case "approachList": return block.data.items.some(item => item.title.trim() || item.description.trim());
            case "list": return block.data.items.some(item => item.text.trim() || hasMeaningfulBlocks(item.blocks));
            default: return false;
        }
    });
}
