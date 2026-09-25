// Initial Seed Data for StitchFlow Garments POS & ERP
import {
  Category,
  Brand,
  GarmentSize,
  GarmentColor,
  Product,
  ProductVariant,
  Customer,
  Supplier,
  ExpenseCategory,
  ShopSettings,
  User,
  Employee
} from '../types';

export const SEED_CATEGORIES: Category[] = [
  { id: 'cat-1', name: "Men's Wear", code: 'MEN', description: "Men's apparel and ethnic wear", isActive: true },
  { id: 'cat-2', name: "Women's Wear", code: 'WOMEN', description: "Women's pret, suits and unstitched", isActive: true },
  { id: 'cat-3', name: 'Kids Wear', code: 'KIDS', description: 'Children and teenage clothing', isActive: true },
  { id: 'cat-4', name: 'Shalwar Kameez & Kurta', code: 'SKK', description: 'Traditional and festive eastern garments', isActive: true },
  { id: 'cat-5', name: 'Shirts & T-Shirts', code: 'SHT', description: 'Casual and formal tops', isActive: true },
  { id: 'cat-6', name: 'Jeans & Trousers', code: 'PNT', description: 'Denim, chinos and dress pants', isActive: true },
  { id: 'cat-7', name: 'Suits & Blazers', code: 'SUT', description: 'Formal two-piece and three-piece suits', isActive: true },
  { id: 'cat-8', name: 'Winterwear & Jackets', code: 'WNT', description: 'Jackets, hoodies and sweaters', isActive: true },
  { id: 'cat-9', name: 'Accessories', code: 'ACC', description: 'Belts, cufflinks, ties and socks', isActive: true }
];

export const SEED_BRANDS: Brand[] = [
  { id: 'br-1', name: 'Junaid Jamshed (J.)', code: 'JJ', isActive: true },
  { id: 'br-2', name: 'Gul Ahmed', code: 'GA', isActive: true },
  { id: 'br-3', name: 'Alkaram Studio', code: 'AK', isActive: true },
  { id: 'br-4', name: 'Charcoal', code: 'CH', isActive: true },
  { id: 'br-5', name: "Levi's Signature", code: 'LS', isActive: true },
  { id: 'br-6', name: 'Outfitters', code: 'OF', isActive: true },
  { id: 'br-7', name: 'Khaadi Man', code: 'KM', isActive: true },
  { id: 'br-8', name: 'In-House Brand', code: 'IHB', isActive: true }
];

export const SEED_SIZES: GarmentSize[] = [
  { id: 'sz-s', name: 'S', code: 'S', sortOrder: 1 },
  { id: 'sz-m', name: 'M', code: 'M', sortOrder: 2 },
  { id: 'sz-l', name: 'L', code: 'L', sortOrder: 3 },
  { id: 'sz-xl', name: 'XL', code: 'XL', sortOrder: 4 },
  { id: 'sz-xxl', name: 'XXL', code: 'XXL', sortOrder: 5 },
  { id: 'sz-30', name: '30', code: '30', sortOrder: 6 },
  { id: 'sz-32', name: '32', code: '32', sortOrder: 7 },
  { id: 'sz-34', name: '34', code: '34', sortOrder: 8 },
  { id: 'sz-36', name: '36', code: '36', sortOrder: 9 },
  { id: 'sz-38', name: '38', code: '38', sortOrder: 10 }
];

