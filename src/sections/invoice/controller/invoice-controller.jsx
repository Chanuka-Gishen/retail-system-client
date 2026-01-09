import { useLocation } from 'react-router-dom';
import { InvoiceView } from '../view/invoice-view';
import { useInvoice } from 'src/hooks/useInvoice';
import { useEffect, useState } from 'react';
import usePayment from 'src/hooks/usePayment';
import { REFUND_REASON_CUSTOMER_DISSATISFACTION } from 'src/constants/invoice-constants';

const InvoiceController = () => {
  const location = useLocation();

  const { id } = location.state || {};

  const {
    invoiceInfo,
    invoiceItems,
    returnItems,
    isLoadingInvoiceInfo,
    isLoadingInvoiceItems,
    isLoadingCreateReturnItems,
    isLoadingReturnItems,
    createReturnItemsController,
    fetchInvoiceInfoController,
    fetchInvoiceItemsController,
    fetchReturnItemsController,
  } = useInvoice();

  const { isLoadingCreate, createPayment } = usePayment();

  const [initialReturnValues, setInitialReturnValues] = useState({ returnItems: [] });

  const [isOpenReturnItems, setIsOpenReturnItems] = useState(false);
  const [isOpenCreatePayment, setIsOpenCreatePayment] = useState(false);

  const handleToggleReturnItems = () => {
    if (!isOpenReturnItems) {
      const items = invoiceItems.map((data) => ({
        returnInvoiceItem: data._id,
        returnItemName: data.item.itemName,
        returnQuantity: data.quantity,
        returnReason: REFUND_REASON_CUSTOMER_DISSATISFACTION,
      }));

      setInitialReturnValues({ returnItems: items });
    } else {
      setInitialReturnValues({ returnItems: [] });
    }
    setIsOpenReturnItems(!isOpenReturnItems);
  };

  const handleToggleCreatePayment = () => {
    setIsOpenCreatePayment(!isOpenCreatePayment);
  };

  const handleCreatePayment = async (values) => {
    const data = {
      paymentInvoice: invoiceInfo._id,
      ...values,
    };

    const isSuccess = await createPayment(data);

    if (isSuccess) {
      fetchInvoiceInfoController(id);
      handleToggleCreatePayment();
    }
  };

  const handleReturnItems = async (values) => {
    const data = {
      returnInvoice: invoiceInfo._id,
      ...values,
    };

    const isSuccess = await createReturnItemsController(data);

    if (isSuccess) {
      handleToggleReturnItems();
      fetchReturnItemsController(id);
    }
  };

  useEffect(() => {
    fetchInvoiceInfoController(id);
    fetchInvoiceItemsController(id);
    fetchReturnItemsController(id);
  }, []);

  return (
    <InvoiceView
      invoiceInfo={invoiceInfo}
      invoiceItems={invoiceItems}
      initialReturnValues={initialReturnValues}
      returnItems={returnItems}
      isOpenReturnItems={isOpenReturnItems}
      isOpenCreatePayment={isOpenCreatePayment}
      isLoadingInvoiceInfo={isLoadingInvoiceInfo}
      isLoadingInvoiceItems={isLoadingInvoiceItems}
      isLoadingCreate={isLoadingCreate}
      isLoadingCreateReturnItems={isLoadingCreateReturnItems}
      isLoadingReturnItems={isLoadingReturnItems}
      handleToggleReturnItems={handleToggleReturnItems}
      handleToggleCreatePayment={handleToggleCreatePayment}
      handleCreatePayment={handleCreatePayment}
      handleReturnItems={handleReturnItems}
    />
  );
};

export default InvoiceController;
