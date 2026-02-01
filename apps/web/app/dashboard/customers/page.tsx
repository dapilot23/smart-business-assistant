'use client';

import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
}

interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    });
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      alert('Please enter first and last name');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingCustomer
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/customers/${editingCustomer.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/customers`;

      const res = await fetch(url, {
        method: editingCustomer ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchCustomers();
        handleCloseModal();
      } else {
        throw new Error('Failed to save customer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/customers/${customer.id}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        await fetchCustomers();
      } else {
        throw new Error('Failed to delete customer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.first_name.toLowerCase().includes(searchLower) ||
      customer.last_name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.phone.includes(searchQuery)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 border-b border-[var(--border)]">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-primary text-lg sm:text-[20px] font-semibold text-[var(--foreground)]">
            Customers
          </h1>
          <p className="font-secondary text-[13px] sm:text-[14px] text-[var(--muted-foreground)]">
            Your customer list.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="self-start sm:self-auto">
          <Icon name="plus" size={16} className="mr-2" />
          Add Customer
        </Button>
      </header>

      {/* Search */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[var(--border)]">
        <div className="relative max-w-md">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Icon name="loader-2" size={24} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Icon name="users" size={48} className="text-[var(--muted-foreground)]" />
            <div className="text-center">
              <p className="font-primary text-[16px] text-[var(--foreground)]">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </p>
              <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
                {searchQuery ? 'Try a different search.' : 'Add your first customer.'}
              </p>
            </div>
            {!searchQuery && (
              <Button onClick={() => handleOpenModal()}>
                <Icon name="plus" size={16} className="mr-2" />
                Add Customer
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-3">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-secondary text-[14px] font-medium text-[var(--foreground)]">
                        {customer.first_name} {customer.last_name}
                      </p>
                      <p className="font-secondary text-[13px] text-[var(--muted-foreground)]">
                        {customer.email}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenModal(customer)}
                        className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors"
                      >
                        <Icon name="edit" size={16} className="text-[var(--muted-foreground)]" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors"
                      >
                        <Icon name="trash-2" size={16} className="text-[var(--muted-foreground)]" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{customer.phone}</span>
                    <span>Added {formatDate(customer.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <table className="hidden lg:table w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Name</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Email</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Phone</th>
                  <th className="text-left pb-3 font-secondary text-[12px] font-medium text-[var(--muted-foreground)] uppercase">Added</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-[var(--border)] hover:bg-[var(--card)] transition-colors">
                    <td className="py-4">
                      <p className="font-secondary text-[14px] font-medium text-[var(--foreground)]">
                        {customer.first_name} {customer.last_name}
                      </p>
                    </td>
                    <td className="py-4">
                      <p className="font-secondary text-[14px] text-[var(--foreground)]">{customer.email}</p>
                    </td>
                    <td className="py-4">
                      <p className="font-secondary text-[14px] text-[var(--foreground)]">{customer.phone}</p>
                    </td>
                    <td className="py-4">
                      <p className="font-secondary text-[14px] text-[var(--muted-foreground)]">
                        {formatDate(customer.created_at)}
                      </p>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors"
                        >
                          <Icon name="edit" size={16} className="text-[var(--muted-foreground)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors"
                        >
                          <Icon name="trash-2" size={16} className="text-[var(--muted-foreground)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Customer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Update customer information' : 'Add a new customer to your directory'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Icon name="loader-2" size={16} className="mr-2 animate-spin" />}
              {editingCustomer ? 'Save Changes' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
