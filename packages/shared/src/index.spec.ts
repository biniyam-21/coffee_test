import { RoleType, OrderStatus, PaymentStatus, StockMovementReason } from './index';

describe('@akufada/shared contracts', () => {
  it('should define RoleType with CUSTOMER, STAFF, and ADMIN', () => {
    expect(RoleType.CUSTOMER).toBe('CUSTOMER');
    expect(RoleType.STAFF).toBe('STAFF');
    expect(RoleType.ADMIN).toBe('ADMIN');
  });

  it('should define standard OrderStatus lifecycle states', () => {
    expect(OrderStatus.PENDING).toBe('PENDING');
    expect(OrderStatus.CONFIRMED).toBe('CONFIRMED');
    expect(OrderStatus.IN_PREPARATION).toBe('IN_PREPARATION');
    expect(OrderStatus.READY_FOR_PICKUP).toBe('READY_FOR_PICKUP');
    expect(OrderStatus.COMPLETED).toBe('COMPLETED');
    expect(OrderStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should define PaymentStatus enum variants', () => {
    expect(PaymentStatus.SUCCESS).toBe('SUCCESS');
    expect(PaymentStatus.DECLINED).toBe('DECLINED');
    expect(PaymentStatus.TIMEOUT).toBe('TIMEOUT');
  });

  it('should define StockMovementReason variants', () => {
    expect(StockMovementReason.ORDER_RESERVATION).toBe('ORDER_RESERVATION');
    expect(StockMovementReason.RESTOCK_PURCHASE).toBe('RESTOCK_PURCHASE');
  });
});
