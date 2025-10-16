import { useLocation } from 'react-router-dom';
import { InvoiceView } from '../view/invoice-view';
import { useInvoice } from 'src/hooks/useInvoice';
import { useEffect, useState } from 'react';
import usePayment from 'src/hooks/usePayment';

const InvoiceController = () => {
  const location = useLocation();

  const { id } = location.state || {};

  const {
    invoiceInfo,
    invoiceItems,
    isLoadingInvoiceInfo,
    isLoadingInvoiceItems,
    fetchInvoiceInfoController,
    fetchInvoiceItemsController,
  } = useInvoice();

  const { isLoadingCreate, createPayment } = usePayment();

  const [isOpenCreatePayment, setIsOpenCreatePayment] = useState(false);

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

  useEffect(() => {
    fetchInvoiceInfoController(id);
    fetchInvoiceItemsController(id);
  }, []);

  return (
    <InvoiceView
      invoiceInfo={invoiceInfo}
      invoiceItems={invoiceItems}
      isOpenCreatePayment={isOpenCreatePayment}
      isLoadingInvoiceInfo={isLoadingInvoiceInfo}
      isLoadingInvoiceItems={isLoadingInvoiceItems}
      isLoadingCreate={isLoadingCreate}
      handleToggleCreatePayment={handleToggleCreatePayment}
      handleCreatePayment={handleCreatePayment}
    />
  );
};

export default InvoiceController;
