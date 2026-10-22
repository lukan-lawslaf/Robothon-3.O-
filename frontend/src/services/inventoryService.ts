import { api, post } from './api';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity: number;
  isDistributed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAllocation {
  id: string;
  teamId: string;
  teamName: string;
  inventoryItemId: string;
  itemName: string;
  itemCategory: string;
  quantity: number;
  notes?: string | null;
  allocatedBy: string;
  adminName: string;
  allocatedAt: string;
  isAdjustment?: boolean;
}

export interface InventoryAdjustment {
  id: string;
  teamId: string;
  teamName: string;
  inventoryItemId: string;
  itemName: string;
  itemCategory: string;
  previousQuantity: number;
  adjustedDelta: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
  adminName: string;
  adjustedAt: string;
}

export interface InventorySummary {
  totalItems: number;
  totalUnits: number;
  availableUnits: number;
  allocatedUnits: number;
  distributedItems: number;
}

export interface InventoryImportSummary {
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorsCount: number;
  errors?: Array<{ row?: number; item: string; reason: string }>;
  details?: Array<{ action: string; name: string; total: number; available: number }>;
}

export interface InventoryData {
  summary: InventorySummary;
  items: InventoryItem[];
  allocations: InventoryAllocation[];
  adjustments: InventoryAdjustment[];
  importHistory: Array<{
    id: string;
    fileName: string;
    importedBy: string;
    adminName: string;
    importedAt: string;
    summary: InventoryImportSummary;
  }>;
}

export interface TeamInventoryItem {
  inventoryItemId: string;
  name: string;
  category: string;
  totalQuantity: number;
  isDistributed: boolean;
  allocations: Array<{
    id: string;
    quantity: number;
    allocatedAt: string;
    adminName: string;
    notes?: string | null;
    isAdjustment?: boolean;
  }>;
}

export interface TeamInventoryResponse {
  teamId: string;
  teamName: string;
  items: TeamInventoryItem[];
  totalUnits: number;
  history: InventoryAllocation[];
}

export interface CategoryPriorityTeam {
  rank: number;
  teamId: string;
  teamName: string;
  category: string;
  categoryScore: number;
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  submittedAt: string | number;
}

export interface CategoryPriorityResponse {
  quizId: string;
  categories: string[];
  priorityByCategory: Record<string, CategoryPriorityTeam[]>;
}

export const inventoryService = {
  async getInventory(): Promise<InventoryData> {
    return await api<InventoryData>('/api/inventory');
  },

  async importInventory(payload: { fileBase64?: string; fileName?: string; items?: any[] }): Promise<{
    success: boolean;
    summary: InventoryImportSummary;
    itemsCount: number;
  }> {
    return await post('/api/inventory/import', payload);
  },

  async allocate(payload: {
    teamId: string;
    inventoryItemId: string;
    quantity: number;
    notes?: string;
  }): Promise<{ success: boolean; allocation: InventoryAllocation; item: InventoryItem }> {
    return await post('/api/inventory/allocate', payload);
  },

  async adjust(payload: {
    teamId: string;
    inventoryItemId: string;
    delta: number;
    reason: string;
  }): Promise<{ success: boolean; adjustment: InventoryAdjustment; item: InventoryItem }> {
    return await post('/api/inventory/adjust', payload);
  },

  async clearAllInventory(): Promise<{
    success: boolean;
    message: string;
    removedCount: number;
  }> {
    return await post('/api/inventory/clear-all', {});
  },

  async resetAllAllocations(): Promise<{
    success: boolean;
    message: string;
    clearedAllocationsCount: number;
    clearedAdjustmentsCount: number;
  }> {
    return await post('/api/inventory/reset-allocations', {});
  },

  async getTeamInventory(teamId?: string): Promise<TeamInventoryResponse> {
    const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    return await api<TeamInventoryResponse>(`/api/inventory/team-inventory${query}`);
  },

  async getCategoryPriority(quizId: string = 'quiz-2'): Promise<CategoryPriorityResponse> {
    return await api<CategoryPriorityResponse>(`/api/quizzes/${encodeURIComponent(quizId)}/category-priority`);
  }
};
