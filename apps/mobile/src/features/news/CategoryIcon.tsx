import { categoryTone, type CategoryTone } from "@bgs/ui";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { ApertureIcon as Aperture } from "phosphor-react-native/src/icons/Aperture";
import { BankIcon as Bank } from "phosphor-react-native/src/icons/Bank";
import { CalendarDotsIcon as CalendarDots } from "phosphor-react-native/src/icons/CalendarDots";
import { ChatsCircleIcon as ChatsCircle } from "phosphor-react-native/src/icons/ChatsCircle";
import { GlobeHemisphereEastIcon as GlobeHemisphereEast } from "phosphor-react-native/src/icons/GlobeHemisphereEast";
import { MegaphoneIcon as Megaphone } from "phosphor-react-native/src/icons/Megaphone";
import { MicrophoneStageIcon as MicrophoneStage } from "phosphor-react-native/src/icons/MicrophoneStage";
import { NewspaperIcon as Newspaper } from "phosphor-react-native/src/icons/Newspaper";
import type { ComponentType } from "react";
import { Icon } from "../../components/Icon";
import { useTheme } from "../../theme/useTheme";

/** One icon per section, chosen for its key word; the section name always follows. */
const GLYPHS: Record<string, ComponentType<PhosphorProps>> = {
  "conseil-des-ministres": Bank,
  communiques: Megaphone,
  discours: MicrophoneStage,
  international: GlobeHemisphereEast,
  focus: Aperture,
  interviews: ChatsCircle,
  agenda: CalendarDots,
};

/** The section's tone in the active theme (neutral for unknown sections). */
export function useCategoryTone(category: string): CategoryTone {
  const { theme } = useTheme();
  return categoryTone(theme.categoryTones, category);
}

export interface CategoryIconProps {
  category: string;
  size?: "sm" | "md" | "lg";
  /** Defaults to the section's own ink. */
  color?: string;
}

/** Decorative: always shown next to the section name, which screen readers read. */
export function CategoryIcon({ category, size = "sm", color }: CategoryIconProps) {
  const tone = useCategoryTone(category);
  return (
    <Icon
      icon={GLYPHS[category] ?? Newspaper}
      size={size}
      weight="duotone"
      color={color ?? tone.ink}
    />
  );
}
