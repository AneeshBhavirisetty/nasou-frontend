import { motion } from "framer-motion";

const features = [
  {
    title: "Predictive replenishment",
    copy:
      "Fuse demand, capacity, and route stability into a single recommendation layer before shelves go out of balance.",
    accent: "from-[#E6ECEA]/35 via-white/5 to-transparent",
    icon: (
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <defs>
          <linearGradient id="feature-wave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5D8C7" />
            <stop offset="100%" stopColor="#255849" />
          </linearGradient>
        </defs>
        <path
          d="M6 28C10 28 10 18 14 18s4 10 8 10 4-12 8-12 4 16 8 16 4-8 4-8"
          fill="none"
          stroke="url(#E5D8C7ture-wave)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="14" cy="18" r="3" fill="#255849" />
        <circle cx="22" cy="28" r="3" fill="#E6ECEA" />
        <circle cx="30" cy="16" r="3" fill="#E5D8C7" />
      </svg>
    ),
  },
  {
    title: "Live route health",
    copy:
      "Watch transport risk, handoff latency, and cross-region bottlenecks pulse directly inside the same operational map.",
    accent: "from-[#255849]/60 via-white/5 to-transparent",
    icon: (
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <circle cx="11" cy="14" r="4" fill="#255849" />
        <circle cx="24" cy="24" r="4.5" fill="#E6ECEA" />
        <circle cx="37" cy="12" r="4" fill="#E5D8C7" />
        <circle cx="35" cy="36" r="4.5" fill="#255849" />
        <path
          d="M11 14l13 10 13-12-2 24-11-12"
          fill="none"
          stroke="#E6ECEA"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    ),
  },
  {
    title: "Retail collaboration",
    copy:
      "Give merchants and operators the same timeline so replenishment, promo timing, and customer commitments stay synchronized.",
    accent: "from-[#E5D8C7]/35 via-white/5 to-transparent",
    icon: (
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <rect x="8" y="18" width="12" height="14" rx="3" fill="#255849" />
        <rect x="28" y="12" width="12" height="20" rx="3" fill="#E6ECEA" />
        <path
          d="M20 25h8m-4-7v14"
          stroke="#EFE7DA"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Customer promise engine",
    copy:
      "Turn the final mile into a brand surface with delivery confidence, service guardrails, and ETA certainty that updates continuously.",
    accent: "from-[#255849]/30 via-white/5 to-transparent",
    icon: (
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <path
          d="M24 9l13 8v14l-13 8-13-8V17l13-8Z"
          fill="none"
          stroke="#E5D8C7"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 9v30M11 17l13 8 13-8"
          stroke="#255849"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-3xl">
        <p className="section-label mb-5">Platform Surface</p>
        <h2 className="font-display text-3xl text-[#1F5C4A] sm:text-4xl lg:text-[3.2rem]">
          Precision tooling for every supply chain conversation.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#255849]">
          The experience stays premium because the system stays legible. Each module is built to
          feel tactile, luminous, and instantly readable under pressure.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -12, scale: 1.015 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              opacity: { duration: 0.8, delay: index * 0.08 },
              y: { duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.3 },
            }}
            className="group relative min-h-[320px] overflow-hidden rounded-[28px] border border-[#E5D8C7] bg-[#FFFFFF]/86 p-6 shadow-[0_22px_54px_rgba(37,88,73,0.1)] backdrop-blur-2xl"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition duration-500 group-hover:opacity-100`}
            />
            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#255849]/40 to-transparent" />
            <motion.div
              animate={{ rotate: [0, 3, 0], y: [0, -6, 0] }}
              transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              {feature.icon}
            </motion.div>

            <div className="relative z-10 mt-10">
              <h3 className="font-display text-2xl text-[#1F5C4A]">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#255849]">{feature.copy}</p>
            </div>

            <motion.div
              initial={{ scaleX: 0.2, opacity: 0.35 }}
              whileHover={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute bottom-0 left-6 right-6 h-px origin-left bg-gradient-to-r from-[#255849] via-[#E5D8C7] to-transparent"
            />
          </motion.article>
        ))}
      </div>
    </section>
  );
}

