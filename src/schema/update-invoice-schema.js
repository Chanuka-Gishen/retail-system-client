import { INV_CUS_TYP_REGISTERED, INV_CUSTOMER_TYPES } from 'src/constants/invoiceConstants';
import * as Yup from 'yup';

export const UpdateInvoiceSchema = Yup.object({
  invoiceCustomerType: Yup.string()
    .required('Invoice customer type is required')
    .oneOf(
      INV_CUSTOMER_TYPES,
      `Invoice customer type must be one of: ${INV_CUSTOMER_TYPES.join(', ')}`
    ),

  invoiceCustomer: Yup.string()

    .when('invoiceCustomerType', (invoiceCustomerType, schema) => {
      return invoiceCustomerType === INV_CUS_TYP_REGISTERED
        ? schema
            .required('Customer ID is required for registered customers')
            .matches(/^[0-9a-fA-F]{24}$/, 'Customer id must be a valid MongoDB ObjectId')
        : schema.nullable().default(null);
    }),

  invoiceDiscountPercentage: Yup.number()
    .typeError('Discount percentage must be a number')
    .min(0, 'Discount percentage cannot be negative')
    .max(100, 'Discount percentage cannot exceed 100%')
    .required('Discount percentage is required')
    .default(0)
    .test('decimal-places', 'Discount percentage can have up to 2 decimal places', (value) => {
      if (value === undefined || value === null) return true;
      const decimalPart = value.toString().split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    }),

  invoiceDiscountCash: Yup.number()
    .typeError('Discount cash must be a number')
    .min(0, 'Discount cash cannot be negative')
    .required('Discount cash is required')
    .default(0)
    .test('decimal-places', 'Discount cash can have up to 2 decimal places', (value) => {
      if (value === undefined || value === null) return true;
      const decimalPart = value.toString().split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    }),
});
