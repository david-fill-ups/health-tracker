"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { InsuranceCardItem } from "./InsuranceCardItem";
import { InsuranceCardForm } from "./InsuranceCardForm";
import type { InsuranceCardListItem } from "@/server/insurance";

export default function InsurancePage() {
  const { activeProfileId } = useProfile();
  const [cards, setCards] = useState<InsuranceCardListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [modalMode, setModalMode] = useState<"new" | "edit" | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [revealedFields, setRevealedFields] = useState<Map<string, Set<string>>>(new Map());
  const [showInactive, setShowInactive] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fetchCards = useCallback(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/insurance?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load insurance cards"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  function reveal(cardId: string, field: string) {
    setRevealedFields((prev) => {
      const next = new Map(prev);
      const fields = new Set(next.get(cardId) ?? []);
      fields.add(field);
      next.set(cardId, fields);
      return next;
    });
  }

  function hide(cardId: string, field: string) {
    setRevealedFields((prev) => {
      const next = new Map(prev);
      const fields = new Set(next.get(cardId) ?? []);
      fields.delete(field);
      next.set(cardId, fields);
      return next;
    });
  }

  function openAdd() {
    setEditingCardId(null);
    setModalMode("new");
  }

  function openEdit(cardId: string) {
    setEditingCardId(cardId);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingCardId(null);
  }

  function handleSaved() {
    fetchCards();
    closeModal();
    setToast({ message: modalMode === "new" ? "Card added" : "Card updated" });
  }

  function handleDeleted(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    closeModal();
    setToast({ message: "Card deleted" });
  }

  async function handleDeleteFromItem(cardId: string) {
    if (!activeProfileId) return;
    const res = await fetch(`/api/insurance/${cardId}?profileId=${activeProfileId}`, { method: "DELETE" });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setToast({ message: "Card deleted" });
    } else {
      setToast({ message: "Failed to delete card", type: "error" });
    }
  }

  const activeCards = cards.filter((c) => c.status === "ACTIVE");
  const inactiveCards = cards.filter((c) => c.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        {activeProfileId && (
          <button
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Card
          </button>
        )}
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view your wallet.</p>
      )}

      {loading && <CardSkeleton count={3} />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {cards.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500 mb-3">No cards recorded.</p>
              <button
                onClick={openAdd}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Add your first card
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCards.map((card) => (
                  <InsuranceCardItem
                    key={card.id}
                    card={card}
                    profileId={activeProfileId}
                    revealed={revealedFields.get(card.id) ?? new Set()}
                    onReveal={(field) => reveal(card.id, field)}
                    onHide={(field) => hide(card.id, field)}
                    onEdit={openEdit}
                    onImageClick={(src) => setLightboxSrc(src)}
                    isShared={card.isShared}
                    ownerName={card.ownerName}
                    memberNames={card.memberNames}
                  />
                ))}
              </div>

              {inactiveCards.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowInactive((v) => !v)}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    {showInactive ? "Hide" : "Show"} inactive / expired (
                    {inactiveCards.length})
                  </button>
                  {showInactive && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                      {inactiveCards.map((card) => (
                        <InsuranceCardItem
                          key={card.id}
                          card={card}
                          profileId={activeProfileId}
                          revealed={revealedFields.get(card.id) ?? new Set()}
                          onReveal={(field) => reveal(card.id, field)}
                          onHide={(field) => hide(card.id, field)}
                          onEdit={openEdit}
                          onImageClick={(src) => setLightboxSrc(src)}
                          isShared={card.isShared}
                          ownerName={card.ownerName}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {modalMode && activeProfileId && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 overflow-y-auto py-10 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-2xl">
            <InsuranceCardForm
              profileId={activeProfileId}
              cardId={editingCardId}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onClose={closeModal}
            />
          </div>
        </div>
      )}

      {lightboxSrc && (
        <PhotoLightbox
          src={lightboxSrc}
          alt="Insurance card"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
