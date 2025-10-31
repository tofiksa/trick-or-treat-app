import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black-primary p-4">
      <main className="w-full max-w-md">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-4xl font-bold leading-tight text-orange-primary md:text-5xl">
              🎃 Knask eller Knep
            </h1>
            <h2 className="text-2xl font-semibold text-purple-light md:text-3xl">
              Konkurranseoversikt
            </h2>
          </div>
          
          <div className="w-full rounded-2xl border-2 border-purple-primary bg-black-secondary p-6 shadow-lg shadow-purple-primary/20">
            <p className="text-lg leading-relaxed text-orange-light">
              Velkommen til Halloween Knask eller Knep-konkurransen! 
              Spor reisen din, sjekk inn ved hus, og konkurrer med andre grupper.
            </p>
          </div>
          
          <div className="flex w-full flex-col gap-4">
            <Link
              href="/login"
              className="h-14 w-full rounded-xl bg-orange-primary text-lg font-semibold text-black-primary transition-all hover:bg-orange-secondary active:scale-95 flex items-center justify-center"
            >
              Kom i gang
            </Link>
            <Link
              href="/results"
              className="h-14 w-full rounded-xl border-2 border-purple-primary bg-transparent text-lg font-semibold text-purple-light transition-all hover:bg-purple-primary/20 active:scale-95 flex items-center justify-center"
            >
              📸 Se resultater
            </Link>
            <Link
              href="/dashboard"
              className="h-14 w-full rounded-xl border-2 border-purple-primary bg-transparent text-lg font-semibold text-purple-light transition-all hover:bg-purple-primary/20 active:scale-95 flex items-center justify-center"
            >
              Se konkurranse
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
