"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getShareUrl } from "@/lib/share";

interface ShareModalProps {
  tripId: string;
  tripTitle: string;
  destination: string;
  isPublic: boolean;
  shareToken: string | null;
  onClose: () => void;
  onShareSettingsChange: (isPublic: boolean, token: string | null) => void;
}

export default function ShareModal({
  tripId,
  tripTitle,
  destination,
  isPublic,
  shareToken,
  onClose,
  onShareSettingsChange,
}: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [localPublic, setLocalPublic] = useState(isPublic);
  const [localToken, setLocalToken] = useState(shareToken);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const shareUrl = localToken ? getShareUrl(localToken) : null;

  // Generate QR code whenever share URL changes
  useEffect(() => {
    if (!shareUrl || !qrCanvasRef.current) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(qrCanvasRef.current!, shareUrl, {
        width: 160,
        margin: 1,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      }).catch(() => {});
    });
  }, [shareUrl]);

  async function enableSharing() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLocalPublic(true);
      setLocalToken(json.shareToken);
      onShareSettingsChange(true, json.shareToken);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enable sharing");
    } finally {
      setLoading(false);
    }
  }

  async function disableSharing() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: false }),
      });
      if (!res.ok) throw new Error("Failed");
      setLocalPublic(false);
      onShareSettingsChange(false, localToken);
    } catch {
      toast.error("Failed to disable sharing");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Link copied!");
    });
  }

  function nativeShare() {
    if (!shareUrl) return;
    if (navigator.share) {
      navigator.share({
        title: tripTitle,
        text: `Check out my Navoryn itinerary for ${destination}!`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      copyLink();
    }
  }

  const encodedUrl = shareUrl ? encodeURIComponent(shareUrl) : "";
  const encodedText = encodeURIComponent(`Check out my Navoryn itinerary for ${destination}!`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/60 bg-navy-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Share itinerary</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-white transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Toggle */}
        <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-700/60 bg-navy p-4">
          <div>
            <p className="font-medium text-white text-sm">Public link</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {localPublic ? "Anyone with the link can view" : "Only you can see this trip"}
            </p>
          </div>
          <button
            onClick={localPublic ? disableSharing : enableSharing}
            disabled={loading}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
              localPublic ? "bg-sky" : "bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                localPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {localPublic && shareUrl && (
          <>
            {/* URL row */}
            <div className="mb-4 flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-slate-700 bg-navy px-3 py-2 text-xs text-slate-300 outline-none"
              />
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg bg-sky px-3 py-2 text-xs font-semibold text-navy hover:bg-sky-hover transition"
              >
                Copy
              </button>
            </div>

            {/* QR + social */}
            <div className="flex gap-4">
              <canvas ref={qrCanvasRef} className="rounded-lg border border-slate-700/60" />
              <div className="flex flex-col gap-2 flex-1">
                <button
                  onClick={nativeShare}
                  className="share-btn bg-slate-700 hover:bg-slate-600"
                >
                  📤 Share…
                </button>
                <a
                  href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                  target="_blank"
                  rel="noopener"
                  className="share-btn bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366]"
                >
                  💬 WhatsApp
                </a>
                <a
                  href={`https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
                  target="_blank"
                  rel="noopener"
                  className="share-btn bg-slate-700 hover:bg-slate-600"
                >
                  𝕏 Twitter
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(tripTitle)}&body=${encodedText}%20${encodedUrl}`}
                  className="share-btn bg-slate-700 hover:bg-slate-600"
                >
                  ✉️ Email
                </a>
              </div>
            </div>
          </>
        )}

        {!localPublic && (
          <p className="text-center text-sm text-slate-400 py-4">
            Enable the public link above to share this itinerary.
          </p>
        )}
      </div>

      <style jsx global>{`
        .share-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          transition: all 0.15s;
          text-decoration: none;
          cursor: pointer;
          border: none;
          outline: none;
        }
      `}</style>
    </div>
  );
}
