export function formatTimestamp(value: unknown) {
  if (typeof value !== "string" || value === "") {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
