import { Helmet } from 'react-helmet-async';

import { Overview } from 'src/sections/overview';

// ----------------------------------------------------------------------

export default function AppPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard | 360-POS </title>
      </Helmet>

      <Overview />
    </>
  );
}
