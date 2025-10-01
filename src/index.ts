import { Hono } from "hono";
import { JWT } from "google-auth-library";
import { stream } from "hono/streaming";
import { env } from "hono/adapter";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/image/:id", async (context) => {
  const fileId = context.req.param("id");
  const { GOOGLE_JWT_EMAIL, GOOGLE_JWT_PRIVATE_KEY } = env<{
    GOOGLE_JWT_PRIVATE_KEY: string;
    GOOGLE_JWT_EMAIL: string;
  }>(context);

  if (!GOOGLE_JWT_EMAIL || !GOOGLE_JWT_PRIVATE_KEY)
    return context.text("Server Error", 503);

  const auth = new JWT({
    email: GOOGLE_JWT_EMAIL,
    key: GOOGLE_JWT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const token = await auth.getAccessToken();

  // https://www.postman.com/postman/google-api-workspace/request/lunipti/get-a-file-s-metadata-or-content-by-id?tab=overview
  const filePromise = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      // TODO: add auth header
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    }
  );

  if (!filePromise.ok) return context.text("File not found", 404);

  const fileStream = filePromise.body;
  if (!fileStream) return context.text("File not found", 404);

  // https://hono.dev/docs/helpers/streaming#stream
  return stream(context, async (stream) => {
    // Write a process to be executed when aborted.
    stream.onAbort(() => {
      console.log("Aborted!");
    });
    // Pipe a readable stream.
    await stream.pipe(fileStream);
  });
});

export default app;
