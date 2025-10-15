import { Helmet } from 'react-helmet-async';
import { CustomerDetails } from 'src/sections/customer-details';

// ----------------------------------------------------------------------

export default function CustomerDetailsPage() {
  return (
    <>
      <Helmet>
        <title> Details | 360-POS </title>
      </Helmet>

      <CustomerDetails />
    </>
  );
}
