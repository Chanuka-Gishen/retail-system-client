import { useState } from 'react';
import axios from 'axios';

import { BACKEND_API } from 'src/axios/constant/backend-api';
import { backendAuthApi } from 'src/axios/instance/backend-axios-instance';
import responseUtil from 'src/utils/responseUtil';

export const useInvoice = () => {
  const sourceToken = axios.CancelToken.source();

  const [invoices, setInvoices] = useState([]);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [invoiceInfo, setInvoiceInfo] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [statTodaySales, setStatTodaySales] = useState(0);
  const [statTodayGrossProfit, setStatTodayGrossProfit] = useState(0);
  const [statTodayInvoicesCount, setStatTodayInvoicesCount] = useState(0);
  const [statPastSales, setStatPastSales] = useState([]);
  const [statPastInvoicesCount, setStatPastInvoicesCount] = useState([]);

  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isLoadingOpenInvoices, setIsLoadingOpenInvoices] = useState(false);
  const [isLoadingInvoiceInfo, setIsLoadingInvoiceInfo] = useState(false);
  const [isLoadingInvoiceItems, setIsLoadingInvoiceItems] = useState(false);
  const [isLoadingCreateInvoice, setIsLoadingCreateInvoice] = useState(false);
  const [isLoadingUpdateInvoice, setIsLoadingUpdateInvoice] = useState(false);
  const [isLoadingAddInvItem, setIsLoadingAddInvItem] = useState(false);
  const [isLoadingUpdateInvItem, setIsLoadingUpdateInvItem] = useState(false);
  const [isLoadingDeleteInvItem, setIsLoadingDeleteInvItem] = useState(false);
  const [isLoadingCompleteInvoice, setIsLoadingCompleteInvoice] = useState(false);
  const [isLoadingClosingInvoice, setIsLoadingClosingInvoice] = useState(false);
  const [isLoadingCreateReturnItems, setIsLoadingCreateReturnItems] = useState(false);
  const [isLoadingReturnItems, setIsLoadingReturnItems] = useState(false);
  const [isLoadingStatTodaySales, setIsLoadingStatTodaySales] = useState(true);
  const [isLoadingStatTodayGrossProfit, setIsLoadingStatTodayGrossProfit] = useState(true);
  const [isLoadingStatTodayInvCount, setIsLoadingStatTodayInvCount] = useState(true);
  const [isLoadingPastSales, setIsLoadingPastSales] = useState(true);
  const [isLoadingPastInvCount, setIsLoadingPastInvCount] = useState(true);

  // Create invoice
  const createInvoiceController = async (data) => {
    if (isLoadingCreateInvoice) return;

    let isSuccess = false;

    setIsLoadingCreateInvoice(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_CREATE,
      method: 'POST',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingCreateInvoice(false))
      .finally(() => setIsLoadingCreateInvoice(false));

    return isSuccess;
  };

  // Update invoice info
  const updateInvoiceController = async (data) => {
    if (isLoadingUpdateInvoice) return;

    let isSuccess = false;

    setIsLoadingUpdateInvoice(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_UPDATE,
      method: 'PUT',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingUpdateInvoice(false))
      .finally(() => setIsLoadingUpdateInvoice(false));

    return isSuccess;
  };

  // Add invoice item
  const addInvoiceItemController = async (data) => {
    if (isLoadingAddInvItem) return;

    let isSuccess = false;

    setIsLoadingAddInvItem(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_ADD_ITEMS,
      method: 'POST',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingAddInvItem(false))
      .finally(() => setIsLoadingAddInvItem(false));

    return isSuccess;
  };

  // Update invoice item
  const updateInvoiceItemController = async (data) => {
    if (isLoadingUpdateInvItem) return;

    let isSuccess = false;

    setIsLoadingUpdateInvItem(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_UPDATE_ITEMS,
      method: 'PUT',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingUpdateInvItem(false))
      .finally(() => setIsLoadingUpdateInvItem(false));
    return isSuccess;
  };

  // Delete invoice item
  const deleteInvoiceItemController = async (id) => {
    if (isLoadingDeleteInvItem) return;

    let isSuccess = false;

    setIsLoadingDeleteInvItem(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_DELETE_ITEM,
      method: 'DELETE',
      cancelToken: sourceToken.token,
      params: { id },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingDeleteInvItem(false))
      .finally(() => setIsLoadingDeleteInvItem(false));

    return isSuccess;
  };

  // Fetch closed invoices
  const fetchClosedInvoicesController = async (params) => {
    if (isLoadingInvoices) return;

    setIsLoadingInvoices(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_GET_ALL,
      method: 'GET',
      cancelToken: sourceToken.token,
      params,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setInvoices(res.data.responseData.data);
          setInvoicesCount(res.data.responseData.count);
        }
      })
      .catch(() => setIsLoadingInvoices(false))
      .finally(setIsLoadingInvoices(false));
  };

  // Fetch Open/Compeleted Invoices
  const fetchOpenInvoicesController = async () => {
    if (isLoadingOpenInvoices) return;

    setIsLoadingOpenInvoices(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_GET_OPEN,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setOpenInvoices(res.data.responseData);
        }
      })
      .catch(() => {
        setIsLoadingOpenInvoices(false);
      })
      .finally(() => {
        setIsLoadingOpenInvoices(false);
      });
  };

  // Fetch invoice info
  const fetchInvoiceInfoController = async (id) => {
    if (isLoadingInvoiceInfo) return;

    setIsLoadingInvoiceInfo(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_GET_INFO,
      method: 'GET',
      cancelToken: sourceToken.token,
      params: { id },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setInvoiceInfo(res.data.responseData);
        }
      })
      .catch(() => setIsLoadingInvoiceInfo(false))
      .finally(() => setIsLoadingInvoiceInfo(false));
  };

  // Fetch invoice items
  const fetchInvoiceItemsController = async (id) => {
    if (isLoadingInvoiceItems) return;

    setIsLoadingInvoiceItems(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_GET_ITEMS,
      method: 'GET',
      cancelToken: sourceToken.token,
      params: { id },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          if (res.data.responseData) {
            setInvoiceItems(res.data.responseData);
          }
        }
      })
      .catch(() => setIsLoadingInvoiceItems(false))
      .finally(() => setIsLoadingInvoiceItems(false));
  };

  // Complete invoice
  const completeInvoiceController = async (id) => {
    if (isLoadingCompleteInvoice) return;

    let isSuccess = false;

    setIsLoadingCompleteInvoice(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_COMPLETE,
      method: 'PUT',
      cancelToken: sourceToken.token,
      params: { id },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingCompleteInvoice(false))
      .finally(() => setIsLoadingCompleteInvoice(false));

    return isSuccess;
  };

  // Close invoice
  const closeInvoiceController = async (id) => {
    if (isLoadingClosingInvoice) return;

    let isSuccess = false;

    setIsLoadingClosingInvoice(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_CLOSE,
      method: 'PUT',
      cancelToken: sourceToken.token,
      params: { id },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => setIsLoadingClosingInvoice(false))
      .finally(() => setIsLoadingClosingInvoice(false));

    return isSuccess;
  };

  // Create return items for invoice
  const createReturnItemsController = async (data) => {
    if (isLoadingCreateReturnItems) return;

    let isSuccess = false;

    setIsLoadingCreateReturnItems(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_RETURN,
      method: 'POST',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => {
        setIsLoadingCreateReturnItems(false);
      })
      .finally(() => {
        setIsLoadingCreateReturnItems(false);
      });

    return isSuccess;
  };

  // Get return items
  const fetchReturnItemsController = async (id) => {
    if (isLoadingReturnItems) return;

    setIsLoadingReturnItems(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_GET_RETURNS,
      method: 'GET',
      cancelToken: sourceToken.token,
      params: { id },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          if (res.data.responseData.length > 0) {
            setReturnItems(res.data.responseData);
          }
        }
      })
      .catch(() => {
        setIsLoadingReturnItems(false);
      })
      .finally(() => {
        setIsLoadingReturnItems(false);
      });
  };

  // Statistics - Today Sales
  const fetchTodaySalesController = async () => {
    setIsLoadingStatTodaySales(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_STAT_TODAY_SALES,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setStatTodaySales(res.data.responseData);
        }
        setIsLoadingStatTodaySales(false);
      })
      .catch(() => {
        setIsLoadingStatTodaySales(false);
      });
  };

  // Statistics - Today Gross Profit
  const fetchTodayGrossProfitController = async () => {
    setIsLoadingStatTodayGrossProfit(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_STAT_GROSS_PROFIT,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setStatTodayGrossProfit(res.data.responseData);
        }
        setIsLoadingStatTodayGrossProfit(false);
      })
      .catch(() => {
        setIsLoadingStatTodayGrossProfit(false);
      });
  };

  // Statistics - Today Invoice Count
  const fetchTodayInvCountController = async () => {
    setIsLoadingStatTodayInvCount(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_STAT_INVOICES_COUNT,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setStatTodayInvoicesCount(res.data.responseData);
        }
        setIsLoadingStatTodayInvCount(false);
      })
      .catch(() => {
        setIsLoadingStatTodayInvCount(false);
      });
  };

  // Statistics - Past Sales
  const fetchPastSalesController = async (days = 7) => {
    setIsLoadingPastSales(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_STAT_PAST_SALES,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setStatPastSales(res.data.responseData);
        }

        setIsLoadingPastSales(false);
      })
      .catch(() => {
        setIsLoadingPastSales(false);
      });
  };

  // Statistics - Past Invoices Count
  const fetchPastInvoicesCountController = async (days = 7) => {
    setIsLoadingPastInvCount(true);

    await backendAuthApi({
      url: BACKEND_API.INVOICE_STAT_PAST_INVOICES_COUNT,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setStatPastInvoicesCount(res.data.responseData);
        }

        setIsLoadingPastInvCount(false);
      })
      .catch(() => {
        setIsLoadingPastInvCount(false);
      });
  };

  return {
    invoices,
    invoicesCount,
    openInvoices,
    invoiceItems,
    invoiceInfo,
    returnItems,
    statTodaySales,
    statTodayGrossProfit,
    statTodayInvoicesCount,
    statPastSales,
    statPastInvoicesCount,
    isLoadingInvoices,
    isLoadingOpenInvoices,
    isLoadingInvoiceInfo,
    isLoadingInvoiceItems,
    isLoadingCreateInvoice,
    isLoadingUpdateInvoice,
    isLoadingAddInvItem,
    isLoadingUpdateInvItem,
    isLoadingDeleteInvItem,
    isLoadingCompleteInvoice,
    isLoadingClosingInvoice,
    isLoadingCreateReturnItems,
    isLoadingReturnItems,
    isLoadingStatTodaySales,
    isLoadingStatTodayGrossProfit,
    isLoadingStatTodayInvCount,
    isLoadingPastSales,
    isLoadingPastInvCount,
    createInvoiceController,
    updateInvoiceController,
    addInvoiceItemController,
    updateInvoiceItemController,
    deleteInvoiceItemController,
    fetchClosedInvoicesController,
    fetchOpenInvoicesController,
    fetchInvoiceInfoController,
    fetchInvoiceItemsController,
    fetchReturnItemsController,
    completeInvoiceController,
    closeInvoiceController,
    createReturnItemsController,
    fetchTodaySalesController,
    fetchTodayGrossProfitController,
    fetchTodayInvCountController,
    fetchPastSalesController,
    fetchPastInvoicesCountController,
  };
};
