import { Helmet } from 'react-helmet-async';
import { Invoices } from 'src/sections/invoices';

// ----------------------------------------------------------------------

export default function InvoicesPage() {
  return (
    <>
      <Helmet>
        <title> Invoices | 360-POS </title>
      </Helmet>

      <Invoices />
    </>
  );
}
