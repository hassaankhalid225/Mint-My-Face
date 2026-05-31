"use client";

import dynamic from "next/dynamic";

const SplashCursor = dynamic(() => import("./SplashCursor"), {
  ssr: false,
  loading: () => null,
});

export default function HomeSplashBackground() {
  return (
    <div className="home-splash-bg" aria-hidden>
      <SplashCursor
        DENSITY_DISSIPATION={3.5}
        VELOCITY_DISSIPATION={2}
        PRESSURE={0.1}
        CURL={3}
        SPLAT_RADIUS={0.2}
        SPLAT_FORCE={6000}
        COLOR_UPDATE_SPEED={10}
        SHADING
        RAINBOW_MODE={false}
        COLOR="#2B5F38"
        TRANSPARENT
      />
    </div>
  );
}
