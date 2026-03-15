export const STATUS_OPTIONS = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' }
];

export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return value;
  }

  return amount.toFixed(2);
};

export const getStatusLabel = (status) => {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status || 'Unknown';
};

export const getDisplayCustomerName = (order) => {
  if (!order) {
    return 'Customer';
  }

  return (
    order.customer?.name ??
    order.customer?.displayName ??
    order.customerName ??
    order.customerNameDisplay ??
    'Customer'
  );
};
