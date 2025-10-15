import { Helmet } from 'react-helmet-async';
import { Employees } from 'src/sections/employees';

// ----------------------------------------------------------------------

export default function EmployeesPage() {
  return (
    <>
      <Helmet>
        <title> Employees | 360-POS </title>
      </Helmet>

      <Employees />
    </>
  );
}
