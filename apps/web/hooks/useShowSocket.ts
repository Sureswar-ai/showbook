"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket/client";
import type { SeatLockedEvent, SeatReleasedEvent, SeatBookedEvent } from "@showbook/types";

interface State {
  lockedByOthers: Record<string, { userId: string; expiresAt: string }>;
  booked: Record<string, true>;
  connected: boolean;
}

export function useShowSocket(showId: string | null, currentUserId: string | null) {
  const [state, setState] = useState<State>({
    lockedByOthers: {},
    booked: {},
    connected: false,
  });

  useEffect(() => {
    if (!showId) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function onConnect() {
      setState((s) => ({ ...s, connected: true }));
      socket.emit("show:join", { showId });
    }
    function onDisconnect() {
      setState((s) => ({ ...s, connected: false }));
    }
    function onLocked(ev: SeatLockedEvent) {
      if (ev.showId !== showId) return;
      if (ev.lockedByUserId === currentUserId) return;
      setState((s) => {
        const next = { ...s.lockedByOthers };
        for (const sid of ev.seatIds) {
          next[sid] = { userId: ev.lockedByUserId ?? "other", expiresAt: ev.lockExpiresAt };
        }
        return { ...s, lockedByOthers: next };
      });
    }
    function onReleased(ev: SeatReleasedEvent) {
      if (ev.showId !== showId) return;
      setState((s) => {
        const next = { ...s.lockedByOthers };
        for (const sid of ev.seatIds) delete next[sid];
        const booked = { ...s.booked };
        for (const sid of ev.seatIds) delete booked[sid];
        return { ...s, lockedByOthers: next, booked };
      });
    }
    function onBooked(ev: SeatBookedEvent) {
      if (ev.showId !== showId) return;
      setState((s) => {
        const next = { ...s.lockedByOthers };
        const booked = { ...s.booked };
        for (const sid of ev.seatIds) {
          delete next[sid];
          booked[sid] = true;
        }
        return { ...s, lockedByOthers: next, booked };
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("seat:locked", onLocked);
    socket.on("seat:released", onReleased);
    socket.on("seat:booked", onBooked);

    if (socket.connected) onConnect();

    return () => {
      socket.emit("show:leave", { showId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("seat:locked", onLocked);
      socket.off("seat:released", onReleased);
      socket.off("seat:booked", onBooked);
    };
  }, [showId, currentUserId]);

  return state;
}
