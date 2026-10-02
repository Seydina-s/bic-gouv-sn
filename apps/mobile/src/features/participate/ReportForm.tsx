import { REPORT_CATEGORIES, type ReportCategory } from "@bgs/shared-types";
import { Image } from "expo-image";
import { CameraIcon as Camera } from "phosphor-react-native/src/icons/Camera";
import { ImageIcon } from "phosphor-react-native/src/icons/Image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createParticipationClient } from "../../api/participation-client";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { SectionChip } from "../news/SectionChip";
import { Field, MAX_TEXT, MIN_TEXT, SendRow } from "./FormParts";
import { usePhotoPicker } from "./usePhotoPicker";
import { useSending } from "./useSending";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createParticipationClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/** The longest place name the API accepts. */
const MAX_PLACE = 120;

function PhotoButton({
  icon,
  label,
  onPress,
}: {
  icon: typeof Camera;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.photoButton,
        {
          gap: space.sm,
          minHeight: touchTarget.min,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          borderColor: color.borderStrong,
          backgroundColor: pressed ? color.surface : color.background,
        },
      ]}
    >
      <Icon icon={icon} size="sm" color={color.textBrand} />
      <Text style={[textStyle.label, { color: color.textBrand }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * "Signaler un problème" (decision of the user, 01/10/2026): what kind, a photo if
 * wished, what was seen and where. Received by the team in the console.
 */
export function ReportForm() {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [category, setCategory] = useState<ReportCategory>("voirie");
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  const photos = usePhotoPicker();
  const { state, submit, reset } = useSending((key) =>
    client.sendReport(
      {
        category,
        text,
        place: place.trim() === "" ? null : place.trim(),
        photo: photos.photo?.base64 ?? null,
        lang,
      },
      key,
    ),
  );
  const { color, space, textStyle, radius, layout } = theme;

  return (
    <View style={{ gap: space.md }}>
      <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
        {t("participate.reportTitle")}
      </Text>
      <Text style={[textStyle.body, { color: color.textSecondary }]}>
        {t("participate.reportIntro")}
      </Text>
      <Text style={[textStyle.label, { color: color.textPrimary }]}>
        {t("participate.category")}
      </Text>
      <View style={[styles.row, styles.wrap, { gap: space.sm }]}>
        {REPORT_CATEGORIES.map((one) => (
          <SectionChip
            key={one}
            category={null}
            label={t(`participate.categories.${one}`)}
            active={category === one}
            onPress={() => {
              setCategory(one);
            }}
          />
        ))}
      </View>
      {photos.available ? (
        photos.photo === null ? (
          <View style={[styles.row, styles.wrap, { gap: space.sm }]}>
            <PhotoButton
              icon={Camera}
              label={t("participate.takePhoto")}
              onPress={() => void photos.pick("camera")}
            />
            <PhotoButton
              icon={ImageIcon}
              label={t("participate.choosePhoto")}
              onPress={() => void photos.pick("library")}
            />
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            <Image
              source={{ uri: photos.photo.uri }}
              accessibilityLabel={t("participate.photoAlt")}
              contentFit="cover"
              style={{
                width: "100%",
                aspectRatio: layout.coverAspectRatio,
                borderRadius: radius.md,
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={photos.remove}
              style={dimWhenPressed(
                [styles.remove, { minHeight: theme.touchTarget.min }],
                theme.opacity.controlPressed,
              )}
            >
              <Text style={[textStyle.label, { color: color.textBrand }]}>
                {t("participate.removePhoto")}
              </Text>
            </Pressable>
          </View>
        )
      ) : (
        <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
          {t("participate.photoLater")}
        </Text>
      )}
      {photos.cameraDenied && (
        <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>
          {t("participate.cameraDenied")}
        </Text>
      )}
      <Field
        label={t("participate.reportLabel")}
        value={text}
        multiline
        maxLength={MAX_TEXT}
        onChange={(next) => {
          setText(next);
          reset();
        }}
      />
      <Field
        label={t("participate.placeLabel")}
        value={place}
        maxLength={MAX_PLACE}
        onChange={(next) => {
          setPlace(next);
          reset();
        }}
      />
      <SendRow
        state={state}
        ready={text.trim().length >= MIN_TEXT}
        sentMessage={t("participate.reportSent")}
        onSend={() => {
          void submit().then((sent) => {
            if (sent) {
              setText("");
              setPlace("");
              photos.remove();
            }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  wrap: { flexWrap: "wrap" },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  remove: { justifyContent: "center", alignSelf: "flex-start" },
});
