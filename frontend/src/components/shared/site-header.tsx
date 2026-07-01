"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
	const pathname = usePathname();
	const isHome = pathname === "/";

	return (
		<header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-bg/90 backdrop-blur-md">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo / brand */}
					<div className="flex items-center gap-3">
						<Link href="/" className="flex items-center gap-2.5 group">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-deep text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="h-5 w-5 text-primary"
								>
									<polygon points="6 3 20 12 6 21 6 3" />
								</svg>
							</div>
							<span className="font-display text-lg font-bold text-ink tracking-tight group-hover:text-primary-deep transition-colors">
								YouTube<span className="font-normal text-ink-soft">Tools</span>
							</span>
						</Link>
					</div>

					{/* Nav */}
					<nav className="flex items-center gap-4">
						<Link
							href="/"
							className={[
								"text-sm font-semibold transition-colors",
								isHome
									? "text-primary-deep underline underline-offset-4"
									: "text-ink-soft hover:text-primary-deep",
							].join(" ")}
						>
							All Tools
						</Link>
						<a
							href="https://www.youtube.com/@DeepHouseillusion"
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-lg bg-primary/30 px-3 py-1.5 text-xs font-bold text-primary-deep hover:bg-primary/50 transition-colors whitespace-nowrap"
						>
							YouTube Channel
						</a>
					</nav>
				</div>
			</div>
		</header>
	);
}
