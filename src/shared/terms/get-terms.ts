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

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isString(item) && item.trim().length > 0)
  );
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
  return (
    isString(field(value, "title")) &&
    isNonEmptyStringArray(field(value, "paragraphs")) &&
    isMetadata(field(value, "metadata"))
  );
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
  return hasStrings(value, ["id", "title", itemKey]);
}

function isHomeTerms(value: unknown): value is HomeTerms {
  const meta = field(value, "meta");
  const linkLabels = field(value, "linkLabels");
  const language = field(value, "language");
  const menu = field(value, "menu");
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
    isString(field(language, "label")) &&
    isArrayOf(field(language, "links"), isLanguageLink) &&
    hasStrings(menu, ["title", "openLabel", "closeLabel"]) &&
    hasStrings(identity, ["name", "role", "lead", "supporting"]) &&
    isArrayOf(field(identity, "links"), isExternalLink) &&
    hasStrings(experience, ["id", "title"]) &&
    isArrayOf(field(experience, "companies"), isCompanyExperience) &&
    hasStrings(openSource, ["id", "title"]) &&
    isArrayOf(field(openSource, "contributions"), isOpenSourceContribution) &&
    hasStrings(independentWork, ["id", "title"]) &&
    isArrayOf(field(independentWork, "items"), isIndependentWork) &&
    hasStrings(background, ["id", "title"]) &&
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
