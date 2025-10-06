import { Helmet } from 'react-helmet-async';
import { Jobs } from 'src/sections/jobs';

// ----------------------------------------------------------------------

export default function JobsPage() {
  return (
    <>
      <Helmet>
        <title> Jobs | POS APP </title>
      </Helmet>

      <Jobs />
    </>
  );
}
