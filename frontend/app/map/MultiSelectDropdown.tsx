"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label
        : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative w-full sm:w-81.25 max-w-[35%]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border border-black bg-white p-3 text-black hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <span className="dropdown-container flex gap-2 items-center truncate">
          <span className="font-medium">{label}:</span> {summary}
        </span>
        <svg
          className={`ml-2 size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-64 md:w-[85%] w-full overflow-auto border border-black bg-white lg:py-3 py-1 dark:border-neutral-700 dark:bg-neutral-900 scrollbar-thin">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded lg:px-6 px-3 py-1 text-left text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Clear all
            </button>
          )}
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-10 justify-between py-2 lg:px-6 px-3 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {option.label}
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleValue(option.value)}
                className="dropdown-checkbox size-3 border-black dark:border-neutral-600"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
