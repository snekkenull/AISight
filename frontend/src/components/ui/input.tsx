import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full px-3 py-2 text-sm ring-offset-background transition-all duration-200 ease-in-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] md:min-h-0",
  {
    variants: {
      variant: {
        default: "rounded-input border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        eva: "eva-clip-corner-sm bg-eva-bg-secondary border border-eva-border-default text-eva-text-primary font-eva-mono placeholder:text-eva-text-secondary focus-visible:outline-none focus-visible:border-eva-border-accent focus-visible:shadow-eva-glow-orange",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

/**
 * Input component with touch target compliance and EVA styling
 * Requirements: 8.4 - All interactive elements have minimum 44x44px touch target on mobile
 * Requirements: 4.3, 10.4 - EVA styling with dark background, accent border, and focus glow
 * 
 * Uses min-h-[44px] on mobile to ensure accessibility while maintaining
 * visual design on desktop (h-10 = 40px)
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
