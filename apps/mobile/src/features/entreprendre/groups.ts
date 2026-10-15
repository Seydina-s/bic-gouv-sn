import type { EntreprendreGroup, EntreprendreSlug } from "@bgs/shared-types";
import { BuildingsIcon as Buildings } from "phosphor-react-native/src/icons/Buildings";
import { CoinsIcon as Coins } from "phosphor-react-native/src/icons/Coins";
import { FileArrowUpIcon as FileArrowUp } from "phosphor-react-native/src/icons/FileArrowUp";
import { HandshakeIcon as Handshake } from "phosphor-react-native/src/icons/Handshake";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import type { IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";

/** Each group of the space: its icon, and the page a shortcut opens. */
export const GROUPS: Readonly<
  Record<EntreprendreGroup, { icon: ComponentType<IconProps>; first: EntreprendreSlug }>
> = {
  deposer: { icon: FileArrowUp, first: "comment-deposer" },
  financer: { icon: Coins, first: "types-de-financements" },
  accompagner: { icon: Handshake, first: "formation-assistance" },
  trouver: { icon: MapPin, first: "antennes" },
  der: { icon: Buildings, first: "presentation" },
};

/** The groups in the order the space shows them: applying first. */
export const GROUP_ORDER: readonly EntreprendreGroup[] = [
  "deposer",
  "financer",
  "accompagner",
  "trouver",
  "der",
];
