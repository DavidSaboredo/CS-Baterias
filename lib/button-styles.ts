/**
 * Shared button style utility to ensure cross-browser compatibility.
 * Replaces colored shadow opacity that may render incorrectly in Chrome.
 */

export type ButtonColor = 'blue' | 'amber' | 'red' | 'green' | 'gray'
export type ButtonSize = 'sm' | 'md'

interface ButtonStylesConfig {
  color?: ButtonColor
  disabled?: boolean
  fullWidth?: boolean
  size?: ButtonSize
}

/**
 * Generates consistent primary button classes.
 * Removes shadow color opacity (#/20) that causes visibility issues in Chrome.
 * Replaces with solid shadow-md for better cross-browser rendering.
 */
export function getPrimaryButtonClasses(config: ButtonStylesConfig = {}): string {
  const { color = 'blue', disabled = false, fullWidth = false, size = 'md' } = config

  const colorMap: Record<ButtonColor, { bg: string; hover: string }> = {
    blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700' },
    amber: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700' },
    red: { bg: 'bg-red-600', hover: 'hover:bg-red-700' },
    green: { bg: 'bg-green-600', hover: 'hover:bg-green-700' },
    gray: { bg: 'bg-gray-600', hover: 'hover:bg-gray-700' },
  }

  const { bg, hover } = colorMap[color]

  const padding = size === 'sm' ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-2.5 rounded-xl'

  const baseClasses = [
    fullWidth ? 'w-full' : '',
    'appearance-none',
    'border border-transparent',
    bg,
    'text-white',
    padding,
    hover,
    'transition-colors',
    'font-semibold',
    'shadow-sm',
    'inline-flex items-center justify-center gap-2',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/10',
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
  const { disabled = false, fullWidth = false, size = 'md' } = config

  const padding = size === 'sm' ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-2.5 rounded-xl'

  return [
    fullWidth ? 'w-full' : '',
    'appearance-none',
    'border border-gray-200',
    'bg-white',
    'text-gray-800',
    padding,
    'hover:bg-gray-50',
    'transition-colors',
    'font-semibold',
    'shadow-sm',
    'inline-flex items-center justify-center gap-2',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/10',
    disabled ? 'disabled:opacity-50 disabled:cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
