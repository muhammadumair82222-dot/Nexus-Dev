// Inventory & Variant Matrix Service
import { localDB } from '../db/indexedDb';
import { Product, ProductVariant, StockMovement, Category, Brand, GarmentSize, GarmentColor } from '../types';
import { SEED_PRODUCTS, SEED_VARIANTS, SEED_CATEGORIES, SEED_BRANDS, SEED_SIZES, SEED_COLORS } from '../db/initialSeed';
import { syncEngine } from '../sync/syncEngine';

export class InventoryService {
  async ensureInitialized(): Promise<void> {
    const existing = await localDB.getAll<Product>('products');
    if (existing.length === 0) {
      await localDB.putBatch('products', SEED_PRODUCTS);
      await localDB.putBatch('product_variants', SEED_VARIANTS);
      await localDB.putBatch('categories', SEED_CATEGORIES);
      await localDB.putBatch('brands', SEED_BRANDS);
      await localDB.putBatch('sizes', SEED_SIZES);
      await localDB.putBatch('colors', SEED_COLORS);
    }
  }

  async getProducts(): Promise<Product[]> {
    await this.ensureInitialized();
    const products = await localDB.getAll<Product>('products');
    const variants = await localDB.getAll<ProductVariant>('product_variants');

    return products.map((p) => ({
      ...p,
      variants: variants.filter((v) => v.productId === p.id)
    }));
  }

  async getVariants(): Promise<ProductVariant[]> {
    await this.ensureInitialized();
    return localDB.getAll<ProductVariant>('product_variants');
  }

  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    return localDB.getAll<Category>('categories');
  }

  async getBrands(): Promise<Brand[]> {
    await this.ensureInitialized();
    return localDB.getAll<Brand>('brands');
  }

  async getSizes(): Promise<GarmentSize[]> {
    await this.ensureInitialized();
    const sizes = await localDB.getAll<GarmentSize>('sizes');
    return sizes.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getColors(): Promise<GarmentColor[]> {
    await this.ensureInitialized();
    return localDB.getAll<GarmentColor>('colors');
  }

  async findVariantByBarcodeOrSku(code: string): Promise<ProductVariant | undefined> {
    const clean = code.trim().toLowerCase();
    const variants = await this.getVariants();
    return variants.find(
      (v) => (v.barcode && v.barcode.toLowerCase() === clean) || (v.sku && v.sku.toLowerCase() === clean)
    );
  }

  // Generate SKU and Barcode for a variant
  generateSku(brandCode: string, catCode: string, colorName: string, sizeName: string): string {
    const colAbbr = colorName.substring(0, 3).toUpperCase();
    const szAbbr = sizeName.toUpperCase();
    return `${catCode}-${brandCode}-${colAbbr}-${szAbbr}`;
  }

  generateBarcode(): string {
    // Generate 10-digit numeric barcode
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `890${randomSuffix}`;
  }

  // Save product and its variant matrix
  async saveProductWithVariants(product: Product, variants: ProductVariant[]): Promise<void> {
    await localDB.put('products', product);
    for (const v of variants) {
      await localDB.put('product_variants', v);
    }

    // Attempt online sync
    try {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, variants })
      }).catch(() => {});
    } catch {
      // offline-safe
    }
  }

  // Stock Adjustment
  async adjustStock(
    variantId: string,
    quantityChange: number,
    reason: string,
    user: { id: string; name: string }
  ): Promise<ProductVariant> {
    const variant = await localDB.getById<ProductVariant>('product_variants', variantId);
    if (!variant) throw new Error('Variant not found');

    variant.quantity += quantityChange;
    await localDB.put('product_variants', variant);

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      variantId: variant.id,
      productName: variant.productName || 'Product',
      variantDescription: `${variant.sizeName || ''} / ${variant.colorName || ''}`,
      movementType: quantityChange >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      referenceType: 'AUDIT',
      referenceId: `ADJ-${Date.now()}`,
      quantityChange,
      costPerUnit: variant.purchasePrice,
      balanceAfter: variant.quantity,
      reason,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString()
    };
    await localDB.put('stock_movements', movement);

    // Queue for sync
    await syncEngine.queueTransaction(
      'STOCK_MOVEMENT' as any,
      'CREATE',
      { variantId, quantityChange, reason, user },
      `tx-adj-${Date.now()}`
    );

    return variant;
  }
}

export const inventoryService = new InventoryService();
