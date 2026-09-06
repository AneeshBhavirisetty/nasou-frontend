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
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-[13.5px] text-emerald-700">
      <Icon name="check" size={16} strokeWidth={3} className="mb-1" />
      Thanks — we&rsquo;ll get back to you within one working day.
    </div>
  ) : (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success('Message sent'); }}
      className="grid gap-3 rounded-lg border border-line bg-white p-5"
    >
      <Field label="Your name" required placeholder="Full name" />
      <Field label="Email or phone" required placeholder="How we reach you" />
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Message</span>
        <textarea required rows={4} className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-[14px] outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/15" placeholder="Tell us what you need" />
      </label>
      <Button type="submit" iconRight="arrowRight">Send message</Button>
    </form>
  );
}

export default function Info({ slug = 'about' }) {
  const c = CONTENT[slug] ?? CONTENT.about;
  return (
    <Container className="py-8 sm:py-12">
      <Breadcrumbs className="mb-5" items={[{ label: 'Home', to: '/' }, { label: c.title }]} />
      <h1 className="display-serif text-[clamp(1.9rem,5vw,3rem)]">{c.title}</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-50">{c.lead}</p>

      {slug === 'about' && (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <div key={v.title} className="rounded-lg border border-line bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-600"><Icon name={v.icon} size={18} /></span>
              <h3 className="mt-4 text-[15px] font-bold">{v.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-50">{v.body}</p>
            </div>
          ))}
        </div>
      )}

      {slug === 'contact' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-3 text-[14px]">
            <p className="flex items-center gap-2.5"><Icon name="phone" size={16} className="text-emerald-600" /> <a href={`tel:${brand.phone.replace(/\s/g, '')}`} className="font-semibold hover:text-emerald-600">{brand.phone}</a></p>
            <p className="flex items-center gap-2.5"><Icon name="phone" size={16} className="text-emerald-600" /> Toll-free {brand.toll}</p>
            <p className="flex items-center gap-2.5"><Icon name="mail" size={16} className="text-emerald-600" /> <a href={`mailto:${brand.email}`} className="font-semibold hover:text-emerald-600">{brand.email}</a></p>
            <p className="flex items-start gap-2.5"><Icon name="pin" size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {brand.address}</p>
            <p className="flex items-center gap-2.5 text-ink-50"><Icon name="tag" size={16} /> GSTIN {brand.gst}</p>
          </div>
          <ContactForm />
        </div>
      )}

      {slug === 'returns' && (
        <div className="mt-8 max-w-2xl">
          <Accordion>
            {faqs.map((f, i) => <AccordionItem key={i} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}
          </Accordion>
        </div>
      )}
    </Container>
  );
}
