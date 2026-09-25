import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { serverDB } from './src/db/serverDb';
import { Sale, SalesReturn, Purchase, Expense, Product, ProductVariant, Customer, Supplier } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health / Ping
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    shop: serverDB.getState().settings.shopName
  });
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = serverDB.getState().users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Passwords for demo: 'admin', 'manager', 'cashier', 'inventory' or password123
  serverDB.logAudit({
    userId: user.id,
    userName: user.fullName,
    action: 'USER_LOGIN',
    module: 'AUTH',
    recordId: user.id
  });

  res.json({
    token: `token-${user.id}-${Date.now()}`,
    user
  });
});

// Bootstrap full initial state for client synchronization
app.get('/api/bootstrap', (req, res) => {
  res.json(serverDB.getState());
});

// Sales
app.post('/api/sales', (req, res) => {
  const sale: Sale = req.body;
  const user = { id: sale.cashierId || 'admin', name: sale.cashierName || 'Cashier' };
  const result = serverDB.processSale(sale, user);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, sale });
});

app.get('/api/sales', (req, res) => {
  res.json(serverDB.getState().sales);
});

// Returns & Exchanges
app.post('/api/returns', (req, res) => {
  const salesReturn: SalesReturn = req.body;
  const user = { id: salesReturn.cashierId || 'admin', name: salesReturn.cashierName || 'Cashier' };
  const result = serverDB.processSalesReturn(salesReturn, user);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, return: salesReturn });
});

// Purchases
app.post('/api/purchases', (req, res) => {
  const purchase: Purchase = req.body;
  const user = { id: 'admin', name: 'Manager' };
  const result = serverDB.processPurchase(purchase, user);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, purchase });
});

app.get('/api/purchases', (req, res) => {
  res.json(serverDB.getState().purchases);
});

// Expenses
app.post('/api/expenses', (req, res) => {
  const expense: Expense = req.body;
  const user = { id: expense.userId || 'admin', name: expense.userName || 'User' };
  serverDB.processExpense(expense, user);
  res.json({ success: true, expense });
});

app.get('/api/expenses', (req, res) => {
  res.json(serverDB.getState().expenses);
});

// Products & Variants Management
app.post('/api/products', (req, res) => {
  const { product, variants }: { product: Product; variants: ProductVariant[] } = req.body;
  const state = serverDB.getState();

  const existingProdIndex = state.products.findIndex((p) => p.id === product.id);
  if (existingProdIndex >= 0) {
    state.products[existingProdIndex] = product;
  } else {
    state.products.unshift(product);
  }

  // Update or insert variants
  variants.forEach((v) => {
    const existingVarIndex = state.variants.findIndex((variant) => variant.id === v.id);
    if (existingVarIndex >= 0) {
      state.variants[existingVarIndex] = v;
    } else {
      state.variants.push(v);
    }
  });

  serverDB.logAudit({
    userId: 'admin',
    userName: 'Admin',
    action: existingProdIndex >= 0 ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
    module: 'INVENTORY',
    recordId: product.id,
    newValues: `${product.name} with ${variants.length} variants`
  });

  serverDB.save();
  res.json({ success: true, product, variants });
});

// Stock adjustments
app.post('/api/stock/adjust', (req, res) => {
  const { variantId, quantityChange, reason, user } = req.body;
  const state = serverDB.getState();
  const variant = state.variants.find((v) => v.id === variantId);
  if (!variant) return res.status(404).json({ error: 'Variant not found' });

  variant.quantity += quantityChange;
  state.stockMovements.unshift({
    id: `adj-${Date.now()}`,
    variantId: variant.id,
    productName: variant.productName || 'Product',
    variantDescription: `${variant.sizeName || ''} / ${variant.colorName || ''}`,
    movementType: quantityChange >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
    referenceType: 'AUDIT',
    referenceId: `ADJ-${Date.now()}`,
    quantityChange,
    costPerUnit: variant.purchasePrice,
    balanceAfter: variant.quantity,
    reason: reason || 'Manual Stock Audit',
    userId: user?.id || 'admin',
    userName: user?.name || 'Administrator',
    createdAt: new Date().toISOString()
  });

  serverDB.logAudit({
    userId: user?.id || 'admin',
    userName: user?.name || 'Admin',
    action: 'STOCK_ADJUSTMENT',
    module: 'INVENTORY',
    recordId: variant.sku,
    newValues: `Change: ${quantityChange}, New Stock: ${variant.quantity}`
  });

  serverDB.save();
  res.json({ success: true, variant });
});

