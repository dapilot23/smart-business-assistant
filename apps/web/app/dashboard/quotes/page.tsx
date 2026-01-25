"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "../../components/Icon";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
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
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: QuoteItem[];
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    } finally {
      setLoading(false);
    }
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

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-[var(--border)]">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-lg sm:text-[20px] font-semibold text-[var(--foreground)]">
            Quotes
          </h1>
          <p className="font-secondary text-[13px] sm:text-[14px] text-[var(--muted-foreground)]">
            Create and manage quotes for your customers
          </p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="flex items-center justify-center gap-2 h-10 px-4 bg-[var(--primary)] rounded-full hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Icon name="plus" size={18} className="text-[var(--primary-foreground)]" />
          <span className="font-primary text-[14px] font-medium text-[var(--primary-foreground)]">
            New Quote
          </span>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Icon name="refresh" size={24} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Icon name="file-text" size={48} className="text-[var(--muted-foreground)]" />
            <div className="text-center">
              <p className="font-primary text-[16px] text-[var(--foreground)]">No quotes yet</p>
              <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
                Create your first quote to get started
              </p>
            </div>
            <Link
              href="/dashboard/quotes/new"
              className="flex items-center gap-2 h-10 px-4 bg-[var(--primary)] rounded-full hover:opacity-90 transition-opacity"
            >
              <Icon name="plus" size={18} className="text-[var(--primary-foreground)]" />
              <span className="font-primary text-[14px] font-medium text-[var(--primary-foreground)]">
                Create Quote
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <StatCard
                title="Total Quotes"
                value={quotes.length.toString()}
                icon="file-text"
              />
              <StatCard
                title="Pending"
                value={quotes.filter(q => q.status === "SENT").length.toString()}
                icon="clock"
              />
              <StatCard
                title="Accepted"
                value={quotes.filter(q => q.status === "ACCEPTED").length.toString()}
                icon="check"
              />
              <StatCard
                title="Total Value"
                value={formatCurrency(quotes.reduce((sum, q) => sum + q.amount, 0))}
                icon="dollar-sign"
              />
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-3">
              {quotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/quotes/${quote.id}`}
                  className="block bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-secondary text-[14px] font-medium text-[var(--primary)]">
                        {quote.quoteNumber}
                      </span>
                      <p className="font-secondary text-[14px] text-[var(--foreground)] mt-1">
                        {quote.customer?.name || "Unknown"}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 rounded-full font-secondary text-[11px] ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </div>
                  <p className="font-secondary text-[13px] text-[var(--muted-foreground)] truncate mb-2">
                    {quote.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-secondary text-[14px] font-semibold text-[var(--foreground)]">
                      {formatCurrency(quote.amount)}
                    </span>
                    <span className="font-secondary text-[12px] text-[var(--muted-foreground)]">
                      Valid: {formatDate(quote.validUntil)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Quote #</th>
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Customer</th>
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Description</th>
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Amount</th>
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Status</th>
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Valid Until</th>
                      <th className="text-left p-4 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--secondary)]">
                        <td className="p-4">
                          <Link href={`/dashboard/quotes/${quote.id}`} className="font-secondary text-[14px] text-[var(--primary)] hover:underline">
                            {quote.quoteNumber}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-secondary text-[14px] text-[var(--foreground)]">
                              {quote.customer?.name || "Unknown"}
                            </span>
                            <span className="font-secondary text-[12px] text-[var(--muted-foreground)]">
                              {quote.customer?.email || ""}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-secondary text-[14px] text-[var(--foreground)] max-w-[200px] truncate">
                          {quote.description}
                        </td>
                        <td className="p-4 font-secondary text-[14px] font-medium text-[var(--foreground)]">
                          {formatCurrency(quote.amount)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded-full font-secondary text-[12px] ${getStatusColor(quote.status)}`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="p-4 font-secondary text-[14px] text-[var(--muted-foreground)]">
                          {formatDate(quote.validUntil)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/quotes/${quote.id}`}
                              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
                            >
                              <Icon name="chevron-right" size={16} className="text-[var(--muted-foreground)]" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: "file-text" | "clock" | "check" | "dollar-sign" }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
      <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-[var(--primary)]/10 shrink-0">
        <Icon name={icon} size={16} className="sm:hidden text-[var(--primary)]" />
        <Icon name={icon} size={20} className="hidden sm:block text-[var(--primary)]" />
      </div>
      <div className="min-w-0">
        <p className="font-secondary text-[11px] sm:text-[12px] text-[var(--muted-foreground)]">{title}</p>
        <p className="font-primary text-[14px] sm:text-[18px] font-semibold text-[var(--foreground)] truncate">{value}</p>
      </div>
    </div>
  );
}
