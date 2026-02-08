import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-[1.5rem] border border-violet-100/50 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-all hover:shadow-[0_8px_30px_rgb(124,58,237,0.1)]',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-bold leading-none tracking-tight text-violet-950', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-violet-500/80 font-medium', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 pt-0 text-stone-700', className)}
      {...props}
    />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
