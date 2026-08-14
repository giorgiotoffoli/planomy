import * as React from 'react'

type PlanomyIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string
}

const PlanomyIcon = React.forwardRef<SVGSVGElement, PlanomyIconProps>(
  ({ size = 24, color = 'currentColor', ...props }, ref) => (
    <svg
      ref={ref}
      fill={color}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M11.445 21.832a1 1 0 0 0 1.11 0l9-6A.998.998 0 0 0 21.8 14.4l-9-12c-.377-.504-1.223-.504-1.6 0l-9 12a1 1 0 0 0 .245 1.432l9 6zm8.12-7.078L12 19.798V4.667l7.565 10.087z" />
    </svg>
  ),
)

PlanomyIcon.displayName = 'PlanomyIcon'

export { PlanomyIcon }
