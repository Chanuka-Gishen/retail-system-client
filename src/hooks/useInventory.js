import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { BACKEND_API } from 'src/axios/constant/backend-api';
import { backendAuthApi } from 'src/axios/instance/backend-axios-instance';
import responseUtil from 'src/utils/responseUtil';

const useInventory = () => {
  const { enqueueSnackbar } = useSnackbar();

  const sourceToken = axios.CancelToken.source();

  const [items, setItems] = useState([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [item, setItem] = useState(null);
  const [stockLogs, setStockLogs] = useState([]);
  const [stockLogsCount, setStockLogsCount] = useState(0);
  const [selectItems, setSelectItems] = useState([]);
  const [selectItemsCount, setSelectItemsCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoriesSelect, setCategoriesSelect] = useState([]);
  const [invStockStats, setInvStockStats] = useState([]);
  const [invStockStatsCount, setInvStockStatsCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItem, setIsLoadingItem] = useState(true);
  const [isLoadingSelect, setIsLoadingSelect] = useState(false);
  const [isLoadingAdd, setIsLoadingAdd] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isLoadingAddCategory, setIsLoadingAddCategory] = useState(false);
  const [isLoadingUpdateCategory, setIsLoadingUpdateCategory] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingCategoriesSelection, setIsLoadingCategoriesSelection] = useState(false);
  const [isLoadingStockUpdate, setIsLoadingStockUpdate] = useState(false);
  const [isLoadingStockUpdateLogs, setIsLoadingStockUpdateLogs] = useState(false);
  const [isLoadingStockAvailabilityStats, setIsLoadingStockAvailabilityStats] = useState(false);

  // Fetch all inventory items
  const fetchAllItems = async (params) => {
    setIsLoading(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS,
      method: 'GET',
      cancelToken: sourceToken.token,
      params,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setItems(res.data.responseData.data);
          setItemsCount(res.data.responseData.count);
        }
      })
      .catch(() => {
        setIsLoading(false);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return items;
  };

  // Fetch item info
  const fetchItemInfo = async (id) => {
    setIsLoadingItem(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_INFO,
      method: 'GET',
      cancelToken: sourceToken.token,
      params: {
        id,
      },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setItem(res.data.responseData);
        }
      })
      .catch(() => {
        setIsLoadingItem(false);
      })
      .finally(() => {
        setIsLoadingItem(false);
      });
  };

  // Fetch inventory items for selection ( invoice )
  const fetchItemsForInvoiceSelection = async (params) => {
    if (isLoadingSelect) return;

    setIsLoadingSelect(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_SELECT,
      method: 'GET',
      cancelToken: sourceToken.token,
      params,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setSelectItems(res.data.responseData.data);
          setSelectItemsCount(res.data.responseData.count);
        }
      })
      .catch(() => {
        setIsLoadingSelect(false);
      })
      .finally(() => {
        setIsLoadingSelect(false);
      });
  };

  // Add inventory item
  const addItems = async (data) => {
    if (isLoadingAdd) return;

    let isSuccess = false;

    setIsLoadingAdd(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_ADD,
      method: 'POST',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        } else {
          enqueueSnackbar(res.data.responseMessage, {
            variant: responseUtil.findResponseType(res.data.responseCode),
          });
        }
      })
      .catch(() => {
        setIsLoadingAdd(false);
      })
      .finally(() => {
        setIsLoadingAdd(false);
      });
    return isSuccess;
  };

  // Update inventory item
  const updateItem = async (id, data) => {
    if (isLoadingEdit || !id) return;

    let isSuccess = false;

    setIsLoadingEdit(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_EDIT,
      method: 'PUT',
      cancelToken: sourceToken.token,
      params: {
        id,
      },
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        } else {
          enqueueSnackbar(res.data.responseMessage, {
            variant: responseUtil.findResponseType(res.data.responseCode),
          });
        }
      })
      .catch(() => {
        setIsLoadingEdit(false);
      })
      .finally(() => {
        setIsLoadingEdit(false);
      });

    return isSuccess;
  };

  // Add inventory category
  const addInventoryCategory = async (data) => {
    let isSuccess = false;

    setIsLoadingAddCategory(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_CATEGORY_ADD,
      method: 'POST',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => {
        setIsLoadingAddCategory(false);
      })
      .finally(() => {
        setIsLoadingAddCategory(false);
      });

    return isSuccess;
  };

  // Update inventory category
  const updateInventoryCategory = async (data) => {
    let isSuccess = false;

    setIsLoadingUpdateCategory(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_CATEGORY_EDIT,
      method: 'PUT',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        }
      })
      .catch(() => {
        setIsLoadingUpdateCategory(false);
      })
      .finally(() => {
        setIsLoadingUpdateCategory(false);
      });

    return isSuccess;
  };

  const fetchAllCategories = async () => {
    setIsLoadingCategories(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_CATEGORIES,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setCategories(res.data.responseData);
        }
      })
      .catch(() => {
        setIsLoadingCategories(false);
      })
      .finally(() => {
        setIsLoadingCategories(false);
      });
  };

  const fetchAllCategoriesForSelection = async () => {
    setIsLoadingCategoriesSelection(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_CATEGORIES_SELECTION,
      method: 'GET',
      cancelToken: sourceToken.token,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setCategoriesSelect(res.data.responseData);
        }
      })
      .catch(() => {
        setIsLoadingCategoriesSelection(false);
      })
      .finally(() => {
        setIsLoadingCategoriesSelection(false);
      });
  };

  // Update inventory item stock
  const updateItemStock = async (data) => {
    if (isLoadingStockUpdate) return;

    let isSuccess = false;

    setIsLoadingStockUpdate(true);

    await backendAuthApi({
      url: BACKEND_API.ITEM_UPDATE_STOCK,
      method: 'PUT',
      cancelToken: sourceToken.token,
      data,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          isSuccess = true;
        } else {
          enqueueSnackbar(res.data.responseMessage, {
            variant: responseUtil.findResponseType(res.data.responseCode),
          });
        }
      })
      .catch(() => {
        setIsLoadingStockUpdate(false);
      })
      .finally(() => {
        setIsLoadingStockUpdate(false);
      });

    return isSuccess;
  };

  // Get stock update logs
  const fetchStockUpdateLogs = async (params) => {
    if (isLoadingStockUpdateLogs) return;

    setIsLoadingStockUpdateLogs(true);

    await backendAuthApi({
      url: BACKEND_API.ITEM_UPDATE_LOGS,
      method: 'GET',
      cancelToken: sourceToken.token,
      params,
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setStockLogs(res.data.responseData.data);
          setStockLogsCount(res.data.responseData.count);
        }
      })
      .catch(() => {
        setIsLoadingStockUpdateLogs(false);
      })
      .finally(() => {
        setIsLoadingStockUpdateLogs(false);
      });
  };

  // Get stock items statistics - status (low/empty)
  const fetchStockStatistics = async (status) => {
    if (isLoadingStockAvailabilityStats) return;

    setIsLoadingStockAvailabilityStats(true);

    await backendAuthApi({
      url: BACKEND_API.ITEMS_STOCK_STATISTICS,
      method: 'GET',
      cancelToken: sourceToken.token,
      params: {
        status,
      },
    })
      .then((res) => {
        if (responseUtil.isResponseSuccess(res.data.responseCode)) {
          setInvStockStats(res.data.responseData.data);
          setInvStockStatsCount(res.data.responseData.count);
        }
      })
      .catch(() => {
        setIsLoadingStockAvailabilityStats(false);
      })
      .finally(() => {
        setIsLoadingStockAvailabilityStats(false);
      });
  };

  return {
    items,
    selectItems,
    selectItemsCount,
    item,
    itemsCount,
    categories,
    categoriesSelect,
    stockLogs,
    stockLogsCount,
    invStockStats,
    invStockStatsCount,
    isLoading,
    isLoadingItem,
    isLoadingSelect,
    isLoadingAdd,
    isLoadingEdit,
    isLoadingAddCategory,
    isLoadingUpdateCategory,
    isLoadingCategories,
    isLoadingCategoriesSelection,
    isLoadingStockUpdate,
    isLoadingStockUpdateLogs,
    isLoadingStockAvailabilityStats,
    fetchAllItems,
    fetchItemInfo,
    fetchItemsForInvoiceSelection,
    fetchAllCategories,
    fetchAllCategoriesForSelection,
    addItems,
    updateItem,
    addInventoryCategory,
    updateInventoryCategory,
    updateItemStock,
    fetchStockUpdateLogs,
    fetchStockStatistics,
  };
};

export default useInventory;
