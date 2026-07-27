import { AboutHowItWorks } from "@/components/about-how-it-works";
import { AboutWhyItMatters } from "@/components/about-why-it-matters";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:py-14">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Phylo is an app designed to help you gain insight into the diversity of species you consume as food. This is
          not a macro tracker, it&apos;s a community-centric platform that allows you to discover new foods, identify
          dietary overreliances, and compete with friends to broaden your diet.
        </p>
      </header>

      <AboutHowItWorks />

      <AboutWhyItMatters />
    </div>
  );
}
