"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TimelineFeed from "@/components/TimelineFeed";

export default function ResultsPage() {
	const [loading, setLoading] = useState(true);
	const supabase = createClient();

	useEffect(() => {
		// Verify Supabase connection (optional - for debugging)
		const checkConnection = async () => {
			try {
				const { error } = await supabase.from("photos").select("id").limit(1);
				if (error && !error.message.includes("relation")) {
					console.warn("Supabase connection check:", error);
				}
			} catch (err) {
				console.warn("Connection check failed:", err);
			} finally {
				setLoading(false);
			}
		};
		checkConnection();
	}, [supabase]);

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
				<div className="max-w-4xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold text-orange-primary">
							🎃 Resultater
						</h1>
						<a
							href="/"
							className="text-purple-primary hover:text-purple-secondary text-sm font-medium"
						>
							← Tilbake til hjemmesiden
						</a>
					</div>
					<p className="text-gray-600 text-sm mt-1">
						Se alle bildene som er lastet opp under konkurransen
					</p>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-4xl mx-auto px-4 py-6">
				{loading ? (
					<div className="text-center py-12">
						<div className="text-gray-400">Laster resultater...</div>
					</div>
				) : (
					<TimelineFeed />
				)}
			</main>
		</div>
	);
}
