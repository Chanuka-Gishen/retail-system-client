import * as React from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { LoadingButton } from '@mui/lab';
import { Box, Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import { formatCurrency } from 'src/utils/format-number';

const ItemDeleteConfirmationDialog = ({ open, value, handleClose, handleSubmit, isLoading }) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Confirmation Dialog</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TableContainer>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>{value.item.itemName}</TableCell>
                  <TableCell>{value.quantity}</TableCell>
                  <TableCell>{formatCurrency(value.totalNetPrice)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <DialogContentText id="alert-dialog-description">
            Are you sure that you want to delete this invoice item completely?
          </DialogContentText>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          disabled={isLoading}
          loading={isLoading}
          onClick={() => handleSubmit(value._id)}
          variant="contained"
          autoFocus
          sx={{ backgroundColor: 'red', color: 'white' }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemDeleteConfirmationDialog;
