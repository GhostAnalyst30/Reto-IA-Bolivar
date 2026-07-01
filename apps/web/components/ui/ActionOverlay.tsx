'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ActionOverlayProps {
  show: boolean;
  message?: string;
}

export function ActionOverlay({ show, message = 'Procesando...' }: ActionOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-8 py-6 shadow-xl"
          >
            <Loader2 className="h-8 w-8 animate-spin text-brand-amber" />
            <p className="text-sm text-zinc-400">{message}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
