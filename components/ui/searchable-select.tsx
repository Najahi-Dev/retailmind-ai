"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type SearchableSelectOption = {
  value: string
  /** Main text shown in the list and in the trigger. */
  label: string
  /** Optional secondary line (e.g. SKU, category, stock). */
  description?: string
  /** Extra text that should match the search but isn't displayed. */
  keywords?: string
  disabled?: boolean
}

type Props = {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  id?: string
  "aria-invalid"?: boolean
}

/**
 * A Select-style dropdown with a search box. Matches the look of
 * `components/ui/select` and supports full keyboard navigation:
 * type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled,
  className,
  id,
  ...rest
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const selected = options.find((o) => o.value === value)

  const filtered = React.useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return options
    return options.filter((o) => {
      const haystack = `${o.label} ${o.description ?? ""} ${o.keywords ?? ""}`.toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
  }, [options, query])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setQuery("")
      const idx = options.findIndex((o) => o.value === value)
      setActiveIndex(idx >= 0 ? idx : 0)
    }
  }

  // Keep the highlighted row in view while navigating with the keyboard.
  React.useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  const choose = (option: SearchableSelectOption | undefined) => {
    if (!option || option.disabled) return
    onValueChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === "Home") {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setActiveIndex(Math.max(0, filtered.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      choose(filtered[activeIndex])
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={rest["aria-invalid"]}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50",
            className
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-60 gap-0 p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Focus the search box instead of the first focusable element.
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input")?.focus()
        }}
      >
        <div className="flex items-center gap-2 border-b px-2.5">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            aria-activedescendant={filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            className="h-9 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setActiveIndex(0)
              }}
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <div ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            filtered.map((o, i) => {
              const isSelected = o.value === value
              const isActive = i === activeIndex
              return (
                <div
                  key={o.value}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled}
                  onMouseMove={() => setActiveIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={cn(
                    "relative flex cursor-default flex-col rounded-sm py-1.5 pr-8 pl-2 text-xs select-none",
                    isActive && "bg-accent text-accent-foreground",
                    o.disabled && "pointer-events-none opacity-50"
                  )}
                >
                  <span className="truncate font-medium">{o.label}</span>
                  {o.description && (
                    <span className="truncate text-[11px] text-muted-foreground">{o.description}</span>
                  )}
                  {isSelected && (
                    <CheckIcon className="absolute top-1/2 right-2 size-4 -translate-y-1/2" />
                  )}
                </div>
              )
            })
          )}
        </div>

        {options.length > 0 && (
          <div className="border-t px-2.5 py-1.5 text-[10px] text-muted-foreground">
            {filtered.length === options.length
              ? `${options.length} options`
              : `${filtered.length} of ${options.length} match`}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
