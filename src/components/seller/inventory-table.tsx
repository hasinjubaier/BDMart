'use client';

import React, { useState } from 'react';
import { adjustVariantStockAction } from '@/server/actions/seller.actions';
import { formatBDT } from '@/lib/formatters';

export interface InventoryItem {
  variantId: string;
  sku: string;
  productTitle: string;
  productSlug: string;
  productStatus: string;
  stock: number;
  price: number;
  attributes: Record<string, unknown>;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [newStockInput, setNewStockInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('Inventory audit adjustment');
  const [statusMap, setStatusMap] = useState<Record<string, { success?: string; error?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdjust = (item: InventoryItem) => {
    setActiveVariantId(item.variantId);
    setNewStockInput(String(item.stock));
    setReasonInput('Routine stock count verification');
    setStatusMap({});
  };

  const handleCommitAdjust = async (variantId: string) => {
    const stockNum = parseInt(newStockInput, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setStatusMap({ [variantId]: { error: 'Stock must be a non-negative integer.' } });
      return;
    }

    if (!reasonInput || reasonInput.trim().length < 3) {
      setStatusMap({ [variantId]: { error: 'A valid reason of at least 3 characters is required.' } });
      return;
    }

    setIsSubmitting(true);
    setStatusMap({});

    try {
      const currentItem = items.find((i) => i.variantId === variantId);
      const res = await adjustVariantStockAction({
        variantId,
        stock: stockNum,
        expectedPreviousStock: currentItem ? currentItem.stock : undefined,
        reason: reasonInput.trim(),
      });

      if (!res.success) {
        setStatusMap({ [variantId]: { error: res.errorMessage } });
      } else {
        setStatusMap({
          [variantId]: {
            success: `Stock updated: ${res.data.previousStock} → ${res.data.newStock} (Delta: ${res.data.delta > 0 ? '+' : ''}${res.data.delta})`,
          },
        });
        // Update local stock in table
        const target = items.find((i) => i.variantId === variantId);
        if (target) {
          target.stock = res.data.newStock;
        }
        setTimeout(() => {
          setActiveVariantId(null);
        }, 1500);
      }
    } catch (err) {
      setStatusMap({
        [variantId]: { error: err instanceof Error ? err.message : 'Stock adjustment failed.' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700 }}>SKU</th>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700 }}>Product Title</th>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700 }}>Attributes</th>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700 }}>Unit Price</th>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700 }}>Current Stock</th>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', color: '#153b5b', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = activeVariantId === item.variantId;
              const status = statusMap[item.variantId];

              const attrString = Object.entries(item.attributes || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ') || 'Standard';

              return (
                <React.Fragment key={item.variantId}>
                  <tr
                    data-testid={`inventory-row-${item.sku}`}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isEditing ? '#f0fdf4' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                      {item.productTitle}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {attrString}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#16a36a' }}>
                      {formatBDT(item.price)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        data-testid={`current-stock-${item.sku}`}
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: item.stock > 0 ? '#dcfce7' : '#fee2e2',
                          color: item.stock > 0 ? '#166534' : '#991b1b',
                        }}
                      >
                        {item.stock} pcs
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize', fontSize: '0.8rem' }}>
                      {item.productStatus}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(item)}
                        data-testid={`adjust-stock-btn-${item.sku}`}
                        style={{
                          padding: '0.35rem 0.75rem',
                          backgroundColor: '#153b5b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>

                  {/* Inline Adjustment Form Drawer */}
                  {isEditing && (
                    <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                      <td colSpan={7} style={{ padding: '1rem 1.25rem' }}>
                        <div
                          data-testid={`stock-adjust-form-${item.sku}`}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            alignItems: 'flex-end',
                          }}
                        >
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                              New Stock Balance (Units) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              data-testid="new-stock-input"
                              value={newStockInput}
                              onChange={(e) => setNewStockInput(e.target.value)}
                              style={{ padding: '0.45rem', width: '130px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div style={{ flex: '1 1 240px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                              Adjustment Reason (Mandatory Audit Trail) *
                            </label>
                            <input
                              type="text"
                              required
                              data-testid="stock-reason-input"
                              value={reasonInput}
                              onChange={(e) => setReasonInput(e.target.value)}
                              placeholder="e.g. Warehouse restock batch #891 or offline order settlement"
                              style={{ width: '100%', padding: '0.45rem', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleCommitAdjust(item.variantId)}
                              data-testid="commit-stock-adjust-btn"
                              style={{
                                padding: '0.45rem 1rem',
                                backgroundColor: '#16a36a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isSubmitting ? 'Saving...' : 'Commit Adjustment'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveVariantId(null)}
                              style={{
                                padding: '0.45rem 0.75rem',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>

                        {status?.error && (
                          <div data-testid="stock-adjust-error" style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>
                            ✕ {status.error}
                          </div>
                        )}
                        {status?.success && (
                          <div data-testid="stock-adjust-success" style={{ color: '#166534', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
                            ✓ {status.success}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
