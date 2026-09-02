import type { SVGProps } from "react"

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">

export function CloseIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M3.75 3.75 12.25 12.25M12.25 3.75 3.75 12.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function GripIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="currentColor"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <circle cx="5" cy="4" r="1" />
      <circle cx="11" cy="4" r="1" />
      <circle cx="5" cy="8" r="1" />
      <circle cx="11" cy="8" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="11" cy="12" r="1" />
    </svg>
  )
}

export function RemoveIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M5.25 5.25v6.25m2.75-6.25v6.25m2.75-6.25v6.25M3.75 4h8.5m-6-1.75h3.5m-5 1.75.5 9.25h5.5l.5-9.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  )
}

export function ArrowBackIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M10.75 3.25 6 8l4.75 4.75M6.25 8h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function BringToFrontIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="7" rx="1" stroke="currentColor" width="7" x="6" y="3" />
      <path d="M3 6v6a1 1 0 0 0 1 1h6" stroke="currentColor" />
    </svg>
  )
}

export function SendToBackIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="7" rx="1" stroke="currentColor" width="7" x="3" y="6" />
      <path d="M6 3h6a1 1 0 0 1 1 1v6" stroke="currentColor" />
    </svg>
  )
}

export function BatchCopyIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="8" rx="1.25" stroke="currentColor" width="8" x="5" y="5" />
      <path d="M3 10V4a1 1 0 0 1 1-1h6" stroke="currentColor" />
    </svg>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="currentColor"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  )
}

export function DuplicateIcon(props: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="8" rx="1" stroke="currentColor" width="8" x="5" y="5" />
      <path d="M3 10V4a1 1 0 0 1 1-1h6" stroke="currentColor" />
      <path d="M9 7v4M7 9h4" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}
