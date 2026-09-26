import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Check, CircleCheck, CloudUpload, Gift, HeartHandshake, Landmark, LoaderCircle, PenLine, Send, ShieldCheck, Ticket, TriangleAlert, X,
} from 'lucide-react';
import { activeClient, type Frequency } from '../config/client';
import type { Door } from '../lib/addresses';
import { validateBankDetails } from '../lib/banks';
import { ageFrom, isEmail, isUkMobile } from '../lib/validate';
import SignaturePad from './SignaturePad';
import { Chip, Label, SectionHead, Tick } from './ui';
import { doorTitle } from './DoorSheets';

const client = activeClient;

export interface SignupForm {
  programme: string;
  entry: string;
  amount: number;
  freq: Frequency;
  day: string;
  title: string; first: string; last: string; dd: string; mm: string; yyyy: string;
  mobile: string; email: string; addr1: string; town: string; postcode: string;
  sort: string; account: string;
  giftAid: boolean; holder: boolean; lotteryRules: boolean; terms: boolean; privacy: boolean;
  contact: string[];
}

export const blankForm = (door: Door): SignupForm => {
  const p = client.programmes[0];
  return {
    programme: p.id, entry: p.entries?.[0]?.id ?? '', amount: client.programmes.find((x) => x.amounts)?.amounts?.[1] ?? 10,
    freq: p.frequencies[0], day: client.collectionDays[0],
    title: '', first: '', last: '', dd: '', mm: '', yyyy: '',
    mobile: '', email: '', addr1: `${door.number} ${door.street}`.trim(), town: door.town, postcode: door.postcode,
    sort: '', account: '',
    giftAid: false, holder: false, lotteryRules: false, terms: false, privacy: false, contact: [],
  };
};


interface Props {
  door: Door;
  form: SignupForm;
  setForm: (f: (prev: SignupForm) => SignupForm) => void;
  online: boolean;
  onClose: () => void;
  onSubmit: (form: SignupForm, signature: string) => Promise<'sent' | 'queued'>;
}

