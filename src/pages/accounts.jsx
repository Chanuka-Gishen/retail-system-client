import { Helmet } from 'react-helmet-async';
import { Accounts } from 'src/sections/accounts';

// ----------------------------------------------------------------------

export default function AccountsPage() {
  return (
    <>
      <Helmet>
        <title> Accounts | POS APP </title>
      </Helmet>

      <Accounts />
    </>
  );
}
