import useInventory from 'src/hooks/useInventory';
import { PosView } from '../view/pos-view';
import { useEffect, useState } from 'react';
import usePagination from 'src/hooks/usePagination';
import { INV_CUS_TYP_GUEST } from 'src/constants/invoice-constants';
import { useInvoice } from 'src/hooks/useInvoice';
import { WO_STATUS_COMPLETED, WO_STATUS_OPEN } from 'src/constants/workorderStatus';
import useCustomer from 'src/hooks/useCustomer';
import usePayment from 'src/hooks/usePayment';

const PosController = () => {
  const {
    selectItems,
    selectItemsCount,
    categories,
    isLoadingSelect,
    isLoadingCategories,
    fetchItemsForInvoiceSelection,
    fetchAllCategories,
  } = useInventory();

  const {
    openInvoices,
    invoiceInfo,
    invoiceItems,
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
    fetchOpenInvoicesController,
    fetchInvoiceInfoController,
    fetchInvoiceItemsController,
    createInvoiceController,
    updateInvoiceController,
    addInvoiceItemController,
    updateInvoiceItemController,
    deleteInvoiceItemController,
    completeInvoiceController,
    closeInvoiceController,
  } = useInvoice();

  const { isLoadingCreate, createPayment } = usePayment();

  const { customerOptions, isLoadingCustomerOptions, fetchCustomerOptions } = useCustomer();

  const pagination = usePagination();

  const [selectedFilters, setSelectedFilters] = useState({
    name: '',
    code: '',
    category: null,
  });

  const [value, setValue] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [isOpenInvoiceUpdate, setIsOpenInvoiceUpdate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenComplete, setIsOpenComplete] = useState(false);
  const [isOpenClose, setIsOpenClose] = useState(false);
  const [isOpenAddPayment, setIsOpenAddPayment] = useState(false);

  //------------------
  const queryParams = { page: pagination.page, limit: pagination.limit, ...selectedFilters };
  //------------------

  const handleSelectCategory = (id) => {
    setSelectedFilters((prevFilters) => ({
      ...prevFilters,
      category: prevFilters.category === id ? null : id,
    }));
  };

  const handleChangeSearch = (e) => {
    setSelectedFilters((prevFilters) => ({
      ...prevFilters,
      [e.target.name]: e.target.value,
    }));
  };

  const handleChangeTab = (event, newValue) => {
    setValue(newValue);
  };

  const handleToggleAddInvoice = () => {
    setIsOpenAdd(!isOpenAdd);
  };

  const handleToggleUpdateInvoice = (data = null) => {
    setSelectedInvoice(data);
    setIsOpenInvoiceUpdate(!isOpenInvoiceUpdate);
  };

  const handleToggleUpdateInvoiceItem = (item = null) => {
    if (invoiceInfo.invoiceStatus != WO_STATUS_OPEN) return;
    setSelectedItem(item);
    setIsOpenUpdate(!isOpenUpdate);
  };

  const handleToggleDeleteInvoiceItem = (item = null) => {
    if (invoiceInfo.invoiceStatus != WO_STATUS_OPEN) return;
    setSelectedItem(item);
    setIsOpenDelete(!isOpenDelete);
  };

  const handleToggleCompleteInvoice = async () => {
    if (invoiceInfo.invoiceStatus != WO_STATUS_OPEN) return;
    setIsOpenComplete(!isOpenComplete);
  };

  const handleToggleCloseInvoice = async () => {
    if (invoiceInfo.invoiceStatus != WO_STATUS_COMPLETED) return;
    setIsOpenClose(!isOpenClose);
  };

  const handleToggleAddPayment = async (data = null) => {
    setSelectedInvoice(data);
    setIsOpenAddPayment(!isOpenAddPayment);
  };

  const handleAddNewInvoice = async () => {
    const data = {
      invoiceCustomerType: INV_CUS_TYP_GUEST,
      invoiceCustomer: null,
    };

    const isSuccess = await createInvoiceController(data);

    if (isSuccess) {
      handleToggleAddInvoice();
      fetchOpenInvoicesController();
    }
  };

  const handleUpdateInvoice = async (values) => {
    const data = {
      _id: selectedInvoice._id,
      ...values,
    };
    const isSuccess = await updateInvoiceController(data);

    if (isSuccess) {
      handleToggleUpdateInvoice();
      fetchInvoiceInfoController(openInvoices[value]._id);
    }
  };

  const handleAddNewItem = async (itemId) => {
    const data = {
      invoice: openInvoices[value]._id,
      item: itemId,
      quantity: 1,
    };

    const isSuccess = await addInvoiceItemController(data);

    if (isSuccess) {
      fetchInvoiceInfoController(openInvoices[value]._id);
      fetchInvoiceItemsController(openInvoices[value]._id);
    }
  };

  const handleUpdateItem = async (itemId, quantity) => {
    const data = {
      _id: itemId,
      quantity,
    };

    const isSuccess = await updateInvoiceItemController(data);

    if (isSuccess) {
      handleToggleUpdateInvoiceItem();
      fetchInvoiceInfoController(openInvoices[value]._id);
      fetchInvoiceItemsController(openInvoices[value]._id);
    }
  };

  const handleDeleteInvoiceItem = async (id) => {
    const isSuccess = await deleteInvoiceItemController(id);

    if (isSuccess) {
      handleToggleDeleteInvoiceItem();
      fetchInvoiceInfoController(openInvoices[value]._id);
      fetchInvoiceItemsController(openInvoices[value]._id);
    }
  };

  const handleCompleteInvoice = async () => {
    const isSuccess = await completeInvoiceController(openInvoices[value]._id);

    if (isSuccess) {
      handleToggleCompleteInvoice();
      fetchInvoiceInfoController(openInvoices[value]._id);
    }
  };

  const handleCloseInvoice = async () => {
    const isSuccess = await closeInvoiceController(openInvoices[value]._id);

    if (isSuccess) {
      handleToggleCloseInvoice();
      fetchOpenInvoicesController();
    }
  };

  const handleAddPayment = async (values) => {
    const data = {
      paymentInvoice: openInvoices[value]._id,
      ...values,
    };
    const isSuccess = await createPayment(data);

    if (isSuccess) {
      handleToggleAddPayment();
      fetchInvoiceInfoController(openInvoices[value]._id);
    }
  };

  useEffect(() => {
    fetchItemsForInvoiceSelection(queryParams);
  }, [selectedFilters, pagination.page]);

  useEffect(() => {
    fetchAllCategories();
    fetchCustomerOptions();
    fetchOpenInvoicesController();
  }, []);

  useEffect(() => {
    if (openInvoices.length > 0) {
      fetchInvoiceInfoController(openInvoices[value]._id);
      fetchInvoiceItemsController(openInvoices[value]._id);
    }
  }, [value, openInvoices]);

  return (
    <PosView
      items={selectItems}
      itemsCount={selectItemsCount}
      itemCategories={categories}
      customerOptions={customerOptions}
      invoices={openInvoices}
      invoiceInfo={invoiceInfo}
      invoiceItems={invoiceItems}
      selectedInvoice={selectedInvoice}
      selectedItem={selectedItem}
      selectedFilters={selectedFilters}
      value={value}
      pagination={pagination}
      isOpenAdd={isOpenAdd}
      isOpenInvoiceUpdate={isOpenInvoiceUpdate}
      isOpenUpdate={isOpenUpdate}
      isOpenDelete={isOpenDelete}
      isOpenComplete={isOpenComplete}
      isOpenClose={isOpenClose}
      isOpenAddPayment={isOpenAddPayment}
      isLoadingItems={isLoadingSelect}
      isLoadingItemCategories={isLoadingCategories}
      isLoadingCustomerOptions={isLoadingCustomerOptions}
      isLoadingInvoices={isLoadingOpenInvoices}
      isLoadingInvoiceInfo={isLoadingInvoiceInfo}
      isLoadingInvoiceItems={isLoadingInvoiceItems}
      isLoadingCreateInvoice={isLoadingCreateInvoice}
      isLoadingUpdateInvoice={isLoadingUpdateInvoice}
      isLoadingAddInvItem={isLoadingAddInvItem}
      isLoadingUpdateInvItem={isLoadingUpdateInvItem}
      isLoadingDeleteInvItem={isLoadingDeleteInvItem}
      isLoadingCompleteInvoice={isLoadingCompleteInvoice}
      isLoadingClosingInvoice={isLoadingClosingInvoice}
      isLoadingCreatePayment={isLoadingCreate}
      handleSelectCategories={handleSelectCategory}
      handleChangeSearch={handleChangeSearch}
      handleChangeTab={handleChangeTab}
      handleToggleAddInvoice={handleToggleAddInvoice}
      handleToggleUpdateInvoice={handleToggleUpdateInvoice}
      handleToggleUpdateInvoiceItem={handleToggleUpdateInvoiceItem}
      handleToggleDeleteInvoiceItem={handleToggleDeleteInvoiceItem}
      handleToggleCompleteInvoice={handleToggleCompleteInvoice}
      handleToggleCloseInvoice={handleToggleCloseInvoice}
      handleToggleAddPayment={handleToggleAddPayment}
      handleAddNewInvoice={handleAddNewInvoice}
      handleUpdateInvoice={handleUpdateInvoice}
      handleAddNewItem={handleAddNewItem}
      handleUpdateItem={handleUpdateItem}
      handleDeleteInvoiceItem={handleDeleteInvoiceItem}
      handleCompleteInvoice={handleCompleteInvoice}
      handleCloseInvoice={handleCloseInvoice}
      handleAddPayment={handleAddPayment}
    />
  );
};

export default PosController;