export default function PitchPanel({ door, form, setForm, online, onClose, onSubmit }: Props) {
  const [signature, setSignature] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'sending' | 'done'>('form');
  const [result, setResult] = useState<'sent' | 'queued'>('sent');
  const [reading, setReading] = useState<null | 'terms' | 'lottery' | 'privacy'>(null);
  const onSig = useCallback((d: string | null) => setSignature(d), []);

  const set = <K extends keyof SignupForm>(k: K, v: SignupForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const flip = (k: 'giftAid' | 'holder' | 'lotteryRules' | 'terms' | 'privacy') => () => setForm((f) => ({ ...f, [k]: !f[k] }));
  const toggleContact = (c: string) =>
    setForm((f) => ({ ...f, contact: f.contact.includes(c) ? f.contact.filter((x) => x !== c) : [...f.contact, c] }));

  const programme = client.programmes.find((p) => p.id === form.programme) ?? client.programmes[0];
  const isLottery = programme.kind === 'lottery';
  const sortDigits = form.sort.replace(/\D/g, '').slice(0, 6);
  const sortPretty = sortDigits.replace(/(\d{2})(?=\d)/g, '$1-');
  const acct = form.account.replace(/\D/g, '').slice(0, 8);
  const bank = validateBankDetails(sortDigits, acct);
  const age = ageFrom(form.dd, form.mm, form.yyyy);
  const ageOk = age !== null && age >= client.minAge && age < 120;
  const mobileOk = isUkMobile(form.mobile);
  const emailOk = form.email.trim() === '' || isEmail(form.email);

  const missing = [
    !form.title && 'title', !form.first.trim() && 'first name', !form.last.trim() && 'last name',
    !ageOk && 'date of birth', !mobileOk && 'mobile', !emailOk && 'email',
    !form.addr1.trim() && 'address', bank.state !== 'valid' && 'bank details',
    !form.holder && 'account holder tick', isLottery && !form.lotteryRules && 'lottery rules tick',
    !form.terms && 'terms tick', !form.privacy && 'privacy tick', !signature && 'signature',
  ].filter(Boolean) as string[];

  const what = isLottery ? programme.entries?.find((e) => e.id === form.entry)?.label ?? '' : `£${form.amount}`;
  const summary = `${what}, paid ${form.freq.toLowerCase()}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (missing.length || !signature) return;
    setPhase('sending');
    const r = await onSubmit({ ...form, giftAid: programme.giftAid && form.giftAid }, signature);
    setResult(r);
    setPhase('done');
  };

  if (phase === 'done') {
    const queued = result === 'queued';
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5 bg-white">
        <div className={`w-28 h-28 rounded-full grid place-items-center border-[4px] border-ink ${queued ? 'bg-accent' : 'bg-go text-white'}`}>
          {queued ? <CloudUpload size={56} strokeWidth={2.5} /> : <Check size={64} strokeWidth={3.5} />}
        </div>
        <div className="font-display font-extrabold uppercase text-[40px] leading-none">{queued ? 'Saved on this tablet' : `Sent to ${client.id.toUpperCase()}`}</div>
        <p className="text-[20px] max-w-[30ch]">
          {queued
            ? `${form.first} ${form.last}'s sign-up is stored on the tablet and will send automatically when signal returns.`
            : `${form.first} ${form.last} is signed up for ${programme.label}, ${summary}.`}
        </p>
        <button type="button" onClick={onClose} className="min-h-[84px] w-full max-w-[420px] rounded-[14px] bg-ink text-white font-display font-extrabold uppercase text-[30px] border-[3px] border-ink active:translate-y-[2px]">
          Next door
        </button>
      </div>
    );
  }

  const legal = reading ? (reading === 'lottery' ? client.legal.lottery : client.legal[reading]) : null;

  return (
    <form onSubmit={submit} className="relative h-full flex flex-col bg-white" noValidate>
      {reading && legal && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col" role="dialog" aria-label={legal.title}>
          <div className="flex items-center justify-between gap-3 px-5 py-3 bg-ink text-white">
            <div className="font-display font-extrabold uppercase text-[30px] leading-none">{legal.title}</div>
            <button type="button" onClick={() => setReading(null)} aria-label="Close" className="w-16 h-16 shrink-0 grid place-items-center rounded-[12px] bg-white text-ink"><X size={32} strokeWidth={3} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 text-[20px] leading-relaxed max-w-[60ch]">
            {legal.paragraphs.map((t, i) => <p key={i}>{t}</p>)}
          </div>
          <div className="px-5 py-4 border-t-[4px] border-ink">
            <button type="button"
              onClick={() => { set(reading === 'lottery' ? 'lotteryRules' : reading, true); setReading(null); }}
              className="w-full min-h-[84px] rounded-[14px] bg-go text-white border-[4px] border-ink font-display font-extrabold uppercase text-[30px] flex items-center justify-center gap-3">
              <Check size={34} strokeWidth={3.5} /> Supporter agrees
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-accent border-b-[4px] border-ink">
        <div className="min-w-0">
          <div className="text-[14px] font-bold uppercase tracking-[.12em]">Pitching now</div>
          <div className="font-display font-extrabold uppercase text-[32px] leading-none truncate">{doorTitle(door)}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" className="w-16 h-16 shrink-0 grid place-items-center rounded-[12px] bg-white border-[3px] border-ink"><X size={32} strokeWidth={3} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-7">
        <section className="flex flex-col gap-3">
          <SectionHead>Programme</SectionHead>
          <div className="grid grid-cols-2 gap-3">
            {client.programmes.map((p) => {
              const on = form.programme === p.id;
              const Icon = p.kind === 'lottery' ? Ticket : HeartHandshake;
              return (
                <button key={p.id} type="button" aria-pressed={on}
                  onClick={() => setForm((f) => ({ ...f, programme: p.id, entry: p.entries?.[0]?.id ?? f.entry, freq: p.frequencies.includes(f.freq) ? f.freq : p.frequencies[0] }))}
                  className={`min-h-[96px] rounded-[14px] border-[4px] border-ink px-3 flex items-center gap-3 text-left font-display font-extrabold uppercase text-[24px] leading-[1.05] ${on ? 'bg-brand text-white shadow-[inset_0_0_0_4px_var(--accent)]' : 'bg-white text-ink'}`}>
                  <Icon size={34} strokeWidth={2.5} className="shrink-0" />
                  <span className="flex-1">{p.label}</span>
                  {on && <CircleCheck size={30} strokeWidth={2.5} className="shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
          {isLottery ? (
            <div>
              <Label>Entry</Label>
              <div className="grid grid-cols-2 gap-2">
                {programme.entries!.map((e) => <Chip key={e.id} active={form.entry === e.id} onClick={() => set('entry', e.id)}>{e.label}</Chip>)}
              </div>
            </div>
          ) : (
            <div>
              <Label hint={`${form.freq} gift`}>Amount</Label>
              <div className="grid grid-cols-4 gap-2">
                {programme.amounts!.map((n) => <Chip key={n} active={form.amount === n} onClick={() => set('amount', n)}>£{n}</Chip>)}
              </div>
            </div>
          )}
          <div>
            <Label>How often</Label>
            <div className="grid grid-cols-3 gap-2">
              {programme.frequencies.map((f) => <Chip key={f} active={form.freq === f} onClick={() => set('freq', f)}>{f}</Chip>)}
            </div>
          </div>
          <div>
            <Label>Collection day</Label>
            <div className="grid grid-cols-3 gap-2">
              {client.collectionDays.map((d) => <Chip key={d} active={form.day === d} onClick={() => set('day', d)}>{d} of month</Chip>)}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHead>Supporter</SectionHead>
          <div>
            <Label>Title</Label>
            <div className="grid grid-cols-5 gap-2">
              {['Mr', 'Mrs', 'Ms', 'Miss', 'Mx'].map((t) => <Chip key={t} active={form.title === t} onClick={() => set('title', t)} className="px-1">{t}</Chip>)}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="first">First name</Label><input id="first" className="field" value={form.first} onChange={(e) => set('first', e.target.value)} autoComplete="off" autoCapitalize="words" /></div>
            <div><Label htmlFor="last">Last name</Label><input id="last" className="field" value={form.last} onChange={(e) => set('last', e.target.value)} autoComplete="off" autoCapitalize="words" /></div>
          </div>
          <div>
            <Label htmlFor="dd" hint={ageOk ? undefined : `Must be ${client.minAge} or over`}>Date of birth</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {([['dd', 'DD', 2, 84], ['mm', 'MM', 2, 84], ['yyyy', 'YYYY', 4, 120]] as const).map(([k, ph, max, w]) => (
                <input key={k} id={k} aria-label={ph} className={`field tnum text-center ${age !== null ? (ageOk ? 'ok' : 'bad') : ''}`} style={{ width: w }}
                  inputMode="numeric" maxLength={max} placeholder={ph} value={form[k]} onChange={(e) => set(k, e.target.value.replace(/\D/g, ''))} />
              ))}
              {age !== null && (
                <span className={`ml-1 min-h-[48px] px-3 rounded-[10px] flex items-center gap-1.5 font-bold text-[18px] border-[3px] ${ageOk ? 'bg-go-soft border-go text-[#005A28]' : 'bg-brand-soft border-brand text-brand-dark'}`}>
                  {ageOk ? <Check size={20} strokeWidth={3} /> : <TriangleAlert size={20} strokeWidth={2.5} />} {ageOk ? `Age ${age}` : `Under ${client.minAge}`}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="mobile">Mobile</Label><input id="mobile" className={`field tnum ${form.mobile ? (mobileOk ? 'ok' : 'bad') : ''}`} type="tel" inputMode="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="07…" /></div>
            <div><Label htmlFor="email" hint="Optional">Email</Label><input id="email" className={`field ${form.email ? (emailOk ? 'ok' : 'bad') : ''}`} type="email" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoCapitalize="off" /></div>
          </div>
          <div>
            <Label htmlFor="addr1" hint="Filled from the map">Address</Label>
            <input id="addr1" className="field" value={form.addr1} onChange={(e) => set('addr1', e.target.value)} />
            <div className="grid grid-cols-[1fr_170px] gap-3 mt-3">
              <input id="town" aria-label="Town" placeholder="Town" className="field" value={form.town} onChange={(e) => set('town', e.target.value)} />
              <input id="postcode" aria-label="Postcode" placeholder="Postcode" className="field uppercase tnum" value={form.postcode} onChange={(e) => set('postcode', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHead aside={<span className="text-[14px] font-bold uppercase tracking-[.08em] flex items-center gap-1.5"><ShieldCheck size={18} /> Direct Debit</span>}>Bank details</SectionHead>
          <div className="grid grid-cols-[190px_1fr] gap-3">
            <div>
              <Label htmlFor="sort">Sort code</Label>
              <input id="sort" className={`field tnum tracking-[.08em] ${sortDigits.length === 6 ? (bank.state === 'unknown-sort-code' ? 'bad' : 'ok') : ''}`} inputMode="numeric" placeholder="00-00-00"
                value={sortPretty} onChange={(e) => set('sort', e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="account">Account number</Label>
              <input id="account" className={`field tnum tracking-[.12em] ${acct.length === 8 ? (bank.state === 'valid' ? 'ok' : 'bad') : ''}`} inputMode="numeric" placeholder="8 digits"
                value={acct} onChange={(e) => set('account', e.target.value.replace(/\D/g, '').slice(0, 8))} autoComplete="off" />
            </div>
          </div>
          <div aria-live="polite" className={`min-h-[76px] rounded-[12px] border-[3px] px-4 flex items-center gap-4 ${
            bank.state === 'valid' ? 'bg-go-soft border-go' : bank.state === 'unknown-sort-code' || bank.state === 'bad-account' ? 'bg-brand-soft border-brand' : 'bg-[#F3F4F2] border-[#8B9088] border-dashed'}`}>
            {bank.state === 'valid' ? (
              <>
                <span className="w-12 h-12 rounded-full bg-go text-white grid place-items-center shrink-0 border-[3px] border-ink"><Check size={28} strokeWidth={3.5} /></span>
                <div className="leading-tight">
                  <div className="font-display font-extrabold uppercase text-[28px] flex items-center gap-2"><Landmark size={24} /> {bank.bank}</div>
                  <div className="text-[16px] text-[#005A28] font-bold">Account checked · accepts Direct Debits</div>
                </div>
              </>
            ) : bank.state === 'unknown-sort-code' ? (
              <><TriangleAlert size={34} className="text-brand shrink-0" /><div className="text-[18px] font-bold text-brand-dark">Sort code not recognised. Check it with the supporter.</div></>
            ) : bank.state === 'bad-account' ? (
              <><TriangleAlert size={34} className="text-brand shrink-0" /><div className="text-[18px] font-bold text-brand-dark">{bank.bank} can’t accept this account number.</div></>
            ) : bank.state === 'bank-found' ? (
              <><Landmark size={30} className="shrink-0" /><div className="text-[18px]"><b>{bank.bank}</b> found. Enter the 8-digit account number.</div></>
            ) : (
              <><Landmark size={30} className="shrink-0 text-[#6B6F73]" /><div className="text-[18px] text-[#3F4346]">Bank name appears here once the sort code is entered.</div></>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHead>Agreements</SectionHead>
          <Tick id="holder" on={form.holder} onToggle={flip('holder')} required title="I am the account holder">
            I am the only person needed to authorise Direct Debits from this account.
          </Tick>
          {isLottery && client.legal.lottery && (
            <Tick id="lotteryRules" on={form.lotteryRules} onToggle={flip('lotteryRules')} required title={`I am ${client.minAge} or over and accept the lottery rules`} onRead={() => setReading('lottery')} />
          )}
          <Tick id="terms" on={form.terms} onToggle={flip('terms')} required title="I accept the Terms and Conditions" onRead={() => setReading('terms')} />
          <Tick id="privacy" on={form.privacy} onToggle={flip('privacy')} required title={`I have been told how ${client.id.toUpperCase()} uses my data`} onRead={() => setReading('privacy')} />
          <div>
            <Label hint="Optional. Leave all off for no contact">Happy to hear from us by</Label>
            <div className="grid grid-cols-4 gap-2">
              {client.contactChannels.map((c) => <Chip key={c} active={form.contact.includes(c)} onClick={() => toggleContact(c)} className="px-1">{c}</Chip>)}
            </div>
          </div>
          {programme.giftAid && (
            <Tick id="giftAid" on={form.giftAid} onToggle={flip('giftAid')} title={<span className="flex items-center gap-2"><Gift size={22} /> Add Gift Aid</span>}>
              I am a UK taxpayer. The charity can claim 25p for every £1 I give. I understand that if I pay less Income or Capital Gains Tax than the Gift Aid claimed, I must pay the difference.
            </Tick>
          )}
          <div>
            <Label hint={signature ? undefined : 'Supporter signs on the glass'}><span className="flex items-center gap-2"><PenLine size={18} /> Signature</span></Label>
            <SignaturePad onChange={onSig} />
            <p className="text-[14px] text-[#3F4346] mt-2 leading-snug">
              By signing, the supporter instructs their bank to pay {client.payeeName} by Direct Debit, safeguarded by the Direct Debit Guarantee. {summary}, collected on the {form.day}.
            </p>
          </div>
        </section>
      </div>

      <div className="px-5 py-4 border-t-[4px] border-ink bg-white">
        <button type="submit" disabled={phase === 'sending'}
          className={`w-full min-h-[96px] rounded-[16px] border-[4px] border-ink font-display font-extrabold uppercase text-[34px] tracking-wide flex items-center justify-center gap-3 active:translate-y-[2px] ${
            missing.length ? 'bg-[#E4E6E3] text-[#4A4E52]' : online ? 'bg-brand text-white shadow-[0_5px_0_#0A0A0A]' : 'bg-accent text-ink shadow-[0_5px_0_#0A0A0A]'}`}>
          {phase === 'sending' ? <><LoaderCircle size={36} className="animate-spin" /> Sending…</>
            : missing.length ? <>{missing.length === 1 ? `Add ${missing[0]}` : `${missing.length} things to finish`}</>
            : online ? <><Send size={34} strokeWidth={2.5} /> Submit to {client.id.toUpperCase()}</>
            : <><CloudUpload size={36} strokeWidth={2.5} /> Save offline · sends later</>}
        </button>
        {missing.length > 1 && <div className="text-[15px] mt-2 text-center text-[#3F4346]">Still needed: {missing.join(', ')}</div>}
      </div>
    </form>
  );
}
