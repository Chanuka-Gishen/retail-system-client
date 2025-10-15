import { Helmet } from 'react-helmet-async';
import { Inventory } from 'src/sections/inventory';

// ----------------------------------------------------------------------

export default function InventoryPage() {
  return (
    <>
      <Helmet>
        <title> Inventory | 360-POS </title>
      </Helmet>

      <Inventory />
    </>
  );
}
