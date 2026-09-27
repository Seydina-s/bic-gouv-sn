import { field } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import type { ServiceReviewState } from "./actions";

export interface ServiceChoice {
  value: string;
  label: string;
}

/** The service's name, as people know it. */
export function NameField({ name }: { name?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor="name" className="block font-semibold">
        {t("services.nameLabel")}
      </label>
      <input id="name" name="name" defaultValue={name} required className={field} />
    </div>
  );
}

/** Where the service is: coordinates or a map link pasted by the person. */
export function PositionField({ position }: { position?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor="position" className="block font-semibold">
        {t("services.positionLabel")}
      </label>
      <p id="position-help" className="text-sm text-ink-soft">
        {t("services.positionHelp")}
      </p>
      <input
        id="position"
        name="position"
        defaultValue={position}
        required
        autoComplete="off"
        spellCheck={false}
        aria-describedby="position-help"
        className={field}
      />
    </div>
  );
}

/** The kind of service, among the categories of the map. */
export function CategoryField({
  categories,
  category,
}: {
  categories: ServiceChoice[];
  category?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor="category" className="block font-semibold">
        {t("services.categoryLabel")}
      </label>
      <select id="category" name="category" defaultValue={category} required className={field}>
        {categories.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** What became of the last submission: saved, or why not. */
export function FormOutcome({ state }: { state: ServiceReviewState }) {
  if (state.error !== undefined) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface">
        {state.error}
      </p>
    );
  }
  if (state.message !== undefined) {
    return (
      <p
        role="status"
        className="rounded-md bg-primary-container px-4 py-3 text-on-primary-container"
      >
        {state.message}
      </p>
    );
  }
  return null;
}
