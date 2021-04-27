import {
  isFormFile,
  MultipartReader,
} from "https://deno.land/std@0.95.0/mime/multipart.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";
import { Buffer } from "https://deno.land/std@0.95.0/io/buffer.ts";
import { readerFromIterable } from "https://deno.land/std@0.95.0/io/streams.ts";
import { streamFromMultipart } from "./mod.ts";

const testBytes = new Uint8Array(2 << 16).map(() =>
  Math.round(Math.random() * 255)
);
const testBytesReader = new Buffer(testBytes) as Deno.Reader;

Deno.test({
  name: "parse",
  fn: async () => {
    const [stream, boundary] = streamFromMultipart(async (writer) => {
      await writer.writeFile("test", "test.bin", testBytesReader);
      await writer.writeField("deno", "land");
    });
    const reader = readerFromIterable(stream);
    const multipartReader = new MultipartReader(reader, boundary);
    const form = await multipartReader.readForm();

    // Ensure the file was serialized correctly.
    const formFile = form.file("test");
    assert(isFormFile(formFile), "form file is invalid");
    assertEquals(formFile.content, testBytes);

    // Ensure the field was serialized correctly.
    assertEquals(form.value("deno"), "land");
  },
});
