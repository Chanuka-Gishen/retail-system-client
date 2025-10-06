import React from 'react';

import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { CustomTable } from 'src/components/custom-table/custom-table';
import { AddItemDialog } from '../components/add-item-dialog';
import { InventoryRow } from '../components/inventory-row';
import { CategoryFormDialog } from '../components/category-form-dialog';

export const InventoryView = ({
  items,
  categories,
  categoriesSelect,
  selectedFilters,
  initialCatValue,
  isOpenAdd,
  isOpenCatAdd,
  isOpenCatUpdate,
  isLoading,
  isLoadingAdd,
  isLoadingCategories,
  isLoadingCategoriesSelection,
  isLoadingAddCategory,
  isLoadingUpdateCategory,
  handleChangeSearch,
  handleToggleAddDialog,
  handleAddItem,
  tableKeys,
  limit,
  page,
  documentCount,
  handleNavigateItem,
  handleChangePage,
  handleChangeRowsPerPage,
  handleToggleAddCatDialog,
  handleToggleUpdateCatDialog,
  handleAddCategory,
  handleUpdateCategory,
}) => {
  const matchDownSm = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  return (
    <Container maxWidth={'xl'}>
      <Grid container spacing={2} alignItems={'center'}>
        <Grid size={{ sm: 12, md: 12, lg: 12 }}>
          <Stack
            direction={{ sx: 'column', md: 'row' }}
            alignItems={{ sx: 'start', md: 'center' }}
            justifyContent={{ sx: 'flex-start', md: 'space-between' }}
            rowGap={1}
          >
            <Typography variant="h4">Manage Inventory</Typography>
            <Box flexGrow={1} />
            <Stack direction="row" spacing={2}>
              <Tooltip title="Add Category">
                <Button
                  variant="contained"
                  endIcon={<AddCircleOutlineIcon />}
                  onClick={handleToggleAddCatDialog}
                >
                  Add Category
                </Button>
              </Tooltip>
              <Tooltip title="Add Item">
                <Button
                  variant="contained"
                  endIcon={<AddCircleOutlineIcon />}
                  onClick={handleToggleAddDialog}
                >
                  Add Item
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        </Grid>
        {categories.map((item, index) => (
          <Grid key={index} size={{ xs: 6, md: 3, lg: 2, xl: 1 }}>
            <Chip
              label={`${item.categoryTitle} (${item.itemsCount})`}
              onClick={() => handleToggleUpdateCatDialog(item)}
            />
          </Grid>
        ))}
        <Grid size={12}></Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TextField
            size="small"
            label="Item Code"
            name="code"
            value={selectedFilters.code}
            onChange={handleChangeSearch}
            autoComplete="off"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TextField
            size="small"
            label="Item Title"
            name="name"
            value={selectedFilters.name}
            onChange={handleChangeSearch}
            autoComplete="off"
            fullWidth
          />
        </Grid>
        <Grid size={12}>
          <Card>
            <Paper elevation={0}>
              <CustomTable
                keys={tableKeys}
                dataLength={items.length}
                isLoading={isLoading}
                documentCount={documentCount}
                page={page}
                limit={limit}
                handleChangePage={handleChangePage}
                handleChangeRowsPerPage={handleChangeRowsPerPage}
                tableBody={<InventoryRow data={items} onClickRow={handleNavigateItem} />}
              />
            </Paper>
          </Card>
        </Grid>
      </Grid>
      {isOpenAdd && (
        <AddItemDialog
          open={isOpenAdd}
          categoriesSelect={categoriesSelect}
          handleOpenClose={handleToggleAddDialog}
          isLoading={isLoadingAdd}
          isLoadingCategoriesSelection={isLoadingCategoriesSelection}
          handleConfirm={handleAddItem}
        />
      )}
      {isOpenCatAdd && (
        <CategoryFormDialog
          open={isOpenCatAdd}
          initlaValues={initialCatValue}
          handleOpenClose={handleToggleAddCatDialog}
          handleConfirm={handleAddCategory}
          isLoading={isLoadingAddCategory}
        />
      )}
      {isOpenCatUpdate && (
        <CategoryFormDialog
          open={isOpenCatUpdate}
          initlaValues={initialCatValue}
          handleOpenClose={handleToggleUpdateCatDialog}
          handleConfirm={handleUpdateCategory}
          isLoading={isLoadingUpdateCategory}
        />
      )}
    </Container>
  );
};
