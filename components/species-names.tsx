import type { ComponentType } from "react";
import { Beef, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function MushroomIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 14a2 2 0 0 1-2-2 1 1 0 0 1 20 0 2 2 0 0 1-2 2z" />
      <path d="M14 14v2.311a8.2 8.2 0 0 0 .665 3.241l.091.213a3 3 0 1 1-5.513 0l.092-.213a8.2 8.2 0 0 0 .665-3.24V14" />
    </svg>
  );
}

const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  plant: Leaf,
  animal: Beef,
  fungus: MushroomIcon,
};

const categoryVariant: Record<string, "default" | "secondary" | "sage" | "outline"> = {
  plant: "sage",
  animal: "secondary",
  fungus: "outline",
  other: "secondary",
};

export function SpeciesNames({
  commonName,
  latinName,
  className,
}: {
  commonName: string;
  latinName: string | null;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate font-medium leading-tight">{commonName}</p>
      {latinName ? <p className="truncate text-sm italic text-muted-foreground">{latinName}</p> : null}
    </div>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const Icon = categoryIcons[category];
  return (
    <Badge variant={categoryVariant[category] ?? "secondary"} className="capitalize">
      {Icon ? <Icon className="mr-1 h-3 w-3" /> : null}
      {category}
    </Badge>
  );
}
