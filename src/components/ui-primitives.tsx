/**
 * Premium UI Primitives — Paova Design System
 * 
 * Composants de base avec styles cohérents et tokens systématiques.
 * Ces primitives garantissent une expérience premium uniforme dans toute l'application.
 */

/**
 * Design Tokens - à utiliser partout dans l'application
 */
export const PREMIUM_TOKENS = {
  // Timing cohérent pour toutes les transitions
  duration: {
    instant: 'duration-[100ms]',
    fast: 'duration-[150ms]',
    normal: 'duration-[200ms]',
    slow: 'duration-[280ms]',
  },
  
  // Easing premium - mouvement naturel
  easing: 'ease-[cubic-bezier(0.22,1,0.36,1)]',
  
  // Hover transforms cohérents
  hover: {
    lift: 'hover:-translate-y-[1.5px]',
    liftSm: 'hover:-translate-y-px',
    scale: 'hover:scale-[1.02]',
  },
  
  // Active states cohérents
  active: {
    scale: 'active:scale-[0.98]',
    press: 'active:translate-y-0',
  },
  
  // Focus states premium
  focus: 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]',
  focusTight: 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)]',
  
  // Border radius scale
  radius: {
    sm: 'rounded-lg',        // 0.5rem / 8px
    md: 'rounded-xl',        // 0.75rem / 12px
    lg: 'rounded-[1rem]',    // 16px
    xl: 'rounded-[1.25rem]', // 20px
    '2xl': 'rounded-[1.5rem]', // 24px
  },
  
  // Icon sizes cohérents
  icon: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
  },
  
  // Stroke width pour icônes
  iconStroke: {
    thin: 1.5,
    normal: 1.8,
    medium: 2,
    bold: 2.2,
  },
  
  // Gap scale cohérent
  gap: {
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-2.5',
    lg: 'gap-3',
    xl: 'gap-4',
  },
  
  // Padding scale pour boutons et inputs
  padding: {
    sm: 'px-3 py-2',
    md: 'px-3.5 py-2.5',
    lg: 'px-4 py-3',
  },
  
  // Text opacity hierarchy
  text: {
    primary: 'text-[var(--color-foreground)]',
    secondary: 'text-[var(--color-foreground)]/78',
    tertiary: 'text-[var(--color-muted)]',
    quaternary: 'text-[var(--color-muted)]/62',
    placeholder: 'text-[var(--color-muted)]/48',
  },
  
  // Border mixing cohérent
  border: {
    subtle: 'border-[color-mix(in_srgb,var(--color-border)_50%,transparent)]',
    default: 'border-[color-mix(in_srgb,var(--color-border)_70%,transparent)]',
    emphasis: 'border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))]',
  },
  
  // Brand color mixing cohérent
  brand: {
    surface: 'bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]',
    muted: 'bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)]',
    soft: 'bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)]',
    medium: 'bg-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]',
  },
  
  // Shadow elevation
  shadow: {
    1: 'shadow-[var(--elev-1)]',
    2: 'shadow-[var(--elev-2)]',
    3: 'shadow-[var(--elev-3)]',
    hover: 'shadow-[var(--elev-hover)]',
  },
} as const;

/**
 * Classes de base pour composants premium
 */
export const PREMIUM_CLASSES = {
  // Bouton primaire premium
  buttonPrimary: `inline-flex items-center justify-center ${PREMIUM_TOKENS.radius.md} bg-[var(--color-brand)] ${PREMIUM_TOKENS.padding.md} text-[14px] font-medium tracking-[-0.01em] text-[var(--color-on-brand)] ${PREMIUM_TOKENS.shadow[1]} transition-[transform,box-shadow,filter] ${PREMIUM_TOKENS.duration.fast} ${PREMIUM_TOKENS.easing} ${PREMIUM_TOKENS.hover.liftSm} hover:brightness-[1.04] hover:${PREMIUM_TOKENS.shadow[2]} ${PREMIUM_TOKENS.focus} ${PREMIUM_TOKENS.active.scale} ${PREMIUM_TOKENS.active.press} disabled:pointer-events-none disabled:opacity-55`,
  
  // Bouton secondaire premium
  buttonSecondary: `inline-flex items-center justify-center ${PREMIUM_TOKENS.radius.md} border ${PREMIUM_TOKENS.border.default} bg-[var(--color-surface)] ${PREMIUM_TOKENS.padding.md} text-[14px] font-medium tracking-[-0.01em] ${PREMIUM_TOKENS.text.primary} ${PREMIUM_TOKENS.shadow[1]} transition-[transform,border-color,box-shadow,background-color] ${PREMIUM_TOKENS.duration.fast} ${PREMIUM_TOKENS.easing} ${PREMIUM_TOKENS.hover.liftSm} hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:${PREMIUM_TOKENS.shadow[2]} ${PREMIUM_TOKENS.focus} ${PREMIUM_TOKENS.active.scale} ${PREMIUM_TOKENS.active.press} disabled:pointer-events-none disabled:opacity-55`,
  
  // Input field premium
  input: `w-full min-h-[2.75rem] ${PREMIUM_TOKENS.radius.md} border ${PREMIUM_TOKENS.border.emphasis} bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface-2))] px-3.5 py-2.5 text-[14px] ${PREMIUM_TOKENS.text.primary} ${PREMIUM_TOKENS.shadow[1]} outline-none transition-[border-color,box-shadow,background-color] ${PREMIUM_TOKENS.duration.fast} ${PREMIUM_TOKENS.easing} placeholder:${PREMIUM_TOKENS.text.placeholder} hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] focus:border-[var(--color-brand)] focus:bg-[var(--color-surface)] focus:shadow-[var(--focus-ring)]`,
  
  // Card premium
  card: `${PREMIUM_TOKENS.radius['2xl']} border ${PREMIUM_TOKENS.border.default} bg-[var(--color-surface)] p-5 ${PREMIUM_TOKENS.shadow[3]} ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-6`,
  
  // Badge premium
  badge: `inline-flex items-center ${PREMIUM_TOKENS.gap.xs} rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] leading-none`,
  
  // Link avec hover premium
  link: `transition-colors ${PREMIUM_TOKENS.duration.fast} ${PREMIUM_TOKENS.easing} hover:text-[var(--color-brand)] ${PREMIUM_TOKENS.focus}`,
} as const;

/**
 * Utilitaires pour générer des classes cohérentes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
