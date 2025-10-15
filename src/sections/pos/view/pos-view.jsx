import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import { formatCurrency } from 'src/utils/format-number';
import InventoryItemCard from '../components/inventory-item-card';
import ConfirmationDialog from 'src/components/confirmation-dialog/confirmation-dialog';
import { InvoicesComponent } from '../components/invoices-component';

export const PosView = ({
  items,
  itemsCount,
  itemCategories,
  customerOptions,
  invoices,
  invoiceInfo,
  invoiceItems,
  selectedFilters,
  selectedInvoice,
  selectedItem,
  value,
  pagination,
  isOpenAdd,
  isOpenInvoiceUpdate,
  isOpenUpdate,
  isOpenDelete,
  isOpenComplete,
  isOpenClose,
  isOpenAddPayment,
  isLoadingInvoices,
  isLoadingInvoiceInfo,
  isLoadingInvoiceItems,
  isLoadingItems,
  isLoadingItemCategories,
  isLoadingCustomerOptions,
  isLoadingCreateInvoice,
  isLoadingUpdateInvoice,
  isLoadingAddInvItem,
  isLoadingUpdateInvItem,
  isLoadingDeleteInvItem,
  isLoadingCompleteInvoice,
  isLoadingClosingInvoice,
  isLoadingCreatePayment,
  handleChangeSearch,
  handleSelectCategories,
  handleChangeTab,
  handleToggleAddInvoice,
  handleToggleUpdateInvoice,
  handleToggleDeleteInvoiceItem,
  handleToggleUpdateInvoiceItem,
  handleToggleCompleteInvoice,
  handleToggleCloseInvoice,
  handleToggleAddPayment,
  handleAddNewInvoice,
  handleUpdateInvoice,
  handleAddNewItem,
  handleUpdateItem,
  handleDeleteInvoiceItem,
  handleCompleteInvoice,
  handleCloseInvoice,
  handleAddPayment
}) => {
  return (
    <Container maxWidth="xl" sx={{ mt: '20px' }}>
      <Grid container spacing={2} columnSpacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Grid container spacing={2}>
                  {isLoadingItemCategories && (
                    <Grid size={12}>
                      <Typography variant="caption" fontStyle="italic">
                        Loading Categories...
                      </Typography>
                    </Grid>
                  )}
                  {itemCategories.map((value, index) => (
                    <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                      <Chip
                        label={`${value.categoryTitle} ${value.itemsCount}`}
                        sx={{ width: '100%' }}
                        color={selectedFilters.category === value._id ? 'primary' : 'default'}
                        onClick={() => handleSelectCategories(value._id)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  size="small"
                  label="Item Code"
                  name="code"
                  value={selectedFilters.code}
                  onChange={handleChangeSearch}
                  autoComplete="off"
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  size="small"
                  label="Item Title"
                  name="name"
                  value={selectedFilters.name}
                  onChange={handleChangeSearch}
                  autoComplete="off"
                  fullWidth
                />
              </Grid>
              {isLoadingItems && (
                <Grid size={12}>
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress />
                  </Box>
                </Grid>
              )}
              {items.map((item, index) => (
                <Grid key={index} size={{ xs: 6, sm: 4, lg: 3 }}>
                  <InventoryItemCard
                    key={index}
                    item={item}
                    onSelect={handleAddNewItem}
                    isLoading={isLoadingAddInvItem}
                  />
                </Grid>
              ))}
              {itemsCount > 10 && (
                <Grid size={12}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <Pagination
                      count={itemsCount}
                      page={pagination.page}
                      onChange={pagination.handleChangePage}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h5">Open Invoices</Typography>
              <Button
                variant="contained"
                onClick={handleToggleAddInvoice}
                disabled={isLoadingCreateInvoice}
              >
                Add New
              </Button>
            </Box>
            {isLoadingInvoices && (
              <Typography textAlign="center" variant="subtitle1" fontStyle="italic">
                Loading...
              </Typography>
            )}
            {!isLoadingInvoices && invoices.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/assets/background/no-items.png"
                  alt="Invoice Management"
                  style={{
                    width: '80%',
                    objectFit: 'cover',
                  }}
                />
                <Typography variant="subtitle1">No invoices found</Typography>
              </Box>
            )}
            {!isLoadingInvoices && invoices.length > 0 && (
              <InvoicesComponent
                value={value}
                customerOptions={customerOptions}
                selectedInvoice={selectedInvoice}
                invoices={invoices}
                invoiceInfo={invoiceInfo}
                invoiceItems={invoiceItems}
                selectedItem={selectedItem}
                isOpenInvoiceUpdate={isOpenInvoiceUpdate}
                isOpenUpdateDialog={isOpenUpdate}
                isOpenDeleteDialog={isOpenDelete}
                isOpenComplete={isOpenComplete}
                isOpenClose={isOpenClose}
                isOpenAddPayment={isOpenAddPayment}
                isLoading={isLoadingInvoices}
                isLoadingCustomerOptions={isLoadingCustomerOptions}
                isLoadingUpdateInvoice={isLoadingUpdateInvoice}
                isLoadingInvoiceInfo={isLoadingInvoiceInfo}
                isLoadingInvoiceItems={isLoadingInvoiceItems}
                isLoadingUpdateInvoiceItem={isLoadingUpdateInvItem}
                isLoadingDeleteInvoiceItem={isLoadingDeleteInvItem}
                isLoadingCompleteInvoice={isLoadingCompleteInvoice}
                isLoadingClosingInvoice={isLoadingClosingInvoice}
                isLoadingCreatePayment={isLoadingCreatePayment}
                handleChange={handleChangeTab}
                handleToggleUpdateInvoice={handleToggleUpdateInvoice}
                handleToggleUpdateDialog={handleToggleUpdateInvoiceItem}
                handleToggleDeleteDialog={handleToggleDeleteInvoiceItem}
                handleToggleCompleteInvoice={handleToggleCompleteInvoice}
                handleToggleCloseInvoice={handleToggleCloseInvoice}
                handleToggleAddPayment={handleToggleAddPayment}
                handleUpdateInvoice={handleUpdateInvoice}
                handleUpdateInvoiceItem={handleUpdateItem}
                handleDeleteInvoiceItem={handleDeleteInvoiceItem}
                handleCompleteInvoice={handleCompleteInvoice}
                handleCloseInvoice={handleCloseInvoice}
                handleAddPayment={handleAddPayment}
              />
            )}
          </Box>
        </Grid>
      </Grid>
      {isOpenAdd && (
        <ConfirmationDialog
          contentText="Are you sure than you want to create a new invoice?"
          open={isOpenAdd}
          isLoading={isLoadingCreateInvoice}
          handleClose={handleToggleAddInvoice}
          handleSubmit={handleAddNewInvoice}
        />
      )}
    </Container>
  );
};
