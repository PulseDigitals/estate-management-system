import { getUncachableResendClient } from './resend-client';
import { generateInvoiceEmailHTML, generateInvoiceEmailText } from './email-templates';
import { format, addDays } from 'date-fns';

// Match the actual database schema types
interface Bill {
  id: string;
  residentId: string;
  invoiceNumber: string | null;
  amount: string;
  createdAt: Date | null;
  dueDate: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: string;
  description: string | null;
}

interface Resident {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  unitNumber: string | null;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendInvoiceEmail(
  bill: Bill,
  resident: Resident
): Promise<EmailResult> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    // Use actual period dates from the bill
    const billingStartDate = bill.periodStart ? new Date(bill.periodStart) : new Date();
    const billingEndDate = bill.periodEnd ? new Date(bill.periodEnd) : addDays(billingStartDate, 90);
    const invoiceDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
    
    // Calculate billing cycle from period dates
    const monthsDiff = Math.round((billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const billingCycle = monthsDiff >= 12 ? 'Annual' : monthsDiff >= 3 ? 'Quarterly' : 'Monthly';
    const monthsBilled = Math.max(1, monthsDiff);

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber: bill.invoiceNumber || 'PENDING',
      dateIssued: invoiceDate,
      residentName: resident.firstName && resident.lastName 
        ? `${resident.firstName} ${resident.lastName}` 
        : 'Valued Resident',
      residentAddress: resident.unitNumber || 'N/A',
      userId: resident.userId,
      invoiceDate: invoiceDate,
      billingCycle: billingCycle,
      monthsBilled: monthsBilled,
      billingPeriod: `${format(billingStartDate, 'dd/MM')}-${format(billingEndDate, 'dd/MM/yy')}`,
      amountDue: parseFloat(bill.amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      paymentDueDate: bill.dueDate ? new Date(bill.dueDate) : addDays(invoiceDate, 30),
      periodStart: billingStartDate,
      periodEnd: billingEndDate,
    };

    // Generate email content
    const htmlContent = generateInvoiceEmailHTML(invoiceData);
    const textContent = generateInvoiceEmailText(invoiceData);

    // Send email
    console.log(`[Email Service] Attempting to send email to ${resident.email} from ${fromEmail}`);
    const result = await client.emails.send({
      from: fromEmail,
      to: resident.email,
      subject: `Invoice ${invoiceData.invoiceNumber} - Service Charge Payment Due`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`[Email Service] Resend API response:`, JSON.stringify(result, null, 2));
    
    if (result.error) {
      const errorMsg = result.error.message || 'Unknown Resend error';
      console.error(`[Email Service] ❌ RESEND API ERROR:`, errorMsg);
      
      // Check for domain verification error
      if (errorMsg.includes('domain is not verified') || errorMsg.includes('verification')) {
        console.error(`[Email Service] 🔴 DOMAIN VERIFICATION REQUIRED:`);
        console.error(`   From Email: ${fromEmail}`);
        console.error(`   Solution 1 (Testing): Update Resend connector to use "onboarding@resend.dev"`);
        console.error(`   Solution 2 (Production): Verify your domain at https://resend.com/domains`);
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.log(`[Email Service] Invoice email sent to ${resident.email} for bill #${bill.id}, Message ID: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error(`[Email Service] Failed to send invoice email for bill #${bill.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendBulkInvoiceEmails(
  bills: Bill[],
  residents: Map<string, Resident>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const bill of bills) {
    const resident = residents.get(bill.residentId);
    if (!resident) {
      console.warn(`[Email Service] Resident not found for bill #${bill.id}`);
      failed++;
      continue;
    }

    if (!resident.email) {
      console.warn(`[Email Service] No email address for resident #${resident.id}`);
      failed++;
      continue;
    }

    const result = await sendInvoiceEmail(bill, resident);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[Email Service] Bulk send completed: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
