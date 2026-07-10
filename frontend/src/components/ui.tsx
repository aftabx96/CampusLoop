import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ReactNode, useRef } from 'react';
import { useUi } from '../stores/ui';

/** Ambient animated aurora background (fixed, behind everything). */
export function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
    </div>
  );
}

/** 3D perspective tilt card - premium hover depth, iOS-like spring. */
export function TiltCard({
  children,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18 });
  const shine = useMotionValue(50);
  const shineBg = useTransform(
    shine,
    (v) => `radial-gradient(420px circle at ${v}% 18%, rgba(255,255,255,0.28), transparent 65%)`,
  );

  return (
    <motion.div
      ref={ref}
      className={`glass card-hover ${className}`}
style={{
  ...style,
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  rotateX: srx,
  rotateY: sry,
  transformPerspective: 900,
  transformStyle: 'preserve-3d',
}}    
onClick={onClick}
      onMouseMove={(e) => {
        const rect = ref.current!.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        ry.set((px - 0.5) * 10);
        rx.set((0.5 - py) * 8);
        shine.set(px * 100);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          background: shineBg,
        }}
      />
      <div style={{
    transform: 'translateZ(24px)',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  }}
>
  {children}</div>
    </motion.div>
  );
}

/** Page enter/exit transition wrapper - spatial continuity, spring-based. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered list container. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
export const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 26 } },
};

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
            background: 'rgba(8,10,20,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            padding: 20,
          }}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{ width: wide ? 'min(880px, 100%)' : 'min(520px, 100%)', maxHeight: '86dvh', overflowY: 'auto', padding: 28 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 20 }}>{title}</h3>
              <button className="btn btn-glass btn-sm" onClick={onClose} aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useUi();
  const icons = {
    success: <CheckCircle2 size={17} color="var(--success)" />,
    error: <AlertCircle size={17} color="var(--danger)" />,
    info: <Info size={17} color="var(--accent)" />,
  };
  return (
    <div
      aria-live="polite"
      style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, display: 'flex', flexDirection: 'column', gap: 10, width: 'min(420px, calc(100vw - 32px))' }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="glass-strong"
            style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 18 }}
          >
            {icons[t.kind]}
            <span style={{ fontSize: 14, flex: 1 }}>{t.text}</span>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'var(--ink-3)', display: 'flex' }}>
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="glass" style={{ padding: '56px 24px', textAlign: 'center', flex: '1 1 100%', maxWidth: 'none', width: '100%' }}>
      <div style={{ display: 'inline-flex', padding: 18, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', marginBottom: 14 }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, marginBottom: 6 }}>{title}</h3>
      {hint && <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>{hint}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: 24, color: 'var(--ink-2)' }}>
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        style={{ width: 18, height: 18, border: '2.5px solid color-mix(in srgb, var(--accent) 30%, transparent)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }}
      />
      {label && <span style={{ fontSize: 15 }}>{label}</span>}
    </div>
  );
}
