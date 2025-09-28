import Image from "next/image";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
// Images in /public: landing_landscape.jpg (desktop), landing_boi.jpg (mobile portrait)
export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-[#404EED] overflow-hidden"> {/* full viewport height */}
      {/* Background Images */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Mobile Portrait */}
        <Image
          src="/landing_boi.jpg"
          alt="Abstract colorful chat backdrop"
          fill
          priority
          sizes="(max-width: 767px) 100vw"
          className="object-cover md:hidden" />
        {/* Desktop / Tablet Landscape */}
        <Image
          src="/landing_landscape.jpg"
          alt="Abstract colorful chat backdrop"
          fill
          priority
          sizes="(min-width: 768px) 100vw"
          className="object-cover hidden md:block" />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#404EED]/70 via-[#404EED]/55 to-[#23272A]/85" />
      </div>

      {/* Floating Fun Elements */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <div className="absolute top-24 left-8 text-5xl animate-float-slow">💬</div>
        <div className="absolute bottom-32 right-12 text-4xl animate-float-medium">🎧</div>
        {/* Hidden on small screens to improve text readability */}
        <div className="hidden md:block absolute top-1/3 right-1/4 text-6xl animate-float-fast">✨</div>
        <div className="absolute bottom-20 left-1/5 text-4xl animate-float-slower">🪐</div>
      </div>

      {/* Hero Content */}
      <section className="relative flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-6 pt-12 pb-28 md:py-24 gap-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow">
          WELCOME BACK
        </h1>
        <p className="text-base md:text-xl leading-relaxed text-white/90 font-medium max-w-2xl">
          Never miss out on the moments, jokes, late-night rants, or spontaneous game squads. Your spaces are waiting—jump back into the conversation.
        </p>
        <SignedOut>
          <Link href="/sign-in" className="rounded-full bg-white px-10 py-4 text-base md:text-lg font-semibold text-[#23272A] shadow hover:shadow-lg hover:scale-[1.03] active:scale-100 transition">
            Start Chatting
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/me" className="rounded-full bg-[#23272A] px-10 py-4 text-base md:text-lg font-semibold text-white shadow hover:bg-[#1e2224] hover:scale-[1.03] active:scale-100 transition">
            Enter Your Spaces
          </Link>
        </SignedIn>
      </section>
    </main>
  );
}

// Animation utilities (place in globals.css if not present)
// @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
// .animate-float-slow { animation: float 9s ease-in-out infinite; }
// .animate-float-medium { animation: float 7s ease-in-out infinite; }
// .animate-float-fast { animation: float 5s ease-in-out infinite; }
// .animate-float-slower { animation: float 11s ease-in-out infinite; }
