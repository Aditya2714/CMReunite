import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  FaBuilding,
  FaEdit,
  FaEnvelope,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTrash,
  FaUserGraduate,
  FaTimes,
} from "react-icons/fa";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  startYear: "",
  endYear: "",
  degree: "",
  branch: "",
  rollNumber: "",
  company: "",
  designation: "",
  location: "",
  mobileNumber: "",
  bio: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

const searchFields = [
  ["all", "All fields"],
  ["name", "Name"],
  ["email", "Email"],
  ["rollNumber", "USN / Roll number"],
  ["startYear", "Start year"],
  ["endYear", "Passing year"],
  ["degree", "Degree"],
  ["branch", "Branch"],
  ["company", "Company"],
  ["designation", "Designation"],
  ["location", "Location"],
  ["mobileNumber", "Mobile number"],
];

function toForm(person) {
  return Object.keys(emptyForm).reduce(
    (form, key) => ({ ...form, [key]: person[key] ?? "" }),
    {}
  );
}

function getName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getSearchValue(person, field) {
  if (field === "name") return getName(person);
  if (field === "all") {
    return [
      getName(person),
      person.email,
      person.rollNumber,
      person.startYear,
      person.endYear,
      person.degree,
      person.branch,
      person.company,
      person.designation,
      person.location,
      person.mobileNumber,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return person[field] || "";
}

function ManageAlumni() {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ keyword: "", searchBy: "all" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchAlumni = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.get("/alumni");
      setAlumni(response.data.data.alumni || []);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Unable to load alumni records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, []);

  const filteredAlumni = useMemo(() => {
    const keyword = filters.keyword.toLowerCase().trim();

    if (!keyword) return [];

    return alumni.filter((person) => {
      const searchable = String(getSearchValue(person, filters.searchBy)).toLowerCase();
      return searchable.includes(keyword);
    });
  }, [alumni, filters]);

  const hasSearched = filters.keyword.trim().length > 0;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const startEdit = (person) => {
    setEditingId(person._id);
    setForm(toForm(person));
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId("");
    setForm(emptyForm);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      startYear: Number(form.startYear),
      endYear: Number(form.endYear),
      mobileNumber: form.mobileNumber ? Number(form.mobileNumber) : undefined,
    };

    try {
      const response = await api.patch(`/alumni/${editingId}`, payload);
      const updated = response.data.data.alumni;
      setAlumni((current) =>
        current.map((person) => (person._id === updated._id ? updated : person))
      );
      setMessage("Alumni record updated successfully.");
      cancelEdit();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to update alumni record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (person) => {
    const name = getName(person);
    const confirmed = window.confirm(
      `Delete ${name}'s alumni profile and login account from the database?`
    );
    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/alumni/${person._id}`);
      setAlumni((current) => current.filter((item) => item._id !== person._id));
      if (editingId === person._id) cancelEdit();
      setMessage("Alumni record deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Unable to delete alumni record.");
    }
  };

  const fieldGroups = [
    ["firstName", "First name", "text"],
    ["lastName", "Last name", "text"],
    ["email", "Email", "email"],
    ["rollNumber", "USN / Roll number", "text"],
    ["startYear", "Start year", "number"],
    ["endYear", "Passing year", "number"],
    ["degree", "Degree", "text"],
    ["branch", "Branch", "text"],
    ["company", "Company", "text"],
    ["designation", "Designation", "text"],
    ["location", "Location", "text"],
    ["mobileNumber", "Mobile number", "tel"],
  ];

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Admin control
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Manage alumni records.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            View, update, and remove verified alumni profiles from the live
            MongoDB records used by the directory and dashboard.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Total alumni</p>
            <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
              {alumni.length}
            </strong>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Search results</p>
            <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
              {filteredAlumni.length}
            </strong>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <button
              type="button"
              onClick={fetchAlumni}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800"
            >
              <FaSyncAlt /> {loading ? "Refreshing..." : "Refresh Records"}
            </button>
          </article>
        </section>

        {(message || error) && (
          <div
            className={`rounded-lg p-4 text-sm font-bold ${
              error ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
            }`}
          >
            {error || message}
          </div>
        )}

        {editingId && (
          <form
            onSubmit={handleSave}
            className="rounded-lg border border-blue-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
                  Editing profile
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Update alumni details
                </h2>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 px-4 font-extrabold text-slate-900 transition hover:border-slate-900"
              >
                <FaTimes /> Cancel
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {fieldGroups.map(([name, label, type]) => (
                <label key={name} className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    {label}
                  </span>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleFormChange}
                    className={inputClass}
                    required={[
                      "firstName",
                      "email",
                      "rollNumber",
                      "startYear",
                      "endYear",
                      "degree",
                      "branch",
                    ].includes(name)}
                  />
                </label>
              ))}
              <label className="block md:col-span-3">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Bio
                </span>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleFormChange}
                  rows="4"
                  className={inputClass}
                  placeholder="Short profile summary"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <FaSave /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">
                Search by
              </span>
              <select
                name="searchBy"
                value={filters.searchBy}
                onChange={handleFilterChange}
                className={inputClass}
              >
                {searchFields.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-600">
                Search
              </span>
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="keyword"
                  value={filters.keyword}
                  onChange={handleFilterChange}
                  placeholder={`Search by ${
                    searchFields.find(([value]) => value === filters.searchBy)?.[1].toLowerCase() ||
                    "selected field"
                  }`}
                  className={`${inputClass} pl-11`}
                />
              </div>
            </label>
          </div>
        </section>

        {loading ? (
          <section className="rounded-lg border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            Loading alumni records...
          </section>
        ) : !hasSearched ? (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-700">
              <FaSearch />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
              Search to view alumni records
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              Choose a field from the dropdown and enter a value. Matching
              alumni cards will appear here only after searching.
            </p>
          </section>
        ) : filteredAlumni.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredAlumni.map((person) => {
              const name = getName(person);
              const initials = getInitials(name);
              const isImage = person.imageUrl && person.fileType !== "application/pdf";

              return (
                <article
                  key={person._id}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-950 text-lg font-extrabold text-white">
                        {isImage ? (
                          <img
                            src={person.imageUrl}
                            alt={`${name} profile`}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-extrabold text-slate-900">
                          {name}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold text-slate-500">
                          <FaEnvelope className="shrink-0 text-blue-700" /> {person.email}
                        </p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                      Batch {person.endYear || "N/A"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-500 sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <FaGraduationCap className="text-blue-700" />
                      {person.degree || "Degree not added"} · {person.branch || "Branch not added"}
                    </p>
                    <p className="flex items-center gap-2">
                      <FaUserGraduate className="text-blue-700" />
                      USN: {person.rollNumber || "Not added"}
                    </p>
                    <p className="flex items-center gap-2">
                      <FaBuilding className="text-blue-700" />
                      {person.designation || "Alumni"} at {person.company || "Not added"}
                    </p>
                    <p className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-blue-700" />
                      {person.location || "Location not added"}
                    </p>
                  </div>

                  {person.bio && (
                    <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                      {person.bio}
                    </p>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => startEdit(person)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(person)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-700">
              <FaUserGraduate />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
              No alumni records found
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Approved, imported, or registered alumni profiles will appear here.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

export default ManageAlumni;
