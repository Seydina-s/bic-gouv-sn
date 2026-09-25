import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";

/** A store pointing at a file that does not exist yet: empty until something is saved. */
export function temporaryStore(): FileArticleRepository {
  return new FileArticleRepository(join(tmpdir(), "bgs-api-tests", randomUUID(), "news.json"));
}
