import { useState } from 'react';
import Icon from '../components/Icon';
import Accordion, { AccordionItem } from '../components/Accordion';
import { Button, Container, Breadcrumbs, Field } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { brand, faqs, valueProps } from '../data/site';

const CONTENT = {
  about: {
    title: 'About Nasou Hive',
    lead: `Nasou Hive is a plumbing-supplies counter built for the people who actually fit the pipe. We started in ${brand.since} with one frustration: finding an exact fitting shouldn't mean calling three shops and driving to a fourth.`,
  },
  contact: {
    title: 'Contact us',
    lead: 'Trade enquiry, bulk quote, or a question about an order — reach us any working day, 9am to 7pm.',
  },
  returns: {
    title: 'Returns & refunds',
    lead: 'Unused fittings in their original packaging can be returned within 7 days of delivery for a full refund of the item value. Start a return from your orders page or contact us.',
  },
};

function ContactForm() {
  const toast = useToast();
  const [sent, setSent] = useState(false);
  return sent ? (
    <div className="rounded-[20px] bg-emerald-50 p-5 text-[13.5px] font-semibold text-emerald-700">
      <Icon name="check" size={16} strokeWidth={3} className="mb-1" />
      Thanks — we&rsquo;ll get back to you within one working day.
    </div>
  ) : (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success('Message sent'); }}
      className="grid gap-4 rounded-[24px] border border-white/80 bg-white p-5 shadow-card sm:p-6"
    >
      <Field label="Your name" required placeholder="Full name" />
      <Field label="Email or phone" required placeholder="How we reach you" />
      <label className="block">
        <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">Message</span>
        <textarea required rows={4} className="w-full rounded-md border border-line bg-white/80 px-4 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-35 focus:border-forest focus:shadow-[0_8px_25px_rgba(37,88,73,0.14),0_0_0_2px_rgba(31,92,74,0.18)]" placeholder="Tell us what you need" />
      </label>
      <Button type="submit" iconRight="arrowRight">Send message</Button>
    </form>
  );
}

export default function Info({ slug = 'about' }) {
  const c = CONTENT[slug] ?? CONTENT.about;
  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: c.title }]} />
      <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-card backdrop-blur sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-50">Nasou Hive</p>
        <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.4rem)] font-semibold text-ink">{c.title}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-50">{c.lead}</p>
      </div>

      {slug === 'about' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <div key={v.title} className="rounded-[18px] border border-white/75 bg-white p-5 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-sunk text-forest"><Icon name={v.icon} size={19} /></span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{v.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-50">{v.body}</p>
            </div>
          ))}
        </div>
      )}

      {slug === 'contact' && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-[24px] bg-ink p-6 text-[14px] text-white sm:p-7 [&_a:hover]:!text-white [&_svg]:!text-[#c9d7d2]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c9d7d2]">Reach us</p>
            <p className="flex items-center gap-2.5"><Icon name="phone" size={16} className="text-emerald-600" /> <a href={`tel:${brand.phone.replace(/\s/g, '')}`} className="font-semibold hover:text-emerald-600">{brand.phone}</a></p>
            <p className="flex items-center gap-2.5"><Icon name="phone" size={16} className="text-emerald-600" /> Toll-free {brand.toll}</p>
            <p className="flex items-center gap-2.5"><Icon name="mail" size={16} className="text-emerald-600" /> <a href={`mailto:${brand.email}`} className="font-semibold hover:text-emerald-600">{brand.email}</a></p>
            <p className="flex items-start gap-2.5"><Icon name="pin" size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {brand.address}</p>
            <p className="flex items-center gap-2.5 text-white/70"><Icon name="tag" size={16} /> GSTIN {brand.gst}</p>
          </div>
          <ContactForm />
        </div>
      )}

      {slug === 'returns' && (
        <div className="mt-5 max-w-3xl">
          <Accordion>
            {faqs.map((f, i) => <AccordionItem key={i} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}
          </Accordion>
        </div>
      )}
    </Container>
  );
}
