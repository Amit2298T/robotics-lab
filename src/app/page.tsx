import Link from "next/link";
import HeroScene from "@/components/home/HeroScene";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(37,99,235,0.16),transparent_36%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

      {/* Navigation */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 lg:px-16">
        <Link
          href="/"
          className="text-xl font-semibold tracking-[0.3em] text-white"
        >
          ROBOLAB
        </Link>

        <nav className="hidden items-center gap-9 text-sm text-neutral-400 md:flex">
          <Link
            href="/simulator"
            className="transition-colors hover:text-white"
          >
            Simulator
          </Link>

          <span className="cursor-default transition-colors hover:text-white">
            Challenges
          </span>

          <span className="cursor-default transition-colors hover:text-white">
            Documentation
          </span>
        </nav>

        <Link
          href="/simulator"
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Launch Simulator
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 grid min-h-[calc(100vh-96px)] items-center px-8 pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-16">
        {/* Left */}
        <div className="relative z-10 max-w-3xl">
          <p className="mb-7 text-xs font-medium uppercase tracking-[0.42em] text-blue-400">
            Robotics Programming Platform
          </p>

          <h1 className="text-[4.2rem] font-semibold leading-[0.86] tracking-[-0.06em] sm:text-7xl lg:text-[7rem]">
            PROGRAM.
            <br />
            SIMULATE.
            <br />
            <span className="text-neutral-600">BUILD.</span>
          </h1>

          <p className="mt-10 max-w-xl text-base leading-7 text-neutral-400 sm:text-lg">
            Write JavaScript and TypeScript. Control robots in a real-time 3D
            physics environment. Read sensors, solve challenges, and build
            robotics logic directly in your browser.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/simulator"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              Start Simulating
            </Link>

            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/[0.02] px-8 py-3.5 text-sm text-neutral-300 transition hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
            >
              Explore Platform
            </button>
          </div>
        </div>

        {/* Real 3D Hero */}
        <div className="relative hidden h-[680px] lg:block">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

          <div className="absolute inset-0 overflow-hidden rounded-[3rem] border border-white/10 bg-[radial-gradient(circle_at_50%_45%,rgba(30,41,59,0.65),rgba(6,8,12,0.9)_70%)] shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
            <HeroScene />

            <div className="pointer-events-none absolute left-8 top-8">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.9)]" />
                <span className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
                  Robot Online
                </span>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-8 left-8 right-8 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-neutral-600">
                  Differential Drive
                </p>

                <p className="mt-2 text-sm text-neutral-300">
                  Interactive Robotics Unit
                </p>
              </div>

              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                Drag to inspect
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 md:block">
        <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-700">
          Scroll to explore
        </p>
      </div>
    </main>
  );
}