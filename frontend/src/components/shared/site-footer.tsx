import React from "react";

export default function SiteFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="mt-auto border-t border-primary/20 bg-bg py-8">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
					<p className="text-xs text-ink-soft">
						&copy; {currentYear} YouTube Tools. All rights reserved.
					</p>
					<div className="flex gap-4">
						<a
							href="https://www.youtube.com/static?template=terms"
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-ink-soft hover:text-primary-deep underline underline-offset-2 transition-colors"
						>
							YouTube ToS
						</a>
						<span className="text-xs text-primary/30">|</span>
						<span className="text-xs text-ink-soft">Fair Use Only</span>
					</div>
				</div>

				{/* Unobtrusive legal compliance footer note */}
				<div className="mt-6 border-t border-primary/10 pt-4 text-center">
					<p className="text-[10px] text-ink-soft/70 leading-relaxed max-w-2xl mx-auto">
						Disclaimer: These tools are provided for personal, educational, and fair-use purposes only. Users are solely responsible for complying with YouTube's Terms of Service and all applicable local copyright laws regarding content retrieval.
					</p>
				</div>
			</div>
		</footer>
	);
}
