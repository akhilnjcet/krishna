import api from './api';

/**
 * Robust Client-Side Cashfree Payment Verification & Status Polling Service
 * 
 * Rules:
 * 1. NEVER treat Cashfree order status "ACTIVE" as a terminal payment failure.
 * 2. Poll the server-side verification endpoint across multiple intervals.
 * 3. Distinguish terminal SUCCESS, genuine PENDING, and terminal FAILED.
 * 4. Idempotently update application state upon confirmation.
 */

export const verifyAndPollCashfreePayment = async (orderId, options = {}) => {
  const {
    maxAttempts = 6,
    intervalMs = 2500,
    onAttempt = null
  } = options;

  if (!orderId) {
    return {
      success: false,
      verified: false,
      isPending: false,
      orderStatus: 'INVALID_ORDER',
      message: 'No Order ID provided for verification.'
    };
  }

  let attempt = 0;
  let lastResponse = null;

  while (attempt < maxAttempts) {
    attempt++;
    if (onAttempt) {
      onAttempt({
        attempt,
        maxAttempts,
        isChecking: true,
        statusText: `Verifying payment with bank & gateway (${attempt}/${maxAttempts})...`
      });
    }

    try {
      const res = await api.post('/payments/cashfree/verify', { orderId });
      lastResponse = res.data;

      // 1. Confirmed Success
      if (lastResponse && (lastResponse.success || lastResponse.verified)) {
        return {
          success: true,
          verified: true,
          isPending: false,
          status: lastResponse.status || 'PAID',
          amount: lastResponse.verifiedAmount || lastResponse.payment?.amount || 0,
          cfPaymentId: lastResponse.cfPaymentId,
          bankReference: lastResponse.bankReference,
          remainingBalance: lastResponse.remainingBalance,
          receiptNumber: lastResponse.receiptNumber,
          payment: lastResponse.payment,
          message: lastResponse.message || 'Payment successfully verified and credited.'
        };
      }

      // 2. Confirmed Terminal Failure (expired, bank decline, user cancel)
      if (
        lastResponse &&
        !lastResponse.isPending &&
        ['FAILED', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'USER_DROPPED'].includes(
          (lastResponse.orderStatus || '').toUpperCase()
        )
      ) {
        return {
          success: false,
          verified: false,
          isPending: false,
          orderStatus: lastResponse.orderStatus || 'FAILED',
          message: lastResponse.message || 'Payment attempt was cancelled or failed at bank.'
        };
      }

      // 3. Still Pending / Active: pause and poll again if attempts remain
      if (attempt < maxAttempts) {
        if (onAttempt) {
          onAttempt({
            attempt,
            maxAttempts,
            isChecking: false,
            isPending: true,
            statusText: `Payment awaiting bank confirmation. Checking again in a few moments... (${attempt}/${maxAttempts})`
          });
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    } catch (err) {
      console.warn(`[PaymentVerifier] Verification attempt ${attempt} notice:`, err.message);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } else {
        lastResponse = {
          success: false,
          verified: false,
          isPending: true,
          orderStatus: 'PENDING',
          message: 'Network verification timed out. Your payment is being verified in the background.'
        };
      }
    }
  }

  // If order is still pending after all polling attempts
  return {
    success: false,
    verified: false,
    isPending: true,
    orderStatus: lastResponse?.orderStatus || 'PENDING',
    message:
      lastResponse?.message ||
      'Payment is currently being processed by your bank/UPI. Please do not pay again. Your balance will update automatically upon final confirmation.',
    ...lastResponse
  };
};

export default {
  verifyAndPollCashfreePayment
};
