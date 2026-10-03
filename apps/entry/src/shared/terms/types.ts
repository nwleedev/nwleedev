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

export type ProfileIconName =
  | "article"
  | "file-pdf"
  | "github"
  | "linkedin";

export type ProfileLink = ExternalLink & {
  icon: ProfileIconName;
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

export type Project = {
  title: string;
  period: string;
  paragraphs: readonly string[];
  technologies: readonly string[];
  serviceLink?: Omit<ExternalLink, "label">;
  links: readonly ExternalLink[];
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
  identity: {
    name: string;
    role: string;
    lead: string;
    supporting: string;
    links: readonly ProfileLink[];
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
  projects: {
    id: string;
    title: string;
    items: readonly Project[];
  };
  background: {
    id: string;
    title: string;
    items: readonly BackgroundItem[];
  };
  contact: {
    id: string;
    title: string;
    links: readonly ExternalLink[];
  };
  footer: {
    text: string;
    topLabel: string;
  };
  showcase: {
    title: string;
    description: string;
    homeLabel: string;
    articleLabel: string;
    toggleLabel: string;
    changesTitle: string;
    changeLabel: string;
    beforeLabel: string;
    afterLabel: string;
    reasonLabel: string;
  };
};
