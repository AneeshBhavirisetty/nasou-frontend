import { useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function formatMetric(value, suffix, decimals = 0) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

function CountMetric({ value, label, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useLayoutEffect(() => {
    const proxy = { value: 0 };
    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        value,
        duration: 1.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          once: true,
        },
        onUpdate: () => setDisplay(proxy.value),
      });
    }, ref);

    return () => ctx.revert();
  }, [value]);

  return (
    <div ref={ref} className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFFFF]/82 px-4 py-4 shadow-[0_14px_34px_rgba(37,88,73,0.08)]">
      <div className="font-display text-2xl text-[#1F5C4A]">
        {formatMetric(display, suffix, decimals)}
      </div>
      <div className="mt-1 text-sm text-[#255849]">{label}</div>
    </div>
  );
}

function DashboardCard() {
  const ref = useRef(null);
  const rawX = useMotionValue(10);
  const rawY = useMotionValue(-8);
  const rotateX = useSpring(rawY, { stiffness: 120, damping: 18 });
  const rotateY = useSpring(rawX, { stiffness: 120, damping: 18 });
  const shadow = useTransform(
    rotateY,
    [-14, 0, 14],
    [
      "0 60px 120px rgba(37,88,73,0.32), -20px 0 60px rgba(34,88,73,0.12)",
      "0 60px 120px rgba(37,88,73,0.32), 0 0 60px rgba(34,88,73,0.12)",
      "0 60px 120px rgba(37,88,73,0.32), 20px 0 60px rgba(34,88,73,0.12)",
    ],
  );

  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const handleMove = (event) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rawX.set(px * 16);
    rawY.set(py * -18);
  };

  const handleLeave = () => {
    rawX.set(10);
    rawY.set(-8);
  };

  return (
    <div ref={ref} className="relative" style={{ perspective: "1800px" }}>
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, boxShadow: shadow, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative mx-auto w-full max-w-[680px]"
      >
        <div className="absolute inset-6 rounded-[30px] bg-[#255849]/12 blur-3xl" />
        <motion.div
          animate={{ rotateZ: [0, -1.5, 0], y: [0, 8, 0] }}
          transition={{ duration: 8.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-6 top-8 z-0 h-40 w-40 rounded-[30px] border border-[#E5D8C7] bg-[#FFFFFF]/70 backdrop-blur-2xl"
          style={{ transform: "translateZ(-80px)" }}
        />
        <motion.div
          animate={{ rotateZ: [0, 2.5, 0], x: [0, -8, 0] }}
          transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 left-4 z-0 h-28 w-52 rounded-[28px] border border-[#E5D8C7] bg-[#E6ECEA]/70 backdrop-blur-2xl"
          style={{ transform: "translateZ(-60px)" }}
        />

        <div className="dashboard-grid relative z-10 overflow-hidden rounded-[34px] border border-[#E5D8C7] bg-[linear-gradient(180deg,#FFFFFF_0%,#EFEAE1_100%)] p-5 backdrop-blur-3xl sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#255849]">Unified ops cockpit</p>
              <h3 className="mt-2 font-display text-2xl text-[#1F5C4A] sm:text-3xl">Supply chain command</h3>
            </div>
            <div className="rounded-full border border-[#255849]/14 bg-[linear-gradient(180deg,#255849_0%,#1F5C4A_100%)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#FFFFFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              Live
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] border border-[#E5D8C7] bg-[#FFFFFF]/72 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#255849]">Network flow</p>
                  <p className="mt-2 text-lg font-semibold text-[#1F5C4A]">Delivered volume vs forecast</p>
                </div>
                <div className="rounded-full border border-[#E5D8C7] bg-[#E6ECEA] px-3 py-1 text-sm text-[#1F5C4A]">
                  +18.4%
                </div>
              </div>

              <svg viewBox="0 0 360 220" className="h-[220px] w-full overflow-visible">
                <defs>
                  <linearGradient id="dashboard-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#255849" stopOpacity="0.15" />
                    <stop offset="40%" stopColor="#E5D8C7" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#255849" stopOpacity="1" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160, 200].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="360"
                    y1={y}
                    y2={y}
                    stroke="rgba(37,88,73,0.12)"
                    strokeDasharray="5 8"
                  />
                ))}
                <motion.path
                  d="M0 178C40 156 58 148 88 138C114 128 144 82 172 92C204 102 214 146 250 136C278 128 296 58 360 44"
                  fill="none"
                  stroke="url(#dashboard-line)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.25 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d="M0 188C44 168 82 162 118 146C158 128 188 120 226 132C282 148 312 118 360 122"
                  fill="none"
                  stroke="rgba(37,88,73,0.28)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="10 10"
                  initial={{ pathLength: 0, opacity: 0.1 }}
                  animate={isInView ? { pathLength: 1, opacity: 0.8 } : {}}
                  transition={{ duration: 1.5, delay: 0.25 }}
                />
                {[88, 172, 250, 360].map((x, index) => (
                  <motion.circle
                    key={x}
                    cx={x}
                    cy={[138, 92, 136, 44][index]}
                    r="5.5"
                    fill={index % 2 === 0 ? "#255849" : "#E5D8C7"}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.45 + index * 0.1 }}
                  />
                ))}
              </svg>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[26px] border border-[#E5D8C7] bg-[#FFFFFF]/72 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#255849]">Regional fill</p>
                <div className="mt-4 space-y-4">
                  {[
                    ["North", 86],
                    ["West", 72],
                    ["East", 93],
                    ["South", 78],
                  ].map(([label, value], index) => (
                      <div key={label}>
                        <div className="mb-2 flex items-center justify-between text-sm text-[#255849]">
                          <span>{label}</span>
                          <span>{value}%</span>
                        </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E5D8C7]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={isInView ? { width: `${value}%` } : {}}
                          transition={{
                            duration: 1.2,
                            delay: 0.35 + index * 0.12,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="h-full rounded-full bg-[linear-gradient(90deg,#255849_0%,#E5D8C7_100%)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-[#E5D8C7] bg-[#FFFFFF]/72 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#255849]">Order orchestration</p>
                    <p className="mt-2 text-lg font-semibold text-[#1F5C4A]">Event throughput</p>
                  </div>
                  <div className="text-right text-sm text-[#255849]">
                    14ms signal loop
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[54, 88, 74, 96].map((value, index) => (
                    <div key={value} className="flex flex-col items-center gap-3">
                      <div className="flex h-32 items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={isInView ? { height: `${value}%` } : {}}
                          transition={{ duration: 1.1, delay: 0.55 + index * 0.12 }}
                          className="w-10 rounded-t-[16px] bg-[linear-gradient(180deg,#E5D8C7_0%,#255849_100%)]"
                        />
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#255849]">
                        Q{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <section id="dashboard" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="section-shell rounded-[34px] border border-[#E5D8C7]/80 bg-[#EFEAE1] px-6 py-8 shadow-[0_30px_100px_rgba(37,88,73,0.12)] sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="max-w-xl">
            <p className="section-label mb-5">Dashboard Preview</p>
            <h2 className="font-display text-3xl text-[#1F5C4A] sm:text-4xl lg:text-[3.2rem]">
              A floating control surface with metrics that animate into proof.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#255849]">
              The preview is designed as a premium command center: self-drawing charts, counter
              motion, and cinematic depth that feels closer to a product reveal than a screenshot.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <CountMetric value={98.2} decimals={1} suffix="%" label="order promise confidence" />
              <CountMetric value={42} suffix="%" label="faster exception triage" />
              <CountMetric value={3.1} decimals={1} suffix="x" label="retailer response speed" />
              <CountMetric value={14} suffix=" ms" label="signal propagation time" />
            </div>
          </div>

          <DashboardCard />
        </div>
      </div>
    </section>
  );
}

