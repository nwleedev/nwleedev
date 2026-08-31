export function joinClassNames(
  ...values: ReadonlyArray<string | false | null | undefined>
) {
  return values
    .filter((value): value is string => {
      return typeof value === "string" && value.length > 0
    })
    .join(" ")
}
