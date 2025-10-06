import * as Yup from 'yup';

import { STOCK_IN, STOCK_OUT } from 'src/constants/stock-movement-types';

export const StockUpdateSchema = Yup.object().shape({
  stockMovementType: Yup.string()
    .oneOf([STOCK_IN, STOCK_OUT], 'Invalid movement type')
    .required('Movement type is required'),
  stockQuantity: Yup.number()
    .min(0, 'Quantity cannot be negative')
    .required('Quantity is required'),
  stockNotes: Yup.string().nullable().notRequired(),
});
