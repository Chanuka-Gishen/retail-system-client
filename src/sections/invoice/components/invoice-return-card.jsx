import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Divider,
  Stack,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  CalendarToday,
  Person,
  Receipt,
  Inventory,
  AttachMoney,
  Print,
  PublishedWithChanges,
} from '@mui/icons-material';
import { fDateTime } from 'src/utils/format-time';
import { formatCurrency } from 'src/utils/format-number';
import { STATUS_ISSUED } from 'src/constants/common-constants';

const InvoiceReturnCard = ({ data }) => {
  // Status color mapping
  const getStatusColor = (status) => {
    const statusColors = {
      Issued: 'primary',
      Processed: 'success',
      Expired: 'error',
    };
    return statusColors[status.toLowerCase()] || 'default';
  };

  return (
    <Card elevation={3} sx={{ margin: 'auto' }}>
      {/* Return Header */}
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Receipt color="primary" />
            <Typography variant="h6" component="span">
              Return #{data.returnCode}
            </Typography>
            <Chip
              label={data.returnStatus}
              color={getStatusColor(data.returnStatus)}
              size="small"
            />
            <Box flexGrow={1} />
            <IconButton onClick={null}>
              <Print />
            </IconButton>
            {data.returnStatus === STATUS_ISSUED && (
              <IconButton onClick={null}>
                <PublishedWithChanges />
              </IconButton>
            )}
          </Box>
        }
        subheader={`Created: ${fDateTime(data.createdAt)}`}
      />

      <CardContent>
        {/* Return Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <AttachMoney fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Total Value:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(data.returnTotalValue)}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Expires:
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight="medium"
                  color={new Date(data.returnExpiresAt) < new Date() ? 'error' : 'text.primary'}
                >
                  {fDateTime(data.returnExpiresAt)}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Issued By:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {`${data.returnIssuedBy?.userFirstName} ${data.returnIssuedBy?.userLastName}`}
                </Typography>
              </Box>

              {data.returnProcessedBy && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Processed By:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {data.returnProcessedBy?.name || 'User ID: ' + data.returnProcessedBy}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Return Items */}
        <Typography variant="h6" gutterBottom>
          Return Items ({data.returnItems.length})
        </Typography>

        <Stack spacing={2}>
          {data.returnItems.map((item, index) => (
            <Box
              key={item._id || index}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.default',
              }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Item Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inventory: {'Item ID: ' + item.returnInventoryItem.itemCode}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Item: {item.returnInventoryItem?.itemName}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Quantity & Value
                  </Typography>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" color="text.secondary">
                      Qty: {item.returnQuantity}/{item.returnOriginalQuantity}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(item.returnItemTotalValue)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      <strong>Reason:</strong> {item.returnReason}
                    </Typography>
                    <Chip
                      icon={<Inventory />}
                      label={`${Math.round((item.returnQuantity / item.returnOriginalQuantity) * 100)}% returned`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Stack>

        {/* Updated At */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {fDateTime(data.updatedAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InvoiceReturnCard;
