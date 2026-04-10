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
  onImageClick: (src: string) => void;
}

function MaskedField({
  label,
  value,
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

  const hasImages = card.hasFrontImage || card.hasBackImage;
  const hasContact = !!(card.phone || card.website);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      {/* Top row: type badge + status badge */}
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[card.type] ?? TYPE_COLORS.OTHER}`}>
          {typeLabel}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[card.status] ?? ""}`}>
          {statusLabel}
        </span>
      </div>

      {/* Name — clickable */}
      <button
        type="button"
        onClick={() => onEdit(card.id)}
        className="text-left hover:opacity-75 transition-opacity"
      >
        <div className="font-semibold text-gray-900 underline decoration-dotted leading-snug">
          {card.insurerName ?? "—"}
        </div>
        {card.planName && (
          <div className="text-xs text-gray-500 mt-0.5">{card.planName}</div>
        )}
      </button>

      {/* Fields */}
      <div className="space-y-1 text-sm">
        {card.policyHolder && (
          <div className="text-gray-500">
            Holder: <span className="text-gray-800">{card.policyHolder}</span>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
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

        {isRx && (
          <div className="flex flex-col gap-0.5">
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

        {isPaymentCard && (card.cardLastFour || card.cardNetwork) && (
          <div className="flex flex-col gap-0.5">
            <MaskedField
              label="Card #"
              value={card.cardLastFour}
              fieldName="cardLastFour"
              revealed={revealed.has("cardLastFour")}
              onReveal={() => onReveal("cardLastFour")}
              onHide={() => onHide("cardLastFour")}
            />
            {card.cardNetwork && (
              <span className="text-gray-500">
                Network: <span className="text-gray-800">{card.cardNetwork}</span>
              </span>
            )}
          </div>
        )}

        {(card.effectiveDate || card.expirationDate) && (
          <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 pt-0.5">
            {card.effectiveDate && (
              <span>Eff: {new Date(card.effectiveDate).toLocaleDateString()}</span>
            )}
            {card.expirationDate && (
              <span className={card.status === "EXPIRED" ? "text-red-500 font-medium" : ""}>
                Exp: {new Date(card.expirationDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {card.notes && (
          <p className="text-xs text-gray-400 pt-0.5">{card.notes}</p>
        )}
      </div>

      {/* Footer: images + contact */}
      {(hasImages || hasContact) && (
        <div className="mt-auto pt-2 border-t border-gray-100 flex flex-wrap items-center gap-x-3 gap-y-1">
          {card.hasFrontImage && (
            <button
              type="button"
              onClick={() => handleImageClick("front")}
              disabled={loadingImages}
              className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              🪪 Front
            </button>
          )}
          {card.hasBackImage && (
            <button
              type="button"
              onClick={() => handleImageClick("back")}
              disabled={loadingImages}
              className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              🪪 Back
            </button>
          )}
          {card.phone && (
            <span className="text-xs text-gray-500">📞 {card.phone}</span>
          )}
          {card.website && (
            <a
              href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:underline"
            >
              🌐 {card.website}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
