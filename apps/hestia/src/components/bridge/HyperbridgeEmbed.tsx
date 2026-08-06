"use client";

import { useEffect, useRef, useState } from "react";

interface HyperbridgeEmbedProps {
  height?: string;
  width?: string;
}

export function HyperbridgeEmbed({
  height = "700px",
  width = "100%",
}: HyperbridgeEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleLoad = () => {
      setIsLoaded(true);
      console.log("Hyperbridge app loaded");
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", handleLoad);
      return () => iframe.removeEventListener("load", handleLoad);
    }
  }, []);

  return (
    <div className="hyperbridge-embed-container">
      {!isLoaded && (
        <div className="loading-skeleton">
          <div className="spinner" />
          <p>Loading Hyperbridge...</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={process.env.NEXT_PUBLIC_HYPERBRIDGE_URL}
        width={width}
        height={height}
        style={{
          border: "none",
          borderRadius: "16px",
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
        allow="clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
        title="Hyperbridge Cross-Chain Bridge"
      />
    </div>
  );
}
