import * as Yup from 'yup';
import { REFUND_REASONS } from 'src/constants/invoice-constants';

const invoiceItemReturnSchema = Yup.object({
  returnInvoiceItem: Yup.string()
    .required('Item ID is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid item ID format'),

  returnQuantity: Yup.number()
    .typeError('Return quantity must be a number')
    .required('Return quantity is required')
    .positive('Return quantity must be positive')
    .min(1, 'Return quantity must be at least 1')
    .integer('Return quantity must be an integer'),
  returnReason: Yup.string()
    .required('Return reason is required')
    .oneOf(REFUND_REASONS, `Return reason must be one of: ${REFUND_REASONS.join(', ')}`),
});

export const itemReturnSchema = Yup.object().shape({
  returnItems: Yup.array()
    .of(invoiceItemReturnSchema)
    .min(1, 'At least one return item is required')
    .max(10, 'Cannot process more than 10 return items at once'),
});
