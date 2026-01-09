import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid2';

import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';

import { FieldArray, Formik } from 'formik';
import { REFUND_REASONS } from 'src/constants/invoice-constants';
import { itemReturnSchema } from 'src/schema/item-return-schema';

export const InvoiceReturnDialog = ({
  open,
  initialValues,
  isLoading,
  handleOpenClose,
  handleConfirm,
}) => {
  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Issue Return</DialogTitle>

      <Formik
        initialValues={initialValues}
        validationSchema={itemReturnSchema}
        onSubmit={(values) => {
          handleConfirm(values);
        }}
        enableReinitialize
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
              <FieldArray name="returnItems">
                {({ push, remove }) => (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {values.returnItems.map((item, index) => (
                      <Grid key={index} container spacing={2} alignItems="center">
                        <Grid size={12}>
                          <Divider textAlign="left">
                            {values.returnItems[index].returnItemName}
                          </Divider>
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                          <TextField
                            label="Qty"
                            name={`returnItems[${index}].returnQuantity`}
                            type="number"
                            fullWidth
                            required
                            autoComplete="off"
                            variant="outlined"
                            {...getFieldProps(`returnItems[${index}].returnQuantity`)}
                            error={
                              touched?.returnItems?.[index]?.returnQuantity &&
                              Boolean(errors?.returnItems?.[index]?.returnQuantity)
                            }
                            helperText={
                              touched?.returnItems &&
                              touched?.returnItems?.[index] &&
                              touched?.returnItems?.[index]?.returnQuantity &&
                              errors?.returnItems &&
                              errors?.returnItems?.[index] &&
                              errors?.returnItems?.[index]?.returnQuantity
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <FormControl fullWidth required>
                            <InputLabel id="select-label">Reason</InputLabel>
                            <Select
                              labelId="select-label"
                              id="simple-select"
                              label="Reason"
                              name={`returnItems[${index}].returnReason`}
                              required
                              fullWidth
                              value={values.returnItems[index].returnReason || ''}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            >
                              {REFUND_REASONS.map((item, index) => (
                                <MenuItem key={index} value={item}>
                                  {item}
                                </MenuItem>
                              ))}
                            </Select>
                            <FormHelperText
                              error={
                                touched?.returnItems?.[index]?.returnReason &&
                                errors?.returnItems?.[index]?.returnReason
                              }
                            >
                              {touched?.returnItems &&
                                touched?.returnItems?.[index] &&
                                touched?.returnItems?.[index]?.returnReason &&
                                errors?.returnItems &&
                                errors?.returnItems?.[index] &&
                                errors?.returnItems?.[index]?.returnReason}
                            </FormHelperText>
                          </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 1 }}>
                          <IconButton onClick={() => remove(index)}>
                            <RemoveCircleIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                  </Box>
                )}
              </FieldArray>
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
