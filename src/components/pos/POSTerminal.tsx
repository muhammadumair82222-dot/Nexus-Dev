import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  PlayCircle,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  User,
  X,
  Printer,
  ChevronDown,
  Layers,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { posService } from '../../services/posService';
import { customerService } from '../../services/customerService';
import { authService } from '../../services/authService';
import {
  Product,
  ProductVariant,
  CartItem,
  Category,
  Customer,
  PaymentMethod,
  Sale,
  HeldSale,
  ShopSettings
} from '../../types';

interface POSTerminalProps {
  settings: ShopSettings;
  onSaleCompleted: (sale: Sale) => void;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({ settings, onSaleCompleted }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [orderDiscount, setOrderDiscount] = useState<number>(0);

  // Variant Modal
  const [activeProductForVariant, setActiveProductForVariant] = useState<Product | null>(null);

  // Hold / Resume
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHeldSalesDrawer, setShowHeldSalesDrawer] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [showHoldModal, setShowHoldModal] = useState(false);

  // Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<{ method: PaymentMethod; amount: number; referenceNo?: string }[]>([
    { method: 'CASH', amount: 0 }
  ]);
  const [tenderCashAmount, setTenderCashAmount] = useState<number>(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Data
  const loadData = async () => {
    const [p, v, c, cust, held] = await Promise.all([
      inventoryService.getProducts(),
      inventoryService.getVariants(),
      inventoryService.getCategories(),
      customerService.getCustomers(),
      posService.getHeldSales()
    ]);
    setProducts(p);
    setVariants(v);
    setCategories(c);
    setCustomers(cust);
    setHeldSales(held);

    // Default customer
    const walkin = cust.find((cu) => cu.id === 'cust-walkin') || cust[0];
    setSelectedCustomer(walkin);
  };

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);

  // Handle Barcode Scan (Enter key)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    const matched = await inventoryService.findVariantByBarcodeOrSku(code);

    if (matched) {
      addVariantToCart(matched);
      setBarcodeInput('');
    } else {
      setErrorMessage(`Barcode/SKU "${code}" not found.`);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Add Variant directly to Cart
  const addVariantToCart = (variant: ProductVariant) => {
    if (variant.quantity <= 0 && !settings.allowNegativeStock) {
      setErrorMessage(`Item "${variant.sku}" is out of stock!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.quantity && !settings.allowNegativeStock) {
          setErrorMessage(`Cannot exceed available physical stock (${variant.quantity}).`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1, total: (item.unitPrice - item.discount) * (item.quantity + 1) }
            : item
        );
      } else {
        const newItem: CartItem = {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.productName || 'Garment Item',
          sizeName: variant.sizeName || '',
          colorName: variant.colorName || '',
          colorHex: variant.colorHex,
          sku: variant.sku,
          barcode: variant.barcode,
          unitPrice: variant.salePrice,
          purchasePrice: variant.purchasePrice,
          quantity: 1,
          discount: variant.discount || 0,
          taxPercent: variant.taxPercent || 0,
          stockAvailable: variant.quantity,
          total: variant.salePrice - (variant.discount || 0)
        };
        return [...prev, newItem];
      }
    });

    setActiveProductForVariant(null);
  };

  // Update Cart Quantity
  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stockAvailable && !settings.allowNegativeStock) {
              setErrorMessage(`Only ${item.stockAvailable} available in stock.`);
              setTimeout(() => setErrorMessage(null), 3000);
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              total: (item.unitPrice - item.discount) * newQty
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove Item
  const removeItem = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  // Calculate Subtotals
  const totals = posService.calculateTotals(cart, orderDiscount, settings.taxRate || 0);

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentSplits([{ method: 'CASH', amount: totals.grandTotal }]);
    setTenderCashAmount(totals.grandTotal);
    setShowCheckoutModal(true);
  };

  // Process Final Checkout
  const handleExecuteCheckout = async () => {
    setIsProcessing(true);
    try {
      const activeUser = authService.getCurrentUser();
      const sale = await posService.completeCheckout({
        items: cart,
        customer: selectedCustomer,
        payments: paymentSplits,
        orderDiscount,
        taxRatePercent: settings.taxRate || 0,
        cashier: { id: activeUser.id, name: activeUser.fullName },
        notes: saleNotes
      });

      // Clear cart
      setCart([]);
      setOrderDiscount(0);
      setSaleNotes('');
      setShowCheckoutModal(false);

      // Refresh inventory counters
      await loadData();

      // Trigger completion callback (opens receipt modal)
      onSaleCompleted(sale);
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Hold Current Sale
  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    await posService.holdSale(holdNote || `Order #${heldSales.length + 1}`, cart, orderDiscount);
    setCart([]);
    setHoldNote('');
    setShowHoldModal(false);
    const updated = await posService.getHeldSales();
    setHeldSales(updated);
  };

  // Resume Held Sale
  const handleResumeSale = async (held: HeldSale) => {
    setCart(held.items);
    setOrderDiscount(held.discountAmount || 0);
    await posService.removeHeldSale(held.id);
    const updated = await posService.getHeldSales();
    setHeldSales(updated);
    setShowHeldSalesDrawer(false);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fabric && p.fabric.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.brandName && p.brandName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-50 text-slate-900">
      {/* LEFT: Product Catalog & Fast Barcode Scan */}
      <div className="flex-1 flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50">
        {/* Top Scan & Search Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between">
          {/* Barcode scanner input */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 absolute left-3 top-2.5 text-red-600" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Garment Barcode or SKU (Press Enter)..."
                className="w-full bg-white border border-slate-300 rounded-md pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition shrink-0 shadow-xs"
            >
              Add Item
            </button>
          </form>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, fabric, brand..."
              className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Held Sales Button */}
          {heldSales.length > 0 && (
            <button
              onClick={() => setShowHeldSalesDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-xs font-semibold hover:bg-amber-100 transition shrink-0"
            >
              <PlayCircle className="w-4 h-4 text-amber-600" />
              <span>Resume Held ({heldSales.length})</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-red-600 text-white font-semibold shadow-xs'
                : 'bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200'
            }`}
          >
            All Garments ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="bg-rose-50 text-rose-800 border-b border-rose-200 px-4 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((prod) => {
            const prodVariants = variants.filter((v) => v.productId === prod.id);
            const totalStock = prodVariants.reduce((sum, v) => sum + v.quantity, 0);
            const minPrice = prodVariants.length > 0 ? Math.min(...prodVariants.map((v) => v.salePrice)) : 0;
            const maxPrice = prodVariants.length > 0 ? Math.max(...prodVariants.map((v) => v.salePrice)) : 0;

            return (
              <div
                key={prod.id}
                onClick={() => {
                  if (prodVariants.length === 1) {
                    addVariantToCart(prodVariants[0]);
                  } else {
                    setActiveProductForVariant(prod);
                  }
                }}
                className="bg-white border border-slate-200 hover:border-red-500 rounded-lg p-2.5 cursor-pointer flex flex-col justify-between transition group hover:shadow-md hover:shadow-red-500/10"
              >
                <div>
                  <div className="relative aspect-square w-full rounded bg-slate-100 overflow-hidden mb-2">
                    {prod.imageUrl ? (
                      <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                        {prod.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        totalStock <= 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : totalStock <= 5
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-white/90 text-emerald-800 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      {totalStock} in stock
                    </span>
                  </div>

                  <h3 className="font-semibold text-xs text-slate-900 line-clamp-1 leading-snug group-hover:text-red-600 transition">
                    {prod.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>{prod.brandName || 'In-House'}</span>
                    <span>•</span>
                    <span className="truncate">{prod.fabric || prod.categoryName}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="font-black text-xs text-red-600">
                    {settings.currencySymbol} {minPrice === maxPrice ? minPrice.toLocaleString() : `${minPrice.toLocaleString()}+`}
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-red-600 font-medium flex items-center gap-0.5">
                    {prodVariants.length} Sizes/Cols
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Fast Cart & Checkout Panel */}
      <div className="w-96 lg:w-[420px] bg-white border-l border-slate-200 flex flex-col justify-between h-full shrink-0 shadow-lg">
        {/* Cart Header */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-red-600" />
            <h2 className="font-bold text-sm text-slate-900">Active Order</h2>
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <>
                <button
                  onClick={() => setShowHoldModal(true)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                  title="Hold Order"
                >
                  <PauseCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCart([])}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                  title="Clear Cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Customer Selector */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Customer:</span>
          </div>
          <select
            value={selectedCustomer?.id || 'cust-walkin'}
            onChange={(e) => {
              const c = customers.find((cu) => cu.id === e.target.value);
              setSelectedCustomer(c);
            }}
            className="bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 max-w-[220px]"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.currentBalance > 0 ? `(Due: ${settings.currencySymbol} ${c.currentBalance})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 p-6 text-center">
              <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="font-semibold text-slate-600">Cart is currently empty</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Scan garment barcode with the handheld scanner or select an apparel item from the catalog.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-red-50/20 rounded-md transition">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">{item.productName}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold px-1 rounded bg-slate-100 text-slate-700">{item.sizeName}</span>
                    <span>•</span>
                    <span className="truncate">{item.colorName}</span>
                    <span>•</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                  </div>
                  <div className="text-xs font-bold text-red-600 mt-1">
                    {settings.currencySymbol} {item.unitPrice.toLocaleString()}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                  <button
                    onClick={() => updateQuantity(item.variantId, -1)}
                    className="p-1 text-slate-500 hover:text-red-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-slate-900 w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variantId, 1)}
                    className="p-1 text-slate-500 hover:text-red-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {settings.currencySymbol} {item.total.toLocaleString()}
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="text-[10px] text-slate-400 hover:text-red-600 mt-0.5 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Cart Calculations & Tender Checkout */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="space-y-1 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">{settings.currencySymbol} {totals.subtotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Order Discount:</span>
              <div className="flex items-center gap-1">
                <span>-</span>
                <input
                  type="number"
                  min="0"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-16 bg-white border border-slate-300 text-right px-1.5 py-0.5 rounded text-xs text-slate-900"
                />
              </div>
            </div>

            {settings.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Sales Tax ({settings.taxRate}%):</span>
                <span>{settings.currencySymbol} {totals.taxAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-200 text-slate-900">
              <span>Grand Total:</span>
              <span className="text-lg text-red-600 font-black">
                {settings.currencySymbol} {totals.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <span>Proceed to Payment (F9)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODAL 1: Select Garment Variant (Size & Color Matrix) */}
      {activeProductForVariant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{activeProductForVariant.name}</h3>
                <p className="text-xs text-slate-500">
                  {activeProductForVariant.fabric} • {activeProductForVariant.season} • Rack {activeProductForVariant.rackLocation}
                </p>
              </div>
              <button
                onClick={() => setActiveProductForVariant(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <label className="text-xs font-semibold text-slate-700">
                Choose Size & Color Variant:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {variants
                  .filter((v) => v.productId === activeProductForVariant.id)
                  .map((v) => (
                    <button
                      key={v.id}
                      onClick={() => addVariantToCart(v)}
                      disabled={v.quantity <= 0 && !settings.allowNegativeStock}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-red-500 hover:bg-red-50/30 disabled:opacity-40 transition text-left"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{v.sizeName}</span>
                          <span>•</span>
                          <span className="text-xs text-slate-600">{v.colorName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{v.sku}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-red-600">
                          {settings.currencySymbol} {v.salePrice.toLocaleString()}
                        </div>
                        <div className={`text-[10px] font-semibold ${v.quantity > 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                          {v.quantity > 0 ? `${v.quantity} in stock` : 'Out of stock'}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Checkout / Payment Tender Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base text-slate-900">Payment Checkout</h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Due */}
            <div className="bg-red-50 p-3.5 rounded-lg border border-red-200 flex justify-between items-center">
              <span className="text-xs text-slate-700 font-medium">Payable Grand Total:</span>
              <span className="text-2xl font-black text-red-600">
                {settings.currencySymbol} {totals.grandTotal.toLocaleString()}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tender Method:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
                  { id: 'CARD', label: 'Card / POS', icon: <CreditCard className="w-4 h-4" /> },
                  { id: 'BANK_TRANSFER', label: 'Bank', icon: <Building className="w-4 h-4" /> },
                  { id: 'EASYPAISA', label: 'Easypaisa', icon: <Smartphone className="w-4 h-4 text-emerald-600" /> },
                  { id: 'JAZZCASH', label: 'JazzCash', icon: <Smartphone className="w-4 h-4 text-red-600" /> },
                  { id: 'CREDIT', label: 'Credit / Khata', icon: <User className="w-4 h-4 text-amber-600" /> }
                ].map((pm) => {
                  const isSelected = paymentSplits[0]?.method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => {
                        setPaymentSplits([{ method: pm.id as PaymentMethod, amount: totals.grandTotal }]);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-red-600 border-red-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300'
                      }`}
                    >
                      {pm.icon}
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Shortcuts if method is CASH */}
            {paymentSplits[0]?.method === 'CASH' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-600 font-medium">Tendered Cash:</label>
                  <input
                    type="number"
                    value={tenderCashAmount || ''}
                    onChange={(e) => setTenderCashAmount(Number(e.target.value))}
                    className="w-32 bg-white border border-slate-300 text-right px-2 py-1 text-sm font-bold text-slate-900 rounded focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[totals.grandTotal, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTenderCashAmount(amt)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded text-slate-700 font-medium transition"
                    >
                      {settings.currencySymbol} {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-600">Change Due Back:</span>
                  <span className={`font-black text-sm ${tenderCashAmount >= totals.grandTotal ? 'text-red-600' : 'text-rose-600'}`}>
                    {settings.currencySymbol} {Math.max(0, tenderCashAmount - totals.grandTotal).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">Invoice Notes (Optional):</label>
              <input
                type="text"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="e.g. Special gift packing, Customer discount approval"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Confirm Payment Action */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCheckout}
                disabled={isProcessing}
                className="flex-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-md shadow-red-600/30 flex items-center justify-center gap-2 transition"
              >
                {isProcessing ? 'Processing Transaction...' : 'Complete & Generate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Hold Sale Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-4 space-y-3 shadow-2xl">
            <h4 className="font-bold text-sm text-slate-900">Hold Current Order</h4>
            <p className="text-xs text-slate-500">
              Save this cart temporarily to serve another customer at the counter.
            </p>
            <input
              type="text"
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              placeholder="Order label (e.g. Red Blazer fitting, Customer #4)"
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:ring-red-500 focus:border-red-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleHoldSale}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-xs"
              >
                Hold Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Resume Held Sales */}
      {showHeldSalesDrawer && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50">
          <div className="bg-white border-l border-slate-200 w-80 h-full p-4 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Held Orders</h3>
                <button onClick={() => setShowHeldSalesDrawer(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 space-y-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
                {heldSales.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="font-semibold text-xs text-slate-900 flex justify-between">
                      <span>{h.referenceName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.heldAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {h.items.length} garments • Total: {settings.currencySymbol} {h.items.reduce((s, i) => s + i.total, 0).toLocaleString()}
                    </div>
                    <button
                      onClick={() => handleResumeSale(h)}
                      className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition shadow-xs"
                    >
                      Resume Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
