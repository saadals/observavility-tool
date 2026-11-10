import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import type { DemoPage } from './_app';

const NotFound: DemoPage = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title={t('app.notFoundTitle')} />
      <EmptyState
        className="py-24"
        icon={<Compass className="size-5" />}
        title={t('app.notFoundTitle')}
        body={t('app.notFoundBody')}
        action={
          <ButtonLink href="/overview" variant="primary">
            {t('app.goHome')}
          </ButtonLink>
        }
      />
    </>
  );
};

NotFound.layout = 'auto';
export default NotFound;
