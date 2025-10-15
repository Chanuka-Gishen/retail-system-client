import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Formik } from 'formik';
import { UpdateInvoiceItemSchema } from 'src/schema/update-invoice-item-schema';

export const UpdateInvoiceItemDialog = ({
  open,
  data,
  isLoading,
  handleOpenClose,
  handleConfirm,
}) => {
  const initialValues = { quantity: data.quantity };
  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Update Invoice Item</DialogTitle>

      <Formik
        initialValues={initialValues}
        validationSchema={UpdateInvoiceItemSchema}
        onSubmit={(values) => {
          handleConfirm(data._id, values.quantity);
        }}
        enableReinitialize
      >
        {({ errors, touched, resetForm, handleSubmit, getFieldProps }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }} alignItems='center'>
                <Grid size={6}>
                  <Typography>{data.item.itemName}</Typography>
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="Item Quantity"
                    name="quantity"
                    fullWidth
                    required
                    type="number"
                    autoComplete="off"
                    variant="outlined"
                    {...getFieldProps('quantity')}
                    error={touched.quantity && Boolean(errors.quantity)}
                    helperText={touched.quantity && errors.quantity}
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
