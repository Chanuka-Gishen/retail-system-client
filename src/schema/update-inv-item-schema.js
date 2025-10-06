import * as Yup from 'yup';

export const UpdateInventoryItemSchema = Yup.object().shape({
  itemCode: Yup.string().required('Item code is required'),
  itemName: Yup.string().required('Item name is required'),
  itemCategory: Yup.string().required('Category is required'),
  itemDescription: Yup.string().nullable().notRequired(),
  itemUnit: Yup.string().default('Pieces'),
  itemBuyingPrice: Yup.number()
    .min(1, 'Buying price cannot be negative/zero')
    .required('Buying price is required'),
  itemSellingPrice: Yup.number()
    .min(1, 'Selling price cannot be negative/zero')
    .required('Selling price is required')
    .test('is-greater', 'Selling price must be greater than buying price', function (value) {
      return value >= this.parent.itemBuyingPrice;
    }),
  itemWholesalePrice: Yup.number()
    .min(1, 'Wholesale price cannot be negative/zero')
    .required('Wholesale price is required')
    .test('is-greater', 'Wholesale price must be greater than buying price', function (value) {
      return value >= this.parent.itemBuyingPrice;
    }),
  itemWholesaleThreshold: Yup.number()
    .min(0, 'Wholesale threshold cannot be negative')
    .required('Wholesale threshold is required'),
  itemSupplier: Yup.string().nullable().notRequired(),
  itemThreshold: Yup.number()
    .min(0, 'Threshold cannot be negative')
    .required('Threshold is required'),
});
