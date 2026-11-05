import Image from "next/image"

export function ServiceLogo({ alt = "개인 메모" }: { alt?: string }) {
  return (
    <Image
      alt={alt}
      className="block h-[var(--notes-logo-height)] w-auto shrink-0"
      height={240}
      src="/magpie.png"
      unoptimized
      width={351}
    />
  )
}
