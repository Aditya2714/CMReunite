const Alumni = require("../models/alumniModel");
const Connection = require("../models/connectionModel");
const User = require("../models/user");

const STOP_WORDS = new Set([
  "a", "an", "and", "alumni", "can", "connect", "find", "for", "from", "help",
  "i", "in", "is", "looking", "me", "mentor", "need", "of", "people", "please",
  "someone", "the", "to", "want", "who", "with",
]);

const parseAlumniQuery = (input = "") => {
  const query = String(input).trim();
  const lower = query.toLowerCase();
  const years = [...new Set((query.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number))];
  const quoted = [...query.matchAll(/["']([^"']+)["']/g)].map((match) => match[1].trim());
  const mode = /\bmentor|guidance|advise|advice\b/.test(lower)
    ? "mentor"
    : /\breferr?al|job|hiring|opportunit/.test(lower)
      ? "referral"
      : "network";
  const tokens = [
    ...quoted,
    ...lower
      .replace(/["']/g, "")
      .split(/[^a-z0-9+#.]+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token) && !years.includes(Number(token))),
  ];

  return { query, mode, years, keywords: [...new Set(tokens)].slice(0, 8) };
};

const scoreProfile = (profile, intent) => {
  const fields = {
    skills: (profile.skills || []).join(" "),
    company: profile.company || "",
    domain: profile.domain || "",
    designation: profile.designation || "",
    branch: profile.branch || "",
    location: profile.location || "",
    bio: profile.bio || "",
  };
  const weights = { skills: 4, domain: 3, company: 3, designation: 2, branch: 2, location: 2, bio: 1 };
  const matches = [];
  let score = 0;

  intent.keywords.forEach((keyword) => {
    Object.entries(fields).forEach(([field, value]) => {
      if (String(value).toLowerCase().includes(keyword.toLowerCase())) {
        score += weights[field];
        matches.push(`${field}: ${keyword}`);
      }
    });
  });
  if (intent.years.includes(profile.endYear)) {
    score += 4;
    matches.push(`batch: ${profile.endYear}`);
  }
  if (intent.mode === "mentor" && profile.bio) score += 1;
  if (intent.mode === "referral" && profile.company) score += 1;
  return { score, matches: [...new Set(matches)].slice(0, 4) };
};

const queryAssistant = async (req, res) => {
  try {
    const intent = parseAlumniQuery(req.body?.query);
    if (intent.query.length < 3) {
      return res.status(400).json({ status: "fail", message: "Ask a more specific alumni question." });
    }

    const visibleUsers = await User.find({
      _id: { $ne: req.user._id, $nin: req.user.blockedUsers || [] },
      blockedUsers: { $ne: req.user._id },
      "privacy.profileVisibility": { $ne: "private" },
      role: "alumni",
      isApproved: true,
    }).select("_id").lean();
    const profiles = await Alumni.find({ user: { $in: visibleUsers.map((user) => user._id) } })
      .select("user firstName lastName imageUrl branch endYear company designation domain location skills bio verified")
      .limit(250)
      .lean();

    const ranked = profiles
      .map((profile) => ({ ...profile, ...scoreProfile(profile, intent) }))
      .filter((profile) => profile.score > 0 || (!intent.keywords.length && !intent.years.length))
      .sort((a, b) => b.score - a.score || Number(b.verified) - Number(a.verified))
      .slice(0, 12);

    const purpose = intent.mode === "mentor" ? "potential mentors" : intent.mode === "referral" ? "referral contacts" : "network matches";
    return res.status(200).json({
      status: "success",
      data: {
        intent,
        answer: ranked.length
          ? `I found ${ranked.length} ${purpose} grounded in alumni profile data.`
          : "I could not find a grounded match. Try a skill, company, branch, city, or graduation year.",
        results: ranked,
        evidence: {
          source: "Verified alumni directory fields",
          searchedProfiles: profiles.length,
          ranking: "Exact field matches with transparent weights",
        },
      },
    });
  } catch (error) {
    console.error("Assistant query failed:", error);
    return res.status(500).json({ status: "fail", message: "Unable to search alumni right now." });
  }
};

const performAssistantAction = async (req, res) => {
  try {
    const { action, targetProfileId, confirmed = false } = req.body || {};
    const navigation = {
      open_mentorship: "/mentorship",
      open_referrals: "/career-referrals",
      open_network: "/network-graph",
    };
    if (navigation[action]) {
      return res.status(200).json({
        status: "success",
        data: { action, navigation: navigation[action], message: "The requested workspace is ready to open." },
      });
    }
    if (action !== "connect") {
      return res.status(400).json({ status: "fail", message: "Unsupported assistant action" });
    }
    const profile = await Alumni.findById(targetProfileId).select("user firstName lastName");
    if (!profile || String(profile.user) === String(req.user._id)) {
      return res.status(400).json({ status: "fail", message: "Choose a valid alumni profile" });
    }
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    const targetUser = await User.findById(profile.user).select("privacy blockedUsers");
    const blocked =
      req.user.blockedUsers?.some((id) => String(id) === String(profile.user)) ||
      targetUser?.blockedUsers?.some((id) => String(id) === String(req.user._id));
    if (blocked || targetUser?.privacy?.allowConnections === false) {
      return res.status(403).json({ status: "fail", message: "This user is not accepting connection requests" });
    }
    if (!confirmed) {
      return res.status(200).json({
        status: "confirmation_required",
        data: {
          requiresConfirmation: true,
          action: "connect",
          targetProfileId,
          message: `Send a connection request to ${name}?`,
        },
      });
    }
    const existing = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: profile.user },
        { requester: profile.user, recipient: req.user._id },
      ],
    });
    if (existing) return res.status(409).json({ status: "fail", message: "A connection relationship already exists" });
    await Connection.create({ requester: req.user._id, recipient: profile.user, message: "Sent through the alumni assistant" });
    return res.status(201).json({
      status: "success",
      data: { action: "connect", message: `Connection request sent to ${name}.` },
    });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Unable to complete the assistant action" });
  }
};

module.exports = { parseAlumniQuery, performAssistantAction, queryAssistant, scoreProfile };
