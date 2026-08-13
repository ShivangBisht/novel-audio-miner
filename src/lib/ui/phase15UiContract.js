export const PHASE15_UI_CONTRACT_VERSION = '15.1';

export const PHASE15_UI_REGIONS = Object.freeze([
  'application-bar',
  'reader-header',
  'reader-navigation',
  'reader-sidebar',
  'reader-viewport',
  'reader-actions',
  'teaching-surface',
  'settings-administration-workspace'
]);

export const PHASE15_READER_SIDEBAR_GROUPS = Object.freeze([
  'book',
  'navigation',
  'new-words',
  'illustrations',
  'display'
]);

export const PHASE15_ADMIN_GROUPS = Object.freeze([
  'reading-preferences',
  'integrations',
  'dictionaries',
  'teaching-administration',
  'diagnostics'
]);

export const PHASE15_FROZEN_CONTRACTS = Object.freeze([
  'epub-runtime',
  'reader-model',
  'contextual-scenes',
  'logical-sentence-ownership',
  'jp-analyzer-record',
  'reader-spans',
  'reader-candidates',
  'reader-selection',
  'teaching-selection',
  'teaching-analysis',
  'teaching-persistence',
  'corpus-formats',
  'mining-semantics',
  'prefetch-scheduling',
  'startup-ownership'
]);

export const PHASE15_VISUAL_PRINCIPLES = Object.freeze({
  applicationFontScope: 'application-ui-only',
  bookTypography: 'preserve-epub-when-available',
  defaultTheme: 'focused-dark',
  themeArchitecture: 'semantic-tokens',
  aesthetic: 'minimalist',
  consistency: 'single-visual-language',
  detailStrategy: 'progressive-disclosure'
});
