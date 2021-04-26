import {
  isFormFile,
  MultipartReader,
} from "https://deno.land/std@0.95.0/mime/multipart.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";
import { Buffer } from "https://deno.land/std@0.95.0/io/buffer.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.95.0/io/streams.ts";
import { streamFromMultipart } from "./mod.ts";

const textEncoder = new TextEncoder();
const textBytes = textEncoder.encode("denoland".repeat(1024));
const textBytesReader = new Buffer(textBytes) as Deno.Reader;

Deno.test({
  name: "parse",
  fn: async () => {
    const [stream, boundary] = streamFromMultipart(async (writer) => {
      await writer.writeFile("test", "test.bin", textBytesReader);
      await writer.writeField("deno", "land");
    });

    const reader = readerFromStreamReader(stream.getReader());
    const multipartReader = new MultipartReader(reader, boundary);
    const form = await multipartReader.readForm();

    // Ensure the file was serialized correctly.
    const formFile = form.file("test");
    assert(isFormFile(formFile), "form file is invalid");
    assertEquals(formFile.content, textBytes);

    // Ensure the field was serialized correctly.
    assertEquals(form.value("deno"), "land");
  },
});
