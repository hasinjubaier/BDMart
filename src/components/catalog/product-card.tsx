import Link from 'next/link';
import { formatBDT } from '@/lib/formatters';
import { SafeImage } from '@/components/ui/safe-image';
import type { CatalogProductItem } from '@/server/services/catalog.service';

interface ProductCardProps {
  product: CatalogProductItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const isInStock = product.totalStock > 0;

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Product Image Container */}
      <Link
        href={`/products/${product.slug}`}
        style={{
          display: 'block',
          position: 'relative',
          paddingTop: '65%', // 16:10 aspect ratio
          backgroundColor: '#f1f5f9',
          overflow: 'hidden',
          textDecoration: 'none',
        }}
        tabIndex={-1}
        aria-hidden="true"
      >
        <SafeImage
          src={product.primaryImage}
          alt={product.title}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {/* Availability Pill */}
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: isInStock ? '#dcfce7' : '#fee2e2',
            color: isInStock ? '#166534' : '#991b1b',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {isInStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </Link>

      {/* Product Details */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.04em',
            }}
          >
            {product.categoryName}
          </span>

          {product.isB2bEnabled && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#153b5b',
                backgroundColor: '#e0f2fe',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
              }}
            >
              MOQ: {product.moq}
            </span>
          )}
        </div>

        <h3
          style={{
            margin: '0',
            fontSize: '1rem',
            fontWeight: 700,
            lineHeight: 1.35,
          }}
        >
          <Link
            href={`/products/${product.slug}`}
            style={{
              color: '#0f172a',
              textDecoration: 'none',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.title}
          </Link>
        </h3>

        {/* Seller Info */}
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
          Sold by{' '}
          <Link
            href={`/sellers/${product.sellerId}`}
            style={{ color: '#153b5b', fontWeight: 600, textDecoration: 'none' }}
          >
            {product.sellerShopName}
          </Link>
        </p>

        {/* Price & SKU */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#16a36a',
              }}
            >
              {formatBDT(product.basePrice)}
            </span>
          </div>

          {product.skus.length > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
              }}
            >
              {product.skus[0]}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
