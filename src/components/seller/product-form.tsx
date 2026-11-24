'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProductDraftAction,
  updateProductDraftAction,
  submitProductForModerationAction,
} from '@/server/actions/seller.actions';

interface CategoryOption {
  id: string;
  name: string;
}

interface VariantInput {
  sku: string;
  color: string;
  size: string;
  stock: number;
  priceBdt: number;
}

interface TierInput {
  minQty: number;
  unitPriceBdt: number;
}

interface InitialProductData {
  id?: string;
  title?: string;
  description?: string;
  categoryId?: string;
  basePriceBdt?: number;
  moq?: number;
  isB2bEnabled?: boolean;
  images?: string[];
  variants?: Array<{
    sku: string;
    attributes: Record<string, unknown>;
    stock: number;
    price: number; // in poisha
  }>;
  tiers?: Array<{
    minQty: number;
    unitPrice: number; // in poisha
  }>;
  moderationReason?: string | null;
}

interface ProductFormProps {
  categories: CategoryOption[];
  initialData?: InitialProductData;
  isEdit?: boolean;
}

export function ProductForm({ categories, initialData, isEdit = false }: ProductFormProps) {
  const router = useRouter();

  // Form State with Form-Error Recovery Preservation
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [basePriceBdt, setBasePriceBdt] = useState(
    initialData?.basePriceBdt !== undefined
      ? String(initialData.basePriceBdt)
      : initialData?.variants?.[0]?.price
      ? String(initialData.variants[0].price / 100)
      : '350'
  );
  const [imageUrl, setImageUrl] = useState(initialData?.images?.[0] || '/products/jute-bag-natural.webp');
  const [isB2bEnabled, setIsB2bEnabled] = useState(initialData?.isB2bEnabled || false);
  const [moq, setMoq] = useState(String(initialData?.moq || 1));

  // Variants State
  const initialVariants: VariantInput[] =
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants.map((v) => ({
          sku: v.sku,
          color: String((v.attributes as Record<string, unknown>)?.color || 'Standard'),
          size: String((v.attributes as Record<string, unknown>)?.size || 'Default'),
          stock: v.stock,
          priceBdt: v.price / 100,
        }))
      : [
          {
            sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            color: 'Natural',
            size: 'Regular',
            stock: 50,
            priceBdt: 350,
          },
        ];

  const [variants, setVariants] = useState<VariantInput[]>(initialVariants);

  // Wholesale Tiers State
  const initialTiers: TierInput[] =
    initialData?.tiers && initialData.tiers.length > 0
      ? initialData.tiers.map((t) => ({
          minQty: t.minQty,
          unitPriceBdt: t.unitPrice / 100,
        }))
      : [
          { minQty: 50, unitPriceBdt: 280 },
          { minQty: 100, unitPriceBdt: 220 },
        ];

  const [tiers, setTiers] = useState<TierInput[]>(initialTiers);

  // Status & Error messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant operations
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        color: 'Alternate',
        size: 'Medium',
        stock: 20,
        priceBdt: parseFloat(basePriceBdt) || 350,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      setErrorMessage('A product must contain at least one variant.');
      return;
    }
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const updateVariant = (index: number, field: keyof VariantInput, value: string | number) => {
    const updated = [...variants];
    const current = updated[index];
    if (current) {
      (current as unknown as Record<string, unknown>)[field] = value;
      setVariants(updated);
    }
  };

  // Tier operations
  const addTier = () => {
    setTiers([...tiers, { minQty: 200, unitPriceBdt: Math.max(10, (parseFloat(basePriceBdt) || 350) * 0.7) }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, idx) => idx !== index));
  };

  const updateTier = (index: number, field: keyof TierInput, value: number) => {
    const updated = [...tiers];
    const current = updated[index];
    if (current) {
      current[field] = value;
      setTiers(updated);
    }
  };

  // Form submission
  const handleSubmit = async (submitForModeration: boolean) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const parsedBasePriceBdt = parseFloat(basePriceBdt);
      if (isNaN(parsedBasePriceBdt) || parsedBasePriceBdt <= 0) {
        throw new Error('Base price must be a positive number in BDT.');
      }

      const parsedMoq = parseInt(moq, 10);
      if (isNaN(parsedMoq) || parsedMoq < 1) {
        throw new Error('MOQ must be at least 1.');
      }

      if (!imageUrl || imageUrl.trim().length === 0) {
        throw new Error('At least one product image is required.');
      }

      // Format payload in integer poisha
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        basePrice: Math.round(parsedBasePriceBdt * 100),
        moq: parsedMoq,
        isB2bEnabled,
        images: [imageUrl.trim()],
        variants: variants.map((v) => ({
          sku: v.sku.trim(),
          attributes: { color: v.color.trim(), size: v.size.trim() },
          stock: Number(v.stock),
          price: Math.round(Number(v.priceBdt) * 100),
        })),
        tiers: isB2bEnabled
          ? tiers.map((t) => ({
              minQty: Number(t.minQty),
              unitPrice: Math.round(Number(t.unitPriceBdt) * 100),
            }))
          : undefined,
      };

      let productId = initialData?.id;

      if (isEdit && productId) {
        const updateRes = await updateProductDraftAction(productId, payload);
        if (!updateRes.success) {
          throw new Error(updateRes.errorMessage);
        }
      } else {
        const createRes = await createProductDraftAction(payload);
        if (!createRes.success) {
          throw new Error(createRes.errorMessage);
        }
        productId = createRes.data.productId;
      }

      // If user requested immediate submission for moderation
      if (submitForModeration && productId) {
        const submitRes = await submitProductForModerationAction(productId);
        if (!submitRes.success) {
          throw new Error(`Draft saved, but moderation submission failed: ${submitRes.errorMessage}`);
        }
        setSuccessMessage('Listing successfully submitted for admin moderation!');
      } else {
        setSuccessMessage(isEdit ? 'Listing draft updated!' : 'Listing draft created!');
      }

      router.push('/seller/products');
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      {/* Moderation Rejection Reason Banner (if returned) */}
      {initialData?.moderationReason && (
        <div
          data-testid="seller-moderation-reason-banner"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: 700, fontSize: '0.95rem' }}>
            <span>⚠️ Action Required:</span>
            <span>Listing Returned by Platform Moderator</span>
          </div>
          <p style={{ margin: '0.5rem 0 0 0', color: '#b91c1c', fontSize: '0.875rem', lineHeight: 1.5 }}>
            <strong>Reason:</strong> {initialData.moderationReason}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#7f1d1d', fontSize: '0.8rem' }}>
            Please make the requested corrections below and click &ldquo;Resubmit for Moderation&rdquo;.
          </p>
        </div>
      )}

      {errorMessage && (
        <div
          data-testid="product-form-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            color: '#991b1b',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            fontWeight: 500,
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          data-testid="product-form-success"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            color: '#166534',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(false);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        {/* Title */}
        <div>
          <label htmlFor="product-title" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.35rem' }}>
            Product Title (English) *
          </label>
          <input
            id="product-title"
            data-testid="product-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Handcrafted Golden Jute Tote Bag"
            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
        </div>

        {/* Category & Base Retail Price */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="product-category" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.35rem' }}>
              Category *
            </label>
            <select
              id="product-category"
              data-testid="product-category-select"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="product-base-price" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.35rem' }}>
              Retail Base Price (BDT) *
            </label>
            <input
              id="product-base-price"
              data-testid="product-price-input"
              type="number"
              required
              min="1"
              step="any"
              value={basePriceBdt}
              onChange={(e) => setBasePriceBdt(e.target.value)}
              placeholder="e.g. 350"
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="product-description" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.35rem' }}>
            Product Description (English) *
          </label>
          <textarea
            id="product-description"
            data-testid="product-description-input"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of craftsmanship, materials, dimensions, and usage..."
            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        {/* Primary Image URL */}
        <div>
          <label htmlFor="product-image" style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.35rem' }}>
            Product Image Storage Path or URL *
          </label>
          <input
            id="product-image"
            data-testid="product-image-input"
            type="text"
            required
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/products/jute-bag-natural.webp"
            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
        </div>

        {/* Variants Section */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#153b5b' }}>
                Product Variants & Stock
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Each sellable SKU has individual inventory tracking and pricing
              </p>
            </div>
            <button
              type="button"
              onClick={addVariant}
              data-testid="add-variant-btn"
              style={{ padding: '0.35rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              + Add Variant
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {variants.map((v, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto',
                  gap: '0.5rem',
                  alignItems: 'end',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.75rem',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid={`variant-sku-input-${idx}`}
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    Color
                  </label>
                  <input
                    type="text"
                    value={v.color}
                    onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    Size
                  </label>
                  <input
                    type="text"
                    value={v.size}
                    onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    Stock (Units) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    data-testid={`variant-stock-input-${idx}`}
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, 'stock', parseInt(e.target.value, 10) || 0)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    Price (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    data-testid={`variant-price-input-${idx}`}
                    value={v.priceBdt}
                    onChange={(e) => updateVariant(idx, 'priceBdt', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    aria-label={`Remove variant ${v.sku}`}
                    style={{ padding: '0.45rem 0.65rem', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* B2B Wholesale Section */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#153b5b', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isB2bEnabled}
              onChange={(e) => setIsB2bEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#153b5b' }}
            />
            <span>Enable B2B Wholesale Volume Pricing</span>
          </label>

          {isB2bEnabled && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <div style={{ marginBottom: '1rem', maxWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                  Minimum Order Quantity (MOQ)
                </label>
                <input
                  type="number"
                  min="1"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
                  Wholesale Price Tiers Ladder
                </span>
                <button
                  type="button"
                  onClick={addTier}
                  style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ffffff', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#166534', cursor: 'pointer' }}
                >
                  + Add Tier
                </button>
              </div>

              {tiers.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#166534' }}>Min Qty:</span>
                  <input
                    type="number"
                    min="2"
                    value={t.minQty}
                    onChange={(e) => updateTier(idx, 'minQty', parseInt(e.target.value, 10) || 2)}
                    style={{ width: '100px', padding: '0.35rem', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#166534' }}>Unit Price (BDT):</span>
                  <input
                    type="number"
                    min="1"
                    value={t.unitPriceBdt}
                    onChange={(e) => updateTier(idx, 'unitPriceBdt', parseFloat(e.target.value) || 1)}
                    style={{ width: '120px', padding: '0.35rem', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.8rem' }}
                  />
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            data-testid="save-draft-btn"
            style={{
              flex: '1 1 180px',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f1f5f9',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Draft' : 'Save as Draft'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            data-testid="submit-moderation-btn"
            style={{
              flex: '2 1 240px',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#16a36a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(22, 163, 106, 0.25)',
            }}
          >
            {isSubmitting ? 'Submitting...' : isEdit ? 'Save & Resubmit for Moderation' : 'Save & Submit for Moderation'}
          </button>
        </div>
      </form>
    </div>
  );
}
