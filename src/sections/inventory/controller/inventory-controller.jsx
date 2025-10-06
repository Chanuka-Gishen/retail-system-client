import React, { useEffect, useMemo, useState } from 'react';
import { InventoryView } from '../view/inventory-view';
import useInventory from 'src/hooks/useInventory';
import { NAVIGATION_ROUTES } from 'src/routes/navigation-routes';
import { useNavigate } from 'react-router-dom';

const InventoryController = () => {
  const tableKeys = [
    'Item Code',
    'Item Name',
    'Item Description',
    'Category',
    'Item Quantity',
    'Threshold',
    'Cost Price',
    'Selling Price',
    'Status',
  ];

  const navigate = useNavigate();
  const {
    items,
    itemsCount,
    categories,
    categoriesSelect,
    isLoading,
    isLoadingAdd,
    isLoadingCategories,
    isLoadingCategoriesSelection,
    isLoadingAddCategory,
    isLoadingUpdateCategory,
    fetchAllItems,
    fetchAllCategories,
    fetchAllCategoriesForSelection,
    addItems,
    addInventoryCategory,
    updateInventoryCategory,
  } = useInventory();

  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(0);

  const [selectedCat, setSelectedCat] = useState(null);

  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [isOpenCatAdd, setIsOpenCatAdd] = useState(false);
  const [isOpenCatUpdate, setIsOpenCatUpdate] = useState(false);

  const [selectedFilters, setSelectedFilters] = useState({
    name: '',
    code: '',
  });

  const [initialCatValue, setInitialCatValue] = useState({ categoryTitle: '' });

  const memoizedSelectedFilters = useMemo(() => selectedFilters, [selectedFilters]);

  //------------------
  const queryParams = { page, limit, ...selectedFilters };
  //------------------

  const handleChangeSearch = (e) => {
    setSelectedFilters((prevFilters) => ({
      ...prevFilters,
      [e.target.name]: e.target.value,
    }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setPage(0);
    setLimit(parseInt(event.target.value, 10));
  };

  const handleToggleAddDialog = () => {
    setIsOpenAdd(!isOpenAdd);
  };

  const handleToggleAddCatDialog = () => {
    setIsOpenCatAdd(!isOpenCatAdd);
  };

  const handleToggleUpdateCatDialog = (value = null) => {
    setSelectedCat(value);
    if (!isOpenCatUpdate) {
      setInitialCatValue({ categoryTitle: value.categoryTitle });
    } else {
      setInitialCatValue({ categoryTitle: '' });
    }
    setIsOpenCatUpdate(!isOpenCatUpdate);
  };

  const handleNavigateItem = (id) => {
    navigate(NAVIGATION_ROUTES.inventory.details.base, {
      state: {
        id,
      },
    });
  };

  const handleAddItem = async (data) => {
    const response = await addItems(data);

    if (response) {
      handleToggleAddDialog();
      await fetchAllItems(queryParams);
    }
  };

  const handleAddCategory = async (data) => {
    const isSuccess = await addInventoryCategory(data);

    if (isSuccess) {
      handleToggleAddCatDialog();
      await fetchAllCategories();
      await fetchAllCategoriesForSelection();
    }
  };

  const handleUpdateCategory = async (data) => {
    const body = {
      _id: selectedCat._id,
      ...data,
    };
    const isSuccess = await updateInventoryCategory(body);

    if (isSuccess) {
      handleToggleUpdateCatDialog();
      await fetchAllCategories();
      await fetchAllCategoriesForSelection();
    }
  };

  useEffect(() => {
    fetchAllItems(queryParams);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, memoizedSelectedFilters]);

  useEffect(() => {
    fetchAllCategoriesForSelection();
    fetchAllCategories();
  }, []);

  return (
    <InventoryView
      items={items}
      categories={categories}
      categoriesSelect={categoriesSelect}
      selectedFilters={selectedFilters}
      initialCatValue={initialCatValue}
      isLoading={isLoading}
      isLoadingAdd={isLoadingAdd}
      isLoadingCategories={isLoadingCategories}
      isLoadingCategoriesSelection={isLoadingCategoriesSelection}
      isLoadingAddCategory={isLoadingAddCategory}
      isLoadingUpdateCategory={isLoadingUpdateCategory}
      isOpenAdd={isOpenAdd}
      isOpenCatAdd={isOpenCatAdd}
      isOpenCatUpdate={isOpenCatUpdate}
      handleChangeSearch={handleChangeSearch}
      handleToggleAddDialog={handleToggleAddDialog}
      handleAddItem={handleAddItem}
      tableKeys={tableKeys}
      limit={limit}
      page={page}
      documentCount={itemsCount}
      handleNavigateItem={handleNavigateItem}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
      handleToggleAddCatDialog={handleToggleAddCatDialog}
      handleToggleUpdateCatDialog={handleToggleUpdateCatDialog}
      handleAddCategory={handleAddCategory}
      handleUpdateCategory={handleUpdateCategory}
    />
  );
};

export default InventoryController;
