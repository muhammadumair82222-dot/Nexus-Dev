import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  Barcode,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
  Tag,
  SlidersHorizontal
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { authService } from '../../services/authService';
import {
  Product,
  ProductVariant,
  Category,
  Brand,
  GarmentSize,
  GarmentColor,
  ShopSettings
} from '../../types';

interface InventoryManagerProps {
  settings: ShopSettings;
  onOpenBarcodePrinter?: (variant: ProductVariant) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ settings, onOpenBarcodePrinter }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sizes, setSizes] = useState<GarmentSize[]>([]);
  const [colors, setColors] = useState<GarmentColor[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // New Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodSubcategory, setProdSubcategory] = useState('');
  const [prodFabric, setProdFabric] = useState('');
  const [prodGender, setProdGender] = useState<'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX'>('MEN');
  const [prodSeason, setProdSeason] = useState<'ALL_SEASON' | 'SUMMER' | 'WINTER' | 'SPRING_AUTUMN'>('ALL_SEASON');
  const [prodRack, setProdRack] = useState('Rack A-01');
  const [prodImageUrl, setProdImageUrl] = useState('');

  // Matrix Generator Selections
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [matrixVariants, setMatrixVariants] = useState<ProductVariant[]>([]);

  // Adjustment Modal
  const [adjustingVariant, setAdjustingVariant] = useState<ProductVariant | null>(null);
  const [adjQuantity, setAdjQuantity] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('Stock Audit Adjustment');

  const loadData = async () => {
    const [p, v, c, b, s, col] = await Promise.all([
      inventoryService.getProducts(),
      inventoryService.getVariants(),
      inventoryService.getCategories(),
      inventoryService.getBrands(),
      inventoryService.getSizes(),
      inventoryService.getColors()
    ]);
    setProducts(p);
    setVariants(v);
    setCategories(c);
    setBrands(b);
    setSizes(s);
    setColors(col);

    if (c.length > 0 && !prodCategory) setProdCategory(c[0].id);
    if (b.length > 0 && !prodBrand) setProdBrand(b[0].id);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate Matrix when sizes/colors change
  const regenerateMatrix = () => {
    if (!prodName || selectedSizes.length === 0 || selectedColors.length === 0) {
      setMatrixVariants([]);
      return;
    }

    const catObj = categories.find((c) => c.id === prodCategory);
    const brandObj = brands.find((b) => b.id === prodBrand);
    const catCode = catObj?.code || 'GAR';
    const brandCode = brandObj?.code || 'BR';

    const tempVariants: ProductVariant[] = [];

    selectedColors.forEach((colorId) => {
      const col = colors.find((c) => c.id === colorId);
      selectedSizes.forEach((sizeId) => {
        const sz = sizes.find((s) => s.id === sizeId);
        const sku = inventoryService.generateSku(brandCode, catCode, col?.name || 'COL', sz?.name || 'SZ');
        const barcode = inventoryService.generateBarcode();

        tempVariants.push({
          id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          productId: '', // assigned on save
          productName: prodName,
          sizeId,
          sizeName: sz?.name,
          colorId,
          colorName: col?.name,
          colorHex: col?.hexCode,
          sku,
          barcode,
          purchasePrice: 2000,
          salePrice: 3500,
          wholesalePrice: 2800,
          discount: 0,
          taxPercent: 0,
          quantity: 10,
          minStock: 4,
          isActive: true,
          rackLocation: prodRack
        });
      });
    });

    setMatrixVariants(tempVariants);
  };

  // Toggle Size
  const toggleSize = (sizeId: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId) ? prev.filter((id) => id !== sizeId) : [...prev, sizeId]
    );
  };

  // Toggle Color
  const toggleColor = (colorId: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId]
    );
  };

  useEffect(() => {
    if (showAddProductModal) {
      regenerateMatrix();
    }
  }, [selectedSizes, selectedColors, prodName, prodCategory, prodBrand]);

  // Save new Product + Generated Matrix
  const handleSaveProduct = async () => {
    if (!prodName) return;
    const catObj = categories.find((c) => c.id === prodCategory);
    const brandObj = brands.find((b) => b.id === prodBrand);

    const productId = `prod-${Date.now()}`;
    const newProduct: Product = {
      id: productId,
      name: prodName,
      categoryId: prodCategory,
      categoryName: catObj?.name,
      brandId: prodBrand,
      brandName: brandObj?.name,
      subcategory: prodSubcategory,
      fabric: prodFabric,
      gender: prodGender,
      season: prodSeason,
      rackLocation: prodRack,
      imageUrl: prodImageUrl || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const finalVariants = matrixVariants.map((v) => ({
      ...v,
      productId,
      productName: prodName
    }));

    await inventoryService.saveProductWithVariants(newProduct, finalVariants);
    await loadData();
    setShowAddProductModal(false);

    // Reset inputs
    setProdName('');
    setSelectedSizes([]);
    setSelectedColors([]);
    setMatrixVariants([]);
  };

  // Execute Stock Adjustment
  const handleStockAdjust = async () => {
    if (!adjustingVariant || adjQuantity === 0) return;
    const user = authService.getCurrentUser();
    await inventoryService.adjustStock(adjustingVariant.id, adjQuantity, adjReason, {
      id: user.id,
      name: user.fullName
    });
    setAdjustingVariant(null);
    setAdjQuantity(0);
    await loadData();
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCatFilter === 'ALL' || p.categoryId === selectedCatFilter;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fabric && p.fabric.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.brandName && p.brandName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-600" />
            <span>Garments Inventory & Variant Matrix</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track variant-level stock (Size, Color, Fabric, Season) and barcodes
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedSizes(['sz-s', 'sz-m', 'sz-l']);
            setSelectedColors(['col-blk', 'col-nvy']);
            setShowAddProductModal(true);
          }}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Garment Product & Matrix</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, fabric, brand, SKU..."
            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedCatFilter}
            onChange={(e) => setSelectedCatFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products & Expandable Variants List */}
      <div className="space-y-3">
        {filteredProducts.map((prod) => {
          const prodVariants = variants.filter((v) => v.productId === prod.id);
          const totalStock = prodVariants.reduce((sum, v) => sum + v.quantity, 0);
          const isExpanded = expandedProductId === prod.id;

          return (
            <div
              key={prod.id}
              className="bg-white border border-slate-200 hover:border-red-200 rounded-xl overflow-hidden shadow-xs transition"
            >
              {/* Product Header Row */}
              <div
                onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-red-50/20 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {prod.imageUrl ? (
                      <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                        {prod.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-red-600">{prod.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">{prod.brandName}</span>
                      <span>•</span>
                      <span>{prod.categoryName}</span>
                      <span>•</span>
                      <span>Fabric: {prod.fabric || 'Standard'}</span>
                      <span>•</span>
                      <span>Rack: {prod.rackLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {totalStock} units
                    </div>
                    <span className="text-[10px] text-red-600 font-semibold">
                      {prodVariants.length} variants
                    </span>
                  </div>

                  <button className="text-slate-400 hover:text-slate-700 p-1">
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Variants Table */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50/80 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                    Variant Matrix for {prod.name}:
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="py-2 px-2">Size</th>
                          <th className="py-2 px-2">Color</th>
                          <th className="py-2 px-2">SKU Code</th>
                          <th className="py-2 px-2">Barcode</th>
                          <th className="py-2 px-2 text-right">Cost Price</th>
                          <th className="py-2 px-2 text-right">Sale Price</th>
                          <th className="py-2 px-2 text-center">Stock</th>
                          <th className="py-2 px-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prodVariants.map((v) => (
                          <tr key={v.id} className="hover:bg-red-50/30">
                            <td className="py-2 px-2 font-bold text-slate-900">{v.sizeName}</td>
                            <td className="py-2 px-2">
                              <span className="flex items-center gap-1.5">
                                {v.colorHex && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                    style={{ backgroundColor: v.colorHex }}
                                  />
                                )}
                                <span className="text-slate-700">{v.colorName}</span>
                              </span>
                            </td>
                            <td className="py-2 px-2 font-mono text-[11px] text-slate-600">{v.sku}</td>
                            <td className="py-2 px-2 font-mono text-[11px] text-red-600 flex items-center gap-1">
                              <Barcode className="w-3.5 h-3.5" />
                              <span>{v.barcode}</span>
                            </td>
                            <td className="py-2 px-2 text-right text-slate-500">
                              {settings.currencySymbol} {v.purchasePrice.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-right font-black text-red-600">
                              {settings.currencySymbol} {v.salePrice.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  v.quantity <= 0
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : v.quantity <= (v.minStock || 5)
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {v.quantity}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAdjustingVariant(v);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded"
                                  title="Adjust Stock Count"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {onOpenBarcodePrinter && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenBarcodePrinter(v);
                                    }}
                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                    title="Print Barcode Label"
                                  >
                                    <Barcode className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: New Garment Product & Matrix Generator */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" />
                <span>Create Garment & Generate Variant Matrix</span>
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Basic Garment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-600 font-medium block mb-1">Product Title *</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Classic Wash Cotton Kurta"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Brand</label>
                  <select
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Fabric Composition</label>
                  <input
                    type="text"
                    value={prodFabric}
                    onChange={(e) => setProdFabric(e.target.value)}
                    placeholder="e.g. 100% Giza Cotton"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Gender</label>
                  <select
                    value={prodGender}
                    onChange={(e: any) => setProdGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="KIDS">Kids</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Season</label>
                  <select
                    value={prodSeason}
                    onChange={(e: any) => setProdSeason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  >
                    <option value="ALL_SEASON">All Season</option>
                    <option value="SUMMER">Summer</option>
                    <option value="WINTER">Winter</option>
                    <option value="SPRING_AUTUMN">Spring / Autumn</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={prodRack}
                    onChange={(e) => setProdRack(e.target.value)}
                    placeholder="e.g. Rack C-03"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Image URL (Optional)</label>
                  <input
                    type="text"
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* MATRIX BUILDER CONTROLS */}
              <div className="p-3 bg-red-50/50 rounded-lg border border-red-200 space-y-3">
                <div className="font-bold text-xs text-red-700 uppercase tracking-wide">
                  Step 2: Select Sizes & Colors to Auto-Generate Variants
                </div>

                {/* Size Checkboxes */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Select Sizes:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map((sz) => {
                      const isSelected = selectedSizes.includes(sz.id);
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => toggleSize(sz.id)}
                          className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-red-600 border-red-600 text-white shadow-2xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-red-50'
                          }`}
                        >
                          {sz.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Checkboxes */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Select Colors:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((col) => {
                      const isSelected = selectedColors.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => toggleColor(col.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition ${
                            isSelected
                              ? 'bg-red-600 border-red-600 text-white font-semibold shadow-2xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-red-50'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: col.hexCode }}
                          />
                          <span>{col.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Generated Variants Preview & Pricing Grid */}
              {matrixVariants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Generated Variants Matrix ({matrixVariants.length} Combinations)</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs bg-white">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="p-2">Variant</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Barcode</th>
                          <th className="p-2">Cost Price</th>
                          <th className="p-2">Sale Price</th>
                          <th className="p-2">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matrixVariants.map((v, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold text-slate-900">
                              {v.sizeName} / {v.colorName}
                            </td>
                            <td className="p-2 font-mono text-[11px] text-slate-600">{v.sku}</td>
                            <td className="p-2 font-mono text-[11px] text-red-600">{v.barcode}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={v.purchasePrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setMatrixVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, purchasePrice: val } : item))
                                  );
                                }}
                                className="w-20 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={v.salePrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setMatrixVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, salePrice: val } : item))
                                  );
                                }}
                                className="w-20 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={v.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setMatrixVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                                  );
                                }}
                                className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={!prodName || matrixVariants.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-md shadow-red-600/20"
              >
                Save Product & {matrixVariants.length} Variants
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Stock Audit Adjustment */}
      {adjustingVariant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-4 space-y-3 shadow-2xl text-slate-900">
            <h4 className="font-bold text-sm text-slate-900">Manual Stock Audit</h4>
            <p className="text-xs text-slate-500">
              Adjust physical quantity for {adjustingVariant.productName} ({adjustingVariant.sizeName} / {adjustingVariant.colorName}). Current: {adjustingVariant.quantity}
            </p>

            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">
                Quantity Change (+ to add, - to deduct):
              </label>
              <input
                type="number"
                value={adjQuantity || ''}
                onChange={(e) => setAdjQuantity(Number(e.target.value))}
                placeholder="e.g. +5 or -2"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">Reason / Note:</label>
              <input
                type="text"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setAdjustingVariant(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjust}
                disabled={adjQuantity === 0}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-xs"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
