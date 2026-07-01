import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import SiteHeader from "@/components/shared/site-header";
import SiteFooter from "@/components/shared/site-footer";

const spaceGrotesk = Space_Grotesk({
	variable: "--font-display",
	subsets: ["latin"],
	display: "swap",
	preload: true,
});

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
	preload: false,
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	display: "swap",
	preload: false,
});

export const metadata: Metadata = {
	title: {
		default: "YouTube Tools Platform",
		template: "%s | YouTube Tools Platform",
	},
	description: "A premium suite of utility tools for extracting transcripts, calculating playlist durations, downloading thumbnails, cleaning URLs, and more.",
	metadataBase: new URL("https://yourdomain.com"),
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col bg-bg text-ink font-sans">
				<Providers>
					<SiteHeader />
					<main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
						{children}
					</main>
					<SiteFooter />
				</Providers>
			</body>
		</html>
	);
}
