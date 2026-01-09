import React from 'react';
import Chart from 'react-apexcharts';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid2';

import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StackedLineChartIcon from '@mui/icons-material/StackedLineChart';

import useAuthStore from 'src/store/auth-store';
import StatCard from 'src/components/stat-card';
import { CustomTable } from 'src/components/custom-table/custom-table';
import { LowStocksRow } from '../components/low-stocks-row';
import { ITEM_STS_LOW_STOCK, ITEM_STS_OUTOFSTOCK } from 'src/constants/item-status';
import { formatCurrency } from 'src/utils/format-number';
import { PendingPaymentsRow } from '../components/pending-payments-row';

// ----------------------------------------------------------------------

export const Overview = ({
  selectedInvStatus,
  setSelectedInvStatus,
  stockTableColumns,
  pendingPayColumns,
  invStockStats,
  invStockStatsCount,
  chartTotalRevenueData,
  charTotalJobsData,
  pendingPayments,
  statTodaySales,
  statTodayGrossProfit,
  statTodayInvoicesCount,
  statPastSales,
  statPastInvoicesCount,
  isLoadingStatTodaySales,
  isLoadingStatTodayGrossProfit,
  isLoadingStatTodayInvCount,
  isLoadingChartRevenueData,
  isLoadingChartTotalJobs,
  isLoadingStockAvailabilityStats,
  isLoadingPendingPayments,
  isLoadingPastSales,
  isLoadingPastInvCount,
}) => {
  const theme = useTheme();
  const { auth } = useAuthStore.getState();

  // Sales Chart Options
  const salesOptions = {
    chart: {
      type: 'line',
      height: 350,
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    title: {
      text: 'Daily Sales (Last 7 Days)',
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
      },
    },
    xaxis: {
      type: 'datetime',
      categories: statPastSales.map((item) => item.date),
      labels: {
        format: 'dd MMM',
      },
    },
    yaxis: {
      title: {
        text: 'Sales (LKR)',
      },
      labels: {
        formatter: (value) => formatCurrency(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => formatCurrency(value),
      },
    },
    colors: ['#4CAF50'],
  };

  // Order Count Chart Options
  const orderCountOptions = {
    chart: {
      type: 'line',
      height: 350,
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    title: {
      text: 'Daily Invoices (Last 7 Days)',
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
      },
    },
    xaxis: {
      type: 'datetime',
      categories: statPastInvoicesCount.map((item) => item.date),
      labels: {
        format: 'dd MMM',
      },
    },
    yaxis: {
      title: {
        text: 'Number of Invoices',
      },
      min: 0,
      tickAmount: 5,
    },
    colors: ['#3F51B5'],
  };

  // Chart Series Data
  const salesSeries = [
    {
      name: 'Sales',
      data: statPastSales.map((item) => item.total),
    },
  ];

  const orderCountSeries = [
    {
      name: 'Invoices Count',
      data: statPastInvoicesCount.map((item) => item.count),
    },
  ];

  return (
    <Container maxWidth="xl">
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 12, md: 8, lg: 8 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 12, md: 4, lg: 4 }}>
              <StatCard
                title={'Today Sales'}
                isLoading={isLoadingStatTodaySales}
                value={statTodaySales}
                icon={<LocalAtmIcon color="success" fontSize="large" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 4, lg: 4 }}>
              <StatCard
                title={'Today Gross Profit'}
                isLoading={isLoadingStatTodayGrossProfit}
                value={statTodayGrossProfit}
                icon={<AttachMoneyIcon color="info" fontSize="large" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 4, lg: 4 }}>
              <StatCard
                title={'Invoices Count'}
                isLoading={isLoadingStatTodayInvCount}
                type="number"
                value={statTodayInvoicesCount}
                icon={<StackedLineChartIcon color="success" fontSize="large" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                    boxShadow: theme.shadows[6],
                  },
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                <Paper elevation={0} sx={{ p: '10px' }}>
                  {isLoadingPastSales ? (
                    <CircularProgress />
                  ) : (
                    <Chart options={salesOptions} series={salesSeries} type="line" height={350} />
                  )}
                </Paper>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                    boxShadow: theme.shadows[6],
                  },
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                <Paper elevation={0} sx={{ p: '10px' }}>
                  {isLoadingPastInvCount ? (
                    <CircularProgress />
                  ) : (
                    <Chart
                      options={orderCountOptions}
                      series={orderCountSeries}
                      type="line"
                      height={350}
                    />
                  )}
                </Paper>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5">
                Stocks {isLoadingStockAvailabilityStats ? `(...)` : `(${invStockStatsCount})`}
              </Typography>
              <ButtonGroup variant="outlined" aria-label="Loading button group">
                <Button
                  variant={selectedInvStatus === ITEM_STS_OUTOFSTOCK ? 'contained' : 'outlined'}
                  onClick={() => setSelectedInvStatus(ITEM_STS_OUTOFSTOCK)}
                  loading={isLoadingStockAvailabilityStats}
                  loadingPosition="start"
                >
                  {ITEM_STS_OUTOFSTOCK}
                </Button>
                <Button
                  variant={selectedInvStatus === ITEM_STS_LOW_STOCK ? 'contained' : 'outlined'}
                  onClick={() => setSelectedInvStatus(ITEM_STS_LOW_STOCK)}
                  loading={isLoadingStockAvailabilityStats}
                  loadingPosition="start"
                >
                  {ITEM_STS_LOW_STOCK}
                </Button>
              </ButtonGroup>
            </Stack>

            <Card>
              <Paper elevation={0}>
                <CustomTable
                  keys={stockTableColumns}
                  isLoading={isLoadingStockAvailabilityStats}
                  dataLength={invStockStats.length}
                  tableBody={<LowStocksRow data={invStockStats} />}
                  enablePagination={false}
                />
              </Paper>
            </Card>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Pending Cheque Payments</Typography>
            <Card>
              <Paper elevation={0}>
                <CustomTable
                  keys={pendingPayColumns}
                  isLoading={isLoadingPendingPayments}
                  dataLength={pendingPayments.length}
                  tableBody={<PendingPaymentsRow data={pendingPayments} />}
                  enablePagination={false}
                />
              </Paper>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

Overview.propTypes = {};
