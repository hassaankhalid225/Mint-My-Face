"use client";

import React, { useId, type CSSProperties, type ReactNode } from "react";
import "./ElectricBorder.css";

export type ElectricBorderProps = {
  color?: string;
  speed?: number;
  chaos?: number;
  thickness?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** Animated electric border — inspired by @BalintFerenczy (https://codepen.io/BalintFerenczy/pen/KwdoyEN) */
export default function ElectricBorder({
  color = "var(--color-primary)",
  speed = 1,
  chaos = 0.12,
  thickness = 2,
  className = "",
  style,
  children,
}: ElectricBorderProps) {
  const filterId = useId().replace(/:/g, "");
  const duration = 6 / Math.max(speed, 0.1);
  const displacement = Math.max(4, Math.round(chaos * 250));
  const radius =
    style?.borderRadius !== undefined
      ? typeof style.borderRadius === "number"
        ? `${style.borderRadius}px`
        : style.borderRadius
      : "var(--rounded-lg)";

  return (
    <div
      className={`electric-border${className ? ` ${className}` : ""}`}
      style={
        {
          "--eb-color": color,
          "--eb-thickness": `${thickness}px`,
          "--eb-radius": radius,
          ...style,
          borderRadius: radius,
        } as CSSProperties
      }
    >
      <svg className="electric-border__svg" aria-hidden="true">
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate
                attributeName="dy"
                values="700; 0"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate
                attributeName="dy"
                values="0; -700"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise3" seed="2" />
            <feOffset in="noise3" dx="0" dy="0" result="offsetNoise3">
              <animate
                attributeName="dx"
                values="490; 0"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise4" seed="2" />
            <feOffset in="noise4" dx="0" dy="0" result="offsetNoise4">
              <animate
                attributeName="dx"
                values="0; -490"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />

            <feDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale={displacement}
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>

      <div className="electric-border__frame">
        <div className="electric-border__inner">
          <div className="electric-border__bg-glow" />
          <div className="electric-border__content">{children}</div>
          <div className="electric-border__effects">
            <div
              className="electric-border__main"
              style={{ filter: `url(#${filterId})` }}
            />
            <div className="electric-border__glow-1" />
            <div className="electric-border__glow-2" />
            <div className="electric-border__overlay-1" />
            <div className="electric-border__overlay-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
