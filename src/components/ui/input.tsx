import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-2xl border-2 border-violet-50/50 bg-white/70 px-4 py-2 text-base font-medium shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-violet-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 outline-none hover:border-violet-200 hover:bg-white',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
