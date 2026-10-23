const Alumni = require("../models/alumniModel");
const Connection = require("../models/connectionModel");
const User = require("../models/user");

const getNetworkGraph = async (req, res) => {
  try {
    const profiles = (await require("../services/discoveryPolicy").visibleProfiles(req.user, { includeSelf: true })).sort((a, b) => Number(b.verified) - Number(a.verified) || new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 80);
    const connections = await Connection.find({
      status: "accepted",
      requester: { $in: profiles.map((profile) => profile.user) },
      recipient: { $in: profiles.map((profile) => profile.user) },
    }).lean();

    const nodes = profiles.map((profile) => ({
      id: String(profile.user),
      profileId: String(profile._id),
      name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
      imageUrl: profile.imageUrl,
      branch: profile.branch,
      batch: profile.endYear,
      company: profile.company,
      designation: profile.designation,
      location: profile.location,
      verified: profile.verified,
      isCurrentUser: String(profile.user) === String(req.user._id),
    }));
    const edgeKeys = new Set();
    const edges = connections.map((connection) => {
      const source = String(connection.requester);
      const target = String(connection.recipient);
      edgeKeys.add([source, target].sort().join(":"));
      return { source, target, type: "connection", label: "Connected" };
    });

    // Add explainable similarity links so users can discover beyond direct contacts.
    for (let left = 0; left < profiles.length && edges.length < 180; left += 1) {
      for (let right = left + 1; right < profiles.length && edges.length < 180; right += 1) {
        const a = profiles[left];
        const b = profiles[right];
        const key = [String(a.user), String(b.user)].sort().join(":");
        if (edgeKeys.has(key)) continue;
        const shared = [];
        if (a.company && a.company.toLowerCase() === b.company?.toLowerCase()) shared.push(a.company);
        if (a.branch && a.branch.toLowerCase() === b.branch?.toLowerCase()) shared.push(a.branch);
        if (!shared.length) continue;
        edgeKeys.add(key);
        edges.push({
          source: String(a.user),
          target: String(b.user),
          type: "similarity",
          label: `Shared ${shared.join(" · ")}`,
        });
      }
    }

    return res.status(200).json({
      status: "success",
      data: {
        nodes,
        edges,
        summary: {
          people: nodes.length,
          connections: edges.filter((edge) => edge.type === "connection").length,
          discoveryLinks: edges.filter((edge) => edge.type === "similarity").length,
        },
      },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("networkController.failed", error);
    throw error;
  }
};

module.exports = { getNetworkGraph };
