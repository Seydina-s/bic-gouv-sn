import { StatusPanel } from "../components/StatusPanel";
import { getApiStatus } from "../lib/api-status";
import { readApiUrl } from "../lib/config";

// Always the live state: never served from a cache.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const status = await getApiStatus({ apiUrl: readApiUrl(process.env) });
  return <StatusPanel status={status} />;
}
