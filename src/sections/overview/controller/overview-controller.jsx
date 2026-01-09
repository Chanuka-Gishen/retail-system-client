import React, { useEffect, useState } from 'react';
import { Overview } from '../view/overview-view';
import useInventory from 'src/hooks/useInventory';
import { ITEM_STS_OUTOFSTOCK } from 'src/constants/item-status';
import usePayment from 'src/hooks/usePayment';
import { useInvoice } from 'src/hooks/useInvoice';

const stockTableColumns = ['Code', 'Item', 'Quantity'];
const pendingPayColumns = ['vehicle No', 'Customer Name', 'Amount', 'Transaction Id', 'Created At'];

const OverviewController = () => {
  const {
    invStockStats,
    invStockStatsCount,
    isLoadingStockAvailabilityStats,
    fetchStockStatistics,
  } = useInventory();

  const { pendingPayments, isLoadingPendingPayments, fetchPendingPayments } = usePayment();

  const {
    statTodaySales,
    statTodayGrossProfit,
    statTodayInvoicesCount,
    statPastSales,
    statPastInvoicesCount,
    isLoadingStatTodaySales,
    isLoadingStatTodayGrossProfit,
    isLoadingStatTodayInvCount,
    isLoadingPastSales,
    isLoadingPastInvCount,
    fetchTodaySalesController,
    fetchTodayGrossProfitController,
    fetchTodayInvCountController,
    fetchPastSalesController,
    fetchPastInvoicesCountController,
  } = useInvoice();

  const [selectedInvStatus, setSelectedInvStatus] = useState(ITEM_STS_OUTOFSTOCK);

  useEffect(() => {
    fetchStockStatistics(selectedInvStatus);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvStatus]);

  useEffect(() => {
    fetchPendingPayments();
    fetchTodaySalesController();
    fetchTodayGrossProfitController();
    fetchTodayInvCountController();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPastSalesController();
  }, []);

  useEffect(() => {
    fetchPastInvoicesCountController();
  }, []);

  return (
    <Overview
      selectedInvStatus={selectedInvStatus}
      setSelectedInvStatus={setSelectedInvStatus}
      stockTableColumns={stockTableColumns}
      pendingPayColumns={pendingPayColumns}
      invStockStats={invStockStats}
      invStockStatsCount={invStockStatsCount}
      pendingPayments={pendingPayments}
      statTodaySales={statTodaySales}
      statTodayGrossProfit={statTodayGrossProfit}
      statTodayInvoicesCount={statTodayInvoicesCount}
      statPastSales={statPastSales}
      statPastInvoicesCount={statPastInvoicesCount}
      isLoadingStockAvailabilityStats={isLoadingStockAvailabilityStats}
      isLoadingPendingPayments={isLoadingPendingPayments}
      isLoadingStatTodaySales={isLoadingStatTodaySales}
      isLoadingStatTodayGrossProfit={isLoadingStatTodayGrossProfit}
      isLoadingStatTodayInvCount={isLoadingStatTodayInvCount}
      isLoadingPastSales={isLoadingPastSales}
      isLoadingPastInvCount={isLoadingPastInvCount}
    />
  );
};

export default OverviewController;
