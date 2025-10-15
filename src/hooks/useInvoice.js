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

  return {
    invoices,
    invoicesCount,
    openInvoices,
    invoiceItems,
    invoiceInfo,
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
    createInvoiceController,
    updateInvoiceController,
    addInvoiceItemController,
    updateInvoiceItemController,
    deleteInvoiceItemController,
    fetchClosedInvoicesController,
    fetchOpenInvoicesController,
    fetchInvoiceInfoController,
    fetchInvoiceItemsController,
    completeInvoiceController,
    closeInvoiceController,
  };
};
