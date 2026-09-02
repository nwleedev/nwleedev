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
