import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box, Avatar } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { formatCurrency } from 'src/utils/format-number';

const InventoryItemCard = ({ item, onSelect, isLoading }) => {
  return (
    <Card
      sx={{
        width: 180,
        borderRadius: 3,
        boxShadow: 2,
        transition: '0.2s',
        '&:hover': {
          boxShadow: 5,
          transform: 'scale(1.03)',
        },
      }}
    >
      <CardActionArea disabled={isLoading} onClick={() => onSelect(item._id)}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pt: 2,
          }}
        >
          {item.image ? (
            <Avatar
              src={item.image}
              alt={item.itemName}
              sx={{ width: 60, height: 60, bgcolor: 'transparent' }}
            />
          ) : (
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'grey.200',
                color: 'text.secondary',
              }}
            >
              <Inventory2OutlinedIcon fontSize="large" />
            </Avatar>
          )}
        </Box>

        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {item.itemName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Price: {formatCurrency(item.itemSellingPrice)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wholesale: {formatCurrency(item.itemWholesalePrice)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default InventoryItemCard;
