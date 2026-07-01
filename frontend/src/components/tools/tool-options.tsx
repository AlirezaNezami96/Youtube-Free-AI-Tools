import React from "react";

interface ToolOptionsProps {
	/** Optional label shown above the options row */
	label?: string;
	children: React.ReactNode;
}

/**
 * ToolOptions — a lightweight wrapper that presents tool-specific options
 * in a consistent horizontal row with an optional section label.
 *
 * Usage:
 *   <ToolOptions label="Format">
 *     <select ...>...</select>
 *   </ToolOptions>
 *
 * Ships as a pure presentational component with no client-side state.
 * Each tool page owns its own state; this component just provides
 * consistent layout and labelling.
 */
export default function ToolOptions({ label, children }: ToolOptionsProps) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
			{label && (
				<span className="text-sm font-semibold text-ink-soft select-none whitespace-nowrap">
					{label}
				</span>
			)}
			{children}
		</div>
	);
}

// ─── Primitive sub-components ─────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	children: React.ReactNode;
}

/** A consistently styled <select> for use inside ToolOptions. */
export function OptionSelect({ children, className = "", ...props }: SelectProps) {
	return (
		<select
			className={`rounded-lg border border-primary/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer ${className}`}
			{...props}
		>
			{children}
		</select>
	);
}

interface CheckboxProps {
	id: string;
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

/** A consistently styled checkbox + label for use inside ToolOptions. */
export function OptionCheckbox({ id, label, checked, onChange }: CheckboxProps) {
	return (
		<label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer select-none group">
			<input
				type="checkbox"
				id={id}
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="h-4 w-4 rounded border-primary/40 accent-primary-deep focus:ring-primary/20"
			/>
			<span className="text-sm font-semibold text-ink-soft group-hover:text-ink transition-colors">
				{label}
			</span>
		</label>
	);
}