// Customers
app.post('/api/customers', (req, res) => {
  const customer: Customer = req.body;
  const state = serverDB.getState();
  const index = state.customers.findIndex((c) => c.id === customer.id);
  if (index >= 0) {
    state.customers[index] = customer;
  } else {
    state.customers.push(customer);
  }
  serverDB.save();
  res.json({ success: true, customer });
});

app.post('/api/customers/payment', (req, res) => {
  const { customerId, amount, paymentMethod, referenceNo, notes } = req.body;
  const state = serverDB.getState();
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  customer.currentBalance = Math.max(0, customer.currentBalance - amount);
  customer.totalPaid += amount;
  customer.updatedAt = new Date().toISOString();

  serverDB.logAudit({
    userId: 'admin',
    userName: 'Cashier',
    action: 'CUSTOMER_PAYMENT_RECEIVED',
    module: 'CUSTOMERS',
    recordId: customer.id,
    newValues: `Received: ${amount} via ${paymentMethod} (${referenceNo || 'None'}). Balance remaining: ${customer.currentBalance}`
  });

  serverDB.save();
  res.json({ success: true, customer });
});

// Suppliers
app.post('/api/suppliers', (req, res) => {
  const supplier: Supplier = req.body;
  const state = serverDB.getState();
  const index = state.suppliers.findIndex((s) => s.id === supplier.id);
  if (index >= 0) {
    state.suppliers[index] = supplier;
  } else {
    state.suppliers.push(supplier);
  }
  serverDB.save();
  res.json({ success: true, supplier });
});

app.post('/api/suppliers/payment', (req, res) => {
  const { supplierId, amount, paymentMethod, referenceNo, notes } = req.body;
  const state = serverDB.getState();
  const supplier = state.suppliers.find((s) => s.id === supplierId);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  supplier.currentPayable = Math.max(0, supplier.currentPayable - amount);
  supplier.totalPaid += amount;
  supplier.updatedAt = new Date().toISOString();

  serverDB.logAudit({
    userId: 'admin',
    userName: 'Accountant',
    action: 'SUPPLIER_PAYMENT_MADE',
    module: 'SUPPLIERS',
    recordId: supplier.id,
    newValues: `Paid: ${amount} via ${paymentMethod}. Payable remaining: ${supplier.currentPayable}`
  });

  serverDB.save();
  res.json({ success: true, supplier });
});

// Sync Batch
app.post('/api/sync/batch', (req, res) => {
  const { batch, user } = req.body;
  const result = serverDB.processSyncBatch(batch || [], user || { id: 'cashier', name: 'POS Terminal' });
  res.json(result);
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  res.json(serverDB.getState().auditLogs);
});

// Settings
app.post('/api/settings', (req, res) => {
  const state = serverDB.getState();
  state.settings = { ...state.settings, ...req.body };
  serverDB.save();
  res.json({ success: true, settings: state.settings });
});

// Backup
app.get('/api/backup', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename=stitchflow-backup-${Date.now()}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(serverDB.getState(), null, 2));
});

// Restore
app.post('/api/restore', (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData.products || !backupData.variants || !backupData.settings) {
      return res.status(400).json({ error: 'Invalid backup payload format.' });
    }
    const state = serverDB.getState();
    Object.assign(state, backupData);
    serverDB.logAudit({
      userId: 'admin',
      userName: 'Administrator',
      action: 'DATABASE_RESTORED',
      module: 'BACKUP',
      recordId: `restored-${Date.now()}`
    });
    serverDB.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset to initial seed
app.post('/api/reset', (req, res) => {
  serverDB.resetToSeeds();
  res.json({ success: true, message: 'Database reset to demo seed values successfully.' });
});

// Vite or Static Serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`StitchFlow Garments POS server running on http://localhost:${PORT}`);
  });
}

startServer();
