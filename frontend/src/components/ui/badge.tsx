import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        muted:
          "border-transparent bg-muted text-muted-foreground",
        "eva-orange":
          "eva-clip-corner-sm border-eva-accent-orange bg-eva-bg-tertiary text-eva-accent-orange font-eva-mono uppercase tracking-eva-tight text-[10px] px-2 py-0.5",
        "eva-red":
          "eva-clip-corner-sm border-eva-accent-red bg-eva-bg-tertiary text-eva-accent-red font-eva-mono uppercase tracking-eva-tight text-[10px] px-2 py-0.5",
        "eva-purple":
          "eva-clip-corner-sm border-eva-accent-purple bg-eva-bg-tertiary text-eva-accent-purple font-eva-mono uppercase tracking-eva-tight text-[10px] px-2 py-0.5",
        "eva-green":
          "eva-clip-corner-sm border-eva-accent-green bg-eva-bg-tertiary text-eva-accent-green font-eva-mono uppercase tracking-eva-tight text-[10px] px-2 py-0.5",
        "eva-cyan":
          "eva-clip-corner-sm border-eva-accent-cyan bg-eva-bg-tertiary text-eva-accent-cyan font-eva-mono uppercase tracking-eva-tight text-[10px] px-2 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
