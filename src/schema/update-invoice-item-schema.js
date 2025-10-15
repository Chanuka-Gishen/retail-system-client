import * as Yup from 'yup';

export const UpdateInvoiceItemSchema = Yup.object().shape({
  quantity: Yup.number().min(1, 'Invalid quantity amount').required('Quantity is required'),
});
