import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Formik } from 'formik';
import Grid from '@mui/material/Grid2';

import {
  PAY_METHOD_BACK_TRN,
  PAY_METHOD_CARD,
  PAY_METHOD_CASH,
  PAY_METHODS,
} from 'src/constants/payment-methods';
import { addPaymentSchema } from 'src/schema/add-payment-schema';
import { CurrencyInput } from 'src/components/currency-input/currency-input';
import { formatCurrency } from 'src/utils/format-number';
import { useEffect, useState } from 'react';

export const InvoicePaymentDialog = ({ open, handleClose, data, isLoading, handleConfirm }) => {
  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Add Invoice Payment</DialogTitle>
      <Formik
        initialValues={{
          paymentAmount: 0,
          paymentMethod: PAY_METHOD_CASH,
          paymentTransactionId: '',
          paymentNotes: '',
        }}
        validationSchema={addPaymentSchema}
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
          setFieldValue,
          getFieldProps,
          handleChange,
          handleBlur,
        }) => {
          const [amountReceived, setAmountReceived] = useState(0);

          const handleReceivedAmountChange = (e) => {
            setAmountReceived(e.target.value);
          };

          const amount = amountReceived || 0;
          const paymentAmount = Math.min(amount, data.invoiceBalanceAmount);
          const balanceToReturn = Math.max(0, amount - data.invoiceBalanceAmount);

          useEffect(() => {
            setFieldValue('paymentAmount', paymentAmount);
          }, [amountReceived]);
          return (
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid size={{ xs: 12, sm: 12, lg: 12 }}>
                    <Stack direction="column" spacing={2}>
                      <Divider> Payment Status </Divider>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="subtitle1">Total Amount :</Typography>
                        <Typography>{formatCurrency(data.invoiceSubTotal)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="subtitle1">Balance Amount :</Typography>
                        <Typography>{formatCurrency(data.invoiceBalanceAmount)}</Typography>
                      </Stack>
                      <Divider> New Payment </Divider>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                    <TextField
                      label="Amount Received"
                      id="amount-received"
                      name="amountReceived"
                      fullWidth
                      required
                      autoComplete="off"
                      variant="outlined"
                      value={amountReceived}
                      onChange={handleReceivedAmountChange}
                      slotProps={{ input: { inputComponent: CurrencyInput } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                    <TextField
                      label="Balance Amount"
                      name="balanceAmount"
                      fullWidth
                      disabled
                      autoComplete="off"
                      variant="outlined"
                      value={balanceToReturn || ''}
                      slotProps={{ input: { inputComponent: CurrencyInput } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                    <TextField
                      label="Payment Amount"
                      name="paymentAmount"
                      fullWidth
                      required
                      autoComplete="off"
                      variant="outlined"
                      {...getFieldProps('paymentAmount')}
                      error={touched.paymentAmount && Boolean(errors.paymentAmount)}
                      helperText={touched.paymentAmount && errors.paymentAmount}
                      slotProps={{ input: { inputComponent: CurrencyInput } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, lg: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel id="select-label">Method</InputLabel>
                      <Select
                        labelId="select-label"
                        id="simple-select"
                        label="Method"
                        name="paymentMethod"
                        required
                        value={values.paymentMethod || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      >
                        {PAY_METHODS.map((item, index) => (
                          <MenuItem key={index} value={item}>
                            {item}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {touched.paymentMethod && errors.paymentMethod}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  {[PAY_METHOD_BACK_TRN, PAY_METHOD_CARD].includes(values.paymentMethod) && (
                    <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                      <TextField
                        label="Transaction ID"
                        name="paymentTransactionId"
                        fullWidth
                        autoComplete="off"
                        variant="outlined"
                        {...getFieldProps('paymentTransactionId')}
                      />
                    </Grid>
                  )}

                  <Grid size={{ sm: 12, xs: 12, lg: 12 }}>
                    <TextField
                      label="Extra Notes"
                      name="paymentNotes"
                      fullWidth
                      autoComplete="off"
                      variant="outlined"
                      {...getFieldProps('paymentNotes')}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    handleClose();
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
          );
        }}
      </Formik>
    </Dialog>
  );
};
