"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "../../components/Icon";

interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
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
      month: "short",
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

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-[var(--border)]">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-lg sm:text-[20px] font-semibold text-[var(--foreground)]">
            Invoices
          </h1>
          <p className="font-secondary text-[13px] sm:text-[14px] text-[var(--muted-foreground)]">
            Track billing and payments.
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center justify-center gap-2 h-10 px-4 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Icon name="plus" size={16} />
          New Invoice
        </Link>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-[var(--border)]">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 sm:p-4">
            <p className="font-secondary text-[11px] sm:text-[12px] text-[var(--muted-foreground)] uppercase">Total Invoices</p>
            <p className="font-primary text-lg sm:text-[24px] font-semibold text-[var(--foreground)]">{stats.total}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 sm:p-4">
            <p className="font-secondary text-[11px] sm:text-[12px] text-[var(--muted-foreground)] uppercase">Outstanding</p>
            <p className="font-primary text-lg sm:text-[24px] font-semibold text-[var(--foreground)]">{stats.sent + stats.overdue}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 sm:p-4">
            <p className="font-secondary text-[11px] sm:text-[12px] text-[var(--muted-foreground)] uppercase">Paid</p>
            <p className="font-primary text-lg sm:text-[24px] font-semibold text-[var(--color-success)]">{stats.paid}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 sm:p-4">
            <p className="font-secondary text-[11px] sm:text-[12px] text-[var(--muted-foreground)] uppercase">Outstanding</p>
            <p className="font-primary text-lg sm:text-[24px] font-semibold text-[var(--primary)] truncate">{formatCurrency(stats.outstandingAmount)}</p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
              <Icon name="file-text" size={24} className="text-[var(--muted-foreground)]" />
            </div>
            <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
              No invoices yet. Create your first invoice.
            </p>
            <Link
              href="/dashboard/invoices/new"
              className="flex items-center gap-2 h-10 px-4 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <Icon name="plus" size={16} />
              New Invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-3">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/dashboard/invoices/${invoice.id}`}
                  className="block bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-secondary text-[14px] font-medium text-[var(--primary)]">
                        {invoice.invoiceNumber}
                      </span>
                      <p className="font-secondary text-[14px] text-[var(--foreground)] mt-1">
                        {invoice.customer.name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full font-secondary text-[11px] ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <p className="font-secondary text-[13px] text-[var(--muted-foreground)] truncate mb-2">
                    {invoice.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-secondary text-[14px] font-semibold text-[var(--foreground)]">
                        {formatCurrency(invoice.amount)}
                      </span>
                      {invoice.paidAmount > 0 && invoice.paidAmount < invoice.amount && (
                        <span className="font-secondary text-[12px] text-[var(--muted-foreground)] ml-2">
                          ({formatCurrency(invoice.paidAmount)} paid)
                        </span>
                      )}
                    </div>
                    <span className="font-secondary text-[12px] text-[var(--muted-foreground)]">
                      Due: {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Table */}
            <table className="hidden lg:table w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Invoice</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Customer</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Description</th>
                  <th className="text-right pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Amount</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Status</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Due Date</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[var(--border)] hover:bg-[var(--card)] transition-colors">
                    <td className="py-4">
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="font-secondary text-[14px] font-medium text-[var(--primary)] hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-4">
                      <p className="font-secondary text-[14px] text-[var(--foreground)]">{invoice.customer.name}</p>
                    </td>
                    <td className="py-4">
                      <p className="font-secondary text-[14px] text-[var(--foreground)] truncate max-w-[200px]">{invoice.description}</p>
                    </td>
                    <td className="py-4 text-right">
                      <p className="font-secondary text-[14px] font-medium text-[var(--foreground)]">{formatCurrency(invoice.amount)}</p>
                      {invoice.paidAmount > 0 && invoice.paidAmount < invoice.amount && (
                        <p className="font-secondary text-[12px] text-[var(--muted-foreground)]">
                          {formatCurrency(invoice.paidAmount)} paid
                        </p>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full font-secondary text-[12px] ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <p className="font-secondary text-[14px] text-[var(--foreground)]">{formatDate(invoice.dueDate)}</p>
                    </td>
                    <td className="py-4 text-right">
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        <Icon name="chevron-right" size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </main>
  );
}
