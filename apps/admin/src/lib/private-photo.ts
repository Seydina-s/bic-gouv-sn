import { adminPicture } from "./admin-api";
import { readCookie, SESSION_COOKIE } from "./session";

/** Only an id (a UUID) is ever passed on to the API. */
const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A photo kept by the API (a report's, a written message's), for the console: fetched
 * with the signed-in person's session, so the browser never holds the API's token,
 * and nothing is cached on the way.
 */
export async function privatePhoto(id: string, apiPath: (id: string) => string): Promise<Response> {
  const token = await readCookie(SESSION_COOKIE);
  if (token === null || !PHOTO_ID.test(id)) {
    return new Response(null, { status: 404 });
  }
  const photo = await adminPicture(apiPath(id), token);
  return photo === null
    ? new Response(null, { status: 404 })
    : new Response(photo, {
        headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" },
      });
}
