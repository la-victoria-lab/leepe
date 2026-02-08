import * as React from 'react'
import { cn } from '@/lib/utils'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'glass'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default:
        'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 font-semibold tracking-wide',
      destructive:
        'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:scale-95 transition-all',
      outline:
        'border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent active:scale-95 transition-all font-medium',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all font-medium',
      ghost: 'hover:bg-violet-50 hover:text-primary active:scale-95 transition-all',
      link: 'text-primary underline-offset-4 hover:underline',
      glass:
        'bg-white/40 backdrop-blur-md border border-white/50 text-foreground hover:bg-white/60 active:scale-95 shadow-sm transition-all',
    }

    const sizes = {
      default: 'h-11 px-6 py-2 rounded-2xl', // Más alto y con mucho radio
      sm: 'h-9 rounded-xl px-4 text-xs font-semibold uppercase tracking-wider',
      lg: 'h-14 rounded-3xl px-10 text-lg',
      icon: 'h-11 w-11 rounded-2xl',
    }

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:grayscale',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
