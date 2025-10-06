import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Formik } from 'formik';
import { STOCK_IN, STOCK_OUT } from 'src/constants/stock-movement-types';
import { StockUpdateSchema } from 'src/schema/stock-update-schema';

export const UpdateStockDialog = ({ open, isLoading, handleOpenClose, handleConfirm }) => {
  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Update Inventory Item Stocks</DialogTitle>

      <Formik
        initialValues={{
          stockMovementType: STOCK_IN,
          stockQuantity: 0,
          stockNotes: '',
        }}
        validationSchema={StockUpdateSchema}
        onSubmit={(values) => {
          handleConfirm(values);
        }}
      >
        {({
          values,
          errors,
          touched,
          resetForm,
          handleSubmit,
          getFieldProps,
          handleChange,
          handleBlur,
        }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 12, lg: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel id="select-label">Movement Type</InputLabel>
                    <Select
                      labelId="select-label"
                      id="simple-select"
                      label="Movement Type"
                      name="stockMovementType"
                      required
                      value={values.stockMovementType || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <MenuItem value={STOCK_IN}>{STOCK_IN}</MenuItem>
                      <MenuItem value={STOCK_OUT}>{STOCK_OUT}</MenuItem>
                    </Select>
                    <FormHelperText error={touched.stockMovementType && errors.stockMovementType}>
                      {touched.stockMovementType && errors.stockMovementType}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                  <TextField
                    label="Stock Quantity"
                    name="stockQuantity"
                    fullWidth
                    required
                    type="number"
                    autoComplete="off"
                    variant="outlined"
                    {...getFieldProps('stockQuantity')}
                    error={touched.stockQuantity && Boolean(errors.stockQuantity)}
                    helperText={touched.stockQuantity && errors.stockQuantity}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 12, lg: 12 }}>
                  <TextField
                    label="Notes"
                    name="stockNotes"
                    fullWidth
                    multiline
                    rows={2}
                    autoComplete="off"
                    variant="outlined"
                    {...getFieldProps('stockNotes')}
                    error={touched.stockNotes && Boolean(errors.stockNotes)}
                    helperText={touched.stockNotes && errors.stockNotes}
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
