-- Cash-on-pickup orders are unpaid until collected.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
