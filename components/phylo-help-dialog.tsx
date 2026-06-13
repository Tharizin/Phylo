"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhyloHelpCarousel } from "@/components/phylo-help-carousel";
import type { HelpSlide } from "@/lib/help-content";

export function PhyloHelpDialog({
  open,
  onOpenChange,
  slides,
  title = "About Phylo",
  description = "A quick tour before you sign in.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: HelpSlide[];
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <PhyloHelpCarousel slides={slides} />
      </DialogContent>
    </Dialog>
  );
}
