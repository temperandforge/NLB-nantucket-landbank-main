"use client";

import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css/core";

export type TimelineEvent = {
  year: string;
  title: string;
  description: string;
  /** Reproduces the varying connector-line heights from the Figma design
   * (an intentionally organic, non-uniform rhythm). */
  lineLength: number;
};

type TimelineSliderProps = {
  events: TimelineEvent[];
  className?: string;
};

// Wave path recreated from the Figma line asset — an organic multi-hump curve.
// viewBox width is arbitrary; getPointAtLength works in path-space regardless
// of how the SVG is scaled on screen (getScreenCTM handles the conversion).
const WAVE_PATH_D =
  "M0,70 C100,20 200,20 300,70 C400,120 500,120 600,60 C700,10 800,10 900,55 C1000,100 1100,100 1200,50";
const WAVE_VIEWBOX = "0 0 1200 120";
const WAVE_VIEWBOX_WIDTH = 1200;

// The path is monotonically increasing in x, so a given x has exactly one
// length along the curve — find it via bisection on getPointAtLength.
function findLengthForX(path: SVGPathElement, totalLength: number, targetX: number) {
  let lo = 0;
  let hi = totalLength;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).x < targetX) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export default function TimelineSlider({ events, className }: TimelineSliderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const splideRootRef = useRef<HTMLDivElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const wave = waveRef.current;
    const dot = dotRef.current;
    const splideRoot = splideRootRef.current;
    const prevButton = prevButtonRef.current;
    const nextButton = nextButtonRef.current;
    const svgEl = wave?.querySelector("svg");
    const path = wave?.querySelector("path");
    const splideTrackEl = splideRoot?.querySelector(".splide__track");
    if (!wave || !dot || !splideRoot || !prevButton || !nextButton || !svgEl || !path || !splideTrackEl) {
      return;
    }

    // The left padding mirrors `tf-px` + `tf-max-w` (see css/blocks.css) so the first card
    // lines up with the rest of the page content on load; the previous cards still show in
    // that padding as the slider moves. The right side uses the same inset so the last card ends flush with the content.
    // Splide parses padding itself and can't resolve calc()/var(), so it's measured to px here
    // (a CSS-string value left getEnd() at 0 and froze the dot).
    const gutterProbe = document.createElement("div");
    gutterProbe.style.cssText = "position:absolute;visibility:hidden;padding-left:var(--tf-x)";
    rootRef.current!.appendChild(gutterProbe);
    // Distance from each viewport edge to the page content (the same on both sides).
    function getContentInset() {
      const gutter = parseFloat(getComputedStyle(gutterProbe).paddingLeft) || 0;
      const maxWidth = 90 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
      return Math.max(gutter, (splideRoot!.clientWidth - maxWidth) / 2);
    }

    const SPLIDE_BREAKPOINTS: Record<number, { perPage: number }> = {
      1280: { perPage: 3 },
      1024: { perPage: 2 },
      640: { perPage: 1 },
    };
    const BASE_SPLIDE_OPTIONS = { perPage: 4 };
    const breakpointThresholds = Object.keys(SPLIDE_BREAKPOINTS)
      .map(Number)
      .sort((a, b) => a - b);

    // Not using Splide's own `breakpoints` option: its listener does not reliably re-fire
    // on every resize (e.g. programmatic viewport changes), which left perPage/getEnd()
    // stuck at whatever breakpoint was active on mount. We watch matchMedia ourselves.
    function getActiveSplideOptions() {
      const active =
        breakpointThresholds
          .filter((threshold) => window.matchMedia(`(max-width: ${threshold}px)`).matches)
          .map((threshold) => SPLIDE_BREAKPOINTS[threshold])[0] ?? BASE_SPLIDE_OPTIONS;
      const inset = getContentInset();
      // Same inset both sides, so the last card ends flush with the page content.
      return { perPage: active.perPage, padding: { left: inset, right: inset } };
    }

    const splide = new Splide(splideRoot, {
      type: "slide",
      gap: "32px",
      arrows: false,
      pagination: false,
      ...getActiveSplideOptions(),
    });

    function getEndIndex() {
      return splide.Components.Controller.getEnd();
    }

    // Matches the 2-card breakpoint: the stretched curve gets too squished below the large breakpoint.
    const isMobileLayout = window.matchMedia("(max-width: 1024px)");

    // Desktop/tablet: the line is stretched to fill the container width
    // (non-uniform x/y scale — an intentional "squish" of the same curve).
    // Mobile: the line keeps its natural, un-squished aspect ratio and is
    // instead panned horizontally, matching the Figma mobile reference (a
    // ~5x-viewport-wide line shifted into view) rather than being squeezed
    // into a narrow screen.
    let pxScaleX = 1;
    let pxScaleY = 1;
    let pxOffsetX = 0;
    let pxOffsetY = 0;
    // Desktop only: the dot's screen-space travel is confined to the slider's
    // fully-visible card area (see findLengthForX usage below).
    let bounds = { minLength: 0, maxLength: path.getTotalLength() };
    // Mobile only: the screen-space x range the dot (and the point of the
    // curve under it) travels across, in px relative to `wave`.
    let mobileTargetX = { min: 0, max: 0 };

    function updateBounds() {
      const totalLength = path!.getTotalLength();
      const wrapperRect = wave!.getBoundingClientRect();
      if (wrapperRect.width === 0 || wrapperRect.height === 0) return;

      if (isMobileLayout.matches) {
        // Natural (unstretched) aspect ratio: pick a pixel width for the SVG
        // that matches the viewBox's own 1200:120 ratio at the wrapper's
        // fixed height, so nothing gets squished — the SVG just ends up
        // wider than the wrapper, clipped by its overflow-hidden.
        const naturalWidth = wrapperRect.height * (WAVE_VIEWBOX_WIDTH / 120);
        svgEl!.style.width = `${naturalWidth}px`;
        svgEl!.style.transform = "none"; // reset before measuring
      } else {
        svgEl!.style.width = "100%";
        svgEl!.style.transform = "none";
      }

      const svgRect = svgEl!.getBoundingClientRect();
      if (svgRect.width === 0 || svgRect.height === 0) return;

      pxScaleX = svgRect.width / WAVE_VIEWBOX_WIDTH;
      pxScaleY = svgRect.height / 120;
      pxOffsetX = svgRect.left - wrapperRect.left;
      pxOffsetY = svgRect.top - wrapperRect.top;

      const trackRect = splideTrackEl!.getBoundingClientRect();
      const trackStyle = getComputedStyle(splideTrackEl!);
      const paddingLeft = parseFloat(trackStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(trackStyle.paddingRight) || 0;

      if (isMobileLayout.matches) {
        // The dot travels screen-edge to screen-edge across the slider's
        // visible card area; the curve panning (see setSceneAtProgress) makes
        // the line arrive under it at the matching point.
        mobileTargetX = {
          min: trackRect.left + paddingLeft - wrapperRect.left,
          max: trackRect.right - paddingRight - wrapperRect.left,
        };
      } else {
        // Confine the dot's horizontal travel to the slider's *fully visible*
        // card area — not the raw svg box, which (at this width) matches it
        // anyway, but the same inset logic applies.
        const scale = WAVE_VIEWBOX_WIDTH / svgRect.width;
        const minX = (trackRect.left + paddingLeft - svgRect.left) * scale;
        const maxX = (trackRect.right - paddingRight - svgRect.left) * scale;
        bounds = {
          minLength: findLengthForX(path!, totalLength, minX),
          maxLength: findLengthForX(path!, totalLength, maxX),
        };
      }
    }

    // Renders the dot (and, on mobile, pans the line) for a given progress
    // (0..1 across the whole slide range) — the single source of truth for
    // "where is everything" at any point in time, including mid-animation.
    function setSceneAtProgress(progress: number) {
      if (isMobileLayout.matches) {
        const totalLength = path!.getTotalLength();
        const point = path!.getPointAtLength(progress * totalLength);
        const naturalX = point.x * pxScaleX;
        const naturalY = point.y * pxScaleY;
        const targetX = mobileTargetX.min + progress * (mobileTargetX.max - mobileTargetX.min);
        svgEl!.style.transform = `translateX(${targetX - naturalX}px)`;
        dot!.style.left = `${pxOffsetX + targetX}px`;
        dot!.style.top = `${pxOffsetY + naturalY}px`;
      } else {
        const length = bounds.minLength + progress * (bounds.maxLength - bounds.minLength);
        const point = path!.getPointAtLength(length);
        dot!.style.left = `${pxOffsetX + point.x * pxScaleX}px`;
        dot!.style.top = `${pxOffsetY + point.y * pxScaleY}px`;
      }
    }

    function indexToProgress(index: number) {
      const end = getEndIndex();
      // Clamp: after a resize to a larger perPage, splide.index can briefly exceed the new end.
      return end > 0 ? Math.min(1, Math.max(0, index / end)) : 0;
    }

    let currentProgress = 0;
    let dotAnimationFrame: number | null = null;

    function easeOutCubic(t: number) {
      return 1 - (1 - t) ** 3;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Animates BY WALKING ALONG THE CURVE — sampling intermediate points
    // between the current and target progress — rather than a CSS transition
    // on left/top, which would interpolate in a straight line through the
    // page instead of following the wave.
    function animateToProgress(targetProgress: number, duration = 500) {
      if (dotAnimationFrame !== null) cancelAnimationFrame(dotAnimationFrame);
      const startProgress = currentProgress;
      const delta = targetProgress - startProgress;
      if (delta === 0 || prefersReducedMotion.matches) {
        currentProgress = targetProgress;
        setSceneAtProgress(targetProgress);
        return;
      }
      const startTime = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        currentProgress = startProgress + delta * easeOutCubic(t);
        setSceneAtProgress(currentProgress);
        dotAnimationFrame = t < 1 ? requestAnimationFrame(step) : null;
      };
      dotAnimationFrame = requestAnimationFrame(step);
    }

    function moveDotToIndex(index: number) {
      animateToProgress(indexToProgress(index));
    }

    function setDotToIndexInstant(index: number) {
      if (dotAnimationFrame !== null) {
        cancelAnimationFrame(dotAnimationFrame);
        dotAnimationFrame = null;
      }
      currentProgress = indexToProgress(index);
      setSceneAtProgress(currentProgress);
    }

    function updateArrows() {
      prevButton!.disabled = splide.index === 0;
      nextButton!.disabled = splide.index >= getEndIndex();
    }

    function handlePrevClick() {
      splide.go("-1");
    }
    function handleNextClick() {
      splide.go("+1");
    }
    prevButton.addEventListener("click", handlePrevClick);
    nextButton.addEventListener("click", handleNextClick);

    splide.on("mounted resized", () => {
      updateBounds();
      setDotToIndexInstant(splide.index);
      updateArrows();
    });

    // Use `move` (fires as soon as a destination is decided — including mid-drag,
    // once the user releases past the drag threshold) rather than `moved` (fires
    // only after the transition finishes), so the dot animates in step with the
    // slide instead of jumping into place afterwards. `destIndex` is the actual
    // clamped target Splide is animating to.
    splide.on("move", (_newIndex, _prevIndex, destIndex) => {
      updateBounds();
      moveDotToIndex(destIndex);
      prevButton!.disabled = destIndex === 0;
      nextButton!.disabled = destIndex >= getEndIndex();
    });

    // Belt-and-suspenders resync: re-apply the options for whatever breakpoint
    // is actually active right now, independent of Splide's own (unreliable)
    // breakpoint listener, then bring our own dot/bounds state back in sync.
    function resyncToViewport() {
      splide.options = getActiveSplideOptions();
      // Fewer slides fit-to-end at a larger perPage, so the old index may now be past the end.
      if (splide.index > getEndIndex()) splide.go(getEndIndex());
      updateBounds();
      setDotToIndexInstant(splide.index);
      updateArrows();
    }

    const mediaQueries = breakpointThresholds.map((threshold) => window.matchMedia(`(max-width: ${threshold}px)`));
    mediaQueries.forEach((mq) => mq.addEventListener("change", resyncToViewport));
    window.addEventListener("resize", resyncToViewport);

    splide.mount();

    return () => {
      if (dotAnimationFrame !== null) cancelAnimationFrame(dotAnimationFrame);
      mediaQueries.forEach((mq) => mq.removeEventListener("change", resyncToViewport));
      window.removeEventListener("resize", resyncToViewport);
      prevButton.removeEventListener("click", handlePrevClick);
      nextButton.removeEventListener("click", handleNextClick);
      gutterProbe.remove();
      splide.destroy();
    };
  }, [events]);

  return (
    <div ref={rootRef} className={`history-slider flex w-full flex-col items-end gap-16 bg-background py-24 ${className ?? ""}`}>
      {/* Full-bleed wave: unpadded, direct child of root so it spans the true viewport edges. */}
      <div ref={waveRef} className="relative h-[135px] w-full overflow-hidden">
        <svg viewBox={WAVE_VIEWBOX} preserveAspectRatio="none" className="block h-full w-full overflow-visible">
          <path
            d={WAVE_PATH_D}
            fill="none"
            stroke="var(--color-dusty-heath-700)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Positioned in real pixels (not SVG shape-in-viewBox) — the viewBox is
            stretched non-uniformly (preserveAspectRatio="none") so any SVG shape
            drawn inside it would be squashed into an ellipse. No CSS transition
            here — the dot is animated manually along the curve, since a CSS
            transition on left/top interpolates in a straight line instead of
            following the path. */}
        <div
          ref={dotRef}
          className="history-slider-dot pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dusty-heath-300"
        />
      </div>

      {/* The slider itself is also a full-bleed, unpadded child of root (like the
          wave) — Splide's own `padding` option reveals slivers of the adjacent
          cards, and those slivers need to reach the true viewport edge, not stop
          at an inset content wrapper. */}
      <div ref={splideRootRef} className="splide w-full">
        <div className="splide__track">
          <ul className="splide__list">
            {events.map((event) => (
              <li key={`${event.year}-${event.title}`} className="splide__slide">
                <div className="flex w-full flex-col items-start gap-3">
                  <p className="w-full font-mono text-body-base leading-[1.6] text-on-background">{event.title}</p>
                  <div className="flex w-full items-end gap-6" style={{ height: `${event.lineLength + 130}px` }}>
                    <div className="h-full w-px shrink-0 bg-dusty-heath-700" style={{ height: `${event.lineLength}px` }} />
                    <div className="flex h-full flex-1 flex-col items-start justify-between">
                      <p className="w-full font-serif text-headline-2xl font-normal leading-[1.05] text-on-background">
                        {event.year}
                      </p>
                      <p className="w-full font-sans text-body-base leading-[1.6] text-on-background">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Padded content wrapper just for the arrow controls, matching the Figma layout's inset. */}
      <div className="flex w-full justify-end tf-px">
        <div className="flex items-center gap-[9px]">
          <button
            ref={prevButtonRef}
            type="button"
            aria-label="Previous"
            className="history-slider-arrow flex size-12 items-center justify-center rounded-[4px] bg-primary text-on-primary transition-colors hover:bg-(--ui-hover-darker) disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" className="size-6">
              <path d="M12 5L5 12L12 19M5 12H19" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            ref={nextButtonRef}
            type="button"
            aria-label="Next"
            className="history-slider-arrow flex size-12 items-center justify-center rounded-[4px] bg-primary text-on-primary transition-colors hover:bg-(--ui-hover-darker) disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" className="size-6">
              <path d="M5 12H19M12 19L19 12L12 5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
