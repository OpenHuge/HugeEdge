export type ListDir = "asc" | "desc";

export type ListSearch<TSort extends string> = {
  q: string;
  status: string;
  sort: TSort;
  dir: ListDir;
};

export function normalizeListSearch<TSort extends string>(
  input: Partial<ListSearch<TSort>>,
  defaults: Pick<ListSearch<TSort>, "sort" | "dir">,
): ListSearch<TSort> {
  return {
    q: input.q ?? "",
    status: input.status ?? "all",
    sort: input.sort ?? defaults.sort,
    dir: input.dir ?? defaults.dir,
  };
}

export function buildListSearch<TSort extends string>(search: ListSearch<TSort>) {
  return {
    q: search.q || undefined,
    status: search.status !== "all" ? search.status : undefined,
    sort: search.sort,
    dir: search.dir,
  };
}

export function includesQuery(
  values: Array<string | undefined>,
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export function compareValues(
  left: string | number | undefined,
  right: string | number | undefined,
  dir: ListDir,
) {
  const safeLeft = left ?? "";
  const safeRight = right ?? "";
  const result =
    typeof safeLeft === "number" && typeof safeRight === "number"
      ? safeLeft - safeRight
      : String(safeLeft).localeCompare(String(safeRight));

  return dir === "asc" ? result : result * -1;
}
