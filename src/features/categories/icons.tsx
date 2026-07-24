import {
  Baby,
  Clapperboard,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PawPrint,
  Plane,
  Repeat,
  Shapes,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  TrainFront,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { asPalette } from "@/components/ui/palette";
import { cn } from "@/lib/cn";

/**
 * Curated icon set for categories (system + user-created). A fixed map keeps
 * the bundle tree-shaken — never import the full lucide icon registry.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "utensils-crossed": UtensilsCrossed,
  plane: Plane,
  "shopping-basket": ShoppingBasket,
  clapperboard: Clapperboard,
  house: House,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  fuel: Fuel,
  repeat: Repeat,
  shapes: Shapes,
  wine: Wine,
  "train-front": TrainFront,
  shirt: Shirt,
  smartphone: Smartphone,
  gift: Gift,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  "paw-print": PawPrint,
  baby: Baby,
  sparkles: Sparkles,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function CategoryGlyph({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? Shapes;
  return <Icon className={className} aria-hidden />;
}

/** Category identity: icon in a small gradient squircle. */
export function CategoryBadge({
  icon,
  gradient,
  className,
}: {
  icon: string;
  gradient: string;
  className?: string;
}) {
  return (
    <GradientPanel
      palette={asPalette(gradient)}
      glow={false}
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-sm", className)}
    >
      <CategoryGlyph icon={icon} className="size-5 text-white" />
    </GradientPanel>
  );
}
