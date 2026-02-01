"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "../../../components/Icon";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center h-full">
        <Icon name="refresh" size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </main>
    }>
      <NewInvoiceContent />
    </Suspense>
  );
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    fetchCustomers();
    if (quoteId) {
      loadQuoteData(quoteId);
    } else {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setDueDate(defaultDue.toISOString().split("T")[0]);
    }
  }, [quoteId]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const loadQuoteData = async (id: string) => {
    setLoadingQuote(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes/${id}`);
      if (res.ok) {
        const quote = await res.json();
        setSelectedCustomer(quote.customerId);
        setDescription(quote.description);
        setItems(quote.items.map((item: QuoteItem, idx: number) => ({
          id: String(idx + 1),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })));
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setDueDate(defaultDue.toISOString().split("T")[0]);
      }
    } catch (err) {
      console.error("Failed to load quote:", err);
    } finally {
      setLoadingQuote(false);
    }
  };

  const addItem = () => {
    const newId = String(Date.now());
    setItems([...items, { id: newId, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;
      if (quoteId) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices/from-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId, dueDate }),
        });
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/invoices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: selectedCustomer,
            description,
            dueDate,
            items: items.map(({ description, quantity, unitPrice, total }) => ({
              description,
              quantity,
              unitPrice,
              total,
            })),
          }),
        });
      }

      if (res.ok) {
        const invoice = await res.json();
        router.push(`/dashboard/invoices/${invoice.id}`);
      } else {
        const error = await res.json();
        alert(`Failed to create invoice: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingQuote) {
    return (
      <main className="flex items-center justify-center h-full">
        <Icon name="refresh" size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </main>
    );
  }

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
            <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
              {quoteId ? "Create Invoice from Quote" : "New Invoice"}
            </h1>
            <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
              Create an invoice.
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 overflow-auto p-8">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          {/* Customer Selection */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
              Customer
            </h2>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
              disabled={!!quoteId}
              className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Details */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)] mb-4">
              Invoice Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={!!quoteId}
                  placeholder="Invoice description"
                  className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
                Line Items
              </h2>
              {!quoteId && (
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 h-8 px-3 bg-[var(--secondary)] rounded-lg font-secondary text-[12px] font-medium text-[var(--foreground)] hover:opacity-80 transition-opacity"
                >
                  <Icon name="plus" size={14} />
                  Add Item
                </button>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    {index === 0 && (
                      <label className="block font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">
                        Description
                      </label>
                    )}
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      required
                      disabled={!!quoteId}
                      placeholder="Item description"
                      className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">
                        Quantity
                      </label>
                    )}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      required
                      disabled={!!quoteId}
                      className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">
                        Unit Price
                      </label>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      required
                      disabled={!!quoteId}
                      className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block font-secondary text-[12px] text-[var(--muted-foreground)] uppercase mb-1">
                        Total
                      </label>
                    )}
                    <div className="h-10 px-3 bg-[var(--secondary)] border border-[var(--border)] rounded-lg flex items-center font-secondary text-[14px] text-[var(--foreground)]">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {index === 0 && <div className="h-5" />}
                    {items.length > 1 && !quoteId && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-[var(--border)] mt-6 pt-4">
              <div className="flex justify-end">
                <div className="w-48 flex justify-between items-center">
                  <span className="font-primary text-[16px] font-semibold text-[var(--foreground)]">Total</span>
                  <span className="font-primary text-[20px] font-semibold text-[var(--primary)]">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard/invoices"
              className="h-10 px-6 bg-[var(--secondary)] rounded-full font-primary text-[14px] font-medium text-[var(--foreground)] hover:opacity-80 transition-opacity flex items-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-6 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Icon name="refresh" size={16} className="animate-spin" />}
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
