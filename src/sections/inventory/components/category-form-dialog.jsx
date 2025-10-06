import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Formik } from 'formik';
import { CategorySchema } from 'src/schema/category-schema';

export const CategoryFormDialog = ({
  open,
  initlaValues,
  isLoading,
  handleOpenClose,
  handleConfirm,
}) => {
  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="lg"
    >
      <DialogTitle id="alert-dialog-title">Add/Edit Category Info</DialogTitle>

      <Formik
        initialValues={initlaValues}
        validationSchema={CategorySchema}
        onSubmit={(values,{ resetForm }) => {
          handleConfirm(values);
          resetForm()
        }}
      >
        {({ errors, touched, resetForm, handleSubmit, getFieldProps }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ minWidth: '100%' }}>
              <Grid container spacing={2} sx={{ mt: 1, minWidth: '100%' }}>
                <Grid size={12}>
                  <TextField
                    label="Category Title"
                    name="categoryTitle"
                    required
                    fullWidth
                    autoComplete="off"
                    variant="outlined"
                    {...getFieldProps('categoryTitle')}
                    error={touched.categoryTitle && Boolean(errors.categoryTitle)}
                    helperText={touched.categoryTitle && errors.categoryTitle}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  handleOpenClose();
                  resetForm();
                }}
                disabled={isLoading}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button variant="contained" type="submit" disabled={isLoading} autoFocus>
                Confirm
              </Button>
            </DialogActions>
          </form>
        )}
      </Formik>
    </Dialog>
  );
};
