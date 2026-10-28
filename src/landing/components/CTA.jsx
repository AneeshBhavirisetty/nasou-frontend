import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function CTA() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: 6 + (index * 4.2) % 88,
        top: 8 + (index * 7.8) % 74,
        size: 3 + (index % 4),
        duration: 7 + (index % 6),
        delay: index * 0.16,
      })),
    [],
  );

  return (
    <section id="cta" className="mx-auto mt-16 max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="section-shell relative overflow-hidden rounded-[38px] border border-[#E5D8C7]/80 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_80%_15%,rgba(230,236,234,0.72),transparent_22%),linear-gradient(135deg,#EFEAE1_0%,#EFE7DA_58%,#E6ECEA_100%)] px-6 py-16 shadow-[0_30px_100px_rgba(37,88,73,0.12)] sm:px-8 lg:px-12 lg:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_20%),radial-gradient(circle_at_75%_10%,rgba(31,92,74,0.18),transparent_18%),radial-gradient(circle_at_70%_65%,rgba(229,216,199,0.12),transparent_18%)]" />
          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              className="absolute rounded-full bg-[#255849]/20 shadow-[0_0_22px_rgba(37,88,73,0.12)]"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
              }}
              animate={{
                y: [0, -30 - particle.size * 2, 0],
                x: [0, particle.size * 2, 0],
                opacity: [0.25, 0.95, 0.25],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          <p className="section-label justify-center text-center before:hidden">Final Call To Action</p>
          <h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-[-0.04em] text-[#1F5C4A] sm:text-5xl lg:text-[4.8rem]">
            Orchestrate the entire chain with the calm of a single interface.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#255849] sm:text-lg">
            Move from disconnected updates to a unified motion system where industry signals,
            retailer decisions, and customer outcomes stay synchronized in real time.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex"
            >
              <Link
                to="/app/auth"
                className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-[#FFFFFF] bg-[#E5D8C7] px-7 py-4 text-sm font-semibold text-[#1F5C4A] shadow-[0_16px_36px_rgba(229,216,199,0.22)] transition hover:bg-[#FFFFFF]"
              >
                Get Started
              </Link>
            </motion.div>
            <motion.a
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="#top"
              className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-[#E5D8C7] bg-[#FFFFFF]/82 px-7 py-4 text-sm font-semibold text-[#1F5C4A] shadow-[0_16px_36px_rgba(37,88,73,0.1)] transition hover:bg-[#E6ECEA]"
            >
              Rewatch the cinematic intro
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
