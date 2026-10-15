"use client";

import { MESSAGE_BODY_MAX, MESSAGE_TITLE_MAX } from "@bgs/shared-types";
import { useActionState, useEffect, useState } from "react";
import { IdempotencyKey } from "../../components/IdempotencyKey";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { field, primaryButton, secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import {
  decideNotification,
  prepareMessage,
  prepareNotification,
  setAutomaticNotifications,
} from "./actions";

export interface ArticleChoice {
  id: string;
  label: string;
}

/** Chooses one of the latest official articles: its title becomes the notification. */
export function PrepareForm({
  articles,
  idempotencyKey,
}: {
  articles: readonly ArticleChoice[];
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(prepareNotification, {});
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <IdempotencyKey value={idempotencyKey} />
      <div className="space-y-2">
        <label htmlFor="articleId" className="block font-semibold">
          {t("notifications.article")}
        </label>
        <select id="articleId" name="articleId" required defaultValue="" className={field}>
          <option value="" disabled>
            {t("notifications.choose")}
          </option>
          {articles.map((article) => (
            <option key={article.id} value={article.id}>
              {article.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("notifications.prepare")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}

/** Characters left in a field, read out politely as the person types. */
function Remaining({ id, left }: { id: string; left: number }) {
  return (
    <p id={id} aria-live="polite" className="text-sm text-ink-soft">
      {t("notifications.remaining", { count: left })}
    </p>
  );
}

/**
 * A message written by the team (owner's request, 14/10/2026): a title, a few lines,
 * an optional photo, and a live preview of how a phone shows it. Sent once another
 * person checks it, like any notification prepared by hand.
 */
export function MessageForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(prepareMessage, {});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // The preview's object URL is released when replaced or when the form goes.
  useEffect(
    () => () => {
      if (photoUrl !== null) {
        URL.revokeObjectURL(photoUrl);
      }
    },
    [photoUrl],
  );

  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form action={action} className="space-y-5">
        <IdempotencyKey value={idempotencyKey} />
        <div className="space-y-2">
          <label htmlFor="message-title" className="block font-semibold">
            {t("notifications.messageHeading")}
          </label>
          <input
            id="message-title"
            name="title"
            required
            maxLength={MESSAGE_TITLE_MAX}
            aria-describedby="message-title-left"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className={field}
          />
          <Remaining id="message-title-left" left={MESSAGE_TITLE_MAX - title.length} />
        </div>
        <div className="space-y-2">
          <label htmlFor="message-body" className="block font-semibold">
            {t("notifications.messageBody")}
          </label>
          <textarea
            id="message-body"
            name="body"
            required
            rows={4}
            maxLength={MESSAGE_BODY_MAX}
            aria-describedby="message-body-left"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
            }}
            className={`${field} py-3`}
          />
          <Remaining id="message-body-left" left={MESSAGE_BODY_MAX - body.length} />
        </div>
        <fieldset className="space-y-2">
          <legend className="font-semibold">{t("notifications.messageLang")}</legend>
          <div className="flex flex-wrap gap-6">
            {(["fr", "wo"] as const).map((lang) => (
              <label key={lang} className="inline-flex min-h-12 items-center gap-2">
                <input type="radio" name="lang" value={lang} defaultChecked={lang === "fr"} />
                {t(lang === "fr" ? "notifications.langFr" : "notifications.langWo")}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <label htmlFor="message-photo" className="block font-semibold">
            {t("notifications.photo")}
          </label>
          <input
            id="message-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="message-photo-help"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPhotoUrl(file === undefined ? null : URL.createObjectURL(file));
            }}
            className="block min-h-12 w-full text-sm file:mr-4 file:min-h-12 file:rounded-md file:border file:border-line-strong file:bg-surface-raised file:px-4 file:font-semibold file:text-brand"
          />
          <p id="message-photo-help" className="text-sm text-ink-soft">
            {t("notifications.photoHelp")}
          </p>
        </div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {t("notifications.prepare")}
        </button>
        <FormOutcome state={state} />
      </form>
      <MessagePreview title={title} body={body} photoUrl={photoUrl} />
    </div>
  );
}

/** How a phone shows the message: the app's name, the title, the lines, the photo. */
function MessagePreview({
  title,
  body,
  photoUrl,
}: {
  title: string;
  body: string;
  photoUrl: string | null;
}) {
  const empty = title.trim() === "" && body.trim() === "";
  return (
    <figure aria-label={t("notifications.preview")} className="space-y-3">
      <figcaption className="text-sm font-semibold text-ink-soft">
        {t("notifications.preview")}
      </figcaption>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm">
        <div className="space-y-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {t("notifications.previewApp")}
          </p>
          {empty ? (
            <p className="text-sm text-ink-soft">{t("notifications.previewEmpty")}</p>
          ) : (
            <>
              <p className="font-semibold leading-snug break-words">{title}</p>
              <p className="whitespace-pre-line text-sm leading-snug break-words text-ink-soft">
                {body}
              </p>
            </>
          )}
        </div>
        {photoUrl !== null && (
          // A local preview of the file chosen: never sent anywhere from here.
          <img src={photoUrl} alt="" className="aspect-video w-full object-cover" />
        )}
      </div>
    </figure>
  );
}

/** Approve (another person than the author) or cancel one waiting notification. */
export function DecisionForm({ id, canApprove }: { id: string; canApprove: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(decideNotification, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-3">
        {canApprove && (
          <button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
            className={primaryButton}
          >
            {t("notifications.approve")}
          </button>
        )}
        <button
          type="submit"
          name="decision"
          value="cancel"
          disabled={pending}
          className={secondaryButton}
        >
          {t("notifications.cancel")}
        </button>
      </div>
      <FormOutcome state={state} />
    </form>
  );
}

/** One button: pause the automatic notifications, or resume them. */
export function AutomaticForm({ paused }: { paused: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    setAutomaticNotifications,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="paused" value={paused ? "false" : "true"} />
      <button type="submit" disabled={pending} className={paused ? primaryButton : secondaryButton}>
        {t(paused ? "notifications.resume" : "notifications.pause")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}
