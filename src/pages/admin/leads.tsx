import { Download, Inbox, Rocket, Trash2, Users } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components/layout/PageTitle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, Kpi, PageHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { SearchInput } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { downloadText, toCsv } from '@/lib/csv';
import { useFormat } from '@/lib/hooks';
import { CURRENT_TOOLS, INDUSTRIES, useLeads } from '@/store/leads';
import { useLive } from '@/store/live';
import { useUi } from '@/store/ui';

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const f = useFormat();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="text-[12.5px]">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate text-muted">{i.label}</span>
            <span className="font-semibold text-fg tabular">{f.number(i.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function LeadsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const leads = useLeads((s) => s.leads);
  const remove = useLeads((s) => s.remove);
  const clear = useLeads((s) => s.clear);
  const openEarly = useUi((s) => s.openEarlyAccess);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const now = useLive((s) => s.now);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => [l.name, l.company, l.email, l.phone, l.painPoint, l.currentToolName].join(' ').toLowerCase().includes(q));
  }, [leads, search]);

  const stats = useMemo(() => {
    const byIndustry = INDUSTRIES.map((i) => ({ label: t(`leads.industries.${i}`), value: leads.filter((l) => l.industry === i).length })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const byTool = CURRENT_TOOLS.map((i) => ({ label: t(`leads.tools.${i}`), value: leads.filter((l) => l.currentTool === i).length })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const avg = leads.length ? leads.reduce((s, l) => s + l.devices, 0) / leads.length : 0;
    return { byIndustry, byTool, avg, last7: leads.filter((l) => l.createdAt > now - 7 * 86_400_000).length };
  }, [leads, t, now]);

  const exportCsv = () => {
    const headers = ['submitted_at', 'name', 'company', 'role', 'industry', 'devices', 'current_tool', 'current_tool_name', 'pain_point', 'email', 'phone', 'ui_language', 'source_page'];
    const rows = leads.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.name,
      l.company,
      t(`leads.roles.${l.role}`),
      t(`leads.industries.${l.industry}`),
      l.devices,
      t(`leads.tools.${l.currentTool}`),
      l.currentToolName,
      l.painPoint,
      l.email,
      l.phone,
      l.lang,
      l.source,
    ]);
    downloadText(`${t('leads.admin.csvName')}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  };

  return (
    <>
      <PageTitle title={t('nav.leads')} />
      <PageHeader
        title={t('leads.admin.title')}
        subtitle={t('leads.admin.subtitle')}
        actions={
          <>
            {leads.length > 0 && (
              <Button variant="ghost" size="sm" leading={<Trash2 className="size-4" />} onClick={() => setConfirm(true)} className="hover:text-crit">
                {t('leads.admin.clearAll')}
              </Button>
            )}
            <Button variant="primary" size="sm" leading={<Download className="size-4" />} onClick={exportCsv} disabled={!leads.length}>
              {t('actions.exportCsv')}
            </Button>
          </>
        }
      />
      <p className="-mt-3 mb-4 text-xs text-subtle">{t('leads.admin.localOnly')}</p>

      {leads.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={t('leads.admin.emptyTitle')}
            body={t('leads.admin.emptyBody')}
            action={
              <Button variant="accent" leading={<Rocket className="size-4" />} onClick={() => openEarly('/admin/leads')}>
                {t('leads.admin.openForm')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label={t('leads.admin.total')} value={f.number(leads.length)} icon={<Users className="size-4.5" />} tone="brand" />
            <Kpi label={t('leads.admin.last7')} value={f.number(stats.last7)} />
            <Kpi label={t('leads.admin.avgDevices')} value={f.number(stats.avg)} />
            <Kpi label={t('leads.admin.topIndustry')} value={<span className="text-base">{stats.byIndustry[0]?.label ?? '—'}</span>} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t('leads.admin.byIndustry')} />
              <CardBody>
                <BarList items={stats.byIndustry} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('leads.admin.byTool')} />
              <CardBody>
                <BarList items={stats.byTool} />
              </CardBody>
            </Card>
          </div>
          <Card>
            <div className="border-b border-line p-4 sm:px-5">
              <SearchInput value={search} onChange={setSearch} placeholder={t('leads.admin.search')} label={t('leads.admin.search')} className="w-full sm:w-80" />
            </div>
            {filtered.length === 0 ? (
              <EmptyState title={t('empty.title')} body={t('empty.filters')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-[13px]">
                  <thead className="border-b border-line bg-surface-2 text-[11.5px] text-muted">
                    <tr>
                      <th className="px-5 py-2.5 text-start font-medium">{t('leads.admin.submitted')}</th>
                      <th className="px-3 py-2.5 text-start font-medium">{t('leads.form.name')}</th>
                      <th className="px-3 py-2.5 text-start font-medium">{t('leads.form.industry')}</th>
                      <th className="px-3 py-2.5 text-end font-medium">{t('leads.admin.fleet')}</th>
                      <th className="px-3 py-2.5 text-start font-medium">{t('leads.form.currentTool')}</th>
                      <th className="px-3 py-2.5 text-start font-medium">{t('leads.admin.contact')}</th>
                      <th className="w-12 px-5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <Fragment key={l.id}>
                        <tr className="cursor-pointer border-b border-line hover:bg-surface-2" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                          <td className="whitespace-nowrap px-5 py-2.5 text-muted tabular">{f.dateTime(l.createdAt)}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-fg">{l.name}</div>
                            <div className="text-[11.5px] text-subtle">
                              {t(`leads.roles.${l.role}`)} · {l.company}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-muted">{t(`leads.industries.${l.industry}`)}</td>
                          <td className="px-3 py-2.5 text-end font-semibold text-fg tabular">{f.number(l.devices)}</td>
                          <td className="px-3 py-2.5 text-muted">
                            {t(`leads.tools.${l.currentTool}`)}
                            {l.currentToolName && <div className="text-[11.5px] text-subtle">{l.currentToolName}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="ltr-text text-fg">{l.email}</div>
                            <div className="ltr-text text-[11.5px] text-subtle tabular">{l.phone}</div>
                          </td>
                          <td className="px-5 py-2.5 text-end">
                            <Button
                              size="xs"
                              variant="ghost"
                              icon
                              aria-label={t('leads.admin.deleteOne')}
                              title={t('leads.admin.deleteOne')}
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(l.id);
                              }}
                              className="hover:text-crit"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                        {expanded === l.id && (
                          <tr className="border-b border-line bg-surface-2">
                            <td colSpan={7} className="px-5 py-3 text-[13px]">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{t('leads.admin.pain')}</div>
                              <p className="mt-1 text-fg" dir="auto">
                                {l.painPoint || '—'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11.5px]">
                                <Badge tone="neutral">
                                  {t('leads.admin.lang')}: {l.lang.toUpperCase()}
                                </Badge>
                                <Badge tone="neutral">
                                  {t('leads.admin.source')}: <span className="ltr-text">{l.source}</span>
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={t('leads.admin.clearTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clear();
                setConfirm(false);
              }}
            >
              {t('leads.admin.clearAll')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('leads.admin.clearBody', { count: leads.length })}</p>
      </Modal>
    </>
  );
}
