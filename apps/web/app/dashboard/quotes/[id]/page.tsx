"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "../../../components/Icon";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteFollowUp {
  id: string;
  step: number;
  channel: "SMS" | "EMAIL";
  scheduledAt: string;
  sentAt?: string;
  status: "PENDING" | "SENT" | "CANCELLED";
}

interface Quote {
  id: string;
  quoteNumber: string;
  description: string;
  amount: number;
  validUntil: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  customerId: string;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  items: QuoteItem[];
  followUps?: QuoteFollowUp[];
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQuote = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      } else {
        router.push("/dashboard/quotes");
      }
    } catch (err) {
      console.error("Failed to fetch quote:", err);
      router.push("/dashboard/quotes");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (params.id) {
      fetchQuote(params.id as string);
    }
  }, [params.id, fetchQuote]);

  const updateStatus = async (status: string) => {
    if (!quote) return;
    setActionLoading(status);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes/${quote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const sendQuote = async () => {
    if (!quote) return;
    setActionLoading("SENT");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "sms" }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuote(data.quote);
        alert("Quote sent successfully via SMS!");
      } else {
        const error = await res.json();
        alert(`Failed to send quote: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to send quote:", err);
      alert("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteQuote = async () => {
    if (!quote || !confirm("Are you sure you want to delete this quote?")) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes/${quote.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/quotes");
      }
    } catch (err) {
      console.error("Failed to delete quote:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: Quote["status"]) => {
    switch (status) {
      case "DRAFT": return "bg-gray-800 text-gray-300";
      case "SENT": return "bg-blue-900 text-blue-300";
      case "ACCEPTED": return "bg-[var(--color-success)] text-[var(--color-success-foreground)]";
      case "REJECTED": return "bg-red-900 text-red-300";
      case "EXPIRED": return "bg-yellow-900 text-yellow-300";
      default: return "bg-gray-800 text-gray-300";
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center h-full">
        <Icon name="refresh" size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </main>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center justify-between h-20 px-8 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/quotes"
            className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
          >
            <Icon name="chevron-right" size={20} className="text-[var(--muted-foreground)] rotate-180" />
          </Link>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
                {quote.quoteNumber}
              </h1>
              <span className={`px-2 py-0.5 rounded-full font-secondary text-[12px] ${getStatusColor(quote.status)}`}>
                {quote.status}
              </span>
            </div>
            <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
              Created {formatDate(quote.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Download PDF button - always visible */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-full font-primary text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          >
            <Icon name="file-text" size={16} />
            Download PDF
          </a>

          {quote.status === "DRAFT" && (
            <>
              <button
                onClick={sendQuote}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 h-10 px-4 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading === "SENT" ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="mail" size={16} />
                )}
                Send via SMS
              </button>
              <button
                onClick={deleteQuote}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 h-10 px-4 bg-red-900/20 border border-red-800 rounded-full font-primary text-[14px] font-medium text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === "delete" ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="x" size={16} />
                )}
                Delete
              </button>
            </>
          )}
          {quote.status === "SENT" && (
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus("ACCEPTED")}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 h-10 px-4 bg-[var(--color-success)] rounded-full font-primary text-[14px] font-medium text-[var(--color-success-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading === "ACCEPTED" ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="check" size={16} />
                )}
                Mark Accepted
              </button>
              <button
                onClick={() => updateStatus("REJECTED")}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 h-10 px-4 bg-red-900/20 border border-red-800 rounded-full font-primary text-[14px] font-medium text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === "REJECTED" ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="x" size={16} />
                )}
                Mark Rejected
              </button>
            </div>
          )}
          {quote.status === "ACCEPTED" && (
            <Link
              href={`/dashboard/invoices/new?quoteId=${quote.id}`}
              className="flex items-center gap-2 h-10 px-4 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <Icon name="file-text" size={16} />
              Create Invoice
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl space-y-6">
          {/* Customer Info */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
              Customer Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Name</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{quote.customer.name}</p>
              </div>
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Email</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{quote.customer.email}</p>
              </div>
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Phone</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{quote.customer.phone}</p>
              </div>
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Valid Until</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{formatDate(quote.validUntil)}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
              Line Items
            </h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Description</th>
                  <th className="text-right pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase w-20">Qty</th>
                  <th className="text-right pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase w-28">Unit Price</th>
                  <th className="text-right pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 font-secondary text-[14px] text-[var(--foreground)]">
                      {item.description}
                    </td>
                    <td className="py-3 text-right font-secondary text-[14px] text-[var(--foreground)]">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right font-secondary text-[14px] text-[var(--foreground)]">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 text-right font-secondary text-[14px] font-medium text-[var(--foreground)]">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="border-t border-[var(--border)] mt-4 pt-4">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between font-primary text-[18px] font-semibold">
                    <span className="text-[var(--foreground)]">Total</span>
                    <span className="text-[var(--primary)]">{formatCurrency(quote.amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
              Timeline
            </h2>
            <div className="space-y-3">
              <TimelineItem
                icon="plus"
                label="Quote created"
                date={formatDate(quote.createdAt)}
                active
              />
              {quote.sentAt && (
                <TimelineItem
                  icon="mail"
                  label="Quote sent to customer"
                  date={formatDate(quote.sentAt)}
                  active
                />
              )}
              {quote.followUps?.filter(f => f.status === "SENT").map((followUp) => (
                <TimelineItem
                  key={followUp.id}
                  icon="mail"
                  label={`Follow-up ${followUp.step} sent via ${followUp.channel}`}
                  date={followUp.sentAt ? formatDate(followUp.sentAt) : ""}
                  active
                />
              ))}
              {quote.acceptedAt && (
                <TimelineItem
                  icon="check"
                  label="Quote accepted"
                  date={formatDate(quote.acceptedAt)}
                  active
                />
              )}
              {quote.status === "REJECTED" && (
                <TimelineItem
                  icon="x"
                  label="Quote rejected"
                  date=""
                  active
                  variant="error"
                />
              )}
            </div>
          </div>

          {/* Follow-ups Section */}
          {quote.followUps && quote.followUps.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
              <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
                Automated Follow-ups
              </h2>
              <div className="space-y-3">
                {quote.followUps.map((followUp) => (
                  <FollowUpItem key={followUp.id} followUp={followUp} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TimelineItem({ icon, label, date, active, variant = "default" }: {
  icon: "plus" | "mail" | "check" | "x";
  label: string;
  date: string;
  active?: boolean;
  variant?: "default" | "error";
}) {
  const iconColors = {
    default: active ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--card)] text-[var(--muted-foreground)]",
    error: "bg-red-900/20 text-red-400",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColors[variant]}`}>
        <Icon name={icon} size={14} />
      </div>
      <div className="flex-1">
        <p className="font-secondary text-[14px] text-[var(--foreground)]">{label}</p>
        {date && (
          <p className="font-secondary text-[12px] text-[var(--muted-foreground)]">{date}</p>
        )}
      </div>
    </div>
  );
}

