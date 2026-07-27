import { AboutHowItWorks } from "@/components/about-how-it-works";
import { AboutWhyItMatters } from "@/components/about-why-it-matters";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:py-14">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Phylo tracks the diversity of species in your diet — and helps you understand why that variety matters.
        </p>
      </header>

      <AboutHowItWorks />

      <AboutWhyItMatters />
    </div>
  );
}
