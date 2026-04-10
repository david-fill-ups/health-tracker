"use client";

import { useState } from "react";
import { INSURANCE_CARD_TYPE_LABELS, INSURANCE_CARD_STATUS_LABELS } from "@/lib/validation";
import type { InsuranceCardListItem } from "@/server/insurance";

interface InsuranceCardItemProps {
  card: InsuranceCardListItem;
  profileId: string;
  revealed: Set<string>;
  onReveal: (field: string) => void;
  onHide: (field: string) => void;
  onEdit: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onImageClick: (src: string) => void;
}

function MaskedField({
  label,
  value,
  fieldName,
  revealed,
  onReveal,
  onHide,
}: {
  label: string;
  value: string | null | undefined;
  fieldName: string;
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span
        className={
          revealed
            ? "font-mono text-gray-900"
            : "tracking-widest text-gray-400 select-none"
        }
      >
        {revealed ? value : "••••••"}
      </span>
      <button
        type="button"
        onClick={revealed ? onHide : onReveal}
        className="text-xs text-indigo-500 hover:text-indigo-700 underline shrink-0"
      >
        {revealed ? "Hide" : "Show"}
      </button>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  HEALTH: "bg-blue-100 text-blue-700",
  DENTAL: "bg-teal-100 text-teal-700",
  VISION: "bg-purple-100 text-purple-700",
  PRESCRIPTION: "bg-orange-100 text-orange-700",
  HSA: "bg-green-100 text-green-700",
  FSA: "bg-emerald-100 text-emerald-700",
  HRA: "bg-cyan-100 text-cyan-700",
  OTHER: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-red-100 text-red-600",
};

export function InsuranceCardItem({
  card,
  profileId,
  revealed,
  onReveal,
  onHide,
  onEdit,
  onDelete,
  onImageClick,
}: InsuranceCardItemProps) {
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageData, setImageData] = useState<{
    front: string | null;
    back: string | null;
  } | null>(null);

  const isPaymentCard = ["HSA", "FSA", "HRA"].includes(card.type);
  const isRx = card.type === "PRESCRIPTION";

  async function fetchImages() {
    if (imageData) return imageData;
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/insurance/${card.id}?profileId=${profileId}`);
      const data = await res.json();
      const result = {
        front: data.frontImageData ?? null,
        back: data.backImageData ?? null,
      };
      setImageData(result);
      return result;
    } catch {
      return null;
    } finally {
      setLoadingImages(false);
    }
  }

  async function handleImageClick(side: "front" | "back") {
    const imgs = await fetchImages();
    if (!imgs) return;
    const src = side === "front" ? imgs.front : imgs.back;
    if (src) onImageClick(src);
  }


  const typeLabel =
    INSURANCE_CARD_TYPE_LABELS[card.type as keyof typeof INSURANCE_CARD_TYPE_LABELS] ?? card.type;
  const statusLabel =
    INSURANCE_CARD_STATUS_LABELS[card.status as keyof typeof INSURANCE_CARD_STATUS_LABELS] ?? card.status;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
      <button
        type="button"
        onClick={() => onEdit(card.id)}
        className="flex items-center gap-2 flex-wrap text-left hover:opacity-75 transition-opacity"
      >
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[card.type] ?? TYPE_COLORS.OTHER}`}
        >
          {typeLabel}
        </span>
        <span className="font-semibold text-gray-900 underline decoration-dotted">
          {card.insurerName ?? "—"}
        </span>
        {card.planName && (
          <span className="text-sm text-gray-500">· {card.planName}</span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[card.status] ?? ""}`}
        >
          {statusLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(card.id)}
        className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-sm"
        title="Delete card"
      >
        ✕
      </button>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-1.5">
        {card.policyHolder && (
          <div className="text-sm text-gray-600">
            Holder: <span className="text-gray-900">{card.policyHolder}</span>
          </div>
        )}

        {/* Masked insurance fields */}
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <MaskedField
            label="Member ID"
            value={card.memberId}
            fieldName="memberId"
            revealed={revealed.has("memberId")}
            onReveal={() => onReveal("memberId")}
            onHide={() => onHide("memberId")}
          />
          <MaskedField
            label="Group"
            value={card.groupNumber}
            fieldName="groupNumber"
            revealed={revealed.has("groupNumber")}
            onReveal={() => onReveal("groupNumber")}
            onHide={() => onHide("groupNumber")}
          />
        </div>

        {/* RX fields */}
        {isRx && (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <MaskedField
              label="BIN"
              value={card.rxBIN}
              fieldName="rxBIN"
              revealed={revealed.has("rxBIN")}
              onReveal={() => onReveal("rxBIN")}
              onHide={() => onHide("rxBIN")}
            />
            <MaskedField
              label="PCN"
              value={card.rxPCN}
              fieldName="rxPCN"
              revealed={revealed.has("rxPCN")}
              onReveal={() => onReveal("rxPCN")}
              onHide={() => onHide("rxPCN")}
            />
            <MaskedField
              label="RxGroup"
              value={card.rxGroup}
              fieldName="rxGroup"
              revealed={revealed.has("rxGroup")}
              onReveal={() => onReveal("rxGroup")}
              onHide={() => onHide("rxGroup")}
            />
          </div>
        )}

        {/* Payment card fields */}
        {isPaymentCard && (card.cardLastFour || card.cardNetwork) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
            <MaskedField
              label="Card #"
              value={card.cardLastFour}
              fieldName="cardLastFour"
              revealed={revealed.has("cardLastFour")}
              onReveal={() => onReveal("cardLastFour")}
              onHide={() => onHide("cardLastFour")}
            />
            {card.cardNetwork && (
              <span className="text-sm text-gray-500">
                Network: <span className="text-gray-900">{card.cardNetwork}</span>
              </span>
            )}
          </div>
        )}

        {/* Contact & dates */}
        {(card.phone || card.website) && (
          <div className="flex flex-wrap gap-x-4 text-sm text-gray-500">
            {card.phone && <span>📞 {card.phone}</span>}
            {card.website && (
              <a
                href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline"
              >
                🌐 {card.website}
              </a>
            )}
          </div>
        )}

        {(card.effectiveDate || card.expirationDate) && (
          <div className="flex flex-wrap gap-x-4 text-xs text-gray-400">
            {card.effectiveDate && (
              <span>Effective: {new Date(card.effectiveDate).toLocaleDateString()}</span>
            )}
            {card.expirationDate && (
              <span
                className={
                  card.status === "EXPIRED" ? "text-red-500 font-medium" : ""
                }
              >
                Expires: {new Date(card.expirationDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Image thumbnails */}
        {(card.hasFrontImage || card.hasBackImage) && (
          <div className="flex gap-3 mt-1">
            {card.hasFrontImage && (
              <button
                type="button"
                onClick={() => handleImageClick("front")}
                disabled={loadingImages}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                🪪 Front
              </button>
            )}
            {card.hasBackImage && (
              <button
                type="button"
                onClick={() => handleImageClick("back")}
                disabled={loadingImages}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                🪪 Back
              </button>
            )}
          </div>
        )}

        {card.notes && (
          <p className="text-sm text-gray-500 mt-1">{card.notes}</p>
        )}
      </div>
    </div>
  );
}
