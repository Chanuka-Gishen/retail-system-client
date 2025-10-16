import { Helmet } from 'react-helmet-async';
import { Invoice } from 'src/sections/invoice';

// ----------------------------------------------------------------------

export default function InvoicePage() {
  return (
    <>
      <Helmet>
        <title> Invoice | 360-POS </title>
      </Helmet>

      <Invoice />
    </>
  );
}
