import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { pageTransition } from '../lib/motion';

export default function PublicLayout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
          >
            {children ?? <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
