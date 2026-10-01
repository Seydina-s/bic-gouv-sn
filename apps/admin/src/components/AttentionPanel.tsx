import {
  ArrowRightIcon,
  CheckCircleIcon,
  WarningIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { AttentionItem } from "../lib/attention";
import { t } from "../lib/i18n";

/** Red or yellow, always with an icon: never the colour alone. */
const TONE_LOOK = {
  danger: { box: "bg-danger-surface text-on-danger-surface", Icon: WarningOctagonIcon },
  warning: { box: "bg-accent-container text-on-accent-container", Icon: WarningIcon },
} as const;

/** "À traiter": what needs a person now, each with the page where to do it. */
export function AttentionPanel({ items }: { items: readonly AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-lg bg-primary-container p-5 text-on-primary-container">
        <CheckCircleIcon aria-hidden="true" weight="fill" className="size-6 shrink-0" />
        {t("attention.none")}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const { box, Icon } = TONE_LOOK[item.tone];
        return (
          <li key={item.text}>
            <Link
              href={item.href}
              className={`flex min-h-12 items-center gap-3 rounded-lg p-5 font-semibold underline-offset-4 hover:underline focus-visible:underline ${box}`}
            >
              <Icon aria-hidden="true" weight="fill" className="size-6 shrink-0" />
              <span className="flex-1">{item.text}</span>
              <ArrowRightIcon aria-hidden="true" className="size-5 shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
