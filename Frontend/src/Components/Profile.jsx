import { useEffect, useState } from "react";
import api from "../services/api";
import { FaCamera, FaFilePdf, FaSave } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import { login } from "../features/authSlice";
import { useCurrentUser } from "../services/authService";

const ADMIN_DESIGNATIONS = [
  "Head of Department",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Placement Officer",
  "Department Coordinator",
  "Administrative Staff",
  "Other",
];

function Profile() {
  const user = useCurrentUser() || {};
  const isAdministrativeUser = ["admin", "super_admin"].includes(user.role);
  const dispatch = useDispatch();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.adminName ||
    "CMRIT member";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [profile, setProfile] = useState({
    adminName: user.adminName || user.name || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    phone: user.phone || "",
    branch: user.branch || "",
    degree: user.degree || "",
    startYear: user.startYear || "",
    endYear: user.endYear || "",
    company: user.company || "",
    designation: user.designation || "",
    officialDesignation: user.officialDesignation || "",
    customDesignation: user.customDesignation || "",
    location: user.location || "",
    bio: user.bio || "",
    photoUrl: user.imageUrl || user.profileImage || user.avatar || user.image || user.photoUrl || "",
    fileType: user.fileType || "",
    originalFileName: user.originalFileName || "",
  });
  const [profileFile, setProfileFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/profile/me");
        const latestProfile = response.data.data.profile;
        setProfile((current) => ({
          ...current,
          firstName: latestProfile.firstName || "",
          lastName: latestProfile.lastName || "",
          adminName: latestProfile.adminName || latestProfile.name || "",
          email: latestProfile.email || "",
          phone: latestProfile.mobileNumber || latestProfile.phone || "",
          branch: latestProfile.branch || "",
          degree: latestProfile.degree || "",
          startYear: latestProfile.startYear || "",
          endYear: latestProfile.endYear || "",
          company: latestProfile.company || "",
          designation: latestProfile.designation || "",
          officialDesignation: latestProfile.officialDesignation || "",
          customDesignation: latestProfile.customDesignation || "",
          department: latestProfile.department || null,
          role: latestProfile.role || user.role,
          location: latestProfile.location || "",
          bio: latestProfile.bio || "",
          photoUrl: latestProfile.imageUrl || latestProfile.photoUrl || "",
          fileType: latestProfile.fileType || "",
          originalFileName: latestProfile.originalFileName || "",
        }));
        dispatch(login({ ...latestProfile, role: latestProfile.role || user.role }));
      } catch (error) {
        console.error("Profile fetch failed:", error);
      }
    };

    fetchProfile();
  }, [dispatch, user.role]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      const adminFields = ["adminName", "email", "phone", "officialDesignation", "customDesignation"];
      Object.entries(profile).forEach(([key, value]) => {
        const allowed = isAdministrativeUser
          ? adminFields.includes(key)
          : !["adminName", "officialDesignation", "customDesignation", "department", "role", "photoUrl", "fileType", "originalFileName", "branch"].includes(key);
        if (allowed) {
          formData.append(key, value);
        }
      });
      if (profileFile) formData.append("file", profileFile);

      const response = await api.put("/profile/me", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = response.data.data.profile;
      dispatch(login({ ...updatedProfile, role: updatedProfile.role || user.role }));
      setProfile((current) => ({
        ...current,
        photoUrl: updatedProfile.imageUrl || "",
        fileType: updatedProfile.fileType || "",
        originalFileName: updatedProfile.originalFileName || "",
      }));
      setProfileFile(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error(error.response?.data?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "form-control";

  return (
    <main className="px-4 py-9">
      <ToastContainer />
      <section className="surface-card mx-auto max-w-5xl overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#101936] via-[#172554] to-[#3157d5] px-6 py-9 text-white sm:px-9">
          <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full border-[38px] border-white/5" />
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-200">
            Profile section
          </p>
          <h1 className="relative text-3xl font-black tracking-tight">
            {isAdministrativeUser ? "Edit your administrator profile" : "Edit your alumni profile"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
            {isAdministrativeUser
              ? "Keep your official contact and administrative information current."
              : "Keep your profile details current so classmates, faculty, and alumni coordinators can recognize and reach you easily."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[280px_1fr]"
        >
          <aside className="h-fit rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-5">
            <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-900 text-3xl font-extrabold text-white shadow-xl shadow-indigo-200">
              {profile.photoUrl && profile.fileType !== "application/pdf" ? (
                <img
                  src={profile.photoUrl}
                  alt={`${displayName} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-600">
                <FaCamera /> Profile file
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setProfileFile(event.target.files[0] || null)}
                className={inputClass}
              />
            </label>

            {profileFile && (
              <div className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-slate-500">
                Selected: {profileFile.name}
              </div>
            )}

            {profile.photoUrl && profile.fileType === "application/pdf" && (
              <a
                href={profile.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button mt-3 min-h-[42px] w-full px-3 text-sm"
              >
                <FaFilePdf /> View uploaded PDF
              </a>
            )}

          </aside>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-xl font-black text-slate-950">
                Personal details
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {isAdministrativeUser ? (
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-600">
                      Full name
                    </span>
                    <input
                      name="adminName"
                      value={profile.adminName}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-600">
                        First name
                      </span>
                      <input
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-600">
                        Last name
                      </span>
                      <input
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </label>
                  </>
                )}
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    value={profile.email}
                    readOnly={isAdministrativeUser}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Phone
                  </span>
                  <input
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="+91 ..."
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-black text-slate-950">
                {isAdministrativeUser ? "Administrative information" : "Academic and career details"}
              </h2>
              {isAdministrativeUser ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-600">Department</span>
                    <input
                      aria-label="Department"
                      value={profile.department?.name || (user.role === "super_admin" ? "Platform-wide" : "Not assigned")}
                      readOnly
                      className={`${inputClass} bg-slate-100`}
                    />
                    <span className="mt-2 block text-xs font-semibold text-slate-500">
                      Department assigned by Super Admin.
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-600">Role</span>
                    <input
                      value={user.role === "super_admin" ? "Super Admin" : "Department Admin"}
                      readOnly
                      className={`${inputClass} bg-slate-100`}
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-600">Official designation</span>
                    <select
                      name="officialDesignation"
                      value={profile.officialDesignation}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select official designation</option>
                      {ADMIN_DESIGNATIONS.map((designation) => (
                        <option key={designation} value={designation}>{designation}</option>
                      ))}
                    </select>
                  </label>
                  {profile.officialDesignation === "Other" && (
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-bold text-slate-600">Custom designation</span>
                      <input
                        name="customDesignation"
                        value={profile.customDesignation}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        placeholder="Enter the official designation"
                        className={inputClass}
                      />
                    </label>
                  )}
                </div>
              ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Branch
                  </span>
                  <input
                    name="branch"
                    disabled
                    value={profile.branch}
                    onChange={handleChange}
                    placeholder="Computer Science"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Degree
                  </span>
                  <input
                    name="degree"
                    value={profile.degree}
                    onChange={handleChange}
                    placeholder="Bachelor"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Start year
                  </span>
                  <input
                    name="startYear"
                    value={profile.startYear}
                    onChange={handleChange}
                    placeholder="2020"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    End year
                  </span>
                  <input
                    name="endYear"
                    value={profile.endYear}
                    onChange={handleChange}
                    placeholder="2024"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Company
                  </span>
                  <input
                    name="company"
                    value={profile.company}
                    onChange={handleChange}
                    placeholder="Current company"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Designation
                  </span>
                  <input
                    name="designation"
                    value={profile.designation}
                    onChange={handleChange}
                    placeholder="Software Engineer"
                    className={inputClass}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Location
                  </span>
                  <input
                    name="location"
                    value={profile.location}
                    onChange={handleChange}
                    placeholder="Bengaluru"
                    className={inputClass}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Short bio
                  </span>
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Share a short introduction for your alumni profile."
                    className={inputClass}
                  />
                </label>
              </div>
              )}
            </section>

            <div className="flex justify-end border-t border-slate-200 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="primary-button"
              >
                <FaSave /> {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Profile;
