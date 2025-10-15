import { Helmet } from 'react-helmet-async';
import { Accounts } from 'src/sections/accounts';

// ----------------------------------------------------------------------

export default function AccountsPage() {
  return (
    <>
      <Helmet>
        <title> Accounts | 360-POS </title>
      </Helmet>

      <Accounts />
    </>
  );
}
