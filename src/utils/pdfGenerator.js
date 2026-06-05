import html2pdf from 'html2pdf.js';
import { formatCurrency } from './orderUtils';

const DATE_FORMAT_OPTIONS = { year: 'numeric', month: 'short', day: 'numeric' };

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = safeDate(value);
  return date ? date.toLocaleDateString('en-IN', DATE_FORMAT_OPTIONS) : 'N/A';
}

function getOrderDate(order) {
  return order?.orderDate || order?.deliveredAt || order?.createdAt || order?.updatedAt || null;
}

function getBaseUnitPrice(item) {
  const value = item?.baseUnitPrice ?? item?.basePrice ?? item?.price ?? item?.item?.basePrice ?? item?.item?.price;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getEffectiveUnitPrice(item) {
  const value = item?.unitPrice ?? item?.customPrice ?? item?.customUnitPrice ?? getBaseUnitPrice(item) ?? 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isCustomUnitPrice(item) {
  if (item?.isCustomPrice || item?.priceType === 'CUSTOM') {
    return true;
  }

  if (item?.customPrice !== undefined || item?.customUnitPrice !== undefined) {
    return true;
  }

  const baseUnitPrice = getBaseUnitPrice(item);
  const effectiveUnitPrice = getEffectiveUnitPrice(item);

  return baseUnitPrice !== null && effectiveUnitPrice !== baseUnitPrice;
}

function getDateKey(value) {
  const date = safeDate(value);
  return date ? date.toISOString().split('T')[0] : 'unknown';
}

function groupOrdersByDate(orders = []) {
  const grouped = new Map();

  orders.forEach((orderRecord) => {
    const order = orderRecord?.order || {};
    const dateValue = getOrderDate(order);
    const dateKey = getDateKey(dateValue);
    const groupLabel = formatDate(dateValue);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { label: groupLabel, orderRecords: [] });
    }

    grouped.get(dateKey).orderRecords.push({ ...orderRecord, dateValue, groupLabel });
  });

  return Array.from(grouped.values());
}

function renderItemRows(items = [], dateValue) {
  const dateLabel = escapeHtml(formatDate(dateValue));

  return items.map((item) => `
    <tr>
      <td style="padding: 8px 6px; color: #475569; vertical-align: top; width: 18%;">${dateLabel}</td>
      <td style="padding: 8px 6px; color: #0f172a; font-weight: 600; vertical-align: top; width: 34%; word-break: break-word;">
        <div>${escapeHtml(item.itemName || item.name || item.item?.name || 'Unknown Item')}</div>
        ${isCustomUnitPrice(item) ? '<div style="margin-top: 3px; font-size: 10px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.06em;">Custom price</div>' : ''}
      </td>
      <td style="padding: 8px 6px; text-align: right; color: #334155; vertical-align: top; width: 16%; white-space: nowrap;">${formatCurrency(getEffectiveUnitPrice(item))}</td>
      <td style="padding: 8px 6px; text-align: center; color: #334155; vertical-align: top; width: 10%;">${escapeHtml(item.quantity || 0)}</td>
      <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: #0f172a; vertical-align: top; width: 22%;">${formatCurrency(item.lineTotal ?? (getEffectiveUnitPrice(item) * Number(item.quantity || 0)))}</td>
    </tr>
  `).join('');
}

