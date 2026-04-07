// ─────────────────────────────────────────────
// FlowCheck Email Library
// All Resend API calls are server-side only.
// Never import this on the client.
// ─────────────────────────────────────────────
const { Resend } = require('resend');
const { db }     = require('./firebase-admin');   // Firestore Admin
const { renderTemplate } = require('./templates');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS  = 'FlowCheck <hello@getflowcheck.app>';
const SUPPORT_EMAIL = 'support@getflowcheck.app';

// ── Core send function with idempotency ──────
async function sendEmail({ to, subject, html, idempotencyKey, emailType, userId }) {
  if (!to || !subject || !html) throw new Error('Missing required email fields');

  // 1. Check idempotency — has this exact email already been sent?
  if (idempotencyKey) {
    const existingRef = db.collection('emailLogs').doc(idempotencyKey);
    const existing = await existingRef.get();
    if (existing.exists) {
      console.log(`[email] Skipped duplicate: ${idempotencyKey}`);
      return { skipped: true, idempotencyKey };
    }
  }

  // 2. Send via Resend
  let result;
  try {
    result = await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      [to],
      subject: subject,
      html:    html,
    });
  } catch (err) {
    console.error(`[email] Send failed: ${emailType} to ${to}`, err.message);
    // Log the failure
    if (userId) {
      await db.collection('emailLogs').add({
        userId, to, emailType, status: 'failed',
        error: err.message, sentAt: new Date().toISOString()
      });
    }
    throw err;
  }

  // 3. Log success with idempotency key
  const logData = {
    userId:          userId || null,
    to,
    emailType,
    subject,
    resendMessageId: result?.data?.id || null,
    status:          'sent',
    sentAt:          new Date().toISOString(),
    idempotencyKey:  idempotencyKey || null,
  };

  if (idempotencyKey) {
    await db.collection('emailLogs').doc(idempotencyKey).set(logData);
  } else {
    await db.collection('emailLogs').add(logData);
  }

  // 4. Update user's emailState
  if (userId) {
    const fieldMap = {
      welcome:            'welcomeEmailSentAt',
      verify:             'verifyEmailSentAt',
      trial_started:      'trialStartedEmailSentAt',
      trial_ending_3d:    'trialEnding3dEmailSentAt',
      trial_ending_1d:    'trialEnding1dEmailSentAt',
      subscription_active:'subscriptionActiveEmailSentAt',
      payment_failed:     'paymentFailedEmailSentAt',
      subscription_canceled: 'subscriptionCanceledEmailSentAt',
      account_deleted:    'accountDeletedEmailSentAt',
      weekly_summary:     'lastWeeklySummarySentAt',
      monthly_summary:    'lastMonthlySummarySentAt',
      reengagement:       'reengagementEmailSentAt',
      sync_issue:         'syncIssueEmailSentAt',
    };
    const field = fieldMap[emailType];
    if (field) {
      await db.collection('userEmailState').doc(userId).set(
        { [field]: new Date().toISOString() },
        { merge: true }
      );
    }
  }

  console.log(`[email] Sent: ${emailType} → ${to} (${result?.data?.id})`);
  return result;
}

// ── Lifecycle email dispatcher ────────────────
async function sendLifecycleEmail(emailType, userId, extraData = {}) {
  // Fetch user data
  const userRecord = await getUserRecord(userId);
  if (!userRecord?.email) {
    console.warn(`[email] No email for userId: ${userId}`);
    return;
  }

  // Build idempotency key
  const idempotencyKey = buildIdempotencyKey(emailType, userId, extraData);

  // Render template
  const { subject, html } = renderTemplate(emailType, {
    email:   userRecord.email,
    name:    userRecord.displayName || 'there',
    userId,
    ...extraData,
  });

  return sendEmail({
    to: userRecord.email,
    subject,
    html,
    idempotencyKey,
    emailType,
    userId,
  });
}

// ── Helpers ───────────────────────────────────
function buildIdempotencyKey(emailType, userId, extraData = {}) {
  const { weekKey, monthKey } = extraData;
  if (emailType === 'weekly_summary' && weekKey) return `${emailType}_${userId}_${weekKey}`;
  if (emailType === 'monthly_summary' && monthKey) return `${emailType}_${userId}_${monthKey}`;
  // One-time emails: key is just type + userId
  const oneTimeTypes = ['welcome','verify','trial_started','subscription_active',
                        'subscription_canceled','account_deleted'];
  if (oneTimeTypes.includes(emailType)) return `${emailType}_${userId}`;
  // Others: include timestamp day to allow daily retries
  const day = new Date().toISOString().slice(0, 10);
  return `${emailType}_${userId}_${day}`;
}

async function getUserRecord(userId) {
  try {
    const admin = require('./firebase-admin').admin;
    return await admin.auth().getUser(userId);
  } catch (e) {
    return null;
  }
}

async function getUserEmailState(userId) {
  const doc = await db.collection('userEmailState').doc(userId).get();
  return doc.exists ? doc.data() : {};
}

module.exports = {
  sendEmail,
  sendLifecycleEmail,
  getUserEmailState,
  SUPPORT_EMAIL,
};
