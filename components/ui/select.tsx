"use client"

/**
 * Searchable Select — drop-in replacement for the shadcn/Radix Select.
 *
 * Same API as before (Select, SelectTrigger, SelectValue, SelectContent,
 * SelectItem, SelectGroup, SelectLabel, SelectSeparator), so every dropdown
 * in the app gets a search box without changing any page code.
 *
 *  • Type to filter (matches every word, any order, case-insensitive)
 *  • ↑/↓/Home/End to move, Enter to pick, Esc to close
 *  • Typing while the trigger is focused opens the list pre-filled
 *  • Items whose value starts with "__" (e.g. "__create_new__") always stay
 *    visible so "Create new…" actions are reachable while searching
 *  • `<Select searchable={false}>` opts a single dropdown out of search
 */

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// ── Helpers ────────────────────────────────────────────────────────

/** Plain text of a ReactNode tree, used for searching. */
function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(" ")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children)
  return ""
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

function matches(text: string, query: string) {
  const terms = normalize(query).split(" ").filter(Boolean)
  if (terms.length === 0) return true
  const hay = normalize(text)
  return terms.every((t) => hay.includes(t))
}

const isPinned = (value: string) => value.startsWith("__")

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

// ── Context ────────────────────────────────────────────────────────

type ItemRecord = { label: React.ReactNode; text: string; disabled: boolean }

type SelectCtx = {
  value: string | undefined
  select: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  disabled: boolean
  searchable: boolean
  query: string
  setQuery: (q: string) => void
  activeValue: string | null
  setActiveValue: (v: string | null) => void
  items: Map<string, ItemRecord>
  registerItem: (value: string, rec: ItemRecord) => void
  unregisterItem: (value: string) => void
  listId: string
}

const SelectContext = React.createContext<SelectCtx | null>(null)

function useSelect(component: string) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error(`<${component}> must be used within <Select>`)
  return ctx
}

/** "register": hidden pass that records items (so SelectValue knows labels). "list": visible popup. */
const RenderModeContext = React.createContext<"register" | "list">("list")

// ── Select (root) ──────────────────────────────────────────────────

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
  /** Show the search box (default true). */
  searchable?: boolean
  children?: React.ReactNode
}

function Select({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  required,
  name,
  searchable = true,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const value = valueProp !== undefined ? valueProp : uncontrolledValue

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp !== undefined ? openProp : uncontrolledOpen

  const [query, setQuery] = React.useState("")
  const [activeValue, setActiveValue] = React.useState<string | null>(null)
  const [items, setItems] = React.useState(() => new Map<string, ItemRecord>())
  const listId = React.useId()

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (disabled && next) return
      if (openProp === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
      if (!next) setQuery("")
    },
    [disabled, openProp, onOpenChange]
  )

  const select = React.useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolledValue(next)
      if (next !== value) onValueChange?.(next)
      setOpen(false)
    },
    [valueProp, value, onValueChange, setOpen]
  )

  const registerItem = React.useCallback((v: string, rec: ItemRecord) => {
    setItems((prev) => {
      const cur = prev.get(v)
      if (cur && cur.label === rec.label && cur.text === rec.text && cur.disabled === rec.disabled) return prev
      return new Map(prev).set(v, rec)
    })
  }, [])
  const unregisterItem = React.useCallback((v: string) => {
    setItems((prev) => {
      if (!prev.has(v)) return prev
      const next = new Map(prev)
      next.delete(v)
      return next
    })
  }, [])

  const ctx = React.useMemo<SelectCtx>(
    () => ({
      value,
      select,
      open,
      setOpen,
      disabled,
      searchable,
      query,
      setQuery,
      activeValue,
      setActiveValue,
      items,
      registerItem,
      unregisterItem,
      listId,
    }),
    [value, select, open, setOpen, disabled, searchable, query, activeValue, items, registerItem, unregisterItem, listId]
  )

  return (
    <SelectContext.Provider value={ctx}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal>
        <div data-slot="select" className="contents">
          {children}
        </div>
      </PopoverPrimitive.Root>
      {name && <input type="hidden" name={name} value={value ?? ""} required={required} />}
    </SelectContext.Provider>
  )
}

// ── Trigger & value ────────────────────────────────────────────────

