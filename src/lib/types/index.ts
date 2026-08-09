import type {
  PaymentMethod,
  PaymentStatus,
  PromotionType,
  PurchaseApprovalStatus,
  SaleStatus,
} from "./enums";

export * from "./enums";

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

// ---------- Auth ----------
export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserDto;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

// ---------- Category ----------
export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string | null;
  isActive: boolean;
}

// ---------- Product ----------
export interface PriceTierDto {
  id: string;
  quantity: number;
  retailPrice: number;
  wholesalePrice: number | null;
  specialPrice: number | null;
}

export interface PriceTierRequest {
  quantity: number;
  retailPrice: number;
  wholesalePrice?: number | null;
  specialPrice?: number | null;
}

export interface ProductDto {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number | null;
  specialPrice: number | null;
  taxRate: number;
  unit: string;
  allowDecimalQuantity: boolean;
  stockQuantity: number;
  reorderLevel: number;
  imageUrl: string | null;
  isActive: boolean;
  isLowStock: boolean;
  priceTiers: PriceTierDto[];
  activePromotion: PromotionSummaryDto | null;
}

export interface CreateProductRequest {
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice?: number | null;
  specialPrice?: number | null;
  taxRate: number;
  unit: string;
  allowDecimalQuantity: boolean;
  initialStock: number;
  reorderLevel: number;
  imageUrl?: string | null;
  priceTiers?: PriceTierRequest[];
}

export interface UpdateProductRequest {
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice?: number | null;
  specialPrice?: number | null;
  taxRate: number;
  unit: string;
  allowDecimalQuantity: boolean;
  reorderLevel: number;
  imageUrl?: string | null;
  isActive: boolean;
  priceTiers?: PriceTierRequest[];
}

export interface ProductQueryParams extends PaginationParams {
  categoryId?: string;
  isActive?: boolean;
  lowStockOnly?: boolean;
}

export interface AdjustStockRequest {
  quantityChange: number;
  notes?: string | null;
}

// ---------- Customer ----------
export interface CustomerDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  creditBalance: number;
  isActive: boolean;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  isActive: boolean;
}

// ---------- Supplier ----------
export interface SupplierDto {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  isActive: boolean;
}

// ---------- Sales ----------
export interface CreateSaleItemRequest {
  productId: string;
  quantity: number;
  discountAmount?: number;
  /** null = auto-resolve from the product's price tiers; a value = explicit override chosen at checkout. */
  unitPrice?: number | null;
}

export interface CreateSalePaymentRequest {
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string | null;
}

export interface CreateSaleRequest {
  customerId?: string | null;
  items: CreateSaleItemRequest[];
  payments: CreateSalePaymentRequest[];
  discountAmount?: number;
  notes?: string | null;
}

export interface SaleItemDto {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  promotionId: string | null;
  promotionName: string | null;
  promotionDiscountAmount: number;
}

export interface SalePaymentDto {
  id: string;
  method: PaymentMethod;
  amount: number;
  referenceNumber: string | null;
  paymentDate: string;
}

export interface SaleDto {
  id: string;
  saleNumber: string;
  customerId: string | null;
  customerName: string | null;
  cashierId: string;
  cashierName: string;
  saleDate: string;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeDue: number;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  items: SaleItemDto[];
  payments: SalePaymentDto[];
}

export interface SaleListItemDto {
  id: string;
  saleNumber: string;
  customerName: string | null;
  cashierName: string;
  saleDate: string;
  totalAmount: number;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
}

export interface SaleQueryParams {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  cashierId?: string;
  status?: SaleStatus;
  search?: string;
}

// ---------- Purchases (invoices) ----------
export interface CreatePurchaseItemRequest {
  productId: string;
  quantityOrdered: number;
  freeQuantity: number;
  unitCost: number;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  items: CreatePurchaseItemRequest[];
  expectedDeliveryDate?: string | null;
  notes?: string | null;
}

export interface PurchaseItemDto {
  id: string;
  productId: string;
  productName: string;
  quantityOrdered: number;
  freeQuantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseDto {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  expectedDeliveryDate: string | null;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdByName: string;
  approvalStatus: PurchaseApprovalStatus;
  approvedByName: string | null;
  approvedAt: string | null;
  isAddedToStock: boolean;
  stockAddedByName: string | null;
  stockAddedAt: string | null;
  isPaid: boolean;
  paidByName: string | null;
  paidAt: string | null;
  isCancelled: boolean;
  items: PurchaseItemDto[];
}

export interface PurchaseQueryParams {
  page?: number;
  pageSize?: number;
  supplierId?: string;
  approvalStatus?: PurchaseApprovalStatus;
  isPaid?: boolean;
  isAddedToStock?: boolean;
}

// ---------- Reports ----------
export interface SalesSummaryDto {
  dateFrom: string;
  dateTo: string;
  totalSales: number;
  grossRevenue: number;
  totalDiscount: number;
  totalTax: number;
  netRevenue: number;
  averageSaleValue: number;
}

export interface DailySalesDto {
  date: string;
  salesCount: number;
  totalAmount: number;
}

export interface TopProductDto {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface LowStockReportItemDto {
  productId: string;
  sku: string;
  productName: string;
  stockQuantity: number;
  reorderLevel: number;
}

export interface InventoryValuationDto {
  totalProducts: number;
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
}

export interface PaymentMethodBreakdownDto {
  method: string;
  amount: number;
  count: number;
}

export interface ApiErrorResponse {
  status: number;
  title: string;
  errors?: Record<string, string[]> | null;
}

// ---------- Promotions ----------
export interface PromotionSummaryDto {
  id: string;
  name: string;
  type: PromotionType;
  buyQuantity: number | null;
  freeQuantity: number | null;
  minQuantity: number | null;
  discountPercent: number | null;
  bundleQuantity: number | null;
  bundlePrice: number | null;
}

export interface PromotionDto extends PromotionSummaryDto {
  description: string | null;
  productId: string;
  productName: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface CreatePromotionRequest {
  name: string;
  description?: string | null;
  productId: string;
  type: PromotionType;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  minQuantity?: number | null;
  discountPercent?: number | null;
  bundleQuantity?: number | null;
  bundlePrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdatePromotionRequest {
  name: string;
  description?: string | null;
  type: PromotionType;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  minQuantity?: number | null;
  discountPercent?: number | null;
  bundleQuantity?: number | null;
  bundlePrice?: number | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}
