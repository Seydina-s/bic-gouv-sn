import { writeFileSync } from "node:fs";
import { renderErrorsDoc } from "../packages/shared-types/src/errors/errors-doc";

const target = new URL("../docs/errors-catalog.md", import.meta.url);
writeFileSync(target, renderErrorsDoc());
process.stdout.write(`Written ${target.pathname}\n`);
