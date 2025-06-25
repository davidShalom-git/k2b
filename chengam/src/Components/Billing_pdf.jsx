import React from 'react';
import { Printer, X } from 'lucide-react';

const Bill = ({ 
  table, 
  menuItems, 
  getCurrentPrice, 
  onClose, 
  restaurantName = "Restaurant POS", 
  gstRate = 18, 
  showGST = true 
}) => {
  if (!table) return null;

  const calculateSubtotal = () => {
    return Object.entries(table.orders || {}).reduce((sum, [itemId, qty]) => {
      const item = menuItems.find(item => item.id === parseInt(itemId));
      const price = item ? getCurrentPrice(item) : 0;
      return sum + (price * qty);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const gstAmount = showGST ? (subtotal * gstRate) / 100 : 0;
  const totalAmount = subtotal + gstAmount;

  const handlePrint = () => {
    window.print();
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-IN'),
      time: now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const { date, time } = getCurrentDateTime();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Screen Header - Hidden in print */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold text-gray-800">Bill Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        {/* Bill Content - This will be printed */}
        <div className="bill-content p-6 font-mono text-sm">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold mb-1">{restaurantName}</h1>
            <div className="border-b border-dashed border-gray-400 mb-2"></div>
            <div className="flex justify-between text-xs">
              <span>Date: {date}</span>
              <span>Time: {time}</span>
            </div>
          </div>

          {/* Table Info */}
          <div className="text-center mb-4">
            <div className="text-base font-bold">KOT - {table.id}</div>
            <div className="text-sm">Dine In: INDOOR</div>
            <div className="text-sm">Table No: {table.id}</div>
          </div>

          <div className="border-b border-dashed border-gray-400 mb-3"></div>

          {/* Items Header */}
          <div className="grid grid-cols-12 gap-1 text-xs font-bold mb-2">
            <div className="col-span-1">No.</div>
            <div className="col-span-5">Item</div>
            <div className="col-span-2">Special Note</div>
            <div className="col-span-2 text-center">Qty.</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>

          {/* Items List */}
          <div className="space-y-1 mb-3">
            {Object.entries(table.orders || {}).map(([itemId, qty], index) => {
              const item = menuItems.find(i => i.id === parseInt(itemId));
              const price = item ? getCurrentPrice(item) : 0;
              const itemTotal = price * qty;
              
              if (!item) return null;
              
              return (
                <div key={itemId} className="grid grid-cols-12 gap-1 text-xs">
                  <div className="col-span-1">{index + 1}</div>
                  <div className="col-span-5">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-gray-600">- ₹{price}</div>
                  </div>
                  <div className="col-span-2 text-gray-600">--</div>
                  <div className="col-span-2 text-center">{qty}</div>
                  <div className="col-span-2 text-right">₹{itemTotal}</div>
                </div>
              );
            })}
          </div>

          <div className="border-b border-dashed border-gray-400 mb-3"></div>

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            
            {showGST && (
              <div className="flex justify-between">
                <span>GST ({gstRate}%):</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-400 pt-2 mt-2">
              <div className="flex justify-between font-bold text-base">
                <span>Total Amount:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-b border-dashed border-gray-400 my-4"></div>

          {/* Footer */}
          <div className="text-center text-xs space-y-1">
            <div>Total Items: {Object.values(table.orders || {}).reduce((sum, qty) => sum + qty, 0)}</div>
            {table.orderTime && <div>Order Time: {table.orderTime}</div>}
            {table.billTime && <div>Bill Time: {table.billTime}</div>}
          </div>

          <div className="text-center text-xs mt-4 space-y-1">
            <div>Thank you for dining with us!</div>
            <div>Please visit again</div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bill-content, .bill-content * {
            visibility: visible;
          }
          .bill-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 300px;
            margin: 0;
            padding: 10px;
            font-size: 12px;
            line-height: 1.2;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
};

export default Bill;