import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useStateServices } from "../near-me/useStateServices";
import { ProcedureView } from "./ProcedureView";
import { useProcedure } from "./useProcedures";

export interface ProcedurePaneProps {
  slug: string;
  bottomInset: number;
  onOpenRelated: (slug: string) => void;
  /** False in the detail pane of a two-pane layout: the screen has its own bar. */
  withAppBar?: boolean;
}

/**
 * One procedure, linked to its official page on e-senegal.sn and, when the sheet
 * says where to go, to the nearest verified service of that kind. Its own screen
 * on a phone, the detail pane beside the list on a large screen.
 */
export function ProcedurePane({
  slug,
  bottomInset,
  onOpenRelated,
  withAppBar = true,
}: ProcedurePaneProps) {
  const procedure = useProcedure(slug);
  const services = useStateServices();
  const router = useRouter();
  const kinds = useMemo(
    () => new Set((services.data?.services ?? []).map((service) => service.category)),
    [services.data],
  );
  return (
    <ProcedureView
      detail={procedure.data}
      isPending={procedure.isPending}
      bottomInset={bottomInset}
      withAppBar={withAppBar}
      onOpenRelated={onOpenRelated}
      services={{
        kinds,
        onOpen: (kind) => {
          router.navigate({ pathname: "/near-me", params: { category: kind } });
        },
      }}
    />
  );
}
