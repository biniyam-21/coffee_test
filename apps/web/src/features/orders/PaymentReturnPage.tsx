import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react';
import { apiRequest } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';

type Verification = { txRef: string; paymentStatus: string; orderStatus: string; changed: boolean };

export const PaymentReturnPage: React.FC = () => {
  const [params] = useSearchParams();
  const txRef = params.get('tx_ref') || '';
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txRef) {
      setError('The payment return did not include a transaction reference. Check your order history for the latest status.');
      return;
    }
    const controller = new AbortController();
    void apiRequest<Verification>(`/payments/chapa/verify?tx_ref=${encodeURIComponent(txRef)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setResult(res);
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const isAbort =
          reason instanceof Error && (reason.name === 'AbortError' || reason.message.toLowerCase().includes('aborted'));
        if (!isAbort) {
          setError(reason instanceof Error ? reason.message : 'Payment status could not be verified.');
        }
      });
    return () => controller.abort();
  }, [txRef]);

  const isSuccess = result?.paymentStatus === 'SUCCESS';
  const isPending = result?.paymentStatus === 'PENDING';

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      {result ? (isSuccess ? <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-600" /> : <CircleAlert className="mb-4 h-12 w-12 text-amber-600" />) : !error ? <LoaderCircle className="mb-4 h-10 w-10 animate-spin text-[#7138E8]" /> : <CircleAlert className="mb-4 h-12 w-12 text-rose-600" />}
      <h1 className="text-2xl font-bold text-[#211D2B]">
        {error ? 'Could not verify payment' : !result ? 'Checking payment' : isSuccess ? 'Payment confirmed' : isPending ? 'Payment is still pending' : 'Payment was not completed'}
      </h1>
      <p className="mt-2 max-w-md text-sm text-[#777183]">
        {error || (isSuccess ? 'Chapa confirmed your payment. Your order has been sent to the kitchen.' : isPending ? 'We have not received a final confirmation yet. Your order status will update after Chapa confirms it.' : 'The order was not confirmed as paid. Check your order history or contact the shop if you completed checkout.')}
      </p>
      {result?.txRef && <p className="mt-3 break-all text-xs text-[#777183]">Reference: {result.txRef}</p>}
      <Link to="/orders" className="mt-6"><Button variant="primary">View my orders</Button></Link>
    </section>
  );
};
