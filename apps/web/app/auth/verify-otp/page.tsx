"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import type { VerifyOtpResponse } from "@showbook/types";
import { useAuth } from "@/stores/authStore";

export default function VerifyOtpPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const phone = params.get("phone") || "";
  const devOtp = params.get("otp");
  const [otp, setOtp] = useState(devOtp || "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (devOtp) setOtp(devOtp);
  }, [devOtp]);

  async function verify() {
    if (otp.length < 4) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<VerifyOtpResponse>("/auth/verify-otp", {
        phone,
        otp,
        name: name || undefined,
      });
      setSession(res);
      toast.success(`Welcome${res.user.name ? `, ${res.user.name}` : ""}!`);
      router.push("/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Enter OTP</h1>
      <p className="text-gray-600 mb-6">
        Sent to <span className="font-semibold">{phone}</span>
      </p>
      {devOtp && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 mb-4 text-sm text-green-900">
          🧪 Dev OTP: <code className="font-mono font-semibold">{devOtp}</code> (auto-filled)
        </div>
      )}
      <div className="space-y-4">
        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit OTP"
          inputMode="numeric"
          className="text-center text-lg tracking-[0.4em]"
          autoFocus
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional, new users)"
        />
        <Button className="w-full" size="lg" onClick={verify} disabled={busy}>
          {busy ? "Verifying…" : "Verify & Continue"}
        </Button>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900 mx-auto block"
        >
          Change number
        </button>
      </div>
    </div>
  );
}
