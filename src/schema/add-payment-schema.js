import {
  PAY_METHOD_REFUND_TICKET,
  PAY_METHODS,
} from 'src/constants/payment-methods';
import * as Yup from 'yup';

export const addPaymentSchema = Yup.object().shape({
  paymentAmount: Yup.number().when('paymentMethod', {
    is: (method) => method !== PAY_METHOD_REFUND_TICKET,
    then: (schema) => schema.min(0.1, 'Amount is not valid').required('Amount is required'),
    otherwise: (schema) => schema.notRequired(),
  }),

  paymentMethod: Yup.string()
    .oneOf(PAY_METHODS, 'Invalid payment method')
    .required('Payment method is required'),
  // voucherCode: Yup.string().when('paymentMethod', {
  //   is: PAY_METHOD_VOUCHER,
  //   then: (schema) =>
  //     schema
  //       .required('Voucher code is required')
  //       .min(3, 'Voucher code must be at least 3 characters')
  //       .max(50, 'Voucher code is too long')
  //       .matches(
  //         /^[A-Z0-9-]+$/,
  //         'Voucher code can only contain uppercase letters, numbers, and hyphens'
  //       ),
  //   otherwise: (schema) => schema.notRequired(),
  // }),

  // Refund ticket specific fields
  refundCode: Yup.string().when('paymentMethod', {
    is: PAY_METHOD_REFUND_TICKET,
    then: (schema) =>
      schema
        .required('Refund ticket code is required')
        .min(3, 'Refund ticket code must be at least 3 characters')
        .max(50, 'Refund ticket code is too long'),
    otherwise: (schema) => schema.notRequired(),
  }),
  paymentTransactionId: Yup.string().notRequired(),
  paymentNotes: Yup.string().notRequired(),
});
