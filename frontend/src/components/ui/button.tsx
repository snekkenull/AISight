import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button variants with touch target compliance
 * Requirements: 8.4 - All interactive elements have minimum 44x44px touch target on mobile
 * 
 * Mobile touch targets use min-h-[44px] and min-w-[44px] to ensure accessibility
 * while maintaining visual design on desktop
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-button text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "eva-primary": "eva-clip-corner bg-eva-bg-tertiary border border-eva-border-accent text-eva-text-accent font-eva-mono uppercase tracking-eva-normal hover:shadow-eva-glow-orange hover:bg-eva-accent-orange/10 active:scale-95",
        "eva-warning": "eva-clip-corner bg-eva-bg-tertiary border border-eva-accent-red text-eva-accent-red font-eva-mono uppercase tracking-eva-normal hover:shadow-eva-glow-red hover:bg-eva-accent-red/10 active:scale-95",
        "eva-danger": "eva-clip-corner bg-eva-accent-red border border-eva-accent-red text-eva-text-primary font-eva-mono uppercase tracking-eva-normal hover:shadow-eva-glow-red hover:bg-eva-accent-red/90 active:scale-95",
        "eva-ghost": "eva-clip-corner-sm bg-transparent border border-eva-border-default text-eva-text-secondary font-eva-mono uppercase tracking-eva-normal hover:border-eva-border-accent hover:text-eva-text-accent hover:shadow-eva-glow-sm active:scale-95",
      },
      size: {
        // Mobile-first: 44px minimum touch target, desktop can be smaller visually
        default: "h-10 px-4 py-2 min-h-[44px] md:min-h-0",
        sm: "h-9 rounded-md px-3 min-h-[44px] md:min-h-0",
        lg: "h-11 rounded-md px-8 min-h-[44px] md:min-h-0",
        // Icon buttons: 44x44px minimum on mobile
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
