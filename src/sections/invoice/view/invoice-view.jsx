import {
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Container,
  Link,
  Table,
  TableBody,
  TableContainer,
  TableRow,
  Typography,
  TableCell,
  Paper,
  TableHead,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';

import { INV_CUS_TYP_REGISTERED } from 'src/constants/invoiceConstants';
import { NAVIGATION_ROUTES } from 'src/routes/navigation-routes';
import useAuthStore from 'src/store/auth-store';
import { formatCurrency } from 'src/utils/format-number';
import {
  PAY_STATUS_PAID,
  PAY_STATUS_PARTIALLY_PAID,
  PAY_STATUS_REFUNDED,
  PAY_STATUS_UNPAID,
  PAY_STATUS_WRITTEN_OFF,
} from 'src/constants/payment-status';
import { fDateTime } from 'src/utils/format-time';
import TableLoadingRow from 'src/components/custom-table/table-loading-row';
import { InvoicePaymentDialog } from 'src/components/invoice-payment-dialog/invoice-payment-dialog';

const CustomTabelCell = (props, children) => {
  return <TableCell {...props} sx={{ cursor: 'pointer' }}></TableCell>;
};

export const InvoiceView = ({
  invoiceInfo,
  invoiceItems,
  isOpenCreatePayment,
  isLoadingInvoiceInfo,
  isLoadingInvoiceItems,
  isLoadingCreate,
  handleToggleCreatePayment,
  handleCreatePayment,
}) => {
  const { auth } = useAuthStore.getState();
  return (
    <Container maxWidth="xl">
      <Grid container spacing={4}>
        <Grid size={12}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link underline="hover" color="inherit" href={NAVIGATION_ROUTES.invoices.base}>
              Invoice Records
            </Link>
            <Typography sx={{ color: 'text.primary' }}>
              {isLoadingInvoiceInfo ? 'Loading...' : invoiceInfo?.invoiceNumber}
            </Typography>
          </Breadcrumbs>
        </Grid>
        {invoiceInfo?.invoicePaymentStatus != PAY_STATUS_PAID && (
          <Grid size={{ xs: 6, md: 2 }}>
            <Button variant="contained" fullWidth onClick={handleToggleCreatePayment}>
              Add Payment
            </Button>
          </Grid>
        )}

        <Grid size={{ xs: 6, md: 2 }}>
          <Button variant="contained" fullWidth>
            Print Bill
          </Button>
        </Grid>

        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              {isLoadingInvoiceInfo && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
              {!isLoadingInvoiceInfo && invoiceInfo && (
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <CustomTabelCell variant="head">Customer Type</CustomTabelCell>
                        <CustomTabelCell>{invoiceInfo.invoiceCustomerType}</CustomTabelCell>
                      </TableRow>
                      {invoiceInfo.invoiceCustomerType === INV_CUS_TYP_REGISTERED && (
                        <TableRow>
                          <CustomTabelCell variant="head">Customer Name</CustomTabelCell>
                          <CustomTabelCell>{`${invoiceInfo.invoiceCustomer.customerPrefix} ${invoiceInfo.invoiceCustomer.customerName}`}</CustomTabelCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Total Value</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(invoiceInfo.invoiceTotalAmount)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Total Discount</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(invoiceInfo.invoiceTotalDiscount)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Gross Total</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(invoiceInfo.invoiceGrossTotal)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Net Total</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(invoiceInfo.invoiceNetTotal)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Estimate Profit</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(
                            invoiceInfo.invoiceNetTotal - invoiceInfo.invoiceGrossTotal
                          )}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Paid Amount</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(invoiceInfo.invoicePaidAmount)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Invoice Balance Amount</CustomTabelCell>
                        <CustomTabelCell>
                          {formatCurrency(invoiceInfo.invoiceBalanceAmount)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Payment Status</CustomTabelCell>
                        <CustomTabelCell>
                          <Chip
                            icon={
                              invoiceInfo.invoicePaymentStatus === PAY_STATUS_PAID ? (
                                <CheckCircleIcon />
                              ) : invoiceInfo.invoicePaymentStatus === PAY_STATUS_UNPAID ? (
                                <CancelIcon />
                              ) : (
                                <PendingIcon />
                              )
                            }
                            label={invoiceInfo.invoicePaymentStatus}
                            color={
                              invoiceInfo.invoicePaymentStatus === PAY_STATUS_PAID
                                ? 'success'
                                : invoiceInfo.invoicePaymentStatus === PAY_STATUS_PARTIALLY_PAID
                                  ? 'warning'
                                  : [PAY_STATUS_WRITTEN_OFF, PAY_STATUS_REFUNDED].includes(
                                        invoiceInfo.invoicePaymentStatus
                                      )
                                    ? 'info'
                                    : 'error'
                            }
                          />
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Created At</CustomTabelCell>
                        <CustomTabelCell>{fDateTime(invoiceInfo.createdAt)}</CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Completed At</CustomTabelCell>
                        <CustomTabelCell>
                          {fDateTime(invoiceInfo.invoiceCompletedAt)}
                        </CustomTabelCell>
                      </TableRow>
                      <TableRow>
                        <CustomTabelCell variant="head">Closed At</CustomTabelCell>
                        <CustomTabelCell>{fDateTime(invoiceInfo.invoiceClosedAt)}</CustomTabelCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: '5px' }}>
                <Typography variant="h5">Invoice Items</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <CustomTabelCell>Item</CustomTabelCell>
                        <CustomTabelCell>Qty</CustomTabelCell>
                        <CustomTabelCell>Price</CustomTabelCell>
                        <CustomTabelCell>Total</CustomTabelCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoadingInvoiceItems && <TableLoadingRow colSpan={4} />}
                      {invoiceItems.map((invItem, index) => (
                        <TableRow key={index} hover={true}>
                          <CustomTabelCell sx={{ cursor: 'pointer' }}>
                            {invItem.item.itemName}
                          </CustomTabelCell>
                          <CustomTabelCell sx={{ cursor: 'pointer' }}>
                            {invItem.quantity}
                          </CustomTabelCell>
                          <CustomTabelCell sx={{ cursor: 'pointer' }}>
                            {formatCurrency(invItem.unitPrice)}
                          </CustomTabelCell>
                          <CustomTabelCell sx={{ cursor: 'pointer' }}>
                            {formatCurrency(invItem.totalNetPrice)}
                          </CustomTabelCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {isOpenCreatePayment && (
        <InvoicePaymentDialog
          data={invoiceInfo}
          open={isOpenCreatePayment}
          isLoading={isLoadingCreate}
          handleClose={handleToggleCreatePayment}
          handleConfirm={handleCreatePayment}
        />
      )}
    </Container>
  );
};
