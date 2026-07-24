import Image from "next/image";
import { cn } from "@/lib/cn";
import { paletteBg, paletteForName } from "./palette";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6 text-caption",
  sm: "size-8 text-caption",
  md: "size-10 text-footnote",
  lg: "size-14 text-headline",
};

const sizePx: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56 };

export interface AvatarProps {
  name: string;
  image?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

/**
 * Member identity: photo when available, otherwise initials on a gradient
 * deterministically derived from the name.
 */
export function Avatar({ name, image, size = "md", className }: AvatarProps) {
  const px = sizePx[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none",
        !image && paletteBg[paletteForName(name)],
        sizeClasses[size],
        className,
      )}
      title={name}
    >
      {image ? (
        <Image src={image} alt={name} width={px} height={px} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export interface AvatarStackProps {
  people: ReadonlyArray<{ name: string; image?: string | null }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

/** Overlapping member avatars with a "+N" overflow chip. */
export function AvatarStack({ people, max = 4, size = "sm", className }: AvatarStackProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  return (
    <span className={cn("inline-flex items-center -space-x-2", className)}>
      {visible.map((person, index) => (
        <Avatar
          key={`${person.name}-${index}`}
          name={person.name}
          image={person.image}
          size={size}
          className="ring-2 ring-canvas"
        />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-glass font-semibold text-fg-2 ring-2 ring-canvas",
            sizeClasses[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
