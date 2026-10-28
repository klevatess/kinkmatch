/* src/texts.en.js — every user-facing string of the bot (English). DRAFT: wording waits for the owner's approval.
   Keys must match texts.ru.js (a test checks it). */

export const T = {
  hiAgain: "Kinkoverse — the button below. Or «Kinkoverse» next to the message field.",
  welcome: "Hi! This is <b>Kinkoverse</b>, a sister project of Kinkosmos — a bot for members of the chat {chat}.\n\n" +
    "Fill in your profile here and see which members of the chat live nearby and how well your checklists match. " +
    "Tap «Open Kinkoverse».",
  welcomeMany: "Hi! This is <b>Kinkoverse</b>, a sister project of Kinkosmos. You are a member of the chats {chats}.\n\n" +
    "Fill in your profile here and see which members of these chats live nearby and how well your checklists match. " +
    "Tap «Open Kinkoverse».",
  openApp: "Open Kinkoverse",
  notMember: "<b>Kinkoverse</b> is a sister project of Kinkosmos.\n\n" +
    "You are not in any connected community chat yet. For now «Open space» is available: you see everyone who switched it on, and they see you. " +
    "Once you join a connected chat, its members appear too.\n\nIf you are an admin of your own chat and want to connect it, tap «Connect your chat».",
  noChat: "<b>Kinkoverse</b> is a sister project of Kinkosmos.\n\n" +
    "The bot is not connected to any chat yet. For now «Open space» is available: you see everyone who switched it on, and they see you.\n\n" +
    "If you are a chat admin and want to connect your chat, tap «Connect your chat».",
  checkFailed: "Could not check whether you are in the chat. Please try again a bit later.",
  unknown: "For now I understand /start, /connect (connect your chat) and /invite (an invitation for chat members).",

  connectButton: "Connect your chat",
  pickChatButton: "Choose a chat",
  connectHelp: "<b>How to connect a chat</b>\n\n" +
    "1. Tap «Choose a chat» and pick your chat — Telegram adds the bot as an administrator.\n" +
    "2. The bot only needs the «manage chat» right (it is on); you can leave all other rights off.\n" +
    "3. Only an administrator of that chat can connect it.\n" +
    "4. Once connected, the bot leaves one message with a button for the members in the chat (you can pin it). It posts nothing else there.\n\n" +
    "To disconnect: remove the bot from the chat or take away its admin rights.",
  dmBound: "The chat «{chat}» is connected. I left one message with a button for the members there — you can pin it. I post nothing else in the chat.",
  dmNeedAdmin: "You added me to «{chat}» without admin rights. To connect the chat, make me an administrator — " +
    "or tap /connect and add me with the button.",

  locSaved: "Place saved as a ~{km} km area. The point itself is not kept, and I deleted your message with it. Go back to Kinkoverse.",
  locTooSoon: "The place can be changed once every 7 days. Next time: {date}.",
  locNoAccess: "First open Kinkoverse and complete the first steps of the profile.",

  ownerWelcome: "This is the Kinkoverse admin account. The admin panel is the button below. Use another account as a participant.",
  ownerNewChat: "A new chat is connected: «{chat}» ({count} members). If it is not your community, you can block it in the panel: «Connected chats» → this chat → «Danger zone».",
  ownerOpenPanel: "Open the panel",
  ownerBlockMoved: "This button no longer blocks. Block a chat in the panel: «Connected chats» → the chat → «Danger zone».",
  ownerBlocked: "Chat blocked",
  ownerChatOff: "The chat «{chat}» disconnected the bot.",
  health: "Status:\ndatabase: {db}\nusers: {users}\nin a chat: {members}\nconnected chats: {chats}\n" +
    "Telegram queue: {pending}\nlast webhook error: {error}",

  // stage 5: mutual yes (DRAFT)
  starLitLater: "You have been given a community star ✦ It appears on the map once you fill in your profile in Kinkoverse. Then switch it on in the «Profile» tab.",
  starLit: "You have been given a community star ✦ Switch it on in the «Profile» tab — neighbours will see a gold star and your caption under the nickname.",
  mutualYes: "A mutual yes in Kinkoverse! Open the «Mutual» tab: the name and the «Write in Telegram» button are there.",
  contact: "Telegram profile: {link}\n\nIf the link does not open, the person's privacy settings hide their profile. Then ask them to write to you first: they have a «Write in Telegram» button too.",
  contactName: "open the profile",
  banned: "Your Kinkoverse account was blocked by a moderator.",

  // stage 6: moderators (DRAFT)
  modInvite: "<b>You are invited to be a Kinkoverse moderator</b>\nScope: {scope}.\n\nWhat it means:\n" +
    "· reports about profiles will come to you;\n" +
    "· you can view members' profiles and checklist answers (never their location), hide a profile, warn a person or block them in the bot;\n" +
    "· the owner sees every decision you take and every profile you open, and can undo decisions.\n\n" +
    "The owner will see your name and @username. Nobody sees people's exact location, you neither.",
  modAccept: "Accept",
  modDecline: "Decline",
  modDone: "Done, you are a moderator. New reports will come here. Moderation: the «Moderation» tab in Kinkoverse or the /mod command.",
  modDeclined: "Invitation declined.",
  modInvalid: "This invitation is no longer valid. Ask the owner for a new one.",
  modOwnerNew: "New moderator: {name} · scope: {scope}.",
  modRemoved: "You are no longer a Kinkoverse moderator.",
  modOpen: "Open moderation",
  notMod: "This command is for moderators only.",
  scopeAll: "all chats",
  newReport: "New report #{n}: {reason} · {chat}.",
  reason_under18: "may be under 18",
  reason_fake: "fake or bot",
  reason_abuse: "insults or pressure",
  reason_other: "other",
  toHeld: "Your profile is hidden for now until a moderator checks it.",
  toWarn: "A Kinkoverse moderator warns you: your profile was reported ({reason}). Please follow the community rules.",
  toHide: "A Kinkoverse moderator hid your profile for 7 days ({reason}). Until {date} nobody sees you.",
  toBan: "Your Kinkoverse account was blocked by a moderator ({reason}).",
  banProposed: "Moderator {by} proposes to block the person on report #{n} ({reason}). The block works only after you approve it.",
  banRejected: "The owner did not approve the block on report #{n}. The report is open again — you can choose another decision.",
  toRestored: "Your profile is visible to neighbours again.",

  // the owner's panel: link to a person's account (DRAFT)
  accountLink: "Account of profile #{n}: {link}",

  // an invitation the chat admin forwards to the chat (the bot itself never posts there) — DRAFT
  inviteIntro: "So that members of «{chat}» find the bot, forward the message below to the chat (you can pin it). The bot itself does not post there.",
  inviteIntroAny: "Forward the message below to your community chat (you can pin it) so that members find the bot.",
  inviteCard: "<b>Kinkoverse</b> — neighbours by Kinkosmos checklists.\n\n" +
    "The bot shows which chat members live nearby and how well your checklists match. Name and Telegram open only after a mutual yes; the exact place is never stored. 18+.\n\n" +
    "Tap the button below, then «Start».",
  inviteButton: "Open Kinkoverse",

  // after connecting, when the bot could not post its one message in the chat — DRAFT
  dmBoundNoPost: "The chat «{chat}» is connected, but I could not leave the message with a button there. Tap /invite and forward the invitation to the chat yourself.",
  // /connect for a chat admin who already connected chats — DRAFT
  myChats: "<b>Your connected chats</b>",
  myChatLine: "«{chat}» — {size} in the chat · {opened} opened the bot · {ready} with a profile",
  myChatsInvite: "An invitation for the members: /invite.",
  // the weekly digest (only for people who agreed) — DRAFT
  digestHead: "<b>Kinkoverse this week</b>",
  digestNew: "New neighbours: {n}",
  digestMutual: "New mutual yes: {n}",
  digestFoot: "Turn the digest off: Kinkoverse → «Profile» → «Settings».",

  // inactive accounts (owner, 2026-10-19)
  idleHidden: "You have not opened Kinkoverse for two months, so your profile is hidden from the map. To bring it back, just open the app.",
  idleWarn: "You have not opened Kinkoverse for a long time. If you do not open it before {date}, your profile and everything the bot knows about you will be deleted. Warning {n} of 3. To keep your profile, just open the app.",
  idleDeleted: "Your Kinkoverse profile was deleted because you had not opened the bot for eight months. You can start again any time: /start.",
  // a one-sided «yes» (owner, 2026-10-19: right away, with the nickname; the name / Telegram stay hidden until mutual)
  likeMore: "And {n} more said «yes» to you too.",
  likePending: "{n} more people said «yes» to you in Kinkoverse. Their cards are in the «Mutual» tab.",
  likeNote: "{who} answered you «yes» in Kinkoverse. The profile is in the «Mutual» tab. Answer «yes» and names and Telegram open.",
  // «Suggest practices» (owner, 2026-10-24; DRAFT)
  proposeMsg: "{who} suggests trying together:\n{list}",
  proposeMsgNew: "{who} changed their suggestion. Now it is:\n{list}",
  proposeHead: "{who} suggests trying together and writes:",
  proposeHeadNew: "{who} changed their suggestion and writes:",
  proposeListN: "Suggested practices ({n}):",
  proposeBtn: "Open in «Mutual»",
  ksLinkMsg: "The checklist of {who} on Kinkosmos — the constellation and every portrait mode:\n{link}",
  ksLinkOpen: "Open on Kinkosmos",
  ksLinkSomeone: "a neighbour",
  someone: "Someone nearby",
  shareCaption: "This is my result on Kinkosmos. And who are you? Find out in Kinkoverse — the bot finds people nearby with similar interests 👇",
  fileCaption: "My result in Kinkosmos\n{link}",
  shareButton: "✦ Find out yours",
  // the backup file sent to the owner (owner, 2026-10-19)
  backupCaption: "Kinkoverse backup. Encrypted with DATA_KEY — keep the file and DATA_KEY apart.",
  // «Universe» (owner, 2026-10-21) — DRAFT wording
  uniOffer: "<b>The Universe</b> is a few checked chats whose people see each other{list}. You can apply for «{chat}» — the bot's owner decides.",
  uniReqBtn: "Apply to the Universe",
  uniWdBtn: "Withdraw the application",
  uniReqSent: "The application for «{chat}» was sent. The answer comes here.",
  uniReqWithdrawn: "The application for «{chat}» was withdrawn.",
  uniReqAlready: "«{chat}» is already in the Universe or has applied.",
  uniNotAdmin: "Only an admin of this chat can apply.",
  uniNone: "You are not an admin of a connected chat that is not in the Universe yet.",
  uniPick: "Which chat to apply to the Universe for?",
  uniAccepted: "«{chat}» is now in the Universe. The bot tells its members itself.",
  uniDeclined: "The application of «{chat}» to the Universe was not accepted for now.",
  uniRequestOwner: "Universe application: chat «{chat}». Decide in the panel → Universe.",
  uniJoined: "Your chat «{chat}» joined the <b>Universe</b> — a few checked chats whose people see each other: {others}.\n\nFor now you are still seen only in your own chat. Do you want to be seen in the Universe too?",
  uniJoinedFirst: "Your chat «{chat}» joined the <b>Universe</b> — checked chats whose people see each other. Other chats will join soon.\n\nFor now you are still seen only in your own chat. Do you want to be seen in the Universe too?",
  uniOn: "Turn on",
  uniOff: "Only my chat",
  uniSetOn: "Done: you are seen in the Universe. You can change it in the settings.",
  uniSetOff: "Fine, only your chat. You can change it in the settings.",
  spaceInvite: "Your list of neighbours in Kinkoverse is empty: you are not in any chat connected to the bot.\n\nGo to <b>open space</b> — everyone who turned it on sees each other. {n} people are there now.",
  spaceInviteBtn: "Go to open space",
  spaceSetOn: "Done: you are in open space. You can turn it off in the settings.",
  // reminders, one per step (owner, 2026-10-21) — DRAFT wording
  rem_consent: "You opened Kinkoverse but did not finish the first step — date of birth and consent. It takes a minute. If the date does not work, type digits, e.g. 05051990.",
  rem_checklist: "The checklist is left: 50 answers are enough, the rest can wait. You can fill it in right in the bot — the draft saves itself.",
  remChecklistDraft: "The checklist is left: the draft already has {n} answers — {k} more and it is ready. The rest can wait.",
  rem_profile: "The checklist is ready — now a nickname, who you are looking for and a couple of lines about yourself.",
  rem_place: "The last step is a rough place. The bot keeps only a 1 or 3 km area, never the point. Without it neighbours do not see you.",
  remNearChats: "People on the map in your chats: {n}. They will see you once you finish.",
  remNearSpace: "People on the map in open space: {n}. They will see you once you finish.",
  comeback: "While you were away, new people appeared nearby: {n}. Take a look in Kinkoverse — maybe someone suits you.",
  sugAccepted: "Your suggestion «{name}» was accepted: it is in the «Interests» catalog now and already picked for you. Thank you!",
  sugAcceptedNoRoom: "Your suggestion «{name}» was accepted: it is in the «Interests» catalog now. Pick it in «Profile → Interests» — that section is full at the moment, remove something first.",
  remGo: "Continue",
  remStop: "Stop reminding",
  remStopped: "Fine, no more reminders.",
  placeReset: "Your place in Kinkoverse seems to be wrong (e.g. the two coordinate numbers swapped). Please set it again — the «Place» step in the app.",
};
