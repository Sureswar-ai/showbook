"use client";
import { io, Socket } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

let singleton: Socket | null = null;

export function getSocket(): Socket {
  if (singleton) return singleton;
  singleton = io(URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
  });
  return singleton;
}