function FollowUpItem({ followUp }: { followUp: QuoteFollowUp }) {
  const getStatusStyles = (status: QuoteFollowUp["status"]) => {
    switch (status) {
      case "PENDING":
        return "bg-blue-900/20 text-blue-300 border-blue-800";
      case "SENT":
        return "bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]";
      case "CANCELLED":
        return "bg-gray-800/50 text-gray-400 border-gray-700";
      default:
        return "bg-gray-800/50 text-gray-400 border-gray-700";
    }
  };

  const getChannelIcon = (channel: string): "phone" | "mail" => {
    return channel === "SMS" ? "phone" : "mail";
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
          <Icon name={getChannelIcon(followUp.channel)} size={14} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-secondary text-[14px] text-[var(--foreground)]">
            Follow-up {followUp.step} via {followUp.channel}
          </p>
          <p className="font-secondary text-[12px] text-[var(--muted-foreground)]">
            {followUp.status === "SENT"
              ? `Sent ${formatDateTime(followUp.sentAt!)}`
              : followUp.status === "PENDING"
              ? `Scheduled for ${formatDateTime(followUp.scheduledAt)}`
              : "Cancelled"}
          </p>
        </div>
      </div>
      <span className={`px-2 py-1 rounded-full font-secondary text-[11px] border ${getStatusStyles(followUp.status)}`}>
        {followUp.status}
      </span>
    </div>
  );
}
