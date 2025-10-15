import { Helmet } from 'react-helmet-async';
import { Pos } from 'src/sections/pos';

// ----------------------------------------------------------------------

export default function PosPage() {
  return (
    <>
      <Helmet>
        <title> POS | 360-POS </title>
      </Helmet>

      <Pos />
    </>
  );
}
