"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  X,
  Download,
  CheckCircle,
  AlertCircle,
  Lock,
} from "lucide-react";
import {
  ApiError,
  downloadHdFile,
  getUserPlan,
  previewImageUrl,
  standardPreviewUrl,
  type DesignCreateResult,
} from "@/lib/api";

type Step = "result" | "success";

interface MintResultModalProps {
  result: DesignCreateResult;
  onClose: () => void;
}

export default function MintResultModal({
  result,
  onClose,
}: MintResultModalProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>("result");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const previewUrl = previewImageUrl(result.preview_url);
  const standardUrl = standardPreviewUrl(result.design_id);
  const email = session?.user?.email ?? undefined;
  const isLoggedIn = status === "authenticated" && !!email;

  const triggerDownload = useCallback((url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleStandardDownload = () => {
    triggerDownload(
      standardUrl,
      `mint-my-face-standard-${result.design_id.slice(0, 8)}.png`,
    );
  };

  const requireLogin = (next: string) => {
    router.push(`/login?callbackUrl=${encodeURIComponent(next)}`);
  };

  const handleUnlockHd = async () => {
    if (!isLoggedIn) {
      requireLogin(`/editor?mint=${result.design_id}`);
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const plan = await getUserPlan(email!);
      if (plan.hd_access) {
        setStep("success");
        return;
      }
      router.push(
        `/pricing?from=hd&design=${encodeURIComponent(result.design_id)}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check your plan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHdDownload = async () => {
    if (!isLoggedIn || !email) {
      requireLogin(`/editor?mint=${result.design_id}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const blob = await downloadHdFile(result.design_id);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `mint-my-face-hd-${result.design_id.slice(0, 8)}.png`);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "HD download failed. Upgrade to Pro on the pricing page.",
      );
      setStep("result");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mint-modal-title"
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-card__header">
          <h2 id="mint-modal-title" className="modal-card__title">
            {step === "success" ? "HD unlocked" : "Your note is minted"}
          </h2>
          {!isProcessing && (
            <button type="button" onClick={onClose} aria-label="Close" className="btn-icon-close">
              <X size={22} />
            </button>
          )}
        </div>

        <div className="modal-card__body">
          {step === "result" && (
            <>
              <p className="type-body-sm" style={{ marginBottom: 16 }}>
                {result.message}
              </p>

              <div className="modal-preview-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Watermarked preview of your dollar bill"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>

              {error && (
                <div className="modal-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleStandardDownload}
                  className="btn btn-secondary"
                  style={{ width: "100%" }}
                >
                  <Download size={18} />
                  Download standard PNG (~480p, watermarked)
                </button>

                <button
                  type="button"
                  onClick={handleUnlockHd}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={isProcessing}
                >
                  <Lock size={18} />
                  {isProcessing
                    ? "Checking plan…"
                    : isLoggedIn
                      ? "Unlock full HD (Pro)"
                      : "Log in to unlock HD"}
                </button>
              </div>

              <p className="modal-note">
                {!isLoggedIn ? (
                  <>
                    <Link href="/login">Log in with Google</Link> then choose{" "}
                    <Link href="/pricing">Pro ($5/mo)</Link> for unlimited HD without
                    watermark.
                  </>
                ) : (
                  <>
                    Pro ($5/mo) unlocks unlimited full HD downloads with no watermark.
                  </>
                )}
              </p>
            </>
          )}

          {step === "success" && (
            <div style={{ textAlign: "center" }}>
              <CheckCircle
                size={48}
                style={{ color: "var(--color-success)", margin: "0 auto 16px" }}
              />
              <p className="type-title-md" style={{ marginBottom: 8 }}>
                Pro active — your HD file is ready.
              </p>
              <p className="type-body-sm" style={{ marginBottom: 24 }}>
                Print-quality PNG · no watermark.
              </p>
              <button type="button" onClick={handleHdDownload} className="btn btn-download">
                <Download size={18} />
                Download HD now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
