"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../../../components/Icon";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

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

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      alert("Please select a customer");
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      alert("Please fill in all line items correctly");
      return;
    }

    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      const quoteData = {
        customerId,
        description: description || items[0]?.description || "Quote",
        amount: calculateTotal(),
        validUntil: validUntil.toISOString(),
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
        notes,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/quotes/${data.id}`);
      } else {
        const error = await res.json();
        alert(error.message || "Failed to create quote");
      }
    } catch (err) {
      console.error("Failed to create quote:", err);
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="font-primary text-[20px] font-semibold text-[var(--foreground)]">
              Create New Quote
            </h1>
            <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
              Build a quote for your customer
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Customer Selection */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
              Customer Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-secondary text-[14px] text-[var(--foreground)]">
                  Select Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full h-10 px-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  required
                >
                  <option value="">Choose a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-secondary text-[14px] text-[var(--foreground)]">
                  Valid For (Days)
                </label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="w-full h-10 px-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-secondary text-[14px] text-[var(--foreground)]">
                Quote Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Plumbing repair services"
                className="w-full h-10 px-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
                Line Items
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg font-secondary text-[13px] hover:bg-[var(--primary)]/20 transition-colors"
              >
                <Icon name="plus" size={14} />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_120px_120px_40px] gap-3 px-2">
                <span className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase">Description</span>
                <span className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase">Qty</span>
                <span className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase">Unit Price</span>
                <span className="font-secondary text-[12px] text-[var(--muted-foreground)] uppercase">Total</span>
                <span></span>
              </div>

              {/* Items */}
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_100px_120px_120px_40px] gap-3 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Item description..."
                    className="h-10 px-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="h-10 px-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    required
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-10 pl-7 pr-4 w-full bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                      required
                    />
                  </div>
                  <span className="font-secondary text-[14px] font-medium text-[var(--foreground)] px-2">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="p-2 rounded-lg hover:bg-red-900/20 text-[var(--muted-foreground)] hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-[var(--border)] pt-4 mt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between font-secondary text-[14px]">
                    <span className="text-[var(--muted-foreground)]">Subtotal</span>
                    <span className="text-[var(--foreground)]">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between font-primary text-[18px] font-semibold pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--foreground)]">Total</span>
                    <span className="text-[var(--primary)]">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
            <h2 className="font-primary text-[16px] font-semibold text-[var(--foreground)]">
              Additional Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional terms, conditions, or notes for the customer..."
              rows={3}
              className="w-full p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-secondary text-[14px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/dashboard/quotes"
              className="px-6 py-2.5 font-secondary text-[14px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </Link>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-[var(--primary)] rounded-full font-primary text-[14px] font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="save" size={16} />
                )}
                {saving ? "Creating..." : "Create Quote"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