function renderOrderCard(orderRecord) {
  const order = orderRecord?.order || {};
  const items = Array.isArray(orderRecord?.items) ? orderRecord.items : [];
  const dateValue = orderRecord?.dateValue || getOrderDate(order);
  const orderDateLabel = escapeHtml(formatDate(dateValue));
  const orderStatus = escapeHtml(order.status || 'DELIVERED');
  const orderId = escapeHtml(order.id || 'N/A');
  const orderTotal = formatCurrency(order.totalAmount);

  return `
    <div style="margin-bottom: 14px; border: 1px solid #dbe4ee; border-radius: 10px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; background-color: #fff;">
      <div style="padding: 12px 14px; border-bottom: 1px solid #eef2f7; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Order</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">#${orderId}</div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; background-color: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">
              ${orderStatus}
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 10px 14px 12px 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed;">
          <thead style="border-bottom: 1px solid #e2e8f0;">
            <tr>
              <th style="text-align: left; padding: 8px 6px; color: #64748b; font-weight: 700; width: 18%;">Date</th>
              <th style="text-align: left; padding: 8px 6px; color: #64748b; font-weight: 700; width: 34%;">Item</th>
              <th style="text-align: right; padding: 8px 6px; color: #64748b; font-weight: 700; width: 16%;">Unit Price</th>
              <th style="text-align: center; padding: 8px 6px; color: #64748b; font-weight: 700; width: 10%;">Qty</th>
              <th style="text-align: right; padding: 8px 6px; color: #64748b; font-weight: 700; width: 22%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemRows(items, dateValue)}
            <tr style="border-top: 1px solid #e2e8f0;">
              <td colspan="4" style="padding: 10px 6px 0 6px; text-align: right; font-weight: 700; color: #64748b;">Order Total:</td>
              <td style="padding: 10px 6px 0 6px; text-align: right; font-weight: 800; color: #0f172a; font-size: 13px;">${orderTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export async function generateInvoicePDF(data, fileName) {
  const { customer, tenant, orders, order, items } = data;
  
  // Create a container for the invoice
  const element = document.createElement('div');
  element.style.padding = '14px';
  element.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  element.style.color = '#334155';
  element.style.backgroundColor = '#fff';
  element.style.lineHeight = '1.45';
  element.style.width = '100%';
  element.style.maxWidth = '820px';
  element.style.boxSizing = 'border-box';

  const tenantName = escapeHtml(tenant?.name || 'Tenant');
  const customerName = escapeHtml(customer?.name || 'Customer');
  
  let content = `
    <div style="margin-bottom: 18px;">
      <div style="text-align: center; margin-bottom: 12px;">
        <h1 style="margin: 0; font-size: 22px; color: #000; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase;">
          ${tenantName}
        </h1>
      </div>
      
      <div style="text-align: left; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
        <div style="font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em;">Bill To</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h2 style="margin: 0; font-size: 18px; color: #0f172a; line-height: 1.2;">
            <strong style="text-transform: uppercase; color: #000; font-weight: 800;">${customerName}</strong>
          </h2>
          <div style="font-size: 14px; color: #64748b; font-weight: 600;">${order ? 'Order Invoice' : 'Delivered Orders'}</div>
        </div>
      </div>
    </div>
  `;

  if (order) {
    // Single Order Details
    content += renderOrderCard({ order, items });
  } else if (orders) {
    // Bulk Delivered Orders
    let grandTotal = 0;
    const customerCredit = Number(customer?.credits || 0);
    const groupedOrders = groupOrdersByDate(Array.isArray(orders) ? orders : []);

    content += `
      <div style="margin-bottom: 15px;">
        ${groupedOrders.map((group) => `
          <div style="margin-bottom: 16px;">
            <div style="margin-bottom: 10px; padding: 8px 12px; border-left: 4px solid #0f172a; background-color: #f8fafc; border-radius: 8px;">
              <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Orders for</div>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${escapeHtml(group.label)}</div>
            </div>

            ${group.orderRecords.map((orderRecord) => {
              const order = orderRecord?.order || {};
              grandTotal += Number(order.totalAmount || 0);
              return renderOrderCard(orderRecord);
            }).join('')}
          </div>
        `).join('')}
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
        <div style="width: 100%; max-width: 280px; text-align: right; padding-top: 10px; border-top: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; color: #64748b;">
            <span>Subtotal:</span>
            <span style="font-weight: 600;">${formatCurrency(grandTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #ef4444;">
            <span>Customer Credit:</span>
            <span style="font-weight: 600;">${formatCurrency(customerCredit)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px;">
            <span style="font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase;">Total:</span>
            <span style="font-size: 18px; font-weight: 800; color: #1e293b;">${formatCurrency(grandTotal + customerCredit)}</span>
          </div>
        </div>
      </div>
    `;
  }

  content += `
    <div style="margin-top: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 18px; font-size: 9px; color: #94a3b8;">
      <p style="margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Thank you for your business!</p>
      <p style="margin: 3px 0 0 0; color: #64748b;">Developed with love by <strong>Tiwari Technologies</strong></p>
    </div>
  `;

  element.innerHTML = content;
  document.body.appendChild(element);

  const opt = {
    margin: [4, 4, 4, 4],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 540 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const pdf = await html2pdf().set(opt).from(element).toPdf().get('pdf');
    const blob = pdf.output('blob');
    document.body.removeChild(element);
    return blob;
  } catch (error) {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
    throw error;
  }
}
