import { Helmet } from 'react-helmet-async';
import { Workorders } from 'src/sections/workorders';

// ----------------------------------------------------------------------

export default function AppPage() {
  return (
    <>
      <Helmet>
        <title> Workorders | 360-POS </title>
      </Helmet>

      <Workorders />
    </>
  );
}
