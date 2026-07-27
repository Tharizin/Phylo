"use client";

import { useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { PhyloHelpDialog } from "@/components/phylo-help-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fullHelpSlides } from "@/lib/help-content";

export function AboutHowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">How does Phylo work?</CardTitle>
          <CardDescription>
            Logging species, earning points, suggesting new entries, and competing with friends — a step-by-step guide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="group w-full justify-between sm:w-auto" onClick={() => setOpen(true)}>
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Open the guide
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>

      <PhyloHelpDialog
        open={open}
        onOpenChange={setOpen}
        slides={fullHelpSlides}
        title="How does Phylo work?"
        description="Click through the slides below, or jump ahead with the dots."
      />
    </>
  );
}
