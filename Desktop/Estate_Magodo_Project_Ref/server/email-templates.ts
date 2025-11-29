import { format } from 'date-fns';

interface InvoiceData {
  invoiceNumber: string;
  dateIssued: Date;
  residentName: string;
  residentAddress: string;
  userId: string;
  invoiceDate: Date;
  billingCycle: string;
  monthsBilled: number;
  billingPeriod: string;
  amountDue: string;
  paymentDueDate: Date;
  periodStart: Date;
  periodEnd: Date;
}

export function generateInvoiceEmailHTML(data: InvoiceData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 650px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: right;
      margin-bottom: 30px;
      color: #2563eb;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .header .invoice-number {
      font-size: 14px;
      margin-top: 5px;
    }
    .header .date {
      font-size: 14px;
      color: #666;
      margin-top: 3px;
    }
    .bill-to {
      margin-bottom: 30px;
    }
    .bill-to h3 {
      color: #2563eb;
      font-size: 12px;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .bill-to p {
      margin: 3px 0;
      font-size: 14px;
    }
    .greeting {
      margin-bottom: 20px;
      font-size: 14px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      background-color: #fafafa;
    }
    .invoice-table th {
      background-color: #e5e7eb;
      padding: 12px 8px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .invoice-table td {
      padding: 12px 8px;
      font-size: 13px;
      border: 1px solid #d1d5db;
    }
    .period-info {
      margin: 20px 0;
      font-size: 14px;
    }
    .payment-reminder {
      margin: 25px 0;
      padding: 15px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      font-size: 14px;
    }
    .payment-reminder strong {
      color: #92400e;
    }
    .signature-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .signature-box {
      display: inline-block;
      width: 100px;
      height: 100px;
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      text-align: center;
      margin-bottom: 10px;
    }
    .signature-box svg {
      width: 60px;
      height: 60px;
      margin-top: 20px;
      fill: #6b7280;
    }
    .signature-info p {
      margin: 3px 0;
      font-size: 14px;
    }
    .bank-details {
      margin-top: 25px;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 6px;
    }
    .bank-details p {
      margin: 5px 0;
      font-size: 14px;
    }
    .bank-details strong {
      display: inline-block;
      min-width: 130px;
    }
    .thank-you {
      margin-top: 30px;
      font-size: 14px;
      color: #666;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice Number: ${data.invoiceNumber}</h1>
      <div class="date">Date Issued: ${format(data.dateIssued, 'dd-MM-yyyy')}</div>
    </div>

    <div class="bill-to">
      <h3>BILL TO:</h3>
      <p><strong>${data.residentName}</strong></p>
      <p>${data.residentAddress}</p>
    </div>

    <div class="greeting">
      <p>Dear ${data.residentName.split(' ')[0]},</p>
      <p>Please find below the details of your service charge billing due for payment.</p>
    </div>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>User ID</th>
          <th>Invoice Date</th>
          <th>Billing Cycle</th>
          <th>Months Billed</th>
          <th>Billing Period</th>
          <th>Amount Due</th>
          <th>Payment Due Date</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.userId}</td>
          <td>${format(data.invoiceDate, 'dd-MM-yyyy')}</td>
          <td>${data.billingCycle}</td>
          <td>${data.monthsBilled}</td>
          <td>${data.billingPeriod}</td>
          <td><strong>₦${data.amountDue}</strong></td>
          <td>${format(data.paymentDueDate, 'dd-MM-yyyy')}</td>
        </tr>
      </tbody>
    </table>

    <div class="period-info">
      <p>This bill covers the period from <strong>${format(data.periodStart, 'dd-MM-yyyy')}</strong> to <strong>${format(data.periodEnd, 'dd-MM-yyyy')}</strong></p>
    </div>

    <div class="payment-reminder">
      <p>Kindly make this payment on/before: <strong>${format(data.paymentDueDate, 'dd-MM-yyyy')}</strong></p>
      <p style="margin-top: 10px;">Thank you.</p>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="signature-info">
        <p><strong>Signed:</strong></p>
        <p>Estate Management</p>
        <p><strong>Magodo Estate</strong></p>
      </div>
    </div>

    <div class="bank-details">
      <p><strong>Bank:</strong> GTB</p>
      <p><strong>Account Name:</strong> Estate Service Account</p>
      <p><strong>Account No:</strong> 34572950</p>
    </div>

    <div class="thank-you">
      <p>We appreciate your prompt payment. If you have any questions about this invoice, please contact the estate management office.</p>
    </div>

    <div class="footer">
      <p>Magodo Estate Management System</p>
      <p>This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function generateInvoiceEmailText(data: InvoiceData): string {
  return `
INVOICE: ${data.invoiceNumber}
Date Issued: ${format(data.dateIssued, 'dd-MM-yyyy')}

BILL TO:
${data.residentName}
${data.residentAddress}

Dear ${data.residentName.split(' ')[0]},

Please find below the details of your service charge billing due for payment.

Invoice Details:
- User ID: ${data.userId}
- Invoice Date: ${format(data.invoiceDate, 'dd-MM-yyyy')}
- Billing Cycle: ${data.billingCycle}
- Months Billed: ${data.monthsBilled}
- Billing Period: ${data.billingPeriod}
- Amount Due: ₦${data.amountDue}
- Payment Due Date: ${format(data.paymentDueDate, 'dd-MM-yyyy')}

This bill covers the period from ${format(data.periodStart, 'dd-MM-yyyy')} to ${format(data.periodEnd, 'dd-MM-yyyy')}

PAYMENT REMINDER:
Kindly make this payment on/before: ${format(data.paymentDueDate, 'dd-MM-yyyy')}

BANK DETAILS:
Bank: GTB
Account Name: Estate Service Account
Account No: 34572950

Thank you for your prompt payment.

---
Signed:
Estate Management
Magodo Estate

---
Magodo Estate Management System
This is an automated email. Please do not reply directly to this message.
`;
}
