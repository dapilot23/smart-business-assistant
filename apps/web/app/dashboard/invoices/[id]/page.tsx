"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "../../../components/Icon";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentReminder {
  id: string;
  step: number;
  channel: "SMS" | "EMAIL" | "BOTH";
  scheduledAt: string;
  sentAt?: string;
  status: "PENDING" | "SENT" | "CANCELLED";
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  customerId: string;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    address?: string;
  };
  items: InvoiceItem[];
  reminders?: PaymentReminder[];
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvoice = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        router.push("/dashboard/invoices");
      }
    } catch (err) {
      console.error("Failed to fetch invoice:", err);
      router.push("/dashboard/invoices");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string);
    }
  }, [params.id, fetchInvoice]);

  const updateStatus = async (status: string) => {
    if (!invoice) return;
    setActionLoading(status);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/${invoice.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const sendInvoice = async () => {
    if (!invoice) return;
    setActionLoading("SENT");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "sms" }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        alert("Invoice sent successfully via SMS!");
      } else {
        const error = await res.json();
        alert(`Failed to send invoice: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to send invoice:", err);
      alert("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteInvoice = async () => {
    if (!invoice || !confirm("Are you sure you want to delete this invoice?")) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/invoices");
      }
    } catch (err) {
      console.error("Failed to delete invoice:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const initiatePayment = async () => {
    if (!invoice) return;
    setActionLoading("pay");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/payments/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          successUrl: `${window.location.origin}/dashboard/invoices/${invoice.id}?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard/invoices/${invoice.id}?payment=cancelled`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, "_blank");
        }
      } else {
        const error = await res.json();
        alert(`Payment error: ${error.message || "Unable to create payment session"}`);
      }
    } catch (err) {
      console.error("Failed to initiate payment:", err);
      alert("Network error. Please try again.");
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

  const getStatusColor = (status: Invoice["status"]) => {
    switch (status) {
      case "DRAFT": return "bg-gray-800 text-gray-300";
      case "SENT": return "bg-blue-900 text-blue-300";
      case "PAID": return "bg-[var(--color-success)] text-[var(--color-success-foreground)]";
      case "OVERDUE": return "bg-red-900 text-red-300";
      case "CANCELLED": return "bg-yellow-900 text-yellow-300";
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

  if (!invoice) {
    return null;
  }

  const balanceDue = invoice.amount - invoice.paidAmount;

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center justify-between h-20 px-8 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
          >
            <Icon name="chevron-right" size={20} className="text-[var(--muted-foreground)] rotate-180" />
          </Link>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
                {invoice.invoiceNumber}
              </h1>
              <span className={`px-2 py-0.5 rounded-full font-secondary text-[12px] ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
            <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
              Created {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Download PDF button - always visible */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-full font-primary text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
          >
            <Icon name="file-text" size={16} />
            Download PDF
          </a>

          {invoice.status === "DRAFT" && (
            <>
              <button
                onClick={sendInvoice}
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
                onClick={deleteInvoice}
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
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <div className="flex gap-2">
              <button
                onClick={initiatePayment}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 h-10 px-4 bg-[var(--color-success)] rounded-full font-primary text-[14px] font-medium text-[var(--color-success-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading === "pay" ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="credit-card" size={16} />
                )}
                Pay Now ({formatCurrency(balanceDue)})
              </button>
              <button
                onClick={() => updateStatus("PAID")}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-full font-primary text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
              >
                {actionLoading === "PAID" ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="check" size={16} />
                )}
                Mark as Paid
              </button>
            </div>
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
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{invoice.customer.name}</p>
              </div>
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Email</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{invoice.customer.email || "N/A"}</p>
              </div>
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Phone</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{invoice.customer.phone}</p>
              </div>
              <div>
                <p className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">Due Date</p>
                <p className="font-secondary text-[14px] text-[var(--foreground)]">{formatDate(invoice.dueDate)}</p>
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
                {invoice.items.map((item) => (
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

            {/* Totals */}
            <div className="border-t border-[var(--border)] mt-4 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between font-secondary text-[14px]">
                    <span className="text-[var(--muted-foreground)]">Subtotal</span>
                    <span className="text-[var(--foreground)]">{formatCurrency(invoice.amount)}</span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <div className="flex justify-between font-secondary text-[14px]">
                      <span className="text-[var(--muted-foreground)]">Paid</span>
                      <span className="text-[var(--color-success)]">-{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-primary text-[18px] font-semibold pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--foreground)]">Balance Due</span>
                    <span className="text-[var(--primary)]">{formatCurrency(balanceDue)}</span>
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
                label="Invoice created"
                date={formatDate(invoice.createdAt)}
                active
              />
              {invoice.sentAt && (
                <TimelineItem
                  icon="mail"
                  label="Invoice sent to customer"
                  date={formatDate(invoice.sentAt)}
                  active
                />
              )}
              {invoice.reminders?.filter(r => r.status === "SENT").map((reminder) => (
                <TimelineItem
                  key={reminder.id}
                  icon="bell"
                  label={`Reminder ${reminder.step} sent via ${reminder.channel}`}
                  date={reminder.sentAt ? formatDate(reminder.sentAt) : ""}
                  active
                />
              ))}
              {invoice.paidAt && (
                <TimelineItem
                  icon="check"
                  label="Payment received"
                  date={formatDate(invoice.paidAt)}
                  active
                  variant="success"
                />
              )}
              {invoice.status === "OVERDUE" && (
                <TimelineItem
                  icon="alert-circle"
                  label="Invoice overdue"
                  date=""
                  active
                  variant="error"
                />
              )}
            </div>
          </div>

          {/* Payment Reminders Section */}
          {invoice.reminders && invoice.reminders.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
              <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
                Payment Reminders
              </h2>
              <div className="space-y-3">
                {invoice.reminders.map((reminder) => (
                  <ReminderItem key={reminder.id} reminder={reminder} />
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
  icon: "plus" | "mail" | "check" | "alert-circle" | "bell";
  label: string;
  date: string;
  active?: boolean;
  variant?: "default" | "success" | "error";
}) {
  const iconColors = {
    default: active ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--card)] text-[var(--muted-foreground)]",
    success: "bg-[var(--color-success)]/20 text-[var(--color-success)]",
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

function ReminderItem({ reminder }: { reminder: PaymentReminder }) {
  const getStatusStyles = (status: PaymentReminder["status"]) => {
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

  const getChannelIcon = (channel: string): "phone" | "mail" | "bell" => {
    switch (channel) {
      case "SMS":
        return "phone";
      case "EMAIL":
        return "mail";
      default:
        return "bell";
    }
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

  const getScheduleLabel = (reminder: PaymentReminder) => {
    const scheduledDate = new Date(reminder.scheduledAt);
    const now = new Date();
    const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (reminder.status === "SENT") {
      return `Sent ${formatDateTime(reminder.sentAt!)}`;
    } else if (reminder.status === "CANCELLED") {
      return "Cancelled";
    } else if (daysUntil < 0) {
      return `Scheduled for ${formatDateTime(reminder.scheduledAt)}`;
    } else if (daysUntil === 0) {
      return "Scheduled for today";
    } else if (daysUntil === 1) {
      return "Scheduled for tomorrow";
    } else {
      return `Scheduled in ${daysUntil} days`;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
          <Icon name={getChannelIcon(reminder.channel)} size={14} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-secondary text-[14px] text-[var(--foreground)]">
            Reminder {reminder.step} via {reminder.channel}
          </p>
          <p className="font-secondary text-[12px] text-[var(--muted-foreground)]">
            {getScheduleLabel(reminder)}
          </p>
        </div>
      </div>
      <span className={`px-2 py-1 rounded-full font-secondary text-[11px] border ${getStatusStyles(reminder.status)}`}>
        {reminder.status}
      </span>
    </div>
  );
}
