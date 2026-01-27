import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputAdornment,
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
  PAY_METHOD_REFUND_TICKET,
  PAY_METHOD_VOUCHER,
  PAY_METHODS,
} from 'src/constants/payment-methods';
import { addPaymentSchema } from 'src/schema/add-payment-schema';
import { CurrencyInput } from 'src/components/currency-input/currency-input';
import { formatCurrency } from 'src/utils/format-number';
import { Fragment } from 'react';

export const InvoicePaymentDialog = ({ open, handleClose, data, isLoading, handleConfirm }) => {
  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Add Payment</DialogTitle>
      <Formik
        initialValues={{
          paymentAmount: 0,
          paymentMethod: PAY_METHOD_CASH,
          refundCode: '',
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
          getFieldProps,
          handleChange,
          handleBlur,
        }) => {
          const balanceToReturn = data.invoiceBalanceAmount || 0 - values.paymentAmount;
          console.log(`Balance: ${data.invoiceBalanceAmount} || pay: ${values.paymentAmount}`);

          const isOverpayment = balanceToReturn > 0;

          return (
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 12, lg: 12 }}>
                    <Stack direction="column" spacing={2}>
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

                  {![PAY_METHOD_REFUND_TICKET, PAY_METHOD_VOUCHER].includes(
                    values.paymentMethod
                  ) && (
                    <Fragment>
                      <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                        <TextField
                          label="Amount"
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

                      <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                        <TextField
                          label={isOverpayment ? 'Return Amount' : 'Remaining Balance'}
                          name="balanceAmount"
                          fullWidth
                          disabled
                          autoComplete="off"
                          variant="outlined"
                          // Fix: Use formatted balance
                          value={balanceToReturn}
                          slotProps={{ input: { inputComponent: CurrencyInput } }}
                        />
                      </Grid>
                    </Fragment>
                  )}

                  {values.paymentMethod === PAY_METHOD_VOUCHER && (
                    <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                      <TextField
                        label="Voucher Code"
                        name="voucherCode"
                        fullWidth
                        required
                        autoComplete="off"
                        variant="outlined"
                        value={values.voucherCode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        helperText={touched.voucherCode && errors.voucherCode}
                        error={touched.voucherCode && Boolean(errors.voucherCode)}
                      />
                    </Grid>
                  )}

                  {/* Refund Ticket Field */}
                  {values.paymentMethod === PAY_METHOD_REFUND_TICKET && (
                    <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
                      <TextField
                        label="Refund Ticket Code"
                        name="refundCode"
                        fullWidth
                        required
                        autoComplete="off"
                        variant="outlined"
                        value={values.refundCode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        helperText={touched.refundCode && errors.refundCode}
                        error={touched.refundCode && Boolean(errors.refundCode)}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">RTN</InputAdornment>,
                          },
                        }}
                      />
                    </Grid>
                  )}

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
