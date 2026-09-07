import { licenseDb, parseDurationToMs } from './db.ts';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8842498066:AAH0c4j-sGaY5c-wolShvu-Z_PfzYuq2WvU';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// State tracking for multi-step prompts (e.g. awaiting key check, awaiting new password)
const userStates: Map<number, { action: string; meta?: any }> = new Map();

// Helper to make requests to Telegram Bot API
async function tgRequest(method: string, body: any): Promise<any> {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API Error (${method}):`, err);
    return null;
  }
}

// Send simple or formatted message
export async function sendTgMessage(chatId: number, text: string, options: any = {}) {
  return tgRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode || 'Markdown',
    reply_markup: options.reply_markup,
    disable_web_page_preview: true
  });
}

// Main admin keyboard
function getAdminKeyboard() {
  return {
    keyboard: [
      [{ text: '🔑 নতুন কি তৈরি' }, { text: '📋 সকল লাইসেন্স' }],
      [{ text: '🔍 লাইসেন্স চেক' }, { text: '🔄 ডিভাইস রিসেট' }],
      [{ text: '⚡ বুকমার্কলেট কোড' }, { text: '⚙️ পাসওয়ার্ড পরিবর্তন' }],
      [{ text: '📊 সিস্টেম স্ট্যাটাস' }, { text: '🚪 লগআউট' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

// Duration preset inline keyboard
function getDurationInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '⏱️ 5 Minutes', callback_data: 'gen_5m' },
        { text: '⏱️ 1 Hour', callback_data: 'gen_1h' }
      ],
      [
        { text: '⏱️ 24 Hours', callback_data: 'gen_24h' },
        { text: '⏱️ 7 Days', callback_data: 'gen_7d' }
      ],
      [
        { text: '⭐ 30 Days (VIP)', callback_data: 'gen_30d' },
        { text: '👑 Lifetime', callback_data: 'gen_lifetime' }
      ]
    ]
  };
}

// Format single license output
function formatLicenseDetail(lic: any): string {
  const isExp = lic.exp && Date.now() >= lic.exp;
  let expStr = 'শুরু হয়নি (লগইনে চালু হবে)';
  if (lic.duration === 'lifetime') {
    expStr = '👑 আজীবন (Lifetime Permanent)';
  } else if (lic.exp) {
    expStr = isExp ? '❌ মেয়াদ শেষ (Expired)' : `⏳ শেষ হবে: ${new Date(lic.exp).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}`;
  }

  return `🔑 *লাইসেন্স কি:* \`${lic.key}\`
───────────────────────────
• *স্ট্যাটাস:* ${!lic.active ? '🚫 ব্লকড (Inactive)' : (isExp ? '❌ মেয়াদোত্তীর্ণ' : '🟢 সক্রিয় (Active)')}
• *মেয়াদ (Duration):* \`${lic.duration}\`
• *কাউন্টডাউন:* ${expStr}
• *ট্রেডার আইডি:* \`${lic.trader_id || 'মুক্ত (Not Set)'}\`
• *ডিভাইস লক:* ${lic.device_id ? `🔒 \`${lic.device_id}\`` : '🔓 আনলকড (লগইনের অপেক্ষায়)'}
• *তৈরির সময়:* ${new Date(lic.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
${lic.note ? `• *নোট:* _${lic.note}_` : ''}`;
}

// Handle text commands and interactive messages
async function handleTelegramMessage(msg: any) {
  const chatId = msg.chat?.id;
  const fromUser = msg.from?.first_name || 'Admin';
  const text = (msg.text || '').trim();

  if (!chatId || !text) return;

  const isAuth = licenseDb.isTelegramChatAuthorized(chatId);

  // 1. UNAUTHENTICATED USERS: Must provide correct admin password
  if (!isAuth) {
    if (licenseDb.verifyAdminPassword(text)) {
      licenseDb.authorizeTelegramChat(chatId);
      userStates.delete(chatId);

      const status = licenseDb.getStatus();
      await sendTgMessage(
        chatId,
        `🎉 *অভিনন্দন ${fromUser}! এডমিন এক্সেস অনুমোদিত হয়েছে।*\n\n` +
        `🌐 *ডাটাবেস:* \`${status.storageType}\`\n` +
        `🔑 *মোট লাইসেন্স:* \`${status.keyCount}\` টি\n` +
        `⚡ *অটো-ট্রেড ইঞ্জিন:* \`100% সক্রিয়\`\n\n` +
        `নিচের মেনু বা বাটন ব্যবহার করে বট ও লাইসেন্স পরিচালনা করুন:`,
        { reply_markup: getAdminKeyboard() }
      );
      return;
    } else {
      await sendTgMessage(
        chatId,
        `🔐 *ISHAK AI PRO - Admin Access Required*\n══════════════════════════\n` +
        `বটটি ব্যবহারের জন্য এডমিন পাসওয়ার্ড প্রদান করুন:\n\n` +
        `_(ডিফল্ট পাসওয়ার্ড: \`ishakdevos\`)_`
      );
      return;
    }
  }

  // 2. AUTHENTICATED USER FLOW
  // Check if user is in an active prompt state
  const curState = userStates.get(chatId);

  if (curState) {
    if (curState.action === 'awaiting_new_password') {
      if (text.length < 4) {
        await sendTgMessage(chatId, '❌ নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে! অনুগ্রহ করে আবার লিখুন:');
        return;
      }
      await licenseDb.setAdminPassword(text);
      userStates.delete(chatId);
      await sendTgMessage(
        chatId,
        `✅ *এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!*\n\n` +
        `🔑 *নতুন পাসওয়ার্ড:* \`${text}\`\n` +
        `🌐 *সুপাবেজ ক্লাউড:* তাৎক্ষণিকভাবে আপডেট ও সেভ হয়েছে।`,
        { reply_markup: getAdminKeyboard() }
      );
      return;
    }

    if (curState.action === 'awaiting_check_key') {
      userStates.delete(chatId);
      const lic = await licenseDb.getLicense(text);
      if (!lic) {
        await sendTgMessage(chatId, `❌ \`${text}\` লাইসেন্স কি-টি ডাটাবেসে পাওয়া যায়নি!`, { reply_markup: getAdminKeyboard() });
      } else {
        await sendTgMessage(chatId, formatLicenseDetail(lic), { reply_markup: getAdminKeyboard() });
      }
      return;
    }

    if (curState.action === 'awaiting_reset_key') {
      userStates.delete(chatId);
      const res = await licenseDb.resetDevice(text);
      await sendTgMessage(chatId, res.message, { reply_markup: getAdminKeyboard() });
      return;
    }
  }

  // Common quick button & slash command routing
  const lowerText = text.toLowerCase();

  // /start or /menu
  if (lowerText === '/start' || lowerText === '/menu') {
    const status = licenseDb.getStatus();
    await sendTgMessage(
      chatId,
      `🤖 *ISHAK AI PRO VIP BOT - কন্ট্রোল প্যানেল*\n══════════════════════════\n` +
      `🌐 *ডাটাবেস:* \`${status.storageType}\`\n` +
      `🔗 *সুপাবেজ স্ট্যাটাস:* ${status.isSupabaseActive ? '🟢 Connected (Active)' : '🟡 Server Store'}\n` +
      `🔑 *মোট লাইসেন্স কি:* \`${status.keyCount}\` টি\n` +
      `⚡ *Quotex Auto-Trade:* \`Enabled & Ready\`\n\n` +
      `*কমান্ড তালিকা:*\n` +
      `• \`/genkey <duration> [trader_id]\` - দ্রুত কি জেনারেট\n` +
      `• \`/keys\` - সকল লাইসেন্স দেখুন\n` +
      `• \`/check <key>\` - লাইসেন্স যাচাই\n` +
      `• \`/reset <key>\` - ডিভাইস লক রিসেট\n` +
      `• \`/block <key>\` - লাইসেন্স ব্লক\n` +
      `• \`/unblock <key>\` - লাইসেন্স সক্রিয়\n` +
      `• \`/delkey <key>\` - লাইসেন্স মুছে ফেলুন\n` +
      `• \`/changepass <new_pass>\` - পাসওয়ার্ড পরিবর্তন\n` +
      `• \`/script\` - কোটেক্স অটো ট্রেড কোড\n` +
      `• \`/logout\` - লগআউট`,
      { reply_markup: getAdminKeyboard() }
    );
    return;
  }

  // 🔑 নতুন কি তৈরি
  if (lowerText === '🔑 নতুন কি তৈরি' || lowerText === '/gen') {
    await sendTgMessage(
      chatId,
      `🔑 *লাইসেন্স কি-এর মেয়াদ নির্বাচন করুন:*`,
      { reply_markup: getDurationInlineKeyboard() }
    );
    return;
  }

  // /genkey <duration> [trader_id]
  if (lowerText.startsWith('/genkey')) {
    const parts = text.split(/\s+/).slice(1);
    const duration = parts[0] || '30d';
    const traderId = parts[1] || '';

    const newLic = await licenseDb.generateLicense(duration, traderId, `Created via TG by ${fromUser}`);
    await sendTgMessage(
      chatId,
      `✅ *নতুন VIP লাইসেন্স তৈরি হয়েছে!*\n══════════════════════════\n\n` +
      `🔑 *Key:* \`${newLic.key}\`\n` +
      `_(উপরে কি-এর ওপর ক্লিক করলে স্বয়ংক্রিয় কপি হবে)_\n\n` +
      `⏱️ *মেয়াদ:* \`${newLic.duration}\`\n` +
      `👤 *ট্রেডার আইডি:* \`${newLic.trader_id || 'যেকোনো আইডি'}\`\n` +
      `🌐 *ডাটাবেস:* \`Supabase Cloud Sync 🟢\`\n` +
      `🔒 *ডিভাইস বাইন্ডিং:* প্রথম লগইনে স্বয়ংক্রিয়ভাবে লক হবে`,
      { reply_markup: getAdminKeyboard() }
    );
    return;
  }

  // 📋 সকল লাইসেন্স
  if (lowerText === '📋 সকল লাইসেন্স' || lowerText === '/keys' || lowerText === '/list') {
    const all = await licenseDb.getAllLicenses();
    // Filter out internal admin config key
    const displayList = all.filter(item => item.key !== '__ADMIN_CONFIG__');

    if (displayList.length === 0) {
      await sendTgMessage(chatId, '📭 বর্তমানে কোনো লাইসেন্স কি তৈরি করা নেই।', { reply_markup: getAdminKeyboard() });
      return;
    }

    let summary = `📋 *মোট লাইসেন্স তালিকা (${displayList.length} টি)*\n══════════════════════════\n\n`;
    displayList.slice(0, 15).forEach((lic, i) => {
      const isExp = lic.exp && Date.now() >= lic.exp;
      const statusIcon = !lic.active ? '🚫' : (isExp ? '❌' : '🟢');
      summary += `${i + 1}. ${statusIcon} \`${lic.key}\` [${lic.duration}]\n`;
      if (lic.trader_id) summary += `   └ Trader ID: \`${lic.trader_id}\`\n`;
      if (lic.device_id) summary += `   └ Locked Device: \`${lic.device_id}\`\n`;
    });

    if (displayList.length > 15) {
      summary += `\n_...এবং আরও ${displayList.length - 15} টি লাইসেন্স রয়েছে। বিস্তারিত দেখতে \`/check <key>\` লিখুন।_`;
    }

    await sendTgMessage(chatId, summary, { reply_markup: getAdminKeyboard() });
    return;
  }

  // 🔍 লাইসেন্স চেক
  if (lowerText === '🔍 লাইসেন্স চেক') {
    userStates.set(chatId, { action: 'awaiting_check_key' });
    await sendTgMessage(chatId, '🔍 অনুগ্রহ করে যে লাইসেন্স কি-টি চেক করতে চান তা লিখুন:');
    return;
  }

  if (lowerText.startsWith('/check')) {
    const parts = text.split(/\s+/).slice(1);
    const key = parts[0];
    if (!key) {
      await sendTgMessage(chatId, 'ব্যবহারবিধি: `/check <KEY>` (যেমন: `/check ISHAK-VIP-PRO-2025`)');
      return;
    }
    const lic = await licenseDb.getLicense(key);
    if (!lic) {
      await sendTgMessage(chatId, `❌ \`${key}\` লাইসেন্স কি ডাটাবেসে পাওয়া যায়নি!`);
    } else {
      await sendTgMessage(chatId, formatLicenseDetail(lic));
    }
    return;
  }

  // 🔄 ডিভাইস রিসেট
  if (lowerText === '🔄 ডিভাইস রিসেট') {
    userStates.set(chatId, { action: 'awaiting_reset_key' });
    await sendTgMessage(chatId, '🔄 যে লাইসেন্সটির ডিভাইস লক রিসেট করতে চান তার Key লিখুন:');
    return;
  }

  if (lowerText.startsWith('/reset')) {
    const parts = text.split(/\s+/).slice(1);
    const key = parts[0];
    if (!key) {
      await sendTgMessage(chatId, 'ব্যবহারবিধি: `/reset <KEY>`');
      return;
    }
    const res = await licenseDb.resetDevice(key);
    await sendTgMessage(chatId, res.message);
    return;
  }

  // 🚫 ব্লক / আনব্লক
  if (lowerText.startsWith('/block')) {
    const key = text.split(/\s+/)[1];
    if (!key) {
      await sendTgMessage(chatId, 'ব্যবহারবিধি: `/block <KEY>`');
      return;
    }
    const res = await licenseDb.toggleActive(key, false);
    await sendTgMessage(chatId, res.message);
    return;
  }

  if (lowerText.startsWith('/unblock')) {
    const key = text.split(/\s+/)[1];
    if (!key) {
      await sendTgMessage(chatId, 'ব্যবহারবিধি: `/unblock <KEY>`');
      return;
    }
    const res = await licenseDb.toggleActive(key, true);
    await sendTgMessage(chatId, res.message);
    return;
  }

  // 🗑️ ডিলিট কি
  if (lowerText.startsWith('/delkey') || lowerText.startsWith('/delete')) {
    const key = text.split(/\s+/)[1];
    if (!key) {
      await sendTgMessage(chatId, 'ব্যবহারবিধি: `/delkey <KEY>`');
      return;
    }
    await licenseDb.deleteLicense(key);
    await sendTgMessage(chatId, `🗑️ লাইসেন্স \`${key}\` সুপাবেজ ডাটাবেস থেকে ডিলিট করা হয়েছে!`);
    return;
  }

  // ⚙️ পাসওয়ার্ড পরিবর্তন
  if (lowerText === '⚙️ পাসওয়ার্ড পরিবর্তন') {
    userStates.set(chatId, { action: 'awaiting_new_password' });
    await sendTgMessage(
      chatId,
      `⚙️ *এডমিন পাসওয়ার্ড পরিবর্তন*\n══════════════════════════\n` +
      `নতুন পাসওয়ার্ডটি নিচে লিখে পাঠান (কমপক্ষে ৪ অক্ষরের হতে হবে):`
    );
    return;
  }

  if (lowerText.startsWith('/changepass')) {
    const parts = text.split(/\s+/).slice(1);
    const newPass = parts[0];
    if (!newPass || newPass.length < 4) {
      await sendTgMessage(chatId, 'ব্যবহারবিধি: `/changepass <নতুন_পাসওয়ার্ড>` (কমপক্ষে ৪ অক্ষর)');
      return;
    }
    await licenseDb.setAdminPassword(newPass);
    await sendTgMessage(
      chatId,
      `✅ *এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!*\n\n` +
      `🔑 *নতুন পাসওয়ার্ড:* \`${newPass}\`\n` +
      `🌐 সুপাবেজ ডাটাবেসে তাৎক্ষণিকভাবে সংরক্ষিত হয়েছে।`
    );
    return;
  }

  // ⚡ বুকমার্কলেট কোড
  if (lowerText === '⚡ বুকমার্কলেট কোড' || lowerText === '/script' || lowerText === '/code') {
    const scriptCode = `javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/ishakdevos/ishak-bot@main/loader.js?t='+Date.now();document.body.appendChild(s);})();`;

    await sendTgMessage(
      chatId,
      `⚡ *QUOTEX AUTO-TRADE BOOKMARKLET CODE*\n══════════════════════════\n\n` +
      `কপি করতে নিচের কোডের ওপর ক্লিক করুন:\n\n` +
      `\`${scriptCode}\`\n\n` +
      `📌 *ব্যবহার করার নিয়ম:*\n` +
      `১. ক্রোম/ব্রাউজারে যেকোনো পেজকে বুকমার্ক করুন।\n` +
      `২. বুকমার্ক এডিট করে URL এর জায়গায় উপরের কোডটি পেস্ট করুন।\n` +
      `৩. কোটেক্স (Quotex) প্ল্যাটফর্ম খুলে বুকমার্কে ক্লিক করুন।\n` +
      `৪. বট স্ক্রিনে ভেসে উঠবে এবং সম্পূর্ণ অটো-ট্রেড (Auto-Trade & Auto-Pilot) কাজ করবে!`
    );
    return;
  }

  // 📊 সিস্টেম স্ট্যাটাস
  if (lowerText === '📊 সিস্টেম স্ট্যাটাস' || lowerText === '/status') {
    const status = licenseDb.getStatus();
    const currentPass = licenseDb.getAdminPassword();
    await sendTgMessage(
      chatId,
      `📊 *ISHAK AI SYSTEM STATUS*\n══════════════════════════\n` +
      `🌐 *ডাটাবেস:* \`${status.storageType}\`\n` +
      `🔗 *Supabase Active:* \`${status.isSupabaseActive ? 'YES 🟢' : 'NO 🔴'}\`\n` +
      `🔑 *মোট লাইসেন্স:* \`${status.keyCount}\` টি\n` +
      `🔐 *বর্তমান পাসওয়ার্ড:* \`${currentPass}\`\n` +
      `⚡ *Quotex Auto Execution:* \`Active (Up/Down Buttons + Pointer Click)\`\n` +
      `🤖 *Telegram Bot Polling:* \`Online 24/7\``
    );
    return;
  }

  // 🚪 লগআউট
  if (lowerText === '🚪 লগআউট' || lowerText === '/logout') {
    licenseDb.revokeTelegramChat(chatId);
    userStates.delete(chatId);
    await sendTgMessage(
      chatId,
      `🔒 *সফলভাবে লগআউট করা হয়েছে!*\n\nপুনরায় এক্সেস করতে এডমিন পাসওয়ার্ড লিখুন:`,
      { reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  // Default unrecognized input for authenticated user
  await sendTgMessage(
    chatId,
    `❓ কমান্ডটি বুঝতে পারিনি। সাহায্য পেতে \`/menu\` লিখুন অথবা নিচের মেনু ব্যবহার করুন:`,
    { reply_markup: getAdminKeyboard() }
  );
}

// Handle inline callback buttons
async function handleTelegramCallback(callbackQuery: any) {
  const queryId = callbackQuery.id;
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data || '';

  if (!chatId) return;

  const isAuth = licenseDb.isTelegramChatAuthorized(chatId);
  if (!isAuth) {
    await tgRequest('answerCallbackQuery', { callback_query_id: queryId, text: 'অনুগ্রহ করে প্রথমে পাসওয়ার্ড দিয়ে লগইন করুন।' });
    return;
  }

  if (data.startsWith('gen_')) {
    const duration = data.replace('gen_', '');
    const newLic = await licenseDb.generateLicense(duration, '', 'Created via Telegram Quick Button');

    await tgRequest('answerCallbackQuery', { callback_query_id: queryId, text: 'লাইসেন্স কি সফলভাবে তৈরি হয়েছে!' });

    await sendTgMessage(
      chatId,
      `✅ *নতুন VIP লাইসেন্স তৈরি হয়েছে!*\n══════════════════════════\n\n` +
      `🔑 *Key:* \`${newLic.key}\`\n` +
      `_(ক্লিক করলেই কপি হবে)_\n\n` +
      `⏱️ *মেয়াদ:* \`${newLic.duration}\`\n` +
      `🌐 *ডাটাবেস:* \`Supabase Cloud Active 🟢\`\n` +
      `⚡ কোটেক্স বোতামে স্বয়ংক্রিয় ট্রেড করতে এই কি-টি ব্যবহার করুন।`,
      { reply_markup: getAdminKeyboard() }
    );
  }
}

// Continuous Telegram Bot Polling Engine
let isPolling = false;
let pollOffset = 0;

export async function startTelegramBot() {
  if (isPolling) return;
  isPolling = true;

  console.log('🤖 Starting Ishak AI Telegram Bot Polling Engine with Supabase connection...');

  // Reset webhooks to ensure getUpdates receives all messages
  await tgRequest('deleteWebhook', { drop_pending_updates: false });

  const pollLoop = async () => {
    while (isPolling) {
      try {
        const response = await fetch(`${TELEGRAM_API}/getUpdates?offset=${pollOffset}&timeout=25`, {
          method: 'GET'
        });

        if (!response.ok) {
          await new Promise(r => setTimeout(r, 4000));
          continue;
        }

        const data = await response.json();
        if (data && data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            pollOffset = update.update_id + 1;

            if (update.message) {
              await handleTelegramMessage(update.message).catch(e => console.error('Handle TG Message Error:', e));
            } else if (update.callback_query) {
              await handleTelegramCallback(update.callback_query).catch(e => console.error('Handle TG Callback Error:', e));
            }
          }
        }
      } catch (err) {
        // Network timeout / drop: wait 3 seconds and reconnect smoothly
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  };

  // Run in background
  pollLoop();
}

// Auto-run if executed directly as a standalone process
if (process.argv[1]?.endsWith('telegramBot.ts')) {
  startTelegramBot();
}
