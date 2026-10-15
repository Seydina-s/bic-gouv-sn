import { privatePhoto } from "../../../../lib/private-photo";

/** A report's photo for the console, under the signed-in person's session. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return privatePhoto(id, (photo) => `/participation/photos/${photo}`);
}
