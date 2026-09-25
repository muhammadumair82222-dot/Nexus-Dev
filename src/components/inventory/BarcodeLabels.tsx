import React, { useState, useEffect } from 'react';
import { Barcode as BarcodeIcon, Printer, CheckSquare, Square, X, Search } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { ProductVariant, ShopSettings } from '../../types';

interface BarcodeLabelsProps {
  settings: ShopSettings;
  selectedVariantInitial?: ProductVariant | null;
}

export const BarcodeLabels: React.FC<BarcodeLabelsProps> = ({ settings, selectedVariantInitial }) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    inventoryService.getVariants().then((v) => {
      setVariants(v);
      if (selectedVariantInitial) {
        setSelectedVariantIds([selectedVariantInitial.id]);
        setLabelCounts({ [selectedVariantInitial.id]: 4 });
      } else if (v.length > 0) {
        setSelectedVariantIds([v[0].id, v[1]?.id].filter(Boolean));
        setLabelCounts({
          [v[0].id]: 4,
          ...(v[1] ? { [v[1].id]: 4 } : {})
        });
      }
    });
  }, [selectedVariantInitial]);

  const toggleSelect = (id: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    if (!labelCounts[id]) {
      setLabelCounts((prev) => ({ ...prev, [id]: 4 }));
    }
  };

  const updateCount = (id: string, count: number) => {
    setLabelCounts((prev) => ({ ...prev, [id]: Math.max(1, count) }));
  };

  const handlePrint = () => {
    window.print();
  };

  const filtered = variants.filter(
    (v) =>
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      (v.productName && v.productName.toLowerCase().includes(search.toLowerCase())) ||
      v.barcode.includes(search)
  );

  // Generate list of stickers to render
  const stickersToPrint: { variant: ProductVariant; index: number }[] = [];
  selectedVariantIds.forEach((id) => {
    const v = variants.find((item) => item.id === id);
    if (v) {
      const count = labelCounts[id] || 1;
      for (let i = 0; i < count; i++) {
        stickersToPrint.push({ variant: v, index: i });
      }
    }
  });

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 text-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-red-600" />
            <span>Garment Barcode Label Printing Studio</span>
          </h2>
          <p className="text-xs text-slate-500">
            Generate and print retail price tags and barcode stickers for apparel
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={stickersToPrint.length === 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/20 transition self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print {stickersToPrint.length} Barcode Labels</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Variant Selector & Counts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search garments to print labels..."
              className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="text-xs font-semibold text-slate-600">
            Select Variants ({selectedVariantIds.length} chosen):
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto space-y-2 pr-1">
            {filtered.map((v) => {
              const isSelected = selectedVariantIds.includes(v.id);
              return (
                <div
                  key={v.id}
                  onClick={() => toggleSelect(v.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-red-50 border-red-500 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-slate-900">{v.productName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">{v.sizeName}</span>
                        <span>•</span>
                        <span>{v.colorName}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-red-600">{v.barcode}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="flex items-center gap-1 shrink-0 ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-slate-500 font-medium">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={labelCounts[v.id] || 4}
                        onChange={(e) => updateCount(v.id, Number(e.target.value))}
                        className="w-12 bg-white border border-slate-300 text-center py-0.5 rounded text-slate-900 text-xs font-bold"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Printable Sheet Preview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Print Sheet Layout Preview (Thermal Sticker / A4 Label Sheet)
            </span>
            <span className="text-xs text-slate-500 font-medium">{stickersToPrint.length} Stickers Total</span>
          </div>

          <div
            id="printable-barcodes"
            className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-lg my-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-16rem)]"
          >
            {stickersToPrint.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                Select one or more garment variants on the left to preview barcode stickers.
              </div>
            ) : (
              stickersToPrint.map((sticker, idx) => (
                <div
                  key={idx}
                  className="bg-white text-black p-3 rounded border border-gray-300 shadow-xs flex flex-col justify-between text-center select-none"
                  style={{ width: '100%', minHeight: '120px' }}
                >
                  <div>
                    <div className="text-[9px] font-black tracking-wider uppercase text-gray-800 truncate">
                      {settings.shopName}
                    </div>
                    <div className="text-[10px] font-bold text-gray-900 truncate mt-0.5">
                      {sticker.variant.productName}
                    </div>
                    <div className="text-[9px] text-gray-700 font-semibold mt-0.5">
                      SIZE: <span className="font-black text-black">{sticker.variant.sizeName}</span> | COLOR: {sticker.variant.colorName}
                    </div>
                  </div>

                  {/* Simulated High Density Barcode */}
                  <div className="my-1.5">
                    <div className="font-mono text-sm tracking-widest text-black leading-none select-none">
                      || | ||| | || |||| |
                    </div>
                    <div className="text-[10px] font-mono font-bold tracking-wider text-gray-800 mt-0.5">
                      {sticker.variant.barcode}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-gray-300 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-[9px] text-gray-600">{sticker.variant.sku}</span>
                    <span className="font-black text-red-600 text-xs">
                      {settings.currencySymbol} {sticker.variant.salePrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Tip: Compatible with standard 50mm x 30mm thermal label printers (Xprinter, Zebra) and 24-up A4 sticker sheets.
          </div>
        </div>
      </div>
    </div>
  );
};
