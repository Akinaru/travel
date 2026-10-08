"use client";

import { useState, type ReactNode } from "react";

// Remote photo (Wikivoyage, og:image) with a calm fallback tile if it is missing or broken.
export function Cover({
  src,
  alt,
  className = "",
  fallback,
}: {
  src: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-sand text-muted ${className}`} aria-hidden="true">
        {fallback}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote images from arbitrary hosts
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={`bg-sand object-cover ${className}`}
    />
  );
}
