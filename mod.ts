import { Channel } from "https://deno.land/x/channo@0.1.1/mod.ts";
import {
  MultipartWriter,
} from "https://deno.land/std@0.95.0/mime/multipart.ts";
import {
  readableStreamFromIterable,
  readableStreamFromReader,
  readerFromStreamReader,
} from "https://deno.land/std@0.95.0/io/streams.ts";

interface BytesMessage {
  type: "bytes";
  buffer: Uint8Array;
}

interface ErrorMessage {
  type: "error";
  error: unknown;
}

interface DoneMessage {
  type: "done";
}

type Message =
  | BytesMessage
  | ErrorMessage
  | DoneMessage;

/**
 * Creates a {@link ReadableStream} by serializing a user populated {@link MultipartWriter}.
 * 
 * @param writerFunction A function that receives a prepared {@link MultipartWriter} that the user
 * can append fields or files to.
 * @returns A tuple of {@link ReadableStream} and the multipart boundary.
 */
export function streamFromMultipart(
  writerFunction: (
    multipartWriter: MultipartWriter,
  ) => Promise<void>,
): [ReadableStream<Uint8Array>, string] {
  const channel = new Channel<Message>();

  // Creates a writer where all of the data is passed to our channel so it can be drained to a
  // ReadableStream.
  const multipartWriter = new MultipartWriter({
    write(buffer: Uint8Array): Promise<number> {
      channel.push({ type: "bytes", buffer });
      return Promise.resolve(buffer.length);
    },
  });

  // Passes the multipart writer to the caller so they can populate it.
  writerFunction(multipartWriter)
    .then(() => {
      try {
        multipartWriter.close();
      } catch (_ignored) {
        // We'll try to close the writer incase the user hasn't, if they have the close function
        // will throw an error we'll just ignore.
      }
    })
    .then(() => channel.push({ type: "done" }))
    .catch((error) => channel.push({ type: "error", error }));

  // A generator that yields values pushed to our multipart writer.
  async function* generator(): AsyncGenerator<Uint8Array, void, undefined> {
    for await (const message of channel.stream()) {
      if (message.type === "done") {
        channel.close();
        return;
      } else if (message.type === "error") {
        throw message.error;
      }

      yield message.buffer;
    }
  }

  // Yes I know this looks REALLY stupid, but I was having issues where if we used the potentially
  // broken stream we would send the data out of order. This fixes it but I have no idea why. It
  // doesn't allocate the entire stream on the heap, so I think this is going to stay for now.
  const potentiallyBrokenStream = readableStreamFromIterable(generator());
  const reader = readerFromStreamReader(potentiallyBrokenStream.getReader());
  const stream = readableStreamFromReader(reader);

  return [stream, multipartWriter.boundary];
}
