/** What a form's last submission became: a message, or an error, or nothing yet. */
export interface FormState {
  message?: string;
  error?: string;
}

/** What became of the last submission: saved, or why not. */
export function FormOutcome({ state }: { state: FormState }) {
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
