import * as React from "react"
import { cn } from "@/lib/utils"
import { Circle } from "lucide-react"

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({})

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value: propValue, defaultValue, onValueChange, name, disabled, children, ...props }, ref) => {
    const [stateValue, setStateValue] = React.useState(defaultValue || "")
    const value = propValue !== undefined ? propValue : stateValue

    const handleValueChange = React.useCallback(
      (val: string) => {
        if (propValue === undefined) {
          setStateValue(val)
        }
        onValueChange?.(val)
      },
      [onValueChange, propValue]
    )

    return (
      <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange, name, disabled }}>
        <div ref={ref} className={cn("grid gap-2", className)} role="radiogroup" {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    const checked = context.value === value
    const disabled = itemDisabled || context.disabled

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            context.onValueChange?.(value)
          }
        }}
        className={cn(
          "aspect-square size-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 bg-white",
          className
        )}
        {...props}
      >
        {checked && <Circle className="size-2 fill-current text-white" />}
      </button>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
