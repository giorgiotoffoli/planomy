'use client'

import { useEffect, useState, type RefObject } from 'react'

type UseCollapsiblePageHeaderOptions = {
  headerRef: RefObject<Element | null>
  scrollRootRef: RefObject<HTMLElement | null>
}

/**
 * Tracks whether a page's large header has left its scrolling viewport.
 *
 * The inset top edge gives the header a small visibility buffer. That keeps
 * the compact header from flickering when the large header is only a few
 * pixels away from the viewport edge.
 */
export function useCollapsiblePageHeader({
  headerRef,
  scrollRootRef,
}: UseCollapsiblePageHeaderOptions) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const header = headerRef.current
    const scrollRoot = scrollRootRef.current

    if (!header || !scrollRoot) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCollapsed(!entry.isIntersecting)
      },
      {
        root: scrollRoot,
        rootMargin: '-32px 0px 0px',
        threshold: 0,
      },
    )

    observer.observe(header)
    return () => observer.disconnect()
  }, [headerRef, scrollRootRef])

  return isCollapsed
}
