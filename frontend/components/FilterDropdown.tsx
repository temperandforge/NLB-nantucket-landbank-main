"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ChevronDownIcon, ChevronUpIcon, SquareCheckIcon, SquareIcon } from "@/components/icons";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  /** Without it the checkboxes do nothing (only until a page that wires them has loaded). */
  onChange?: (selected: string[]) => void;
  /** Render nothing when there are no options (the archives); the map shows the empty dropdown. */
  hideWhenEmpty?: boolean;
}

/**
 * One multi-select filter, shared by the map, the Properties archive and the Records archive (Figma: a button that opens a white panel of checkboxes). The button is the
 * same as the one on the Properties page: label and chevron, with the light border while open or
 * once something is chosen. The panel lists each option with the design's square on the right, "View All"
 * first (checked while nothing is chosen; choosing it clears the filter). Closed by Escape (focus returns to the
 * button) or a press outside.
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  hideWhenEmpty = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange?.(selected.filter((v) => v !== value));
    } else {
      onChange?.([...selected, value]);
    }
  }

  if (hideWhenEmpty && options.length === 0) return null;
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div ref={root} className="relative w-full sm:w-[214px]">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded border bg-input px-5 py-4 font-mono text-body-base text-on-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 ${
          open || selected.length > 0 ? "border-border-light" : "border-transparent"
        }`}
      >
        {/* One line: the label gives way with an ellipsis, the count and the chevron never do. */}
        <span className="flex min-w-0 whitespace-nowrap">
          <span className="truncate">{label}</span>
          {selected.length > 0 && <span className="shrink-0">&nbsp;({selected.length})</span>}
        </span>
        <Chevron className="size-6 shrink-0" />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute left-0 top-full z-20 mt-2 flex max-h-[min(32rem,70dvh)] w-full flex-col overflow-auto rounded bg-surface-light p-6 shadow-[0_8px_20px_rgba(0,0,0,0.04)] sm:w-[266px]"
        >
          <label className="flex cursor-pointer items-center justify-between gap-4 py-2 font-sans text-body-base text-on-surface-light">
            <span>View All</span>
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange?.([])}
              className="peer sr-only"
            />
            <span className="flex shrink-0 rounded-[2px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-moody-moor-500">
              {selected.length === 0 ? <SquareCheckIcon className="size-6" /> : <SquareIcon className="size-6" />}
            </span>
          </label>
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center justify-between gap-4 py-2 font-sans text-body-base text-on-surface-light"
              >
                <span>{option.label}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="peer sr-only"
                />
                <span className="flex shrink-0 rounded-[2px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-moody-moor-500">
                  {checked ? <SquareCheckIcon className="size-6" /> : <SquareIcon className="size-6" />}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
