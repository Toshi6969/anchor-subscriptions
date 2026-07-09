import ShopifyFormat from '@shopify/i18next-shopify';
import {RemixI18Next} from 'remix-i18next/server';

import i18nextOptions from './i18nextOptions';

// Preload all locale JSON files at build time. On Vercel serverless the
// public/ folder is not reliably readable via i18next-fs-backend, so we
// embed the resources directly into the function bundle.
const localeModules = import.meta.glob<Record<string, unknown>>(
  '../../public/locales/*/*.json',
  {eager: true, import: 'default'},
);

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, mod] of Object.entries(localeModules)) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  if (!resources[lng]) resources[lng] = {};
  resources[lng][ns] = mod as Record<string, unknown>;
}

const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: i18nextOptions.supportedLngs,
    fallbackLanguage: i18nextOptions.fallbackLng,
    searchParamKey: 'locale',
    order: ['searchParams'],
  },
  i18next: {
    ...i18nextOptions,
    resources,
  },
  plugins: [ShopifyFormat.default ?? ShopifyFormat],
});

export default i18next;
