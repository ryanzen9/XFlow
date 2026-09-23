import { describe, expect, test } from "bun:test";
import { createZip, readZipDirectory, readZipEntry } from "./archive";

const encoder = new TextEncoder();

function entry(path: string, content: string | Uint8Array) {
  return { path, data: typeof content === "string" ? encoder.encode(content) : content };
}

const sample = [
  entry("manifest.json", JSON.stringify({ manifest_version: 3 })),
  entry("assets/deep/nested.txt", "nested content ".repeat(64)),
  entry("tiny.txt", "x"),
  entry("empty.txt", ""),
  entry("unicode-中文.txt", "中文内容"),
  entry("binary.bin", new Uint8Array([0, 1, 2, 253, 254, 255])),
];

describe("zip round trip", () => {
  test("restores every entry byte for byte", () => {
    const archive = createZip(sample);
    for (const file of sample) {
      expect(Buffer.compare(Buffer.from(readZipEntry(archive, file.path)), Buffer.from(file.data))).toBe(0);
    }
  });

  test("lists entries with their stored size and method", () => {
    const records = readZipDirectory(createZip(sample));
    expect(records.map((record) => record.path).toSorted()).toEqual(sample.map((file) => file.path).toSorted());
    expect(records.find((record) => record.path === "tiny.txt")).toMatchObject({ method: "store", size: 1 });
    expect(records.find((record) => record.path === "assets/deep/nested.txt")).toMatchObject({ method: "deflate" });
    expect(records.find((record) => record.path === "empty.txt")).toMatchObject({ size: 0, compressedSize: 0 });
  });

  test("produces identical bytes for identical input", () => {
    const first = createZip(sample);
    const second = createZip(sample);
    expect(Buffer.compare(Buffer.from(first), Buffer.from(second))).toBe(0);
  });

  test("stores the requested entry first and sorts the rest", () => {
    const paths = readZipDirectory(createZip(sample, { first: "manifest.json" })).map((record) => record.path);
    expect(paths[0]).toBe("manifest.json");
    expect(paths.slice(1)).toEqual(paths.slice(1).toSorted());
  });

  test("reports a missing entry instead of returning nothing", () => {
    const archive = createZip(sample);
    expect(() => readZipEntry(archive, "absent.js")).toThrow("absent.js is not part of the archive");
  });

  test("rejects bytes that are not a ZIP archive", () => {
    expect(() => readZipDirectory(encoder.encode("not a zip"))).toThrow("end of central directory record not found");
  });

  test("detects a corrupted payload through its CRC-32", () => {
    const archive = createZip(sample);
    const target = readZipDirectory(archive).find((record) => record.path === "tiny.txt");
    if (!target) throw new Error("tiny.txt missing from the sample archive");
    const damaged = archive.slice();
    damaged[target.offset + 30 + target.path.length] = 0x79;
    expect(() => readZipEntry(damaged, "tiny.txt")).toThrow();
  });
});
