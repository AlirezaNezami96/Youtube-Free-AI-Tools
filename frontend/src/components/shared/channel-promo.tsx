import React from "react";

type ChannelPromoProps = {
	channelName?: string;
	channelUrl?: string;
	imageSrc?: string;
	message?: string;
};

export default function ChannelPromo({
	channelName = "Deep House Illusion",
	channelUrl = "https://www.youtube.com/@DeepHouseillusion?sub_confirmation=1",
	imageSrc = "/channel-logo.png",
	message = "Enjoyed this tool? Support us by subscribing to our YouTube channel.",
}: ChannelPromoProps) {
	return (
		<div className="mt-8 overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
			<div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
				<div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
					<div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-deep text-primary-deep/10 shadow-sm overflow-hidden">
						{/* Fallback avatar overlaying a conditional image */}
						<div className="absolute inset-0 flex items-center justify-center bg-primary-deep text-white font-bold text-2xl">
							{/* Music note icon */}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="h-7 w-7 text-primary"
							>
								<path d="M9 18V5l12-2v13" />
								<circle cx="6" cy="18" r="3" />
								<circle cx="18" cy="16" r="3" />
							</svg>
						</div>
						{/* Real image if available */}
						{/* We use standard HTML img to avoid Next.js Image component setup complexity for static exports */}
						<img
							src={imageSrc}
							alt={channelName}
							onError={(e) => {
								(e.target as HTMLElement).style.display = "none";
							}}
							className="absolute inset-0 h-full w-full object-cover"
						/>
					</div>
					<div>
						<h3 className="font-display text-lg font-bold text-ink leading-tight">
							{channelName}
						</h3>
						<p className="mt-1 text-sm text-ink-soft max-w-md leading-relaxed">
							{message}
						</p>
					</div>
				</div>
				<a
					href={channelUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="w-full sm:w-auto text-center font-display font-bold text-sm text-ink bg-accent hover:bg-accent/80 px-6 py-3 rounded-xl transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98]"
				>
					Subscribe Now
				</a>
			</div>
		</div>
	);
}
