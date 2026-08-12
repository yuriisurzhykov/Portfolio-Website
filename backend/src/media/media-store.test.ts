import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DiskMediaStore, UnsafeStorageKeyError } from "./media-store";

let rootDir: string;
let store: DiskMediaStore;

beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "media-store-test-"));
    store = new DiskMediaStore(rootDir);
});

afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
});

describe("DiskMediaStore", () => {
    it("writes bytes retrievable at the resolved filesystem path", async () => {
        await store.put("covers/abc-1200.webp", Buffer.from("fake webp bytes"), "image/webp");

        const written = await fs.readFile(path.join(rootDir, "covers", "abc-1200.webp"));
        expect(written.toString()).toBe("fake webp bytes");
    });

    it("creates nested directories as needed", async () => {
        await expect(store.put("a/b/c/file.webp", Buffer.from("x"), "image/webp")).resolves.toBeUndefined();
    });

    it("builds a URL under the default /media prefix", () => {
        expect(store.url("covers/abc-1200.webp")).toBe("/media/covers/abc-1200.webp");
    });

    it("honors a custom URL prefix", () => {
        const custom = new DiskMediaStore(rootDir, "/assets");
        expect(custom.url("covers/abc-1200.webp")).toBe("/assets/covers/abc-1200.webp");
    });

    it("deletes a previously written file", async () => {
        await store.put("to-delete.webp", Buffer.from("x"), "image/webp");
        await store.delete("to-delete.webp");

        await expect(fs.access(path.join(rootDir, "to-delete.webp"))).rejects.toThrow();
    });

    it("does not throw when deleting a file that never existed", async () => {
        await expect(store.delete("never-existed.webp")).resolves.toBeUndefined();
    });

    it("rejects a storage key containing a path-traversal segment, on put/url/delete alike", async () => {
        const traversal = "../../etc/passwd";
        await expect(store.put(traversal, Buffer.from("x"), "image/webp")).rejects.toThrow(UnsafeStorageKeyError);
        expect(() => store.url(traversal)).toThrow(UnsafeStorageKeyError);
        await expect(store.delete(traversal)).rejects.toThrow(UnsafeStorageKeyError);
    });
});
