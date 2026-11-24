'use client';

import { useState } from 'react';
import { formatBDT } from '@/lib/formatters';

export interface VariantData {
  id: string;
  sku: string;
  attributes: Record<string, unknown>;
  stock: number;
  price: number;
}

interface VariantSelectorProps {
  variants: VariantData[];
  basePrice: number;
  initialSku?: string;
}

export function VariantSelector({ variants, basePrice, initialSku }: VariantSelectorProps) {
  const initialIndex = initialSku
    ? Math.max(0, variants.findIndex((v) => v.sku.toLowerCase() === initialSku.toLowerCase()))
    : 0;

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedVariant = variants[selectedIndex] || variants[0];

  if (!selectedVariant) {
    return (
      <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
        No variants currently configured for this product.
      </div>
    );
  }

  const isSelectedInStock = selectedVariant.stock > 0;
  const currentPrice = selectedVariant.price || basePrice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Price & Real-Time Availability Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#16a36a',
              letterSpacing: '-0.02em',
            }}
          >
            {formatBDT(currentPrice)}
          </span>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            retail price (VAT included)
          </span>
        </div>

        {/* Dynamic Stock Indicator Badge */}
        <div
          data-testid="variant-availability-badge"
          style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: isSelectedInStock ? '#dcfce7' : '#fee2e2',
            color: isSelectedInStock ? '#166534' : '#991b1b',
            border: `1px solid ${isSelectedInStock ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {isSelectedInStock ? `In Stock (${selectedVariant.stock} available)` : 'Out of Stock'}
        </div>
      </div>

      {/* Selected SKU Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#475569',
        }}
      >
        <span style={{ fontWeight: 600 }}>SKU:</span>
        <code
          data-testid="selected-variant-sku"
          style={{
            backgroundColor: '#f1f5f9',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            color: '#0f172a',
            fontWeight: 600,
          }}
        >
          {selectedVariant.sku}
        </code>
      </div>

      {/* Variant Selection Buttons (if more than 1 variant) */}
      {variants.length > 1 && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '0.5rem',
            }}
          >
            Select Variant:
          </label>
          <div
            role="radiogroup"
            aria-label="Product Variants"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
          >
            {variants.map((v, idx) => {
              const isSelected = idx === selectedIndex;
              const hasStock = v.stock > 0;

              // Build attribute label
              const attrEntries = Object.entries(v.attributes || {});
              const label =
                attrEntries.length > 0
                  ? attrEntries.map(([k, val]) => `${k}: ${val}`).join(', ')
                  : v.sku;

              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedIndex(idx)}
                  data-testid={`variant-btn-${v.sku}`}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? '#153b5b' : '#cbd5e1'}`,
                    backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                    color: isSelected ? '#153b5b' : '#334155',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    outline: 'none',
                    opacity: hasStock ? 1 : 0.65,
                  }}
                >
                  <span>{label}</span>
                  {!hasStock && (
                    <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
                      (Out of stock)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add to Cart / Order CTA (Phase 2 read-only preview) */}
      <div style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          disabled={!isSelectedInStock}
          data-testid="add-to-cart-button"
          style={{
            width: '100%',
            padding: '0.85rem 1.5rem',
            backgroundColor: isSelectedInStock ? '#16a36a' : '#cbd5e1',
            color: isSelectedInStock ? '#ffffff' : '#64748b',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: isSelectedInStock ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s ease',
            boxShadow: isSelectedInStock ? '0 2px 4px rgba(22, 163, 106, 0.25)' : 'none',
          }}
        >
          {isSelectedInStock ? 'Add to Cart' : 'Currently Unavailable'}
        </button>
      </div>
    </div>
  );
}
