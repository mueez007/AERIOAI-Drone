"use client";

import { useEffect, useRef } from "react";
import { Application } from "@splinetool/runtime";

/**
 * Spline 3D scene using the full runtime SDK.
 * This gives direct programmatic access to the camera
 * so we can zoom it in to make the content fill the viewport.
 */
export default function SplineScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const app = new Application(canvas);

    app
      .load("https://prod.spline.design/ZD0RXerVkuwysYgn/scene.splinecode")
      .then(() => {
        // Find ALL objects and log types to find the camera
        const allObjects = app.getAllObjects();

        // Try multiple strategies to find and zoom the camera
        let camera =
          app.findObjectByName("Camera") ||
          app.findObjectByName("camera") ||
          app.findObjectByName("Camera 1") ||
          app.findObjectByName("Play Camera") ||
          app.findObjectByName("Default Camera");

        // If named search fails, find by type from all objects
        if (!camera) {
          for (const obj of allObjects) {
            const name = (obj.name || "").toLowerCase();
            if (name.includes("camera") || name.includes("cam")) {
              camera = obj;
              break;
            }
          }
        }

        if (camera) {
          // Move camera much closer to make 3D content fill the viewport
          // Reduce Z position to zoom in (closer to origin = bigger content)
          camera.position.z *= 0.45;
        }
      })
      .catch((err) => {
        console.error("Spline load error:", err);
      });

    return () => {
      app.dispose();
    };
  }, []);

  return (
    <div
      id="spline-container"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
