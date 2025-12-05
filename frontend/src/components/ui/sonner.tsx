import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/contexts/ThemeContext"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-eva-bg-secondary group-[.toaster]:text-eva-text-primary group-[.toaster]:border-eva-border-accent group-[.toaster]:shadow-lg group-[.toaster]:font-eva-mono group-[.toaster]:uppercase group-[.toaster]:text-xs group-[.toaster]:tracking-wide",
          description: "group-[.toast]:text-eva-text-secondary",
          actionButton:
            "group-[.toast]:bg-eva-accent-orange group-[.toast]:text-eva-text-primary",
          cancelButton:
            "group-[.toast]:bg-eva-bg-tertiary group-[.toast]:text-eva-text-secondary",
          error: "group-[.toaster]:border-eva-accent-red group-[.toaster]:animate-eva-pulse",
          success: "group-[.toaster]:border-eva-accent-green",
          warning: "group-[.toaster]:border-eva-accent-orange",
          info: "group-[.toaster]:border-eva-accent-cyan",
        },
        style: {
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