function SelectTrigger({
  className,
  size = "default",
  children,
  onKeyDown,
  ...props
}: React.ComponentProps<"button"> & { size?: "sm" | "default" }) {
  const ctx = useSelect("SelectTrigger")
  const hasValue = ctx.value !== undefined && ctx.value !== "" && ctx.items.has(ctx.value)

  return (
    <PopoverPrimitive.Trigger asChild>
      <button
        {...props}
        type="button"
        role="combobox"
        aria-expanded={ctx.open}
        aria-controls={ctx.listId}
        aria-haspopup="listbox"
        data-slot="select-trigger"
        data-size={size}
        data-placeholder={hasValue ? undefined : ""}
        disabled={ctx.disabled || props.disabled}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented || ctx.disabled) return
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault()
            ctx.setOpen(true)
          } else if (ctx.searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== " ") {
            // Start typing on a focused trigger → open with that text as the search.
            e.preventDefault()
            ctx.setQuery(e.key)
            ctx.setOpen(true)
          }
        }}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
      </button>
    </PopoverPrimitive.Trigger>
  )
}

function SelectValue({
  placeholder,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { placeholder?: React.ReactNode; children?: React.ReactNode }) {
  const ctx = useSelect("SelectValue")
  const record = ctx.value !== undefined && ctx.value !== "" ? ctx.items.get(ctx.value) : undefined
  return (
    <span data-slot="select-value" className={cn("truncate", className)} {...props}>
      {children ?? (record ? record.label : placeholder)}
    </span>
  )
}

// ── Content (popup) ────────────────────────────────────────────────

function SelectContent({
  className,
  children,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  // Accepted for API compatibility with Radix Select; the popup always uses popper positioning.
  position: _position,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive.Content>, "children"> & {
  children?: React.ReactNode
  position?: "item-aligned" | "popper"
}) {
  void _position
  const ctx = useSelect("SelectContent")
  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Count visible matches from the registry (pinned "__" items don't count as matches).
  const { total, matchCount } = React.useMemo(() => {
    let total = 0
    let matchCount = 0
    for (const [value, rec] of ctx.items) {
      if (isPinned(value)) continue
      total++
      if (matches(rec.text, ctx.query)) matchCount++
    }
    return { total, matchCount }
  }, [ctx.items, ctx.query])

  const optionEls = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? [])

  // Keep a valid highlighted option: the selected one on open, else the first match.
  const { open, query, value, activeValue, setActiveValue } = ctx
  useIsoLayoutEffect(() => {
    if (!open) return
    const els = optionEls()
    const values = els.map((el) => el.dataset.value!)
    if (activeValue && values.includes(activeValue)) return
    const preferred = !query && value && values.includes(value) ? value : (values[0] ?? null)
    setActiveValue(preferred)
  }, [open, query, value, activeValue, setActiveValue, ctx.items])

  // Scroll the highlighted option into view.
  React.useEffect(() => {
    if (!open || !activeValue) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(activeValue)}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [open, activeValue])

  const move = (dir: 1 | -1 | "first" | "last") => {
    const els = optionEls()
    if (els.length === 0) return
    const idx = els.findIndex((el) => el.dataset.value === activeValue)
    let next: number
    if (dir === "first") next = 0
    else if (dir === "last") next = els.length - 1
    else next = idx < 0 ? 0 : Math.min(els.length - 1, Math.max(0, idx + dir))
    setActiveValue(els[next].dataset.value!)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      move(1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      move(-1)
    } else if (e.key === "Home" && !ctx.searchable) {
      e.preventDefault()
      move("first")
    } else if (e.key === "End" && !ctx.searchable) {
      e.preventDefault()
      move("last")
    } else if (e.key === "PageDown") {
      e.preventDefault()
      move("last")
    } else if (e.key === "PageUp") {
      e.preventDefault()
      move("first")
    } else if (e.key === "Enter" || (e.key === " " && !ctx.searchable)) {
      e.preventDefault()
      if (activeValue) {
        const rec = ctx.items.get(activeValue)
        if (rec && !rec.disabled) ctx.select(activeValue)
      }
    } else if (e.key === "Tab") {
      ctx.setOpen(false)
    }
  }

  return (
    <>
      {/* Hidden registration pass: lets SelectValue show labels while closed. */}
      <RenderModeContext.Provider value="register">
        <div hidden aria-hidden>
          {children}
        </div>
      </RenderModeContext.Provider>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="select-content"
          align={align}
          side={side}
          sideOffset={sideOffset}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(ctx.searchable ? inputRef.current : listRef.current)?.focus()
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "relative z-50 flex max-h-(--radix-popover-content-available-height) w-max max-w-[min(28rem,calc(100vw-2rem))] min-w-(--radix-popover-trigger-width) origin-(--radix-popover-content-transform-origin) flex-col overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "min-w-36",
            className
          )}
          {...props}
        >
          {ctx.searchable && (
            <div className="flex shrink-0 items-center gap-2 border-b px-2.5">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={ctx.query}
                onChange={(e) => ctx.setQuery(e.target.value)}
                placeholder="Search..."
                aria-label="Search options"
                aria-controls={ctx.listId}
                aria-activedescendant={activeValue ? `${ctx.listId}-${activeValue}` : undefined}
                autoComplete="off"
                spellCheck={false}
                className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {ctx.query && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    ctx.setQuery("")
                    inputRef.current?.focus()
                  }}
                  className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          )}

          <div
            ref={listRef}
            id={ctx.listId}
            role="listbox"
            tabIndex={ctx.searchable ? -1 : 0}
            className="min-h-0 flex-1 overflow-y-auto p-1 outline-none"
          >
            <RenderModeContext.Provider value="list">{children}</RenderModeContext.Provider>
            {total > 0 && matchCount === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No results for “{ctx.query.trim()}”
              </p>
            )}
          </div>

          {ctx.searchable && ctx.query && total > 0 && matchCount > 0 && (
            <div className="shrink-0 border-t px-2.5 py-1 text-[11px] text-muted-foreground">
              {matchCount} of {total} match
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </>
  )
}

