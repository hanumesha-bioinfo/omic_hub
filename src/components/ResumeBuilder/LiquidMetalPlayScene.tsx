import React from "react";
import { LiquidMetalButton } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export interface SceneProps {
  diameter?: number;
  strokeWidth?: number;
  onClick?: () => void;
}

export function Scene({
  diameter = 88,
  strokeWidth = 3.0,
  onClick,
}: SceneProps) {
  return (
    <div
      className="shader-frame"
      style={{ width: `${diameter}px`, height: `${diameter}px` }}
      onClick={onClick}
    >
      <LiquidMetalButton
        variant="play"
        rendering="colored"
        diameter={diameter}
        strokeWidth={strokeWidth}
        text="Play"
        onClick={onClick}
      />
    </div>
  );
}
