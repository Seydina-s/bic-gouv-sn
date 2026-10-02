import { REPORT_CATEGORIES, REPORT_DETAIL_MAX, type ReportCategory } from "@bgs/shared-types";
import { Image } from "expo-image";
import { CameraIcon as Camera } from "phosphor-react-native/src/icons/Camera";
import { DotsThreeCircleIcon as DotsThreeCircle } from "phosphor-react-native/src/icons/DotsThreeCircle";
import { DropIcon as Drop } from "phosphor-react-native/src/icons/Drop";
import { ImageIcon } from "phosphor-react-native/src/icons/Image";
import { LightbulbIcon as Lightbulb } from "phosphor-react-native/src/icons/Lightbulb";
import { RoadHorizonIcon as RoadHorizon } from "phosphor-react-native/src/icons/RoadHorizon";
import { TrashIcon as Trash } from "phosphor-react-native/src/icons/Trash";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../../api/base-url";
import { createParticipationClient } from "../../api/participation-client";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { Field, MAX_TEXT, MIN_TEXT, SendRow } from "./FormParts";
import {
  ChoiceTiles,
  NextButton,
  StepBody,
  StepFooter,
  StepHeader,
  type Choice,
} from "./GuidedSteps";
import { SentCard } from "./SentCard";
import { usePhotoPicker } from "./usePhotoPicker";
import { useSending } from "./useSending";

const client = createParticipationClient({ baseUrl: API_BASE_URL });

const ICONS: Record<ReportCategory, Choice<ReportCategory>["icon"]> = {
  voirie: RoadHorizon,
  eclairage: Lightbulb,
  salubrite: Trash,
  eau: Drop,
  autre: DotsThreeCircle,
};

/** The longest place name the API accepts. */
const MAX_PLACE = 120;
/** The shortest kind of problem the API accepts, for "Autre". */
const MIN_DETAIL = 3;
const STEPS = 4;

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
          minHeight: touchTarget.min * 2,
          padding: space.lg,
          borderRadius: radius.lg,
          borderColor: color.border,
          backgroundColor: pressed ? color.surface : color.background,
        },
      ]}
    >
      <Icon icon={icon} size="lg" weight="duotone" color={color.textBrand} />
      <Text style={[textStyle.label, { color: color.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

/** Step 2: a photo taken or chosen, shown once there; optional. */
function PhotoStep({ photos }: { photos: ReturnType<typeof usePhotoPicker> }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, layout } = theme;
  if (!photos.available) {
    return (
      <Text style={[textStyle.body, { color: color.textSecondary }]}>
        {t("participate.photoLater")}
      </Text>
    );
  }
  if (photos.photo !== null) {
    return (
      <View style={{ gap: space.sm }}>
        <Image
          source={{ uri: photos.photo.uri }}
          accessibilityLabel={t("participate.photoAlt")}
          contentFit="cover"
          style={{ width: "100%", aspectRatio: layout.coverAspectRatio, borderRadius: radius.lg }}
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
    );
  }
  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.row, { gap: space.sm }]}>
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
      <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
        {t("participate.photoHint")}
      </Text>
      {photos.cameraDenied && (
        <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>
          {t("participate.cameraDenied")}
        </Text>
      )}
    </View>
  );
}

/**
 * "Signaler un problème" (decisions of the user, 01/10 and 02/10/2026) in four
 * steps: what kind (said in words for "Autre"), a photo, where, what happened.
 */
export function ReportFlow() {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [detail, setDetail] = useState("");
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  const photos = usePhotoPicker();
  const { state, submit, reset } = useSending((key) =>
    client.sendReport(
      {
        category: category ?? "autre",
        detail: category === "autre" ? detail.trim() : null,
        text,
        place: place.trim() === "" ? null : place.trim(),
        photo: photos.photo?.base64 ?? null,
        lang,
      },
      key,
    ),
  );
  const choices = REPORT_CATEGORIES.map((value) => ({
    value,
    label: t(`participate.categories.${value}`),
    hint: t(`participate.categoryHints.${value}`),
    icon: ICONS[value],
  }));
  const kindReady =
    category !== null && (category !== "autre" || detail.trim().length >= MIN_DETAIL);
  const next = (
    <NextButton
      label={t("participate.next")}
      enabled={step !== 1 || kindReady}
      onPress={() => {
        setStep(step + 1);
      }}
    />
  );
  const back = () => {
    setStep(step - 1);
  };

  if (state.phase === "sent") {
    return (
      <SentCard
        message={t("participate.reportSent")}
        again={t("participate.again.report")}
        onAgain={() => {
          setStep(1);
          setCategory(null);
          setDetail("");
          setText("");
          setPlace("");
          photos.remove();
          reset();
        }}
      />
    );
  }
  if (step === 1) {
    const question = t("participate.questions.kind");
    return (
      <StepBody step={1}>
        <StepHeader
          step={1}
          count={STEPS}
          question={question}
          choices={choices.map((choice) => choice.label)}
        />
        <ChoiceTiles
          title={question}
          choices={choices}
          selected={category}
          onSelect={setCategory}
        />
        {category === "autre" && (
          <Field
            label={t("participate.detailLabel")}
            value={detail}
            maxLength={REPORT_DETAIL_MAX}
            onChange={setDetail}
          />
        )}
        <StepFooter onBack={null}>{next}</StepFooter>
      </StepBody>
    );
  }
  if (step === 2) {
    return (
      <StepBody step={2}>
        <StepHeader step={2} count={STEPS} question={t("participate.questions.photo")} />
        <PhotoStep photos={photos} />
        <StepFooter onBack={back}>{next}</StepFooter>
      </StepBody>
    );
  }
  if (step === 3) {
    return (
      <StepBody step={3}>
        <StepHeader step={3} count={STEPS} question={t("participate.questions.place")} />
        <Field
          label={t("participate.placeLabel")}
          value={place}
          maxLength={MAX_PLACE}
          onChange={setPlace}
        />
        <Text style={[theme.textStyle.bodySmall, { color: theme.color.textTertiary }]}>
          {t("participate.placeHint")}
        </Text>
        <StepFooter onBack={back}>{next}</StepFooter>
      </StepBody>
    );
  }
  return (
    <StepBody step={4}>
      <StepHeader step={4} count={STEPS} question={t("participate.questions.report")} />
      <Field
        label={t("participate.reportLabel")}
        value={text}
        multiline
        maxLength={MAX_TEXT}
        onChange={(value) => {
          setText(value);
          reset();
        }}
      />
      <StepFooter onBack={back}>
        <SendRow
          state={state}
          ready={text.trim().length >= MIN_TEXT}
          sentMessage={t("participate.reportSent")}
          onSend={() => void submit()}
        />
      </StepFooter>
    </StepBody>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  photoButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  remove: { justifyContent: "center", alignSelf: "flex-start" },
});