export const SEED_COLORS: GarmentColor[] = [
  { id: 'col-blk', name: 'Jet Black', hexCode: '#111827' },
  { id: 'col-wht', name: 'Pure White', hexCode: '#F9FAFB' },
  { id: 'col-nvy', name: 'Navy Blue', hexCode: '#1E3A8A' },
  { id: 'col-char', name: 'Charcoal Grey', hexCode: '#374151' },
  { id: 'col-mrn', name: 'Maroon / Burgundy', hexCode: '#7F1D1D' },
  { id: 'col-sky', name: 'Sky Blue', hexCode: '#0284C7' },
  { id: 'col-olv', name: 'Olive Green', hexCode: '#3F6212' },
  { id: 'col-bg', name: 'Beige / Khaki', hexCode: '#D97706' }
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: "Men's Luxury Cotton Shalwar Kameez",
    categoryId: 'cat-4',
    categoryName: 'Shalwar Kameez & Kurta',
    brandId: 'br-1',
    brandName: 'Junaid Jamshed (J.)',
    subcategory: 'Eastern Formal',
    fabric: '100% Egyptian Giza Cotton',
    gender: 'MEN',
    season: 'ALL_SEASON',
    rackLocation: 'Rack A-01',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop&q=60',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Slim Fit Stretch Denim Jeans',
    categoryId: 'cat-6',
    categoryName: 'Jeans & Trousers',
    brandId: 'br-5',
    brandName: "Levi's Signature",
    subcategory: 'Casual Denim',
    fabric: '98% Cotton, 2% Spandex',
    gender: 'MEN',
    season: 'ALL_SEASON',
    rackLocation: 'Rack D-04',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=60',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'Executive Oxford Formal Shirt',
    categoryId: 'cat-5',
    categoryName: 'Shirts & T-Shirts',
    brandId: 'br-4',
    brandName: 'Charcoal',
    subcategory: 'Formal Shirts',
    fabric: 'Fine Twill Cotton',
    gender: 'MEN',
    season: 'ALL_SEASON',
    rackLocation: 'Rack B-02',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=60',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'Premium Wool Blend Blazer',
    categoryId: 'cat-7',
    categoryName: 'Suits & Blazers',
    brandId: 'br-4',
    brandName: 'Charcoal',
    subcategory: 'Outerwear',
    fabric: 'Australian Wool Blend',
    gender: 'MEN',
    season: 'WINTER',
    rackLocation: 'Rack S-01',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=60',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-5',
    name: 'Heavyweight Fleece Winter Hoodie',
    categoryId: 'cat-8',
    categoryName: 'Winterwear & Jackets',
    brandId: 'br-6',
    brandName: 'Outfitters',
    subcategory: 'Streetwear',
    fabric: '380 GSM Cotton Fleece',
    gender: 'UNISEX',
    season: 'WINTER',
    rackLocation: 'Rack W-03',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=60',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SEED_VARIANTS: ProductVariant[] = [
  // Product 1: Shalwar Kameez variants
  {
    id: 'var-1-blk-m',
    productId: 'prod-1',
    productName: "Men's Luxury Cotton Shalwar Kameez",
    sizeId: 'sz-m',
    sizeName: 'M',
    colorId: 'col-blk',
    colorName: 'Jet Black',
    colorHex: '#111827',
    sku: 'SKK-JJ-BLK-M',
    barcode: '8901001001',
    purchasePrice: 2800,
    salePrice: 4500,
    wholesalePrice: 3800,
    discount: 0,
    taxPercent: 0,
    quantity: 18,
    minStock: 5,
    isActive: true,
    rackLocation: 'A-01'
  },
  {
    id: 'var-1-blk-l',
    productId: 'prod-1',
    productName: "Men's Luxury Cotton Shalwar Kameez",
    sizeId: 'sz-l',
    sizeName: 'L',
    colorId: 'col-blk',
    colorName: 'Jet Black',
    colorHex: '#111827',
    sku: 'SKK-JJ-BLK-L',
    barcode: '8901001002',
    purchasePrice: 2800,
    salePrice: 4500,
    wholesalePrice: 3800,
    discount: 0,
    taxPercent: 0,
    quantity: 12,
    minStock: 4,
    isActive: true,
    rackLocation: 'A-01'
  },
  {
    id: 'var-1-wht-m',
    productId: 'prod-1',
    productName: "Men's Luxury Cotton Shalwar Kameez",
    sizeId: 'sz-m',
    sizeName: 'M',
    colorId: 'col-wht',
    colorName: 'Pure White',
    colorHex: '#F9FAFB',
    sku: 'SKK-JJ-WHT-M',
    barcode: '8901001003',
    purchasePrice: 2800,
    salePrice: 4500,
    wholesalePrice: 3800,
    discount: 0,
    taxPercent: 0,
    quantity: 25,
    minStock: 6,
    isActive: true,
    rackLocation: 'A-01'
  },
  {
    id: 'var-1-wht-l',
    productId: 'prod-1',
    productName: "Men's Luxury Cotton Shalwar Kameez",
    sizeId: 'sz-l',
    sizeName: 'L',
    colorId: 'col-wht',
    colorName: 'Pure White',
    colorHex: '#F9FAFB',
    sku: 'SKK-JJ-WHT-L',
    barcode: '8901001004',
    purchasePrice: 2800,
    salePrice: 4500,
    wholesalePrice: 3800,
    discount: 0,
    taxPercent: 0,
    quantity: 15,
    minStock: 5,
    isActive: true,
    rackLocation: 'A-01'
  },
  {
    id: 'var-1-nvy-m',
    productId: 'prod-1',
    productName: "Men's Luxury Cotton Shalwar Kameez",
    sizeId: 'sz-m',
    sizeName: 'M',
    colorId: 'col-nvy',
    colorName: 'Navy Blue',
    colorHex: '#1E3A8A',
    sku: 'SKK-JJ-NVY-M',
    barcode: '8901001005',
    purchasePrice: 2800,
    salePrice: 4500,
    wholesalePrice: 3800,
    discount: 0,
    taxPercent: 0,
    quantity: 3, // Low stock demo
    minStock: 5,
    isActive: true,
    rackLocation: 'A-01'
  },

  // Product 2: Denim Jeans variants
  {
    id: 'var-2-32-nvy',
    productId: 'prod-2',
    productName: 'Slim Fit Stretch Denim Jeans',
    sizeId: 'sz-32',
    sizeName: '32',
    colorId: 'col-nvy',
    colorName: 'Navy Blue',
    colorHex: '#1E3A8A',
    sku: 'DNM-LS-NVY-32',
    barcode: '8901002001',
    purchasePrice: 1950,
    salePrice: 3200,
    wholesalePrice: 2600,
    discount: 0,
    taxPercent: 0,
    quantity: 20,
    minStock: 5,
    isActive: true,
    rackLocation: 'D-04'
  },
  {
    id: 'var-2-34-nvy',
    productId: 'prod-2',
    productName: 'Slim Fit Stretch Denim Jeans',
    sizeId: 'sz-34',
    sizeName: '34',
    colorId: 'col-nvy',
    colorName: 'Navy Blue',
    colorHex: '#1E3A8A',
    sku: 'DNM-LS-NVY-34',
    barcode: '8901002002',
    purchasePrice: 1950,
    salePrice: 3200,
    wholesalePrice: 2600,
    discount: 0,
    taxPercent: 0,
    quantity: 14,
    minStock: 4,
    isActive: true,
    rackLocation: 'D-04'
  },
  {
    id: 'var-2-32-char',
    productId: 'prod-2',
    productName: 'Slim Fit Stretch Denim Jeans',
    sizeId: 'sz-32',
    sizeName: '32',
    colorId: 'col-char',
    colorName: 'Charcoal Grey',
    colorHex: '#374151',
    sku: 'DNM-LS-CHR-32',
    barcode: '8901002003',
    purchasePrice: 1950,
    salePrice: 3200,
    wholesalePrice: 2600,
    discount: 0,
    taxPercent: 0,
    quantity: 0, // Out of stock demo
    minStock: 5,
    isActive: true,
    rackLocation: 'D-04'
  },

  // Product 3: Executive Shirt variants
  {
    id: 'var-3-sky-m',
    productId: 'prod-3',
    productName: 'Executive Oxford Formal Shirt',
    sizeId: 'sz-m',
    sizeName: 'M',
    colorId: 'col-sky',
    colorName: 'Sky Blue',
    colorHex: '#0284C7',
    sku: 'SHT-CH-SKY-M',
    barcode: '8901003001',
    purchasePrice: 1400,
    salePrice: 2450,
    wholesalePrice: 1900,
    discount: 0,
    taxPercent: 0,
    quantity: 16,
    minStock: 4,
    isActive: true,
    rackLocation: 'B-02'
  },
  {
    id: 'var-3-wht-l',
    productId: 'prod-3',
    productName: 'Executive Oxford Formal Shirt',
    sizeId: 'sz-l',
    sizeName: 'L',
    colorId: 'col-wht',
    colorName: 'Pure White',
    colorHex: '#F9FAFB',
    sku: 'SHT-CH-WHT-L',
    barcode: '8901003002',
    purchasePrice: 1400,
    salePrice: 2450,
    wholesalePrice: 1900,
    discount: 0,
    taxPercent: 0,
    quantity: 22,
    minStock: 5,
    isActive: true,
    rackLocation: 'B-02'
  },

  // Product 4: Wool Blend Blazer
  {
    id: 'var-4-blk-40',
    productId: 'prod-4',
    productName: 'Premium Wool Blend Blazer',
    sizeId: 'sz-l',
    sizeName: 'L',
    colorId: 'col-blk',
    colorName: 'Jet Black',
    colorHex: '#111827',
    sku: 'BLZ-CH-BLK-L',
    barcode: '8901004001',
    purchasePrice: 6500,
    salePrice: 11500,
    wholesalePrice: 9000,
    discount: 0,
    taxPercent: 0,
    quantity: 7,
    minStock: 2,
    isActive: true,
    rackLocation: 'S-01'
  },

  // Product 5: Heavyweight Fleece Hoodie
  {
    id: 'var-5-mrn-l',
    productId: 'prod-5',
    productName: 'Heavyweight Fleece Winter Hoodie',
    sizeId: 'sz-l',
    sizeName: 'L',
    colorId: 'col-mrn',
    colorName: 'Maroon / Burgundy',
    colorHex: '#7F1D1D',
    sku: 'HOD-OF-MRN-L',
    barcode: '8901005001',
    purchasePrice: 1600,
    salePrice: 2950,
    wholesalePrice: 2300,
    discount: 0,
    taxPercent: 0,
    quantity: 19,
    minStock: 5,
    isActive: true,
    rackLocation: 'W-03'
  }
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-walkin',
    name: 'Walk-in Retail Customer',
    phone: '0000-0000000',
    whatsapp: '',
    address: 'Counter Direct Sale',
    openingBalance: 0,
    currentBalance: 0,
    totalPurchases: 145000,
    totalPaid: 145000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cust-1',
    name: 'Muhammad Tariq Khan',
    phone: '+92 300 8472910',
    whatsapp: '+92 300 8472910',
    address: 'House #42, Street 7, Model Town, Lahore',
    openingBalance: 0,
    currentBalance: 4500, // Due receivable
    totalPurchases: 28500,
    totalPaid: 24000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cust-2',
    name: 'Dr. Faisal Shahzad',
    phone: '+92 321 9928371',
    whatsapp: '+92 321 9928371',
    address: 'Gulberg III, Main Boulevard, Lahore',
    openingBalance: 0,
    currentBalance: 0,
    totalPurchases: 45200,
    totalPaid: 45200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Sheikh Niaz Ahmad',
    companyName: 'Al-Madina Textile Mills & Fabrics',
    phone: '+92 301 4455667',
    whatsapp: '+92 301 4455667',
    address: 'Circular Road, Faisalabad Textile Hub',
    openingBalance: 0,
    currentPayable: 35000, // Shop owes supplier
    totalPurchases: 240000,
    totalPaid: 205000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup-2',
    name: 'Haji Aslam',
    companyName: 'Premier Denim Stitching Units',
    phone: '+92 333 9876543',
    whatsapp: '+92 333 9876543',
    address: 'Kot Lakhpat Industrial Area, Lahore',
    openingBalance: 0,
    currentPayable: 0,
    totalPurchases: 180000,
    totalPaid: 180000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SEED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'exp-cat-1', name: 'Shop Rent', description: 'Monthly showroom and warehouse rent' },
  { id: 'exp-cat-2', name: 'Electricity & Utilities', description: 'LESCO, generator diesel, commercial meter' },
  { id: 'exp-cat-3', name: 'Staff Salaries', description: 'Salaries, sales commissions, overtime' },
  { id: 'exp-cat-4', name: 'Shopping Bags & Packaging', description: 'Branded non-woven bags, hangers, tags' },
  { id: 'exp-cat-5', name: 'Refreshment & Tea', description: 'Customer tea, employee refreshments' },
  { id: 'exp-cat-6', name: 'Shop Maintenance', description: 'Lighting, AC repair, display cleaning' }
];

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Muhammad Usman (Admin)',
    phone: '+92 300 1234567',
    cnic: '35201-1234567-1',
    salary: 85000,
    joiningDate: '2023-01-01',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'emp-2',
    name: 'Bilal Hassan (Store Manager)',
    phone: '+92 302 7654321',
    cnic: '35202-7654321-3',
    salary: 55000,
    joiningDate: '2023-03-15',
    role: 'MANAGER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'emp-3',
    name: 'Hamza Arshad (Senior Cashier)',
    phone: '+92 334 5544332',
    cnic: '35201-9988776-5',
    salary: 35000,
    joiningDate: '2023-06-01',
    role: 'CASHIER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'emp-4',
    name: 'Zahid Mehmood (Inventory Staff)',
    phone: '+92 345 1122334',
    cnic: '35201-4433221-7',
    salary: 32000,
    joiningDate: '2023-08-10',
    role: 'INVENTORY_STAFF',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }
];

export const SEED_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'Store Owner (Admin)',
    email: 'admin@stitchflow.pos',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-manager',
    username: 'manager',
    fullName: 'Bilal Hassan (Manager)',
    email: 'manager@stitchflow.pos',
    role: 'MANAGER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-cashier',
    username: 'cashier',
    fullName: 'Hamza Arshad (Cashier)',
    email: 'cashier@stitchflow.pos',
    role: 'CASHIER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-inventory',
    username: 'inventory',
    fullName: 'Zahid Mehmood (Stock)',
    email: 'inventory@stitchflow.pos',
    role: 'INVENTORY_STAFF',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'StitchFlow Garments & Couture',
  address: 'Shop #14-16, Commercial Plaza, Main Boulevard, Gulberg, Lahore',
  phone: '+92 42 35789012 / +92 300 1234567',
  email: 'info@stitchflow.pos',
  currencySymbol: 'Rs.',
  taxRate: 0,
  allowNegativeStock: false,
  thermalReceiptSize: '80mm',
  receiptFooterMessage: 'Thank you for shopping with StitchFlow Garments! Exchange valid within 7 days with original invoice & tag intact.',
  enableAutoSync: true,
  autoSyncIntervalSec: 15
};
