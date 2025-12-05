import PDFDocument from 'pdfkit';
import { format, addDays } from 'date-fns';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  residentName: string;
  unitNumber: string;
  userId: string;
  billingPeriod: string;
  description: string;
  amount: string;
  balance?: string;
  totalPaid?: string;
}

// Helper function to format date as "17-Sept-2025"
function formatInvoiceDate(date: Date): string {
  return format(date, 'dd-MMM-yyyy');
}

// Helper function to format currency in Nigerian Naira
function formatNGN(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₦${numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', (buffer) => buffers.push(buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      // Header - Estate Name
      doc
        .fillColor('#1e3a8a')
        .fontSize(20)
        .text('Magodo Estate Residents Association', 50, 50)
        .fontSize(10)
        .fillColor('#64748b')
        .text('Estate Management Office', 50, 75)
        .text('Lagos, Nigeria', 50, 90);

      // Invoice Title
      doc
        .fillColor('#1e3a8a')
        .fontSize(28)
        .text('INVOICE', 400, 50, { align: 'right' });

      // Invoice Details Box
      const invoiceBoxTop = 120;
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text('Invoice Number:', 400, invoiceBoxTop)
        .font('Helvetica-Bold')
        .fillColor('#1e3a8a')
        .text(data.invoiceNumber, 400, invoiceBoxTop + 15)
        .font('Helvetica')
        .fillColor('#334155')
        .text('Date Issued:', 400, invoiceBoxTop + 35)
        .text(formatInvoiceDate(data.invoiceDate), 400, invoiceBoxTop + 50)
        .text('Due Date:', 400, invoiceBoxTop + 70)
        .font('Helvetica-Bold')
        .fillColor('#dc2626')
        .text(formatInvoiceDate(data.dueDate), 400, invoiceBoxTop + 85);

      // Bill To Section
      doc
        .font('Helvetica')
        .fillColor('#64748b')
        .fontSize(9)
        .text('BILL TO', 50, invoiceBoxTop);

      doc
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .fontSize(14)
        .text(data.residentName, 50, invoiceBoxTop + 15)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#334155')
        .text(`Unit ${data.unitNumber}`, 50, invoiceBoxTop + 35)
        .text(`User ID: ${data.userId}`, 50, invoiceBoxTop + 50);

      // Horizontal line
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(50, 230)
        .lineTo(545, 230)
        .stroke();

      // Personalized Greeting
      const greetingTop = 250;
      doc
        .font('Helvetica')
        .fillColor('#0f172a')
        .fontSize(11)
        .text(`Dear ${data.residentName},`, 50, greetingTop)
        .fontSize(10)
        .fillColor('#334155')
        .text('Please find below the detail of your service charge billing due for payment:', 50, greetingTop + 20);

      // Invoice Items Table Header
      const tableTop = 295;
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .text('DESCRIPTION', 50, tableTop)
        .text('BILLING PERIOD', 280, tableTop)
        .text('AMOUNT', 480, tableTop, { align: 'right' });

      // Table header underline
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(50, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .stroke();

      // Parse billing period to format dates
      let formattedBillingPeriod = data.billingPeriod;
      try {
        // Try to parse the billing period if it's in a standard format
        const periodMatch = data.billingPeriod.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (periodMatch) {
          const startDate = new Date(periodMatch[1]);
          const endDate = new Date(periodMatch[2]);
          formattedBillingPeriod = `${formatInvoiceDate(startDate)} - ${formatInvoiceDate(endDate)}`;
        }
      } catch (e) {
        // Keep original format if parsing fails
      }

      // Invoice Item
      const itemTop = tableTop + 30;
      doc
        .font('Helvetica')
        .fillColor('#0f172a')
        .fontSize(11)
        .text(data.description, 50, itemTop, { width: 220 })
        .text(formattedBillingPeriod, 280, itemTop, { width: 180 })
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#1e3a8a')
        .text(formatNGN(data.amount), 445, itemTop, { align: 'right', width: 100 });

      // Totals Section with improved shaded box
      const totalsTop = itemTop + 80;
      
      // Shaded box for totals - increased width for better fit
      doc
        .rect(330, totalsTop - 10, 215, 90)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      // Amount Due
      doc
        .font('Helvetica')
        .fillColor('#64748b')
        .fontSize(10)
        .text('Amount Due:', 340, totalsTop)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .fontSize(11)
        .text(formatNGN(data.amount), 445, totalsTop, { align: 'right', width: 90 });

      // Amount Paid (if any)
      if (data.totalPaid && parseFloat(data.totalPaid) > 0) {
        doc
          .font('Helvetica')
          .fillColor('#64748b')
          .fontSize(10)
          .text('Amount Paid:', 340, totalsTop + 25)
          .fillColor('#16a34a')
          .text(formatNGN(data.totalPaid), 445, totalsTop + 25, { align: 'right', width: 90 });
      }

      // Balance Due (if any)
      if (data.balance) {
        doc
          .strokeColor('#1e3a8a')
          .lineWidth(1)
          .moveTo(340, totalsTop + 45)
          .lineTo(535, totalsTop + 45)
          .stroke();

        doc
          .font('Helvetica-Bold')
          .fillColor('#1e3a8a')
          .fontSize(11)
          .text('Balance Due:', 340, totalsTop + 52)
          .fontSize(13)
          .text(formatNGN(data.balance), 445, totalsTop + 52, { align: 'right', width: 90 });
      }

      // Payment Instructions with dynamic due date
      const paymentInstructionsTop = totalsTop + 120;
      const paymentDueDate = addDays(data.invoiceDate, 7);
      
      doc
        .font('Helvetica')
        .fillColor('#0f172a')
        .fontSize(10)
        .text(
          `Kindly make this payment on/before this date: ${formatInvoiceDate(paymentDueDate)}, and make sure to quote your invoice number ${data.invoiceNumber} in the reference section of your payment.`,
          50,
          paymentInstructionsTop,
          { width: 495, align: 'left' }
        );

      // Bank Details Section
      const bankDetailsTop = paymentInstructionsTop + 50;
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .text('PAYMENT INFORMATION', 50, bankDetailsTop)
        .font('Helvetica')
        .fillColor('#334155')
        .fontSize(10)
        .text('Bank: Access Bank PLC', 50, bankDetailsTop + 20)
        .text('Account Name: Magodo Estate Residents Association', 50, bankDetailsTop + 35)
        .text('Account Number: 0123456789', 50, bankDetailsTop + 50);

      // Footer
      const footerTop = 750;
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(50, footerTop)
        .lineTo(545, footerTop)
        .stroke();

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .text('Thank you for your prompt payment.', 50, footerTop + 15, { align: 'center', width: 495 })
        .text('For inquiries, contact: finance@magodoestate.ng | +234 800 000 0000', 50, footerTop + 30, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
