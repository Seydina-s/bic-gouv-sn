import type { ProcedureSummary } from "@bgs/shared-types";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatFcfa } from "./format";

export interface ProcedureFact {
  label: string;
  value: string;
}

/**
 * The known facts of a procedure (cost, delay, online). A fact the source does not
 * give is left out: "unknown" is never shown as "free" or "immediate".
 */
export function useProcedureFacts(procedure: ProcedureSummary): ProcedureFact[] {
  const { t } = useTranslation();
  const facts: ProcedureFact[] = [];
  if (procedure.costFcfa !== null) {
    facts.push({ label: t("procedures.cost"), value: formatFcfa(procedure.costFcfa) });
  }
  if (procedure.delayDays !== null) {
    facts.push({
      label: t("procedures.delay"),
      value: t("procedures.delayDays", { count: procedure.delayDays }),
    });
  }
  if (procedure.online) {
    facts.push({ label: t("procedures.online"), value: t("procedures.onlineYes") });
  }
  return facts;
}

/** Compact facts under a procedure in the list. */
export function FactChips({ facts }: { facts: ProcedureFact[] }) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius } = theme;
  if (facts.length === 0) {
    return null;
  }
  return (
    <View style={[styles.row, { gap: space.sm }]}>
      {facts.map((fact) => (
        <View
          key={fact.label}
          accessible
          accessibilityLabel={`${fact.label} : ${fact.value}`}
          style={{
            backgroundColor: color.primaryContainer,
            borderRadius: radius.sm,
            paddingHorizontal: space.sm,
            paddingVertical: space.xxs,
          }}
        >
          <Text style={[textStyle.caption, { color: color.onPrimaryContainer }]}>{fact.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Large fact cards at the top of a procedure: the answers people look for first. */
export function FactCards({ facts }: { facts: ProcedureFact[] }) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius } = theme;
  if (facts.length === 0) {
    return null;
  }
  return (
    <View style={[styles.row, { gap: space.sm, marginBottom: space.xl }]}>
      {facts.map((fact) => (
        <View
          key={fact.label}
          accessible
          accessibilityLabel={`${fact.label} : ${fact.value}`}
          style={[
            styles.card,
            {
              backgroundColor: color.surface,
              borderColor: color.border,
              borderRadius: radius.md,
              padding: space.md,
              gap: space.xxs,
            },
          ]}
        >
          <Text style={[textStyle.caption, { color: color.textSecondary }]}>{fact.label}</Text>
          <Text style={[textStyle.subtitle, { color: color.textPrimary }]}>{fact.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
  card: { flexGrow: 1, minWidth: 120, borderWidth: StyleSheet.hairlineWidth },
});
