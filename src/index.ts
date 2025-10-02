import { Hono } from "hono";
import { stream } from "hono/streaming";
import jwt, { JwtHeader } from "@tsndr/cloudflare-worker-jwt";

const app = new Hono<{ Bindings: CloudflareBindings }>();

function getExpirationTime(iat: number) {
  const exp = iat + 3600; // 3600 seconds = 1 hour
  return exp;
}
function byteStringToBytes(byteStr: string) {
  let bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes;
}
function base64StringToUint8Array(b64str: string) {
  console.log('### b64str', b64str);
  return byteStringToBytes(atob(b64str));
}
function pemToBinary(pem: string) {
  console.log('### pem', pem);
  
  return base64StringToUint8Array(
    pem.replace(/-+(BEGIN|END).*/g, "").replace(/\s/g, "")
  );
}

app.get("/image/:id", async (context) => {
  const fileId = context.req.param("id");
  const {
    GOOGLE_JWT_EMAIL,
    GOOGLE_JWT_PRIVATE_KEY,
    GOOGLE_JWT_PRIVATE_KEY_ID,
  } = context.env;

  if (
    !GOOGLE_JWT_EMAIL ||
    !GOOGLE_JWT_PRIVATE_KEY ||
    !GOOGLE_JWT_PRIVATE_KEY_ID
  )
    return context.text("Server Error", 503);

  // https://developers.google.com/identity/protocols/oauth2/service-account#httprest
  const jwtHeader = {
    alg: "RS256",
    typ: "JWT",
    kid: GOOGLE_JWT_PRIVATE_KEY_ID,
  } satisfies JwtHeader<{ kid: string }>;
  const iat = Math.floor(Date.now() / 1000);
  const exp = getExpirationTime(iat);

  const secret = await crypto.subtle.importKey(
    "pkcs8",
    pemToBinary(GOOGLE_JWT_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    true,
    ["sign"]
  );
  const signedJWT = await jwt.sign(
    {
      iss: GOOGLE_JWT_EMAIL,
      sub: GOOGLE_JWT_EMAIL,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp,
      iat,
    },
    secret,
    {
      algorithm: "RS256",
      header: jwtHeader,
    }
  );

  const tokenUrl = new URL("https://oauth2.googleapis.com/token");
  tokenUrl.searchParams.set(
    "grant_type",
    "urn:ietf:params:oauth:grant-type:jwt-bearer"
  );
  tokenUrl.searchParams.set("assertion", signedJWT);

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!tokenResponse.ok) {
    console.log(tokenResponse.status, await tokenResponse.text());
    return context.text("Token Server Error", 503);
  }

  const token = await tokenResponse.json();
  if (typeof token !== "object" || !token || !("access_token" in token))
    return context.text("Token Response Error", 503);

  // https://www.postman.com/postman/google-api-workspace/request/lunipti/get-a-file-s-metadata-or-content-by-id?tab=overview
  const filePromise = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
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
