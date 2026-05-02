import type { SVGProps } from 'react'

type PlanomyIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
}

export function PlanomyIcon({
  size = 24,
  className,
  ...props
}: PlanomyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-5 -2 37 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g transform="translate(-34.706768,-118.50844)">
        <g
          transform="matrix(-0.67976355,-1.177385,1.177385,-0.67976355,42.286498,156.81799)"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m 13,13.74 a 2,2 0 0 1 -2,0 L 2.5,8.87 a 1,1 0 0 1 0,-1.74 L 11,2.26 a 2,2 0 0 1 2,0 l 8.5,4.87 a 1,1 0 0 1 0,1.74 z" />
          <path d="m 20,14.285 1.5,0.845 a 1,1 0 0 1 0,1.74 L 13,21.74 a 2,2 0 0 1 -2,0 L 2.5,16.87 a 1,1 0 0 1 0,-1.74 L 4,14.285" />
        </g>
      </g>
    </svg>
  )
}
