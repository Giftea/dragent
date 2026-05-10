import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">Dragent</span>
          <Badge
            variant="outline"
            className="text-xs border-zinc-700 text-zinc-400"
          >
            Testnet
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              Dashboard
            </Button>
          </Link>
          <Link href="/launch">
            <Button className="bg-white text-black hover:bg-zinc-200">
              Launch app
            </Button>
          </Link>
        </div>
        <Link href="/api-docs">
          <Button variant="ghost" className="text-zinc-400 hover:text-white">
            API
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-32 pb-24">
        <Badge className="mb-6 bg-zinc-900 text-zinc-300 border border-zinc-700 px-3 py-1">
          Built on Kite chain
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-none">
          Your AI trading agent.{" "}
          <span className="text-zinc-400">
            Every decision, verified on-chain.
          </span>
        </h1>
        <p className="mt-8 text-lg text-zinc-400 max-w-xl leading-relaxed">
          Write your strategy in plain English. Dragent monitors markets
          autonomously, explains every decision, and builds a verifiable
          reputation on Kite chain. No black boxes. No blind trust. Every
          decision, explained and proven on-chain.
        </p>
        <div className="flex items-center gap-4 mt-10">
          <Link href="/launch">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-zinc-200 px-8"
            >
              Deploy your agent
            </Button>
          </Link>
          <Link href="/passport/1">
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-700 text-zinc-300 px-8"
            >
              View demo passport
            </Button>
          </Link>
        </div>
      </section>

      <Separator className="bg-zinc-800" />

      {/* How it works */}
      <section className="px-8 py-24 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-12 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Write your strategy",
              body: "Describe your trading rules in plain English. Claude parses your intent into executable logic.",
            },
            {
              step: "02",
              title: "Agent decides autonomously",
              body: "Dragent monitors markets 24/7, analyses conditions against your strategy, and makes decisions autonomously — no human input needed.",
            },
            {
              step: "03",
              title: "Every decision proven on Kite",
              body: "Before each decision, the agent commits a cryptographic proof of its reasoning to Kite chain. Immutable, verifiable, tamper-proof.",
            },
          ].map((item) => (
            <div key={item.step} className="flex flex-col gap-3">
              <span className="text-4xl font-bold text-zinc-800">
                {item.step}
              </span>
              <h3 className="text-lg font-medium">{item.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="bg-zinc-800" />

      {/* Stats */}
      <section className="px-8 py-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "100%", label: "Decisions explained" },
            { value: "On-chain", label: "Reputation system" },
            { value: "0", label: "Black boxes" },
            { value: "Kite L1", label: "Settlement layer" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-8 flex items-center justify-between">
        <span className="text-zinc-600 text-sm">
          Dragent — built on Kite chain
        </span>
        <div className="flex gap-6 text-sm text-zinc-600">
          <a
            href="https://testnet.kitescan.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400"
          >
            Explorer
          </a>
          <a
            href="https://github.com/dragent-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
