import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import SearchIcon from '@mui/icons-material/Search';

import { Formik } from 'formik';
import { useState } from 'react';
import { CurrencyInput } from 'src/components/currency-input/currency-input';
import { INV_CUS_TYP_REGISTERED, INV_CUSTOMER_TYPES } from 'src/constants/invoiceConstants';
import { UpdateInvoiceSchema } from 'src/schema/update-invoice-schema';

export const UpdateInvoiceDialog = ({
  open,
  data,
  customerOptions,
  isLoading,
  isLoadingCustomerOptions,
  handleOpenClose,
  handleConfirm,
}) => {
  const initialValues = {
    invoiceCustomerType: data.invoiceCustomerType,
    invoiceCustomer: data.invoiceCustomer ? data.invoiceCustomer._id : null,
    invoiceDiscountPercentage: data.invoiceDiscountPercentage,
    invoiceDiscountCash: data.invoiceDiscountCash,
  };

  console.log(customerOptions);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customerOptions.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerMobile.includes(searchTerm)
  );

  return (
    <Dialog
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Update Invoice Info</DialogTitle>

      <Formik
        initialValues={initialValues}
        validationSchema={UpdateInvoiceSchema}
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
        }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel id="select-label">Customer Type</InputLabel>
                    <Select
                      labelId="select-label"
                      id="simple-select"
                      label="Customer Type"
                      name="invoiceCustomerType"
                      required
                      value={values.invoiceCustomerType || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      {INV_CUSTOMER_TYPES.map((item, index) => (
                        <MenuItem key={index} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText
                      error={touched.invoiceCustomerType && errors.invoiceCustomerType}
                    >
                      {touched.invoiceCustomerType && errors.invoiceCustomerType}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                {values.invoiceCustomerType === INV_CUS_TYP_REGISTERED && (
                  <Grid size={12}>
                    <FormControl fullWidth required>
                      <Autocomplete
                        value={
                          customerOptions.find(
                            (customer) => customer._id === values.invoiceCustomer
                          ) || null
                        }
                        onChange={(event, newValue) => {
                          setFieldValue('invoiceCustomer', newValue._id);
                        }}
                        onInputChange={(event, newInputValue) => {
                          setSearchTerm(newInputValue);
                        }}
                        options={filteredCustomers}
                        loading={isLoadingCustomerOptions}
                        filterOptions={(x) => x} // Disable default filter since we're handling it
                        getOptionLabel={(option) => option?.customerName || ''}
                        isOptionEqualToValue={(option, value) => option?._id === value?._id}
                        sx={{ minWidth: 300 }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search Customer"
                            placeholder="Type to search..."
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={option._id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="subtitle1">{option.customerName}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                📞 {option.customerMobile}
                              </Typography>
                            </Box>
                          </li>
                        )}
                      />
                      <FormHelperText error={touched.invoiceCustomer && errors.invoiceCustomer}>
                        {touched.invoiceCustomer && errors.invoiceCustomer}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                )}
                <Grid size={12}>
                  <TextField
                    label="Cash Discount"
                    name="invoiceDiscountCash"
                    fullWidth
                    autoComplete="off"
                    variant="outlined"
                    {...getFieldProps('invoiceDiscountCash')}
                    error={touched.invoiceDiscountCash && Boolean(errors.invoiceDiscountCash)}
                    helperText={touched.invoiceDiscountCash && errors.invoiceDiscountCash}
                    slotProps={{ input: { inputComponent: CurrencyInput } }}
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
