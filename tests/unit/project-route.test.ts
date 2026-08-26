import { POST } from "@/app/api/projects/route";

const maximumRequestBytes = 64 * 1024;

function streamingRequest(body: string) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });

  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

test("allows an exactly 64 KiB JSON body to reach schema validation", async () => {
  const body = JSON.stringify("x".repeat(maximumRequestBytes - 2));
  expect(new TextEncoder().encode(body)).toHaveLength(maximumRequestBytes);

  const response = await POST(streamingRequest(body));

  expect(response.status).toBe(400);
  expect((await response.json()).code).toBe("INVALID_INPUT");
});

test("returns 413 while reading a stream over 64 KiB without Content-Length", async () => {
  const body = JSON.stringify("x".repeat(maximumRequestBytes - 1));
  const request = streamingRequest(body);
  expect(request.headers.get("content-length")).toBeNull();

  const response = await POST(request);

  expect(response.status).toBe(413);
  expect(await response.json()).toEqual({ code: "PAYLOAD_TOO_LARGE" });
});
