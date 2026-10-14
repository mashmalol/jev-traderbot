"use client";

import { useCallback, useState } from "react";
import styles from "./RunToggle.module.css";

export interface RunToggleProps {
  running: boolean;
  apiUrl: string;
}

/**
 * stop / begin.
 *
 * Posts to /stop or /start and then does nothing else: the authoritative state arrives back over
 * SSE as a `control` event, so the button never decides on its own that the flip succeeded. That
 * also means another client, or a curl on the CLI, moves this button.
 */
export default function RunToggle({ running, apiUrl }: RunToggleProps) {
  const [pending, setPending] = useState(false);

  const flip = useCallback(async () => {
    setPending(true);
    try {
      await fetch(`${(apiUrl || "").replace(/\/+$/, "")}/${running ? "stop" : "start"}`, { method: "POST" });
    } catch {
      /* offline: the reconnect snapshot carries the real state back, so fail quietly */
    } finally {
      setPending(false);
    }
  }, [apiUrl, running]);

  return (
    <button
      type="button"
      className={`${styles.button} ${running ? styles.stop : styles.begin}`}
      onClick={flip}
      disabled={pending}
      aria-label={running ? "Stop trading" : "Begin trading"}
    >
      {running ? "stop" : "begin"}
    </button>
  );
}