// ── Items & structure ──────────────────────────────────────────────

function SelectItem({
  value,
  disabled = false,
  className,
  children,
  textValue,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  value: string
  disabled?: boolean
  children?: React.ReactNode
  /** Override the text used for searching (defaults to the item's text content). */
  textValue?: string
}) {
  const ctx = useSelect("SelectItem")
  const mode = React.useContext(RenderModeContext)
  const text = textValue ?? nodeText(children)

  // Register from the hidden pass only, so SelectValue can show labels while closed.
  const { registerItem, unregisterItem } = ctx
  useIsoLayoutEffect(() => {
    if (mode !== "register") return
    registerItem(value, { label: children, text, disabled })
  }, [mode, value, children, text, disabled, registerItem])
  useIsoLayoutEffect(() => {
    if (mode !== "register") return
    return () => unregisterItem(value)
  }, [mode, value, unregisterItem])

  if (mode === "register") return null
  if (!isPinned(value) && !matches(text, ctx.query)) return null

  const selected = ctx.value === value
  const active = ctx.activeValue === value

  return (
    <div
      id={`${ctx.listId}-${value}`}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-slot="select-item"
      data-value={value}
      data-highlighted={active ? "" : undefined}
      data-state={selected ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      onPointerMove={() => !disabled && !active && ctx.setActiveValue(value)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => !disabled && ctx.select(value)}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        {selected && <CheckIcon className="pointer-events-none" />}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}

function SelectGroup({ className, ...props }: React.ComponentProps<"div">) {
  const mode = React.useContext(RenderModeContext)
  if (mode === "register") return <>{props.children}</>
  return <div role="group" data-slot="select-group" className={cn("scroll-my-1 p-1", className)} {...props} />
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  const mode = React.useContext(RenderModeContext)
  const ctx = useSelect("SelectLabel")
  if (mode === "register" || ctx.query) return null
  return <div data-slot="select-label" className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  const mode = React.useContext(RenderModeContext)
  const ctx = useSelect("SelectSeparator")
  if (mode === "register" || ctx.query) return null
  return (
    <div
      role="separator"
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

/** Kept for API compatibility — the list scrolls natively now. */
function SelectScrollUpButton(props: React.ComponentProps<"div">) {
  void props
  return null
}
function SelectScrollDownButton(props: React.ComponentProps<"div">) {
  void props
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
