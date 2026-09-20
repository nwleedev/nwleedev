import en from "./en.json";
import ko from "./ko.json";
import type { ExternalLink, HomeTerms, LanguageLink, Locale } from "./types";

function field(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return Reflect.get(value, key);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean {
  return Array.isArray(value) && value.every(predicate);
}

function hasStrings(value: unknown, keys: readonly string[]): boolean {
  return keys.every((key) => isString(field(value, key)));
}

function isExternalLink(value: unknown): value is ExternalLink {
  return hasStrings(value, ["label", "href", "context"]);
}

function isLocale(value: unknown): value is Locale {
  return value === "ko" || value === "en";
}

function isLanguageLink(value: unknown): value is LanguageLink {
  return hasStrings(value, ["label", "href"]) && isLocale(field(value, "locale"));
}

function isMetadata(value: unknown): boolean {
  return (
    isString(field(value, "period")) &&
    isStringArray(field(value, "technologies"))
  );
}

function isContribution(value: unknown): boolean {
  const kind = field(value, "kind");
  const hasCommonFields =
    hasStrings(value, ["title", "summary", "detail"]) &&
    isMetadata(field(value, "metadata"));

  if (!hasCommonFields) {
    return false;
  }

  if (kind === "metric") {
    return hasStrings(value, [
      "metricLabel",
      "beforeLabel",
      "afterLabel",
      "before",
      "after",
    ]);
  }

  if (kind === "structure") {
    const figure = field(value, "figure");
    return (
      isString(field(figure, "label")) &&
      isStringArray(field(figure, "steps"))
    );
  }

  if (kind === "evidence") {
    return isString(field(value, "evidence"));
  }

  return false;
}

function isCompanyExperience(value: unknown): boolean {
  return (
    hasStrings(value, ["company", "period", "role", "summary"]) &&
    isArrayOf(field(value, "contributions"), isContribution)
  );
}

function isOpenSourceContribution(value: unknown): boolean {
  return (
    hasStrings(value, ["project", "release", "summary", "verification"]) &&
    isArrayOf(field(value, "links"), isExternalLink)
  );
}

function isIndependentWork(value: unknown): boolean {
  return (
    hasStrings(value, ["title", "period", "summary"]) &&
    isStringArray(field(value, "technologies"))
  );
}

function isBackgroundItem(value: unknown): boolean {
  return hasStrings(value, ["title", "detail", "period"]);
}

function isSection(value: unknown, itemKey: string): boolean {
  return hasStrings(value, ["id", "index", "title", itemKey]);
}

function isHomeTerms(value: unknown): value is HomeTerms {
  const meta = field(value, "meta");
  const linkLabels = field(value, "linkLabels");
  const navigation = field(value, "navigation");
  const identity = field(value, "identity");
  const experience = field(value, "experience");
  const openSource = field(value, "openSource");
  const independentWork = field(value, "independentWork");
  const background = field(value, "background");
  const contact = field(value, "contact");
  const footer = field(value, "footer");

  return (
    hasStrings(meta, ["title", "description"]) &&
    isString(field(value, "skipLink")) &&
    hasStrings(linkLabels, ["resume", "resumeContext"]) &&
    isString(field(navigation, "label")) &&
    isString(field(navigation, "languageLabel")) &&
    isArrayOf(field(navigation, "items"), (item): item is { label: string; href: string } =>
      hasStrings(item, ["label", "href"]),
    ) &&
    isArrayOf(field(navigation, "languages"), isLanguageLink) &&
    hasStrings(identity, ["name", "role", "lead", "supporting"]) &&
    isArrayOf(field(identity, "links"), isExternalLink) &&
    isSection(experience, "introduction") &&
    isArrayOf(field(experience, "companies"), isCompanyExperience) &&
    isSection(openSource, "introduction") &&
    isArrayOf(field(openSource, "contributions"), isOpenSourceContribution) &&
    isSection(independentWork, "introduction") &&
    isArrayOf(field(independentWork, "items"), isIndependentWork) &&
    hasStrings(background, ["id", "index", "title"]) &&
    isArrayOf(field(background, "items"), isBackgroundItem) &&
    isSection(contact, "introduction") &&
    isArrayOf(field(contact, "links"), isExternalLink) &&
    hasStrings(footer, ["text", "topLabel"])
  );
}

function parseTerms(value: unknown, locale: Locale): HomeTerms {
  if (!isHomeTerms(value)) {
    throw new Error(`Invalid terms structure for locale: ${locale}`);
  }

  return value;
}

const termsByLocale = {
  ko: parseTerms(ko, "ko"),
  en: parseTerms(en, "en"),
} satisfies Record<Locale, HomeTerms>;

type RuntimeTerms = {
  resumeUrl: string;
};

export function getTerms(locale: Locale, runtimeTerms: RuntimeTerms): HomeTerms {
  const terms = termsByLocale[locale];

  const resumeLink: ExternalLink = {
    label: terms.linkLabels.resume,
    href: runtimeTerms.resumeUrl,
    context: terms.linkLabels.resumeContext,
  };

  return {
    ...terms,
    identity: {
      ...terms.identity,
      links: [...terms.identity.links, resumeLink],
    },
    contact: {
      ...terms.contact,
      links: [...terms.contact.links, resumeLink],
    },
  };
}
