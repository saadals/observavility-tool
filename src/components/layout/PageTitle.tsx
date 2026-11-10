import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config/brand';

/** Sets the document title, e.g. "Alerts · Tayf". */
export function PageTitle({ title }: { title: string }) {
  const { i18n } = useTranslation();
  const brand = BRAND.name[i18n.language === 'ar' ? 'ar' : 'en'];
  return (
    <Head>
      <title>{`${title} · ${brand}`}</title>
    </Head>
  );
}
