"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import {
  InsuranceCardTypeEnum,
  InsuranceCardStatusEnum,
  INSURANCE_CARD_TYPE_LABELS,
  INSURANCE_CARD_STATUS_LABELS,
} from "@/lib/validation";
import { ImageUploadField } from "./ImageUploadField";

type CardType = z.infer<typeof InsuranceCardTypeEnum>;
type CardStatus = z.infer<typeof InsuranceCardStatusEnum>;

interface InsuranceCardFormProps {
  profileId: string;
  cardId: string | null;
  onSaved: () => void;
  onDeleted: (cardId: string) => void;
  onClose: () => void;
}

const INITIAL_STATE = {
  type: "HEALTH" as CardType,
  status: "ACTIVE" as CardStatus,
  insurerName: "",
  planName: "",
  policyHolder: "",
  memberId: "",
  groupNumber: "",
  rxBIN: "",
  rxPCN: "",
  rxGroup: "",
  phone: "",
  website: "",
  cardLastFour: "",
  cardNetwork: "",
  effectiveDate: "",
  expirationDate: "",
  frontImageData: null as string | null,
  backImageData: null as string | null,
  notes: "",
};

function toDateInputValue(val: string | null | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function InsuranceCardForm({
  profileId,
  cardId,
  onSaved,
  onDeleted,
  onClose,
}: InsuranceCardFormProps) {
  const [fields, setFields] = useState({ ...INITIAL_STATE });
  const [memberProfileIds, setMemberProfileIds] = useState<string[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = cardId !== null;
  const isPaymentCard = ["HSA", "FSA", "HRA"].includes(fields.type);
  const isRx = fields.type === "PRESCRIPTION";

  // Fetch other accessible profiles for member selection
  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => {
        setOtherProfiles(data.filter((p) => p.id !== profileId));
      })
      .catch(() => {/* silently ignore — member selection just won't show */});
  }, [profileId]);

  useEffect(() => {
    if (!cardId) {
      setFields({ ...INITIAL_STATE });
      setMemberProfileIds([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/insurance/${cardId}?profileId=${profileId}`)
      .then((r) => r.json())
      .then((data) => {
        setFields({
          type: data.type ?? "HEALTH",
          status: data.status ?? "ACTIVE",
          insurerName: data.insurerName ?? "",
          planName: data.planName ?? "",
          policyHolder: data.policyHolder ?? "",
          memberId: data.memberId ?? "",
          groupNumber: data.groupNumber ?? "",
          rxBIN: data.rxBIN ?? "",
          rxPCN: data.rxPCN ?? "",
          rxGroup: data.rxGroup ?? "",
          phone: data.phone ?? "",
          website: data.website ?? "",
          cardLastFour: data.cardLastFour ?? "",
          cardNetwork: data.cardNetwork ?? "",
          effectiveDate: toDateInputValue(data.effectiveDate),
          expirationDate: toDateInputValue(data.expirationDate),
          frontImageData: data.frontImageData ?? null,
          backImageData: data.backImageData ?? null,
          notes: data.notes ?? "",
        });
        setMemberProfileIds(data.memberProfileIds ?? []);
      })
      .catch(() => setError("Failed to load card"))
      .finally(() => setLoading(false));
  }, [cardId, profileId]);

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function nullify(v: string): string | null {
    return v.trim() === "" ? null : v.trim();
  }

  function toggleMember(id: string) {
    setMemberProfileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      ...(isEditing ? {} : { profileId }),
      type: fields.type,
      status: fields.status,
      insurerName: nullify(fields.insurerName),
      planName: nullify(fields.planName),
      policyHolder: nullify(fields.policyHolder),
      memberId: nullify(fields.memberId),
      groupNumber: nullify(fields.groupNumber),
      rxBIN: isRx ? nullify(fields.rxBIN) : null,
      rxPCN: isRx ? nullify(fields.rxPCN) : null,
      rxGroup: isRx ? nullify(fields.rxGroup) : null,
      phone: nullify(fields.phone),
      website: nullify(fields.website),
      cardLastFour: isPaymentCard ? nullify(fields.cardLastFour) : null,
      cardNetwork: isPaymentCard ? nullify(fields.cardNetwork) : null,
      effectiveDate: nullify(fields.effectiveDate),
      expirationDate: nullify(fields.expirationDate),
      frontImageData: fields.frontImageData,
      backImageData: fields.backImageData,
      notes: nullify(fields.notes),
      memberProfileIds,
    };

    const url = isEditing
      ? `/api/insurance/${cardId}?profileId=${profileId}`
      : `/api/insurance`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!cardId) return;
    if (!confirm("Delete this insurance card? This cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/insurance/${cardId}?profileId=${profileId}`, {
        method: "DELETE",
      });
      if (res.ok) onDeleted(cardId);
      else setError("Failed to delete");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const selectCls = inputCls;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Insurance Card" : "Add Insurance Card"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Card type & status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Card Type</label>
            <select
              value={fields.type}
              onChange={(e) => set("type", e.target.value as CardType)}
              className={selectCls}
            >
              {InsuranceCardTypeEnum.options.map((opt) => (
                <option key={opt} value={opt}>
                  {INSURANCE_CARD_TYPE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={fields.status}
              onChange={(e) => set("status", e.target.value as CardStatus)}
              className={selectCls}
            >
              {InsuranceCardStatusEnum.options.map((opt) => (
                <option key={opt} value={opt}>
                  {INSURANCE_CARD_STATUS_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Insurance details */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Insurance Details</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Insurer / Company Name</label>
              <input
                type="text"
                value={fields.insurerName}
                onChange={(e) => set("insurerName", e.target.value)}
                placeholder="e.g. Blue Cross Blue Shield"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Plan Name</label>
              <input
                type="text"
                value={fields.planName}
                onChange={(e) => set("planName", e.target.value)}
                placeholder="e.g. Gold PPO 2024"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Policy Holder</label>
            <input
              type="text"
              value={fields.policyHolder}
              onChange={(e) => set("policyHolder", e.target.value)}
              placeholder="Full name of policy holder"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Member ID</label>
              <input
                type="text"
                value={fields.memberId}
                onChange={(e) => set("memberId", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Group Number</label>
              <input
                type="text"
                value={fields.groupNumber}
                onChange={(e) => set("groupNumber", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </fieldset>

        {/* RX fields — only for PRESCRIPTION cards */}
        {isRx && (
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pharmacy / RX Details</legend>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>RX BIN</label>
                <input
                  type="text"
                  value={fields.rxBIN}
                  onChange={(e) => set("rxBIN", e.target.value)}
                  maxLength={20}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>RX PCN</label>
                <input
                  type="text"
                  value={fields.rxPCN}
                  onChange={(e) => set("rxPCN", e.target.value)}
                  maxLength={20}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>RX Group</label>
                <input
                  type="text"
                  value={fields.rxGroup}
                  onChange={(e) => set("rxGroup", e.target.value)}
                  maxLength={50}
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>
        )}

        {/* Payment card fields — HSA / FSA / HRA */}
        {isPaymentCard && (
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment Card Details</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Card Number</label>
                <input
                  type="text"
                  value={fields.cardLastFour}
                  onChange={(e) => set("cardLastFour", e.target.value)}
                  placeholder="e.g. 1234"
                  maxLength={20}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Card Network</label>
                <select
                  value={fields.cardNetwork}
                  onChange={(e) => set("cardNetwork", e.target.value)}
                  className={selectCls}
                >
                  <option value="">— Select —</option>
                  <option>Visa</option>
                  <option>Mastercard</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </fieldset>
        )}

        {/* Contact */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={fields.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(800) 555-1234"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input
                type="text"
                value={fields.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="e.g. bcbs.com"
                className={inputCls}
              />
            </div>
          </div>
        </fieldset>

        {/* Dates */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dates</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Effective Date</label>
              <input
                type="date"
                value={fields.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Expiration Date</label>
              <input
                type="date"
                value={fields.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </fieldset>

        {/* Card images */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Card Photos</legend>
          <div className="flex gap-6 flex-wrap">
            <ImageUploadField
              label="Front of Card"
              value={fields.frontImageData}
              onChange={(v) => set("frontImageData", v)}
            />
            <ImageUploadField
              label="Back of Card"
              value={fields.backImageData}
              onChange={(v) => set("backImageData", v)}
            />
          </div>
        </fieldset>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            maxLength={5000}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Family Members */}
        {otherProfiles.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Also visible to
            </legend>
            <p className="text-xs text-gray-500">
              Checked profiles will see this card in their wallet (read-only).
            </p>
            <div className="space-y-1.5">
              {otherProfiles.map((profile) => (
                <label key={profile.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memberProfileIds.includes(profile.id)}
                    onChange={() => toggleMember(profile.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-800">{profile.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-sm text-red-500 hover:text-red-700 underline disabled:opacity-50"
            >
              Delete card
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Card"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
