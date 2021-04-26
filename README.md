# multipart-stream

Create ReadableStreams from multipart forms without allocating the entire form
on the heap.

## Example

```typescript
import { streamFromMultipart } from "https://deno.land/x/multipart_stream/mod.ts";

const [stream, boundary] = streamFromMultipart(async (multipartWriter) => {
  const file = await Deno.open("test.bin");
  await multipartWriter.writeFile("file", "test.bin", file);
  file.close();
});

await fetch("http://example.com/upload", {
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
  },
  body: stream,
  method: "POST",
});
```
