/**
 * Shared button style utility to ensure cross-browser compatibility.
 * Replaces colored shadow opacity that may render incorrectly in Chrome.
 */

export type ButtonColor = 'blue' | 'amber' | 'red' | 'green' | 'gray'

interface ButtonStylesConfig {
  color?: ButtonColor
  disabled?: boolean
  fullWidth?: boolean
}

/**
 * Generates consistent primary button classes.
 * Removes shadow color opacity (#/20) that causes visibility issues in Chrome.
 * Replaces with solid shadow-md for better cross-browser rendering.
 */
export function getPrimaryButtonClasses(config: ButtonStylesConfig = {}): string {
  const { color = 'blue', disabled = false, fullWidth = true } = config

  const colorMap: Record<ButtonColor, { bg: string; hover: string }> = {
    blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700' },
    amber: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700' },
    red: { bg: 'bg-red-600', hover: 'hover:bg-red-700' },
    green: { bg: 'bg-green-600', hover: 'hover:bg-green-700' },
    gray: { bg: 'bg-gray-600', hover: 'hover:bg-gray-700' },
  }

  const { bg, hover } = colorMap[color]

  const baseClasses = [
    fullWidth ? 'w-full' : '',
    'appearance-none',
    'border border-transparent',
    bg,
    'text-white',
    'px-4 py-3',
    'rounded-xl',
    hover,
    'transition-all',
    'font-bold',
    'shadow-md',
    'flex items-center justify-center gap-2',
    disabled ? 'disabled:opacity-50 disabled:cursor-not-allowed' : 'disabled:opacity-50',
  ]
    .filter(Boolean)
    .join(' ')

  return baseClasses
}

/**
 * Generates secondary button classes for less prominent actions.
 */
export function getSecondaryButtonClasses(config: Partial<ButtonStylesConfig> = {}): string {
  const { disabled = false, fullWidth = false } = config

  return [
    fullWidth ? 'w-full' : '',
    'appearance-none',
    'border border-gray-200',
    'bg-gray-100',
    'text-gray-700',
    'px-4 py-2',
    'rounded-lg',
    'hover:bg-gray-200',
    'transition-colors',
    'font-medium',
    'shadow-sm',
    'flex items-center justify-center gap-2',
    disabled ? 'disabled:opacity-50 disabled:cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
