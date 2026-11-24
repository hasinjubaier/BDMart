'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  publishProductAction,
  returnProductAction,
} from '@/server/actions/moderation.actions';

interface ModerationControlsProps {
  productId: string;
  currentStatus: string;
}

export function ModerationControls({ productId, currentStatus }: ModerationControlsProps) {
  const router = useRouter();
  const [returnReason, setReturnReason] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await publishProductAction(productId);
      if (!res.success) {
        throw new Error(res.errorMessage);
      }
      setSuccessMessage('Listing successfully published to the live marketplace!');
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Publish action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!returnReason || returnReason.trim().length < 3) {
      setErrorMessage('Please provide a specific reason explaining what the seller needs to correct.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await returnProductAction(productId, returnReason.trim());
      if (!res.success) {
        throw new Error(res.errorMessage);
      }
      setSuccessMessage('Listing returned to seller with requested changes.');
      setShowReturnForm(false);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Return action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#153b5b' }}>
        Moderation Actions
      </h3>
      <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
        Current Listing Status:{' '}
        <strong
          data-testid="moderation-current-status"
          style={{ textTransform: 'uppercase', color: currentStatus === 'active' ? '#166534' : '#92400e' }}
        >
          {currentStatus}
        </strong>
      </p>

      {errorMessage && (
        <div
          data-testid="moderation-error"
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#991b1b',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          data-testid="moderation-success"
          style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#166534',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 700,
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {/* Main Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={isSubmitting || currentStatus === 'active'}
          onClick={handlePublish}
          data-testid="publish-listing-btn"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentStatus === 'active' ? '#94a3b8' : '#16a36a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: currentStatus === 'active' || isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: currentStatus === 'active' ? 'none' : '0 2px 4px rgba(22, 163, 106, 0.25)',
          }}
        >
          {isSubmitting ? 'Processing...' : currentStatus === 'active' ? '✓ Already Published' : 'Publish Listing'}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShowReturnForm(!showReturnForm)}
          data-testid="toggle-return-btn"
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#ffffff',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {showReturnForm ? 'Cancel Return' : 'Return for Revisions'}
        </button>
      </div>

      {/* Return Reason Drawer Form */}
      {showReturnForm && (
        <div
          data-testid="return-form-container"
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
          }}
        >
          <label
            htmlFor="return-reason-input"
            style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.35rem' }}
          >
            Reason for Returning Listing to Seller *
          </label>
          <textarea
            id="return-reason-input"
            data-testid="return-reason-textarea"
            rows={3}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="e.g. Please update the title to English and specify accurate fabric weight in the description..."
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #fca5a5',
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
            }}
          />
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleReturn}
            data-testid="confirm-return-btn"
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm & Return Submission'}
          </button>
        </div>
      )}
    </div>
  );
}
