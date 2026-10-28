import { useState } from "react";
import { Canvas } from "@react-three/fiber";

export default function SceneCanvas({
  children,
  fallback,
  className = "",
  style,
  onCreated,
  ...canvasProps
}) {
  const [isReady, setIsReady] = useState(false);

  return (
    <div className={`relative h-full w-full ${className}`.trim()} style={style}>
      {fallback ? (
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isReady ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          {fallback}
        </div>
      ) : null}

      <Canvas
        {...canvasProps}
        className="!h-full !w-full"
        style={{
          width: "100%",
          height: "100%",
          opacity: isReady ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
        onCreated={(state) => {
          setIsReady(true);
          onCreated?.(state);
        }}
      >
        {children}
      </Canvas>
    </div>
  );
}
