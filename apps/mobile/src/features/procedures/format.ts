/** Fee in CFA francs, French grouping ("20 000 F CFA"). Null: unknown, shown as nothing. */
export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)}\u00a0F\u00a0CFA`;
}
