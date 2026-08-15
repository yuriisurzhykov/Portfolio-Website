export type ShadowLayer = {
    readonly x: number;
    readonly y: number;
    readonly blur: number;
    readonly spread: number;
    readonly color: string;
    readonly inset?: boolean;
};

export function serializeShadow(layers: readonly ShadowLayer[]): string {
    return layers
        .map((layer) => [layer.inset ? "inset" : null, `${layer.x}px`, `${layer.y}px`, `${layer.blur}px`, `${layer.spread}px`, layer.color]
            .filter((part) => part !== null)
            .join(" "))
        .join(", ");
}
