import html2pdf from 'html2pdf.js';
import { formatCurrency } from './orderUtils';

const DATE_FORMAT_OPTIONS = { year: 'numeric', month: 'short', day: 'numeric' };

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleDateString('en-IN', DATE_FORMAT_OPTIONS);
}

export async function generateInvoicePDF(data, fileName) {
  const { customer, tenant, orders, order, items } = data;
  
  // Create a container for the invoice
  const element = document.createElement('div');
  element.style.padding = '20px';
  element.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  element.style.color = '#334155';
  element.style.backgroundColor = '#fff';
  element.style.lineHeight = '1.3';

  const tenantName = tenant?.name || 'Tenant';
  
  let content = `
    <!-- Professional Header Section -->
    <div style="margin-bottom: 20px;">
      <div style="text-align: center; margin-bottom: 15px;">
        <h1 style="margin: 0; font-size: 24px; color: #000; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase;">
          ${tenantName}
        </h1>
      </div>
      
      <div style="text-align: left;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 2px;">BILL TO</div>
        <div style="display: inline-block;">
          <h2 style="margin: 0; font-size: 18px; color: #1e293b;">
            <strong style="text-transform: uppercase; color: #000; font-weight: 800;">${customer.name}</strong> 
            <span style="color: #64748b; font-weight: 500; font-size: 16px; margin-left: 2px;">${order ? 'ORDER INVOICE' : 'DELIVERED ORDERS'}</span>
          </h2>
        </div>
      </div>
    </div>
  `;

  if (order) {
    // Single Order Details
    content += `
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 15px;">
        <div style="padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background-color: #fafafa;">
          <div style="font-size: 13px; font-weight: 700; color: #1e293b;">
            Order #${order.id}
          </div>
          <div style="background-color: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
            ${order.status || 'NEW'}
          </div>
        </div>
        
        <div style="padding: 8px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead style="border-bottom: 1px solid #f1f5f9;">
              <tr>
                <th style="text-align: left; padding: 6px 0; color: #64748b; font-weight: 600;">Item</th>
                <th style="text-align: center; padding: 6px 0; color: #64748b; font-weight: 600; width: 50px;">Qty</th>
                <th style="text-align: right; padding: 6px 0; color: #64748b; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 6px 0; color: #334155;">${item.itemName || 'Unknown Item'}</td>
                  <td style="padding: 6px 0; text-align: center; color: #334155;">${item.quantity || 0}</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${formatCurrency(item.lineTotal)}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 1px solid #f1f5f9;">
                <td colspan="2" style="padding: 8px 0; text-align: right; font-weight: 600; color: #64748b;">Order Total:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #1e293b; font-size: 13px;">${formatCurrency(order.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (orders) {
    // Bulk Delivered Orders
    let grandTotal = 0;
    const customerCredit = Number(customer?.credits || 0);

    content += `
      <div style="margin-bottom: 15px;">
        ${orders.map(orderRecord => {
          const { order: o, items: oItems } = orderRecord;
          grandTotal += Number(o.totalAmount || 0);
          return `
            <div style="margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
              <div style="padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background-color: #fafafa;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b;">
                  Order #${o.id}
                </div>
                <div style="background-color: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                  ${o.status || 'DELIVERED'}
                </div>
              </div>
              
              <div style="padding: 8px 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <thead style="border-bottom: 1px solid #f1f5f9;">
                    <tr>
                      <th style="text-align: left; padding: 6px 0; color: #64748b; font-weight: 600;">Item</th>
                      <th style="text-align: center; padding: 6px 0; color: #64748b; font-weight: 600; width: 50px;">Qty</th>
                      <th style="text-align: right; padding: 6px 0; color: #64748b; font-weight: 600;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${oItems.map(item => `
                      <tr>
                        <td style="padding: 6px 0; color: #334155;">${item.itemName || 'Unknown Item'}</td>
                        <td style="padding: 6px 0; text-align: center; color: #334155;">${item.quantity || 0}</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">${formatCurrency(item.lineTotal)}</td>
                      </tr>
                    `).join('')}
                    <tr style="border-top: 1px solid #f1f5f9;">
                      <td colspan="2" style="padding: 8px 0; text-align: right; font-weight: 600; color: #64748b;">Order Total:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #1e293b; font-size: 13px;">${formatCurrency(o.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
        <div style="width: 250px; text-align: right; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #64748b;">
            <span>Subtotal:</span>
            <span style="font-weight: 600;">${formatCurrency(grandTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #ef4444;">
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
    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 9px; color: #94a3b8;">
      <p style="margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Thank you for your business!</p>
      <p style="margin: 3px 0 0 0; color: #64748b;">Developed with love by <strong>Tiwari Technologies</strong></p>
    </div>
  `;

  element.innerHTML = content;
  document.body.appendChild(element);

  const opt = {
    margin: [5, 5, 5, 5],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
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
