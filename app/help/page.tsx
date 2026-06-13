import { PhyloHelpCarousel } from "@/components/phylo-help-carousel";
import { fullHelpSlides } from "@/lib/help-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Help</h1>
        <p className="mt-2 text-muted-foreground">
          How Phylo works — logging, points, species, and competing with friends.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick guide</CardTitle>
          <CardDescription>Click through the slides below, or jump ahead with the dots.</CardDescription>
        </CardHeader>
        <CardContent>
          <PhyloHelpCarousel slides={fullHelpSlides} />
        </CardContent>
      </Card>
    </div>
  );
}
