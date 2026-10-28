import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/** A throwaway HTTP server on 127.0.0.1 for the link-preview tests — real sockets, real redirects, no mocked `fetch`. */
export async function startTestServer(handler: (request: IncomingMessage, response: ServerResponse) => void): Promise<{ origin: string; close: () => Promise<void> }> {
    const server = http.createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    return {
        origin: `http://127.0.0.1:${ port }`,
        close: () => new Promise<void>((resolve) => {
            server.closeAllConnections();
            server.close(() => resolve());
        }),
    };
}

/** What the tests pass to reach that local server: every address and port allowed. */
export const LOCAL_FETCH = { isAllowedAddress: () => true, allowAnyPort: true } as const;
