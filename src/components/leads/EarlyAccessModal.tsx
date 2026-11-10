import { CheckCircle2, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, TextArea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { CURRENT_TOOLS, INDUSTRIES, ROLES, useLeads, type CurrentTool, type Industry, type Role } from '@/store/leads';
import { useUi } from '@/store/ui';

interface FormState {
  name: string;
  company: string;
  role: Role | '';
  industry: Industry | '';
  devices: string;
  currentTool: CurrentTool | '';
  currentToolName: string;
  painPoint: string;
  email: string;
  phone: string;
  consent: boolean;
}

const EMPTY: FormState = {
  name: '',
  company: '',
  role: '',
  industry: '',
  devices: '',
  currentTool: '',
  currentToolName: '',
  painPoint: '',
  email: '',
  phone: '',
  consent: false,
};

type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s()-]{8,18}$/;

export function EarlyAccessModal() {
  const { t, i18n } = useTranslation();
  const open = useUi((s) => s.earlyAccessOpen);
  const source = useUi((s) => s.earlyAccessSource);
  const close = useUi((s) => s.closeEarlyAccess);
  const add = useLeads((s) => s.add);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<string | null>(null);

  const handleClose = () => {
    close();
    setErrors({});
    setDone(null);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    const req = t('leads.form.errors.required');
    if (!form.name.trim()) e.name = req;
    if (!form.company.trim()) e.company = req;
    if (!form.role) e.role = req;
    if (!form.industry) e.industry = req;
    if (!form.devices || Number(form.devices) <= 0) e.devices = t('leads.form.errors.devices');
    if (!form.currentTool) e.currentTool = req;
    if (!EMAIL_RE.test(form.email.trim())) e.email = t('leads.form.errors.email');
    if (!PHONE_RE.test(form.phone.trim())) e.phone = t('leads.form.errors.phone');
    if (!form.consent) e.consent = t('leads.form.errors.consent');
    return e;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`ea-${first}`)?.focus();
      return;
    }
    add({
      name: form.name.trim(),
      company: form.company.trim(),
      role: form.role as Role,
      industry: form.industry as Industry,
      devices: Number(form.devices),
      currentTool: form.currentTool as CurrentTool,
      currentToolName: form.currentToolName.trim(),
      painPoint: form.painPoint.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      lang: i18n.language,
      source: source || '/',
    });
    setDone(form.name.trim().split(' ')[0] ?? '');
    setForm(EMPTY);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={t('leads.form.title')}
      subtitle={done !== null ? undefined : t('leads.form.subtitle')}
      footer={
        done !== null ? (
          <>
            <Button variant="ghost" onClick={() => setDone(null)}>
              {t('leads.form.successAnother')}
            </Button>
            <Button variant="primary" onClick={handleClose}>
              {t('leads.form.successDone')}
            </Button>
          </>
        ) : (
          <>
            <span className="me-auto hidden items-center gap-1.5 text-xs text-subtle sm:inline-flex">
              <Lock className="size-3.5" />
              {t('leads.form.privacyNote')}
            </span>
            <Button variant="ghost" onClick={handleClose}>
              {t('actions.cancel')}
            </Button>
            <Button variant="primary" type="submit" form="early-access-form">
              {t('leads.form.submit')}
            </Button>
          </>
        )
      }
    >
      {done !== null ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-ok/15 text-ok">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-fg">{t('leads.form.successTitle', { name: done })}</h3>
          <p className="mt-2 max-w-md text-sm text-muted">{t('leads.form.successBody')}</p>
          <div className="sadu-band mt-6 h-2 w-40 opacity-50" aria-hidden />
        </div>
      ) : (
        <form id="early-access-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('leads.form.name')} required error={errors.name} htmlFor="ea-name">
            <Input id="ea-name" value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} autoComplete="name" />
          </Field>
          <Field label={t('leads.form.company')} required error={errors.company} htmlFor="ea-company">
            <Input id="ea-company" value={form.company} onChange={(e) => set('company', e.target.value)} invalid={!!errors.company} autoComplete="organization" />
          </Field>
          <Field label={t('leads.form.role')} required error={errors.role} htmlFor="ea-role">
            <Select id="ea-role" value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
              <option value="">{t('leads.form.select')}</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`leads.roles.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('leads.form.industry')} required error={errors.industry} htmlFor="ea-industry">
            <Select id="ea-industry" value={form.industry} onChange={(e) => set('industry', e.target.value as Industry)}>
              <option value="">{t('leads.form.select')}</option>
              {INDUSTRIES.map((r) => (
                <option key={r} value={r}>
                  {t(`leads.industries.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('leads.form.devices')} required error={errors.devices} hint={t('leads.form.devicesHint')} htmlFor="ea-devices">
            <Input id="ea-devices" type="number" inputMode="numeric" min={1} value={form.devices} onChange={(e) => set('devices', e.target.value)} invalid={!!errors.devices} />
          </Field>
          <Field label={t('leads.form.currentTool')} required error={errors.currentTool} htmlFor="ea-currentTool">
            <Select id="ea-currentTool" value={form.currentTool} onChange={(e) => set('currentTool', e.target.value as CurrentTool)}>
              <option value="">{t('leads.form.select')}</option>
              {CURRENT_TOOLS.map((r) => (
                <option key={r} value={r}>
                  {t(`leads.tools.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          {form.currentTool && form.currentTool !== 'none' && (
            <Field label={t('leads.form.currentToolName')} className="sm:col-span-2" htmlFor="ea-currentToolName">
              <Input id="ea-currentToolName" value={form.currentToolName} onChange={(e) => set('currentToolName', e.target.value)} placeholder={t('leads.form.currentToolNamePlaceholder')} />
            </Field>
          )}
          <Field label={t('leads.form.painPoint')} className="sm:col-span-2" htmlFor="ea-painPoint">
            <TextArea id="ea-painPoint" value={form.painPoint} onChange={(e) => set('painPoint', e.target.value)} placeholder={t('leads.form.painPointPlaceholder')} rows={3} />
          </Field>
          <Field label={t('leads.form.email')} required error={errors.email} htmlFor="ea-email">
            <Input id="ea-email" type="email" dir="ltr" className="text-start" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} autoComplete="email" placeholder="name@company.sa" />
          </Field>
          <Field label={t('leads.form.phone')} required error={errors.phone} htmlFor="ea-phone">
            <Input id="ea-phone" type="tel" dir="ltr" className="text-start" value={form.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} autoComplete="tel" placeholder={t('leads.form.phonePlaceholder')} />
          </Field>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-2.5 text-[13px] text-muted">
              <input
                id="ea-consent"
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set('consent', e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
              />
              <span>{t('leads.form.consent')}</span>
            </label>
            {errors.consent && <p className="mt-1 text-xs text-crit">{errors.consent}</p>}
          </div>
        </form>
      )}
    </Modal>
  );
}
