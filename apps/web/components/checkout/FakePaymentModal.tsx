"use client";
import { Button, Modal, Spinner } from "@/components/ui/primitives";
import { useState } from "react";

type Tab = "UPI" | "CARD" | "NETBANKING" | "WALLET";

export function FakePaymentModal({
  open,
  onClose,
  amountPaise,
  orderId,
  onVerify,
}: {
  open: boolean;
  onClose: () => void;
  amountPaise: number;
  orderId: string;
  onVerify: (outcome: "success" | "failure", method: Tab) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("UPI");
  const [busy, setBusy] = useState(false);

  async function go(outcome: "success" | "failure") {
    setBusy(true);
    try {
      // Simulate gateway processing time
      await new Promise((r) => setTimeout(r, 1200));
      await onVerify(outcome, tab);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" hideCloseButton={busy}>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white rounded-t-2xl">
        <div className="text-xs opacity-80">Fake Gateway · Demo only</div>
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">ShowBook Pay</div>
          <div className="text-sm opacity-80">Order {orderId.slice(0, 16)}…</div>
        </div>
        <div className="mt-2 text-2xl font-black">₹{(amountPaise / 100).toFixed(2)}</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {(["UPI", "CARD", "NETBANKING", "WALLET"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t ? "text-brand border-b-2 border-brand" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {busy ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Spinner className="h-8 w-8" />
            <div className="text-sm text-gray-600">Processing payment…</div>
          </div>
        ) : (
          <>
            {tab === "UPI" && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">Pay by UPI</div>
                <input
                  type="text"
                  placeholder="demo@upi"
                  defaultValue="demo@upi"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  readOnly
                />
                <div className="text-xs text-gray-400">This is a simulated flow. No real payment occurs.</div>
              </div>
            )}
            {tab === "CARD" && (
              <div className="space-y-3">
                <input
                  placeholder="4242 4242 4242 4242"
                  defaultValue="4242 4242 4242 4242"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  readOnly
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="MM/YY"
                    defaultValue="12/30"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    readOnly
                  />
                  <input
                    placeholder="CVV"
                    defaultValue="123"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    readOnly
                  />
                </div>
              </div>
            )}
            {tab === "NETBANKING" && (
              <div className="space-y-2">
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>State Bank of India</option>
                  <option>Axis Bank</option>
                </select>
              </div>
            )}
            {tab === "WALLET" && (
              <div className="grid grid-cols-3 gap-2">
                {["Paytm", "PhonePe", "Amazon Pay"].map((w) => (
                  <button
                    key={w}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium"
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => go("failure")}
              >
                Simulate Failure
              </Button>
              <Button className="flex-1" onClick={() => go("success")}>
                Simulate Success
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
