import { Delete } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { formatCurrency } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';
import ItemDeleteConfirmationDialog from './delete-confirmation-dialog';
import { WO_STATUS_COMPLETED, WO_STATUS_OPEN } from 'src/constants/workorderStatus';
import { Fragment } from 'react';
import { UpdateInvoiceItemDialog } from './update-invitem-dialog';
import ConfirmationDialog from 'src/components/confirmation-dialog/confirmation-dialog';

export const InvoicesComponent = ({
  value,
  invoices,
  invoiceInfo,
  invoiceItems,
  selectedItem,
  isOpenUpdateDialog,
  isOpenDeleteDialog,
  isOpenComplete,
  isOpenClose,
  isLoading,
  isLoadingInvoiceInfo,
  isLoadingInvoiceItems,
  isLoadingUpdateInvoiceItem,
  isLoadingDeleteInvoiceItem,
  isLoadingCompleteInvoice,
  isLoadingClosingInvoice,
  handleChange,
  handleToggleUpdateDialog,
  handleToggleDeleteDialog,
  handleToggleCompleteInvoice,
  handleToggleCloseInvoice,
  handleDeleteInvoiceItem,
  handleUpdateInvoiceItem,
  handleCompleteInvoice,
  handleCloseInvoice,
}) => {
  const theme = useTheme();
  return (
    <>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{ borderBottom: '1px solid #ddd' }}
      >
        {invoices.map((tab, index) => (
          <Tab key={index} label={`Queue ${index + 1}`} />
        ))}
      </Tabs>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card elevation={2}>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {invoiceInfo?.invoiceNumber && (
                  <TableRow>
                    <TableCell sx={{ background: theme.palette.primary.lighter }}>
                      Invoice Number
                    </TableCell>
                    <TableCell
                      sx={{ background: theme.palette.primary.lighter, fontWeight: 'bold' }}
                    >
                      {isLoadingInvoiceInfo
                        ? 'Loading...'
                        : invoiceInfo
                          ? invoiceInfo.invoiceNumber
                          : ' - '}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ background: theme.palette.primary.lighter }}>
                    Customer Type
                  </TableCell>
                  <TableCell sx={{ background: theme.palette.primary.lighter, fontWeight: 'bold' }}>
                    {isLoadingInvoiceInfo
                      ? 'Loading...'
                      : invoiceInfo
                        ? `${invoiceInfo.invoiceCustomerType} Customer`
                        : ' - '}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ background: theme.palette.primary.lighter }}>
                    Created At
                  </TableCell>
                  <TableCell sx={{ background: theme.palette.primary.lighter, fontWeight: 'bold' }}>
                    {isLoadingInvoiceInfo
                      ? 'Loading...'
                      : invoiceInfo
                        ? fDateTime(invoiceInfo.createdAt)
                        : ' - '}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', p: '2px 0px 2px 0px', flexGrow: 1 }}>
          {invoiceItems.length === 0 && (
            <Typography variant="caption" fontStyle="italic" textAlign="center">
              No items added
            </Typography>
          )}

          {isLoadingInvoiceItems && (
            <Typography variant="caption" fontStyle="italic" textAlign="center">
              Loading...
            </Typography>
          )}
          {invoiceItems.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Total</TableCell>
                    {invoiceInfo.invoiceStatus === WO_STATUS_OPEN && <TableCell></TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceItems.map((invItem, index) => (
                    <TableRow
                      key={index}
                      hover={true}
                      onClick={() => {
                        handleToggleUpdateDialog(invItem);
                      }}
                    >
                      <TableCell sx={{ cursor: 'pointer' }}>{invItem.item.itemName}</TableCell>
                      <TableCell sx={{ cursor: 'pointer' }}>{invItem.quantity}</TableCell>
                      <TableCell sx={{ cursor: 'pointer' }}>
                        {formatCurrency(invItem.unitPrice)}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer' }}>
                        {formatCurrency(invItem.totalNetPrice)}
                      </TableCell>
                      {invoiceInfo.invoiceStatus === WO_STATUS_OPEN && (
                        <TableCell align="right">
                          <IconButton
                            edge="end"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleDeleteDialog(invItem);
                            }}
                          >
                            <Delete color="error" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2} align="right" variant="head" sx={{ cursor: 'pointer' }}>
                    Total Amount
                  </TableCell>
                  <TableCell align="right" sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    {isLoadingInvoiceInfo
                      ? 'Loading...'
                      : invoiceInfo
                        ? formatCurrency(invoiceInfo.invoiceTotalAmount)
                        : ' - '}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} align="right" variant="head" sx={{ cursor: 'pointer' }}>
                    Total Discount
                  </TableCell>
                  <TableCell align="right" sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    {isLoadingInvoiceInfo
                      ? 'Loading...'
                      : invoiceInfo
                        ? formatCurrency(invoiceInfo.invoiceTotalDiscount)
                        : ' - '}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} align="right" variant="head" sx={{ cursor: 'pointer' }}>
                    SubTotal Amount
                  </TableCell>
                  <TableCell align="right" sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    {isLoadingInvoiceInfo
                      ? 'Loading...'
                      : invoiceInfo
                        ? formatCurrency(invoiceInfo.invoiceSubTotal)
                        : ' - '}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Grid container spacing={2}>
            {!isLoading && invoiceInfo?.invoiceStatus === WO_STATUS_OPEN && (
              <>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Button variant="contained" fullWidth disabled={false} onClick={null}>
                    Update Invoice
                  </Button>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isLoadingCompleteInvoice}
                    onClick={handleToggleCompleteInvoice}
                  >
                    Complete
                  </Button>
                </Grid>
              </>
            )}
            {!isLoading && invoiceInfo?.invoiceStatus === WO_STATUS_COMPLETED && (
              <Fragment>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isLoadingClosingInvoice}
                    onClick={handleCloseInvoice}
                  >
                    Close
                  </Button>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Button variant="contained" fullWidth>
                    Pay
                  </Button>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Button variant="contained" fullWidth>
                    Print
                  </Button>
                </Grid>
              </Fragment>
            )}
          </Grid>
        </Box>
      </Box>
      {isOpenDeleteDialog && selectedItem && (
        <ItemDeleteConfirmationDialog
          open={isOpenDeleteDialog}
          value={selectedItem}
          handleClose={handleToggleDeleteDialog}
          isLoading={isLoadingDeleteInvoiceItem}
          handleSubmit={handleDeleteInvoiceItem}
        />
      )}
      {isOpenUpdateDialog && selectedItem && (
        <UpdateInvoiceItemDialog
          open={isOpenUpdateDialog}
          data={selectedItem}
          isLoading={isLoadingUpdateInvoiceItem}
          handleOpenClose={handleToggleUpdateDialog}
          handleConfirm={handleUpdateInvoiceItem}
        />
      )}
      {isOpenComplete && (
        <ConfirmationDialog
          contentText="Are you sure that you want to complete this invoice? Once proceed invoice items cannot be changed and the invoice will be created."
          open={isOpenComplete}
          handleClose={handleToggleCompleteInvoice}
          isLoading={isLoadingCompleteInvoice}
          handleSubmit={handleCompleteInvoice}
        />
      )}
      {isOpenClose && (
        <ConfirmationDialog
          contentText="Are you that you want to close this invoice? Once proceed the invoice will be removed from this queue"
          open={isOpenClose}
          handleClose={handleToggleCloseInvoice}
          isLoading={isLoadingClosingInvoice}
          handleSubmit={handleCloseInvoice}
        />
      )}
    </>
  );
};
