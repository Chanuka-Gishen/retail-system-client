import {
  Card,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { CustomTable } from 'src/components/custom-table/custom-table';
import { INV_CUSTOMER_TYPES } from 'src/constants/invoiceConstants';
import { PAY_STATUS } from 'src/constants/payment-status';
import { InvoicesRow } from '../components/invoices-row';

export const InvoicesView = ({
  tableTitles,
  searchParams,
  invoices,
  invoicesCount,
  isLoadingInvoices,
  handleOnRowClick,
  pagination,
  handleChangeSearchParam,
  handleDeleteSearchParam,
}) => {
  return (
    <Container>
      <Grid container spacing={4}>
        <Grid size={12}>
          <Typography variant="h4">Invoice Records</Typography>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                size="small"
                label="Customer Name"
                value={searchParams.name}
                name="name"
                onChange={handleChangeSearchParam}
                autoComplete="off"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                size="small"
                label="Customer mobile"
                value={searchParams.mobile}
                name="mobile"
                onChange={handleChangeSearchParam}
                autoComplete="off"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                size="small"
                label="Invoice Number"
                value={searchParams.number}
                name="number"
                onChange={handleChangeSearchParam}
                autoComplete="off"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel size="small" id="select-label-customer-type">
                  Customer Type
                </InputLabel>
                <Select
                  size="small"
                  labelId="select-label-customer-type"
                  id="simple-select-customer-type"
                  label="Customer Type"
                  name="type"
                  fullWidth
                  value={searchParams.type}
                  onChange={handleChangeSearchParam}
                >
                  {INV_CUSTOMER_TYPES.map((item, index) => (
                    <MenuItem key={index} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel size="small" id="select-label-payment-status">
                  Payment Status
                </InputLabel>
                <Select
                  size="small"
                  labelId="select-label-payment-status"
                  id="simple-select-payment-status"
                  label="Payment Status"
                  name="status"
                  fullWidth
                  value={searchParams.status}
                  onChange={handleChangeSearchParam}
                >
                  {PAY_STATUS.map((item, index) => (
                    <MenuItem key={index} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Grid>
        {(searchParams.name ||
          searchParams.mobile ||
          searchParams.number ||
          searchParams.status ||
          searchParams.type) && (
          <Grid size={12}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {searchParams.name && (
                <Chip label={searchParams.name} onDelete={() => handleDeleteSearchParam('name')} />
              )}
              {searchParams.mobile && (
                <Chip
                  label={searchParams.mobile}
                  onDelete={() => handleDeleteSearchParam('mobile')}
                />
              )}
              {searchParams.number && (
                <Chip
                  label={searchParams.number}
                  onDelete={() => handleDeleteSearchParam('number')}
                />
              )}
              {searchParams.type && (
                <Chip label={searchParams.type} onDelete={() => handleDeleteSearchParam('type')} />
              )}
              {searchParams.status && (
                <Chip
                  label={searchParams.status}
                  onDelete={() => handleDeleteSearchParam('status')}
                />
              )}
            </Stack>
          </Grid>
        )}
        <Grid size={12}>
          <Card>
            <Paper elevation={0}>
              <CustomTable
                keys={tableTitles}
                dataLength={invoices.length}
                isLoading={isLoadingInvoices}
                documentCount={invoicesCount}
                page={pagination.page}
                limit={pagination.limit}
                handleChangePage={pagination.handleChangePage}
                handleChangeRowsPerPage={pagination.handleChangeRowsPerPage}
                tableBody={<InvoicesRow data={invoices} onClickRow={handleOnRowClick} />}
              />
            </Paper>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};
