import { Chip, TableCell, TableRow } from '@mui/material';
import { ITEM_STS_INSTOCK, ITEM_STS_OUTOFSTOCK } from 'src/constants/item-status';
import { formatCurrency } from 'src/utils/format-number';

export const InventoryRow = ({ data, onClickRow }) => {
  return (
    <>
      {data.map((item, index) => (
        <TableRow
          key={index}
          hover={true}
          onClick={() => onClickRow(item._id)}
          sx={{ cursor: 'pointer' }}
        >
          <TableCell>{item.itemCode}</TableCell>
          <TableCell>{item.itemName}</TableCell>
          <TableCell>{item.itemDescription}</TableCell>
          <TableCell>{item.itemCategory.categoryTitle}</TableCell>
          <TableCell>{item.itemQuantity}</TableCell>
          <TableCell>{item.itemThreshold}</TableCell>
          <TableCell>{formatCurrency(item.itemBuyingPrice)}</TableCell>
          <TableCell>{formatCurrency(item.itemSellingPrice)}</TableCell>
          <TableCell>
            <Chip
              label={item.itemStatus}
              color={
                item.itemStatus === ITEM_STS_INSTOCK
                  ? 'success'
                  : item.itemStatus === ITEM_STS_OUTOFSTOCK
                    ? 'error'
                    : 'warning'
              }
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
