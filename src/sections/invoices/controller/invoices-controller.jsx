import { useNavigate } from 'react-router-dom';
import { InvoicesView } from '../view/invoices-view';
import { useInvoice } from 'src/hooks/useInvoice';
import usePagination from 'src/hooks/usePagination';
import { useEffect, useState } from 'react';
import { NAVIGATION_ROUTES } from 'src/routes/navigation-routes';

const InvoicesController = () => {
  const tableTitles = [
    'Invoice Number',
    'Customer Type',
    'Customer Name',
    'Payment Status',
    'Total Amount',
    'Balance Amount',
    'Created At',
    'Closed At',
  ];

  const navigate = useNavigate();

  const { invoices, invoicesCount, isLoadingInvoices, fetchClosedInvoicesController } =
    useInvoice();

  const pagination = usePagination();

  const [searchParams, setSearchParams] = useState({
    number: '',
    type: null,
    status: null,
    name: '',
    mobile: '',
  });

  //------------------
  const queryParams = { page: pagination.page, limit: pagination.limit, ...searchParams };
  //------------------

  const handleChangeSearchParam = (event) => {
    setSearchParams({
      ...searchParams,
      [event.target.name]: event.target.value,
    });
  };

  const handleDeleteSearchParam = (filterName) => {
    setSearchParams((prevFilters) => ({
      ...prevFilters,
      [filterName]: ['type', 'status'].includes(filterName) ? null : '',
    }));
  };

  const handleOnRowClick = (data) => {
    navigate(NAVIGATION_ROUTES.invoices.details.base, {
      state: {
        id: data._id,
      },
    });
  };

  useEffect(() => {
    fetchClosedInvoicesController(queryParams);
  }, [pagination.page, pagination.limit, searchParams]);

  return (
    <InvoicesView
      tableTitles={tableTitles}
      searchParams={searchParams}
      invoices={invoices}
      invoicesCount={invoicesCount}
      isLoadingInvoices={isLoadingInvoices}
      handleOnRowClick={handleOnRowClick}
      pagination={pagination}
      handleChangeSearchParam={handleChangeSearchParam}
      handleDeleteSearchParam={handleDeleteSearchParam}
    />
  );
};

export default InvoicesController;
