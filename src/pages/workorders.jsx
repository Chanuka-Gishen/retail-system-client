import { Helmet } from 'react-helmet-async';
import { Workorders } from 'src/sections/workorders';

// ----------------------------------------------------------------------

export default function AppPage() {
  return (
    <>
      <Helmet>
        <title> Workorders | POS APP </title>
      </Helmet>

      <Workorders />
    </>
  );
}
