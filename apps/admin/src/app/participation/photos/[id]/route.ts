import { adminPicture } from "../../../../lib/admin-api";
import { readCookie, SESSION_COOKIE } from "../../../../lib/session";

/** Only a report's photo id (a UUID) is ever asked of the API. */
const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A report's photo for the console, fetched with the signed-in person's session:
 * the browser never holds the API's token, and nothing is cached on the way.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = await readCookie(SESSION_COOKIE);
  if (token === null || !PHOTO_ID.test(id)) {
    return new Response(null, { status: 404 });
  }
  const photo = await adminPicture(`/participation/photos/${id}`, token);
  return photo === null
    ? new Response(null, { status: 404 })
    : new Response(photo, {
        headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" },
      });
}
