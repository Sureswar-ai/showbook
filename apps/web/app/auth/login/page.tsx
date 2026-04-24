"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import type { SendOtpResponse } from "@showbook/types";
import { Phone } from "lucide-react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function send() {
    if (!/^\+?\d{10,15}$/.test(phone)) {
      toast.error("Enter a valid phone number (10-15 digits, optional + prefix)");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<SendOtpResponse>("/auth/send-otp", { phone });
      toast.success("OTP sent");
      const url = new URLSearchParams({ phone });
      if (res.devOtp) url.set("otp", res.devOtp);
      router.push(`/auth/verify-otp?${url.toString()}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Sign in</h1>
      <p className="text-gray-600 mb-6">We'll send you a one-time password.</p>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-sm">
        <div className="font-semibold text-amber-900 mb-1">🧪 Demo mode</div>
        <div className="text-amber-800">
          OTP <code className="px-1 bg-amber-100 rounded">123456</code> works for any number. Demo
          accounts: <code>+911111111111</code> (admin) / <code>+912222222222</code> (customer).
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium">Phone number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+912222222222"
            inputMode="tel"
            autoFocus
          />
        </div>
        <Button className="w-full" size="lg" onClick={send} disabled={busy}>
          {busy ? "Sending…" : "Send OTP"}
        </Button>
      </div>
    </div>
  );
}
