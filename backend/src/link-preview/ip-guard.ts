import { BlockList, isIPv4, isIPv6 } from "node:net";

/**
 * Every address range a server-side fetch on an author's behalf must never
 * reach — the SSRF half of `safe-fetch.ts`. Loopback, RFC 1918 private
 * networks, link-local (169.254.0.0/16 is where cloud metadata services
 * live), CGNAT, multicast, documentation/benchmark ranges and their IPv6
 * equivalents. An allow-by-default list of "bad" ranges is the right shape
 * here (unlike `safe-href.ts`'s scheme allow-list): the public internet is
 * the thing being allowed, and it has no short positive definition.
 */
const BLOCKED = new BlockList();

for (const [network, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
] as const) {
    BLOCKED.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["64:ff9b::", 96],
    ["100::", 64],
    ["2001:db8::", 32],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
] as const) {
    BLOCKED.addSubnet(network, prefix, "ipv6");
}

/** `::ffff:10.0.0.1` is 10.0.0.1 — checked as the IPv4 address it really is, not as an IPv6 address no rule above happens to cover. */
function embeddedIPv4(address: string): string | null {
    const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    return match ? match[1] : null;
}

/** `true` only for a syntactically valid address outside every blocked range. Anything unparseable is refused. */
export function isPublicAddress(address: string): boolean {
    const mapped = embeddedIPv4(address);
    if (mapped) {
        return isPublicAddress(mapped);
    }
    if (isIPv4(address)) {
        return !BLOCKED.check(address, "ipv4");
    }
    if (isIPv6(address)) {
        return !BLOCKED.check(address, "ipv6");
    }
    return false;
}
