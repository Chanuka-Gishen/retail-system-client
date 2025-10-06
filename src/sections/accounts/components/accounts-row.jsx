import { TableCell, TableRow } from '@mui/material';
import { PAY_INPUT_MANUALLY } from 'src/constants/payment-input-type';
import { formatCurrency } from 'src/utils/format-number';
import { fDate } from 'src/utils/format-time';

export const AccountsRow = ({ data, onClick }) => {
  return (
    <>
      {data.map((item, index) => {
        return (
          <TableRow
            key={index}
            hover={item.paymentInputType === PAY_INPUT_MANUALLY ? true : false}
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              item.paymentInputType === PAY_INPUT_MANUALLY ? onClick(item) : null;
            }}
          >
            <TableCell>{item.paymentType}</TableCell>
            <TableCell>{item.paymentSource}</TableCell>
            <TableCell>{item.paymentNotes}</TableCell>
            <TableCell>{formatCurrency(item.paymentAmount)}</TableCell>
            <TableCell>{item.paymentMethod}</TableCell>
            <TableCell>{item.paymentTransactionId}</TableCell>
            <TableCell>{`${item.paymentCollectedBy.userFirstName} ${item.paymentCollectedBy.userLastName}`}</TableCell>
            <TableCell>{fDate(item.createdAt)}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
};
