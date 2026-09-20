export type Locale = "ko" | "en";

export type LanguageLink = {
  locale: Locale;
  label: string;
  href: string;
};

export type ExternalLink = {
  label: string;
  href: string;
  context: string;
};

export type Metadata = {
  period: string;
  technologies: readonly string[];
};

export type Contribution = {
  title: string;
  paragraphs: readonly string[];
  metadata: Metadata;
};

export type CompanyExperience = {
  company: string;
  period: string;
  role: string;
  summary: string;
  contributions: readonly Contribution[];
};

export type OpenSourceContribution = {
  project: string;
  release: string;
  summary: string;
  verification: string;
  links: readonly ExternalLink[];
};

export type IndependentWork = {
  title: string;
  period: string;
  summary: string;
  technologies: readonly string[];
};

export type BackgroundItem = {
  title: string;
  detail: string;
  period: string;
};

export type HomeTerms = {
  meta: {
    title: string;
    description: string;
  };
  skipLink: string;
  linkLabels: {
    resume: string;
    resumeContext: string;
  };
  language: {
    label: string;
    links: readonly LanguageLink[];
  };
  menu: {
    title: string;
    openLabel: string;
    closeLabel: string;
  };
  identity: {
    name: string;
    role: string;
    lead: string;
    supporting: string;
    links: readonly ExternalLink[];
  };
  experience: {
    id: string;
    title: string;
    companies: readonly CompanyExperience[];
  };
  openSource: {
    id: string;
    title: string;
    contributions: readonly OpenSourceContribution[];
  };
  independentWork: {
    id: string;
    title: string;
    items: readonly IndependentWork[];
  };
  background: {
    id: string;
    title: string;
    items: readonly BackgroundItem[];
  };
  contact: {
    id: string;
    title: string;
    introduction: string;
    links: readonly ExternalLink[];
  };
  footer: {
    text: string;
    topLabel: string;
  };
};
