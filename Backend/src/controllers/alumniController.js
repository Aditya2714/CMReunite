const Alumni = require("../models/alumniModel");
const User = require("../models/user");
const Connection = require("../models/connectionModel");

const getAlumniDirectory = async (req, res) => {
  try {
    const { keyword = "", batch = "", branch = "", location = "" } = req.query;
    const andFilters = [];

    if (keyword) {
      const keywordRegex = new RegExp(keyword, "i");
      andFilters.push({
        $or: [
          { firstName: keywordRegex },
          { lastName: keywordRegex },
          { email: keywordRegex },
          { branch: keywordRegex },
          { degree: keywordRegex },
          { skills: keywordRegex },
          { company: keywordRegex },
          { designation: keywordRegex },
          { location: keywordRegex },
          { "workExperiences.company": keywordRegex },
          { "workExperiences.workTitle": keywordRegex },
        ],
      });
    }

    if (batch) andFilters.push({ endYear: Number(batch) || batch });
    if (branch) andFilters.push({ branch: new RegExp(branch, "i") });
    if (location) andFilters.push({ location: new RegExp(location, "i") });

    const query = andFilters.length ? { $and: andFilters } : {};
    const alumni = await Alumni.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const users = await User.find({ _id: { $in: alumni.map((profile) => profile.user) } })
      .select("privacy blockedUsers")
      .lean();
    const accepted = await Connection.find({
      status: "accepted",
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    }).select("requester recipient").lean();
    const connectedIds = new Set(accepted.flatMap((item) => [String(item.requester), String(item.recipient)]));
    const currentBlocked = new Set((req.user.blockedUsers || []).map(String));
    const userById = new Map(users.map((user) => [String(user._id), user]));
    const visibleAlumni = alumni
      .filter((profile) => {
        const user = userById.get(String(profile.user));
        if (!user || String(profile.user) === String(req.user._id)) return true;
        if (currentBlocked.has(String(profile.user))) return false;
        if ((user.blockedUsers || []).some((id) => String(id) === String(req.user._id))) return false;
        if (user.privacy?.profileVisibility === "private") return false;
        if (user.privacy?.profileVisibility === "network") return connectedIds.has(String(profile.user));
        return true;
      })
      .map((profile) => {
        const privacy = userById.get(String(profile.user))?.privacy;
        return {
          ...profile,
          email: privacy?.showEmail ? profile.email : "",
          mobileNumber: privacy?.showPhone ? profile.mobileNumber : undefined,
        };
      });

    return res.status(200).json({
      status: "success",
      results: visibleAlumni.length,
      data: { alumni: visibleAlumni },
    });
  } catch (error) {
    console.error("Error fetching alumni directory:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getAlumniById = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id);
    if (!alumni) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    return res.status(200).json({
      status: "success",
      data: { alumni },
    });
  } catch (error) {
    console.error("Error fetching alumni profile:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const updateAlumniById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "startYear",
      "endYear",
      "degree",
      "branch",
      "rollNumber",
      "company",
      "designation",
      "location",
      "bio",
      "mobileNumber",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const alumni = await Alumni.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!alumni) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    const userUpdates = {};
    if (updates.email) userUpdates.email = updates.email;
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      userUpdates.name = [alumni.firstName, alumni.lastName].filter(Boolean).join(" ");
    }

    if (alumni.user && Object.keys(userUpdates).length) {
      await req.user.constructor.findByIdAndUpdate(alumni.user, userUpdates, {
        runValidators: true,
      });
    }

    return res.status(200).json({
      status: "success",
      data: { alumni },
    });
  } catch (error) {
    console.error("Error updating alumni profile:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
  }
};

const deleteAlumniById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const alumni = await Alumni.findByIdAndDelete(req.params.id);

    if (!alumni) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    await req.user.constructor.findByIdAndDelete(alumni.user);

    return res.status(200).json({
      status: "success",
      message: "Alumni record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting alumni profile:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  deleteAlumniById,
  getAlumniDirectory,
  getAlumniById,
  updateAlumniById,
};
