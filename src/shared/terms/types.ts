export type Locale = "ko" | "en";

export type NavigationItem = {
  label: string;
  href: string;
};

export type LanguageLink = NavigationItem & {
  locale: Locale;
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

export type MetricContribution = {
  kind: "metric";
  title: string;
  summary: string;
  detail: string;
  metricLabel: string;
  beforeLabel: string;
  afterLabel: string;
  before: string;
  after: string;
  metadata: Metadata;
};

export type StructureContribution = {
  kind: "structure";
  title: string;
  summary: string;
  detail: string;
  figure: {
    label: string;
    steps: readonly string[];
  };
  metadata: Metadata;
};

export type EvidenceContribution = {
  kind: "evidence";
  title: string;
  summary: string;
  detail: string;
  evidence: string;
  metadata: Metadata;
};

export type Contribution =
  | MetricContribution
  | StructureContribution
  | EvidenceContribution;

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
  navigation: {
    label: string;
    items: readonly NavigationItem[];
    languageLabel: string;
    languages: readonly LanguageLink[];
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
    index: string;
    title: string;
    introduction: string;
    companies: readonly CompanyExperience[];
  };
  openSource: {
    id: string;
    index: string;
    title: string;
    introduction: string;
    contributions: readonly OpenSourceContribution[];
  };
  independentWork: {
    id: string;
    index: string;
    title: string;
    introduction: string;
    items: readonly IndependentWork[];
  };
  background: {
    id: string;
    index: string;
    title: string;
    items: readonly BackgroundItem[];
  };
  contact: {
    id: string;
    index: string;
    title: string;
    introduction: string;
    links: readonly ExternalLink[];
  };
  footer: {
    text: string;
    topLabel: string;
  };
};
