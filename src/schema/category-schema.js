import * as Yup from 'yup';

export const CategorySchema = Yup.object().shape({
  categoryTitle: Yup.string().required('Category title is required'),
});
