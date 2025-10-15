import useInventory from 'src/hooks/useInventory';
import { PosView } from '../view/pos-view';
import { useEffect, useState } from 'react';
import usePagination from 'src/hooks/usePagination';
import { INV_CUS_TYP_GUEST } from 'src/constants/invoiceConstants';
import { useInvoice } from 'src/hooks/useInvoice';
import { WO_STATUS_COMPLETED, WO_STATUS_OPEN } from 'src/constants/workorderStatus';

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
    isLoadingAddInvItem,
    isLoadingUpdateInvItem,
    isLoadingDeleteInvItem,
    isLoadingCompleteInvoice,
    isLoadingClosingInvoice,
    fetchOpenInvoicesController,
    fetchInvoiceInfoController,
    fetchInvoiceItemsController,
    createInvoiceController,
    addInvoiceItemController,
    updateInvoiceItemController,
    deleteInvoiceItemController,
    completeInvoiceController,
    closeInvoiceController,
  } = useInvoice();

  const pagination = usePagination();

  const [selectedFilters, setSelectedFilters] = useState({
    name: '',
    code: '',
    category: null,
  });

  const [value, setValue] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenComplete, setIsOpenComplete] = useState(false);
  const [isOpenClose, setIsOpenClose] = useState(false);

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

  useEffect(() => {
    fetchItemsForInvoiceSelection(queryParams);
  }, [selectedFilters, pagination.page]);

  useEffect(() => {
    fetchAllCategories();
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
      invoices={openInvoices}
      invoiceInfo={invoiceInfo}
      invoiceItems={invoiceItems}
      selectedItem={selectedItem}
      selectedFilters={selectedFilters}
      value={value}
      pagination={pagination}
      isOpenAdd={isOpenAdd}
      isOpenUpdate={isOpenUpdate}
      isOpenDelete={isOpenDelete}
      isOpenComplete={isOpenComplete}
      isOpenClose={isOpenClose}
      isLoadingItems={isLoadingSelect}
      isLoadingItemCategories={isLoadingCategories}
      isLoadingInvoices={isLoadingOpenInvoices}
      isLoadingInvoiceInfo={isLoadingInvoiceInfo}
      isLoadingInvoiceItems={isLoadingInvoiceItems}
      isLoadingCreateInvoice={isLoadingCreateInvoice}
      isLoadingAddInvItem={isLoadingAddInvItem}
      isLoadingUpdateInvItem={isLoadingUpdateInvItem}
      isLoadingDeleteInvItem={isLoadingDeleteInvItem}
      isLoadingCompleteInvoice={isLoadingCompleteInvoice}
      isLoadingClosingInvoice={isLoadingClosingInvoice}
      handleSelectCategories={handleSelectCategory}
      handleChangeSearch={handleChangeSearch}
      handleChangeTab={handleChangeTab}
      handleToggleAddInvoice={handleToggleAddInvoice}
      handleToggleUpdateInvoiceItem={handleToggleUpdateInvoiceItem}
      handleToggleDeleteInvoiceItem={handleToggleDeleteInvoiceItem}
      handleToggleCompleteInvoice={handleToggleCompleteInvoice}
      handleToggleCloseInvoice={handleToggleCloseInvoice}
      handleAddNewInvoice={handleAddNewInvoice}
      handleAddNewItem={handleAddNewItem}
      handleUpdateItem={handleUpdateItem}
      handleDeleteInvoiceItem={handleDeleteInvoiceItem}
      handleCompleteInvoice={handleCompleteInvoice}
      handleCloseInvoice={handleCloseInvoice}
    />
  );
};

export default PosController;
