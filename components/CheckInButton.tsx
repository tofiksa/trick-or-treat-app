"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateDistance } from "@/lib/utils/distance";

interface CheckInButtonProps {
	onCheckInSuccess: () => void;
}

export default function CheckInButton({
	onCheckInSuccess,
}: CheckInButtonProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadingPhoto, setUploadingPhoto] = useState(false);
	const [photoProgress, setPhotoProgress] = useState<string>("");
	const isProcessingRef = useRef(false); // Prevent race conditions
	const supabase = createClient();

	const handleCheckIn = async () => {
		// Prevent multiple simultaneous check-ins
		if (isProcessingRef.current || loading) {
			return;
		}

		setLoading(true);
		setError(null);
		isProcessingRef.current = true;

		try {
			// Check if geolocation is available
			if (!navigator.geolocation) {
				throw new Error(
					"Geolokasjon støttes ikke av nettleseren din. Vennligst bruk en annen enhet.",
				);
			}

			// Check network connectivity
			if (!navigator.onLine) {
				throw new Error(
					"Ingen internettforbindelse. Vennligst sjekk nettverket ditt og prøv igjen.",
				);
			}

			// Get user
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				throw new Error(
					"Autentisering feilet. Vennligst prøv å logge inn igjen.",
				);
			}

			// Get current location with better error handling
			const position = await new Promise<GeolocationPosition>(
				(resolve, reject) => {
					// Set up timeout
					const timeoutId = setTimeout(() => {
						reject(
							new Error(
								"Stedsforespørsel tok for lang tid. Vennligst sørg for at GPS er aktivert og prøv igjen.",
							),
						);
					}, 15000); // 15 second timeout

					navigator.geolocation.getCurrentPosition(
						(pos) => {
							clearTimeout(timeoutId);
							// Check accuracy (in meters)
							if (pos.coords.accuracy > 100) {
								console.warn(
									"GPS accuracy is low:",
									pos.coords.accuracy,
									"meters",
								);
								// Still allow but warn user
							}
							resolve(pos);
						},
						(err) => {
							clearTimeout(timeoutId);
							reject(err);
						},
						{
							enableHighAccuracy: true,
							timeout: 12000,
							maximumAge: 30000, // Accept position up to 30 seconds old
						},
					);
				},
			);

			const { latitude, longitude } = position.coords;

			// Validate coordinates
			if (
				Number.isNaN(latitude) ||
				Number.isNaN(longitude) ||
				(latitude === 0 && longitude === 0)
			) {
				throw new Error("Ugyldige stedsdata mottatt. Vennligst prøv igjen.");
			}

			// Get user's last check-in to calculate distance
			const { data: lastCheckin, error: lastCheckinError } = await supabase
				.from("checkins")
				.select("latitude, longitude")
				.eq("user_id", user.id)
				.order("timestamp", { ascending: false })
				.limit(1)
				.maybeSingle(); // Use maybeSingle to handle no results gracefully

			if (lastCheckinError && lastCheckinError.code !== "PGRST116") {
				// PGRST116 is "not found" which is OK for first check-in
				console.error("Error fetching last check-in:", lastCheckinError);
				// Continue anyway - we'll just set distance to 0
			}

			let distance_from_previous = 0;
			if (lastCheckin?.latitude && lastCheckin?.longitude) {
				distance_from_previous = calculateDistance(
					lastCheckin.latitude,
					lastCheckin.longitude,
					latitude,
					longitude,
				);
				// Cap distance at reasonable maximum (e.g., 100km) to handle GPS jumps
				if (distance_from_previous > 100) {
					console.warn(
						"Unusually large distance detected:",
						distance_from_previous,
					);
					distance_from_previous = 0; // Reset to 0 for safety
				}
			}

			// Create check-in with retry logic
			let checkin: { id: string } | null = null;
			let retries = 2;
			while (retries > 0) {
				const { data, error: checkinError } = await supabase
					.from("checkins")
					.insert({
						user_id: user.id,
						latitude,
						longitude,
						distance_from_previous,
					})
					.select()
					.single();

				if (checkinError) {
					retries--;
					if (retries === 0) {
						throw new Error(
							`Kunne ikke lagre innlogging: ${checkinError.message}`,
						);
					}
					// Wait 500ms before retry
					await new Promise((resolve) => setTimeout(resolve, 500));
				} else {
					checkin = data;
					break;
				}
			}

			if (!checkin) {
				throw new Error(
					"Kunne ikke opprette innlogging. Vennligst prøv igjen.",
				);
			}

			// Check-in successful!
			onCheckInSuccess();

			// Prompt for photo (non-blocking)
			const wantsPhoto = window.confirm(
				"Innlogging vellykket! Vil du legge til et bilde av godteriet ditt?",
			);
			if (wantsPhoto && checkin) {
				// Don't await - let it run in background
				handlePhotoUpload(checkin.id).catch((photoErr) => {
					console.error("Photo upload error:", photoErr);
					// Error already displayed by handlePhotoUpload
				});
			}
		} catch (err: unknown) {
			console.error("Check-in error:", err);

			// Handle geolocation errors
			if (err && typeof err === "object" && "code" in err) {
				const geoError = err as { code: number; message?: string };
				if (geoError.code === 1) {
					setError(
						"📍 Stedstillatelse nektet. Vennligst aktiver GPS/stedsadgang i nettleserinnstillingene dine og prøv igjen.",
					);
				} else if (geoError.code === 2) {
					setError(
						"📍 Sted utilgjengelig. Vennligst sjekk GPS-innstillingene dine og sørg for at du er i et område med god signal.",
					);
				} else if (geoError.code === 3) {
					setError(
						"⏱️ Stedsforespørsel tok for lang tid. Vennligst sørg for at GPS er aktivert og prøv igjen.",
					);
				} else if (geoError.message) {
					setError(geoError.message);
				} else {
					setError(
						"Kunne ikke sjekke inn. Vennligst prøv igjen. Hvis problemet vedvarer, sjekk internettforbindelsen din.",
					);
				}
			} else if (err && typeof err === "object" && "message" in err) {
				setError((err as { message: string }).message);
			} else {
				setError(
					"Kunne ikke sjekke inn. Vennligst prøv igjen. Hvis problemet vedvarer, sjekk internettforbindelsen din.",
				);
			}
		} finally {
			setLoading(false);
			isProcessingRef.current = false;
		}
	};

	const handlePhotoUpload = async (checkinId: string) => {
		setUploadingPhoto(true);
		setPhotoProgress("Velger bilde...");
		setError(null);

		try {
			// Check network connectivity
			if (!navigator.onLine) {
				throw new Error(
					"Ingen internettforbindelse. Vennligst koble til internett for å laste opp bilder.",
				);
			}

			const input = document.createElement("input");
			input.type = "file";
			input.accept = "image/*";
			input.capture = "environment"; // Use rear camera on mobile

			// Handle file selection (including cancellation)
			const filePromise = new Promise<File | null>((resolve) => {
				input.onchange = (e) => {
					const file = (e.target as HTMLInputElement).files?.[0];
					resolve(file || null);
				};

				// Handle cancellation (user closes file picker without selecting)
				input.oncancel = () => {
					resolve(null);
				};
			});

			input.click();

			// Wait for file selection or cancellation
			const file = await filePromise;

			if (!file) {
				// User cancelled file selection
				setUploadingPhoto(false);
				setPhotoProgress("");
				return;
			}

			// Validate file type
			if (!file.type.startsWith("image/")) {
				throw new Error("Vennligst velg en bildefil.");
			}

			// Validate file size (before compression) - max 10MB
			const maxSizeMB = 10;
			if (file.size > maxSizeMB * 1024 * 1024) {
				throw new Error(
					`Filen er for stor (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal størrelse er ${maxSizeMB}MB.`,
				);
			}

			setPhotoProgress("Komprimerer bilde...");

			try {
				// Compress image
				const imageCompression = (await import("browser-image-compression"))
					.default;
				const compressedFile = await imageCompression(file, {
					maxSizeMB: 0.5,
					maxWidthOrHeight: 1920,
					useWebWorker: true,
					fileType: file.type, // Preserve original type
				});

				setPhotoProgress("Laster opp til server...");

				// Verify authentication
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();
				if (authError || !user) {
					throw new Error("Autentisering utløpt. Vennligst oppdater siden.");
				}

				const fileExt = compressedFile.name.split(".").pop() || "jpg";
				const fileName = `${user.id}/${checkinId}/${Date.now()}.${fileExt}`;

				// Upload to Supabase Storage with error handling
				const { error: uploadError } = await supabase.storage
					.from("candy-photos")
					.upload(fileName, compressedFile, {
						cacheControl: "3600",
						upsert: false,
					});

				if (uploadError) {
					// Handle specific storage errors
					if (uploadError.message.includes("Bucket not found")) {
						throw new Error(
							"Bildeoppbevaring er ikke konfigurert. Vennligst kontakt support.",
						);
					} else if (uploadError.message.includes("JWT")) {
						throw new Error(
							"Autentiseringsfeil. Vennligst oppdater siden og prøv igjen.",
						);
					} else {
						throw new Error(`Opplasting feilet: ${uploadError.message}`);
					}
				}

				setPhotoProgress("Lagrer bildereferanse...");

				// Get public URL
				const {
					data: { publicUrl },
				} = supabase.storage.from("candy-photos").getPublicUrl(fileName);

				// Save photo reference to database
				const { error: photoInsertError } = await supabase
					.from("photos")
					.insert({
						checkin_id: checkinId,
						storage_url: publicUrl,
					});

				if (photoInsertError) {
					console.error("Failed to save photo reference:", photoInsertError);
					// Photo uploaded but reference failed - log but don't block user
					setError(
						"Bilde ble lastet opp, men kunne ikke lagre referanse. Bildet kan ikke vises i historikken.",
					);
				} else {
					setPhotoProgress("✓ Bilde lastet opp vellykket!");
					// Clear success message after 3 seconds
					setTimeout(() => {
						setPhotoProgress("");
						onCheckInSuccess(); // Refresh to show new photo
					}, 3000);
				}
			} catch (compressionError: unknown) {
				console.error("Image compression error:", compressionError);
				const errorMessage =
					compressionError &&
					typeof compressionError === "object" &&
					"message" in compressionError
						? (compressionError as { message: string }).message
						: "Ukjent feil";
				throw new Error(`Bildebehandling feilet: ${errorMessage}`);
			}
		} catch (err: unknown) {
			console.error("Photo upload error:", err);
			const errorMessage =
				err && typeof err === "object" && "message" in err
					? (err as { message: string }).message
					: "Kunne ikke laste opp bilde. Vennligst prøv igjen.";
			setError(errorMessage);
			setPhotoProgress("");
		} finally {
			// Only clear uploading state after a delay to show success message
			if (!photoProgress.includes("✓")) {
				setUploadingPhoto(false);
				setPhotoProgress("");
			}
		}
	};

	return (
		<div className="space-y-3">
			<button
				type="button"
				onClick={handleCheckIn}
				disabled={loading || uploadingPhoto || isProcessingRef.current}
				className="h-16 w-full rounded-xl bg-orange-primary text-xl font-bold text-black-primary transition-all hover:bg-orange-secondary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading
					? "Sjekker inn..."
					: uploadingPhoto
						? `📷 ${photoProgress || "Laster opp bilde..."}`
						: "🎃 Sjekk inn ved hus"}
			</button>

			{error && (
				<div className="rounded-xl bg-red-500/20 border border-red-500 px-4 py-3 text-red-200 text-sm">
					{error}
					<button
						type="button"
						onClick={() => setError(null)}
						className="ml-2 underline hover:text-red-100"
						aria-label="Avvis feil"
					>
						Avvis
					</button>
				</div>
			)}

			{photoProgress?.includes("✓") && (
				<div className="rounded-xl bg-green-500/20 border border-green-500 px-4 py-3 text-green-200 text-sm">
					{photoProgress}
				</div>
			)}
		</div>
	);
}
